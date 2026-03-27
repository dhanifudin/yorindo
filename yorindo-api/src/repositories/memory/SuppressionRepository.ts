import { createId } from '@paralleldrive/cuid2'
import type { ISuppressionRepository } from '../../interfaces/repositories/ISuppressionRepository.js'
import type { PaginationParams } from '../../interfaces/repositories/IContactRepository.js'
import type { SuppressionRecord } from '../../types/domain.js'
import { SEED_CONTACT_IDS } from './_seeds.js'

// Suppressed contacts — last 5 of the seed set (indices 115–119)
const SUPPRESSED_PHONES = [
  '+62811000000115',
  '+62811000000116',
  '+62811000000117',
  '+62811000000118',
  '+62811000000119',
] as const

const SUPPRESSION_REASONS = [
  'unsubscribed',
  'hard_bounce',
  'user_request',
  'spam_complaint',
  'admin_manual',
] as const

export class InMemorySuppressionRepository implements ISuppressionRepository {
  private suppressedPhones: Set<string> = new Set()
  private records: Map<string, SuppressionRecord> = new Map()

  constructor() {
    this._seed()
  }

  private _seed(): void {
    for (let i = 0; i < 5; i++) {
      const record: SuppressionRecord = {
        id: createId(),
        contactId: SEED_CONTACT_IDS[115 + i]!,
        phone: SUPPRESSED_PHONES[i]!,
        reason: SUPPRESSION_REASONS[i]!,
        createdAt: new Date(Date.now() - (5 - i) * 7 * 86400000).toISOString(),
      }
      this.records.set(record.id, record)
      this.suppressedPhones.add(SUPPRESSED_PHONES[i]!)
    }
  }

  async isSuppressed(phone: string): Promise<boolean> {
    return this.suppressedPhones.has(phone)
  }

  async suppress(contactId: string, reason: string): Promise<void> {
    const record: SuppressionRecord = {
      id: createId(),
      contactId,
      phone: contactId, // caller is expected to pass phone; in-memory stores what's given
      reason,
      createdAt: new Date().toISOString(),
    }
    this.records.set(record.id, record)
    this.suppressedPhones.add(contactId)
  }

  async findAll(params: PaginationParams): Promise<{ data: SuppressionRecord[]; total: number }> {
    const data = Array.from(this.records.values())
    const total = data.length
    const start = (params.page - 1) * params.pageSize
    return { data: data.slice(start, start + params.pageSize), total }
  }
}
