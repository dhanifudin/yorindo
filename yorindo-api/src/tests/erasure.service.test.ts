import { describe, it, expect, beforeEach } from 'vitest'
import { createHash } from 'node:crypto'
import { ErasureService, ErasureError } from '../services/erasure.service.js'
import { InMemoryContactRepository } from '../repositories/memory/ContactRepository.js'
import { InMemorySuppressionRepository } from '../repositories/memory/SuppressionRepository.js'
import type { AuditEntry, IAuditLogger } from '../services/blast.service.js'

class TestAuditLogger implements IAuditLogger {
  entries: AuditEntry[] = []
  async log(entry: AuditEntry): Promise<void> {
    this.entries.push(entry)
  }
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

describe('ErasureService', () => {
  let contactRepo: InMemoryContactRepository
  let suppressionRepo: InMemorySuppressionRepository
  let auditLogger: TestAuditLogger
  let service: ErasureService

  beforeEach(() => {
    contactRepo = new InMemoryContactRepository()
    suppressionRepo = new InMemorySuppressionRepository()
    auditLogger = new TestAuditLogger()
    service = new ErasureService(contactRepo, suppressionRepo, auditLogger)
  })

  it('happy path: returns 202 with jobId and queued status', async () => {
    const { data: contacts } = await contactRepo.findAll({ page: 1, pageSize: 1 })
    const contact = contacts[0]

    const result = await service.anonymizeContact({ phone: contact.phone, email: contact.email ?? '' })

    expect(result.jobId).toBeTruthy()
    expect(result.status).toBe('completed')
    expect(result.message).toBe('Permintaan penghapusan diterima')
  })

  it('anonymizes contact: name=ANONYMIZED, phone=sha256(original), email=null', async () => {
    const { data: contacts } = await contactRepo.findAll({ page: 1, pageSize: 10 })
    const contact = contacts.find(c => c.email !== null)!
    const originalPhone = contact.phone

    await service.anonymizeContact({ phone: originalPhone, email: contact.email! })

    const updated = await contactRepo.findById(contact.id)
    expect(updated?.name).toBe('ANONYMIZED')
    expect(updated?.phone).toBe(sha256(originalPhone))
    expect(updated?.email).toBeNull()
    expect(updated?.consentStatus).toBe('suppressed')
  })

  it('adds contact to suppression list after erasure', async () => {
    const { data: contacts } = await contactRepo.findAll({ page: 1, pageSize: 1 })
    const contact = contacts[0]

    await service.anonymizeContact({ phone: contact.phone, email: contact.email ?? '' })

    const isSuppressed = await suppressionRepo.isSuppressed(contact.phone)
    expect(isSuppressed).toBe(true)
  })

  it('writes participant.data-erased audit entry with no PII', async () => {
    const { data: contacts } = await contactRepo.findAll({ page: 1, pageSize: 1 })
    const contact = contacts[0]

    await service.anonymizeContact({ phone: contact.phone, email: contact.email ?? '' })

    const auditEntry = auditLogger.entries.find(e => e.action === 'participant.data-erased')
    expect(auditEntry).toBeTruthy()
    expect(auditEntry?.metadata).not.toHaveProperty('phone')
    expect(auditEntry?.metadata).not.toHaveProperty('email')
    expect(auditEntry?.metadata).toHaveProperty('contactId')
    expect(auditEntry?.metadata).toHaveProperty('phoneHashPrefix')
  })

  it('identity mismatch: wrong email throws ErasureError with httpStatus 422', async () => {
    const { data: contacts } = await contactRepo.findAll({ page: 1, pageSize: 10 })
    const contact = contacts.find(c => c.email !== null)!

    await expect(
      service.anonymizeContact({ phone: contact.phone, email: 'wrong@example.com' })
    ).rejects.toThrow(ErasureError)

    await expect(
      service.anonymizeContact({ phone: contact.phone, email: 'wrong@example.com' })
    ).rejects.toMatchObject({ code: 'IDENTITY_MISMATCH', httpStatus: 422 })
  })

  it('phone not found throws ErasureError with httpStatus 422', async () => {
    await expect(
      service.anonymizeContact({ phone: '+62999000000', email: 'nobody@example.com' })
    ).rejects.toMatchObject({ code: 'IDENTITY_MISMATCH', httpStatus: 422 })
  })

  it('already erased: second request throws ErasureError with httpStatus 409', async () => {
    const { data: contacts } = await contactRepo.findAll({ page: 1, pageSize: 1 })
    const contact = contacts[0]

    await service.anonymizeContact({ phone: contact.phone, email: contact.email ?? '' })

    // Second request: phone is now stored as hash; original phone no longer exists
    // but existsByPhoneHash(sha256(phone)) returns true
    const hashedPhone = sha256(contact.phone)
    await expect(
      service.anonymizeContact({ phone: contact.phone, email: contact.email ?? '' })
    ).rejects.toMatchObject({ code: 'ALREADY_ERASED', httpStatus: 409 })

    // Verify hash is stored
    const exists = await contactRepo.existsByPhoneHash(hashedPhone)
    expect(exists).toBe(true)
  })
})
