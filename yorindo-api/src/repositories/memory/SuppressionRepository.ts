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
  'unsubscribed',
  'erasure_request',
  'unsubscribed',
  'manually_added',
] as const

export class InMemorySuppressionRepository implements ISuppressionRepository {
  private suppressedPhones: Set<string> = new Set()
  private suppressedEmails: Set<string> = new Set()
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
        email: null,
        name: null,
        reason: SUPPRESSION_REASONS[i]!,
        createdAt: new Date(Date.now() - (5 - i) * 7 * 86400000).toISOString(),
      }
      this.records.set(record.id, record)
      this.suppressedPhones.add(SUPPRESSED_PHONES[i]!)
    }
  }

  async isSuppressed(input: string | { phone?: string | null; email?: string | null }): Promise<boolean> {
    if (typeof input === 'string') {
      return this.suppressedPhones.has(input) || this.suppressedEmails.has(input.toLowerCase())
    }

    const phone = input.phone?.trim()
    const email = input.email?.trim().toLowerCase()
    return (phone ? this.suppressedPhones.has(phone) : false) || (email ? this.suppressedEmails.has(email) : false)
  }

  async suppress(
    contactId: string,
    reason: string,
    options?: { phone?: string | null; email?: string | null; name?: string | null },
  ): Promise<SuppressionRecord> {
    const phone = options?.phone?.trim() ?? contactId
    const email = options?.email?.trim().toLowerCase() ?? null
    const existing = Array.from(this.records.values()).find((record) =>
      record.phone === phone || (email !== null && record.email === email),
    )

    if (existing) {
      return existing
    }

    const record: SuppressionRecord = {
      id: createId(),
      contactId,
      phone,
      email,
      name: options?.name?.trim() ?? null,
      reason,
      createdAt: new Date().toISOString(),
    }
    this.records.set(record.id, record)
    if (phone) this.suppressedPhones.add(phone)
    if (email) this.suppressedEmails.add(email)
    return record
  }

  async remove(id: string): Promise<boolean> {
    const existing = this.records.get(id)
    if (!existing) return false
    this.records.delete(id)
    if (existing.phone) this.suppressedPhones.delete(existing.phone)
    if (existing.email) this.suppressedEmails.delete(existing.email)
    return true
  }

  async findAll(params: PaginationParams): Promise<{ data: SuppressionRecord[]; total: number }> {
    const data = Array.from(this.records.values())
    const total = data.length
    const start = (params.page - 1) * params.pageSize
    return { data: data.slice(start, start + params.pageSize), total }
  }
}
