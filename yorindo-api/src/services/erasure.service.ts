import { createHash } from 'node:crypto'
import type { IContactRepository } from '../interfaces/repositories/IContactRepository.js'
import type { ISuppressionRepository } from '../interfaces/repositories/ISuppressionRepository.js'
import type { IAuditLogger } from './blast.service.js'
import { createId } from '@paralleldrive/cuid2'

export interface ErasureRequest {
  phone: string
  email: string
}

export interface ErasureResult {
  jobId: string
  status: 'queued' | 'completed'
  message: string
}

export class ErasureError extends Error {
  constructor(
    message: string,
    public readonly code: 'IDENTITY_MISMATCH' | 'ALREADY_ERASED',
    public readonly httpStatus: 422 | 409,
  ) {
    super(message)
    this.name = 'ErasureError'
  }
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

export class ErasureService {
  constructor(
    private readonly contactRepository: IContactRepository,
    private readonly suppressionRepository: ISuppressionRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async anonymizeContact(request: ErasureRequest): Promise<ErasureResult> {
    const { phone, email } = request
    const hashedPhone = sha256(phone)

    // Check if already erased (phone hash already stored)
    const alreadyErased = await this.contactRepository.existsByPhoneHash(hashedPhone)
    if (alreadyErased) {
      throw new ErasureError(
        'Data sudah dihapus sebelumnya',
        'ALREADY_ERASED',
        409,
      )
    }

    // Identity verification: phone must exist and email must match
    const contact = await this.contactRepository.findByPhone(phone)
    if (!contact) {
      throw new ErasureError(
        'Data tidak ditemukan atau identitas tidak cocok',
        'IDENTITY_MISMATCH',
        422,
      )
    }
    if (contact.email !== null && contact.email !== email) {
      throw new ErasureError(
        'Data tidak ditemukan atau identitas tidak cocok',
        'IDENTITY_MISMATCH',
        422,
      )
    }

    // Anonymize: replace PII with hash; suppress consent
    await this.contactRepository.anonymize(contact.id, hashedPhone)

    // Ensure suppressed in suppression list (for blast exclusion)
    await this.suppressionRepository.suppress(contact.id, 'erasure_request', { 
      phone, 
      email: contact.email,
      name: 'Anonymized'
    })

    // Audit: NO PII in log
    await this.auditLogger.log({
      action: 'participant.data-erased',
      metadata: {
        contactId: contact.id,
        phoneHashPrefix: hashedPhone.slice(0, 8),
      },
      level: 'info',
    })

    return {
      jobId: `erasure-${createId()}`,
      status: 'completed',
      message: 'Permintaan penghapusan diterima',
    }
  }
}
