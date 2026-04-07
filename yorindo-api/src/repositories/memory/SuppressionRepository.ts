import { createId } from '@paralleldrive/cuid2'
import type { ISuppressionRepository } from '../../interfaces/repositories/ISuppressionRepository.js'
import type { PaginationParams } from '../../interfaces/repositories/IContactRepository.js'
import type { SuppressionRecord, EntityId } from '../../types/domain.js'
import { SEED_CONTACT_IDS } from './_seeds.js'

export class InMemorySuppressionRepository implements ISuppressionRepository {
  private suppressedPhones: Set<string> = new Set()
  private suppressedEmails: Set<string> = new Set()
  private records: Map<EntityId, SuppressionRecord> = new Map()

  constructor() {
    this._seed()
  }

  private _seed(): void {
    // Only seed for contacts that have a phone (first 5 of our seed set)
    // Actually, following the original logic, we seed the last 5.
    // In our new ContactRepository seeds, indices 115-119 have NULL phone.
    // So we'll seed them with null phone and maybe one with an email.
    for (let i = 0; i < 5; i++) {
      const contactId = SEED_CONTACT_IDS[115 + i]!
      const record: SuppressionRecord = {
        id: createId(),
        contactId,
        phone: null,
        email: `suppressed-${i}@example.com`,
        name: `Suppressed User ${i}`,
        reason: 'unsubscribed',
        createdAt: new Date(Date.now() - (5 - i) * 7 * 86400000).toISOString(),
      }
      this.records.set(record.id, record)
      if (record.email) this.suppressedEmails.add(record.email.toLowerCase())
    }
  }

  async isSuppressed(input: string | { phone?: string | null; email?: string | null }): Promise<boolean> {
    if (typeof input === 'string') {
      const lower = input.toLowerCase()
      return this.suppressedPhones.has(input) || this.suppressedEmails.has(lower)
    }

    const phone = input.phone?.trim()
    const email = input.email?.trim().toLowerCase()
    
    if (phone && this.suppressedPhones.has(phone)) return true
    if (email && this.suppressedEmails.has(email)) return true
    
    return false
  }

  async suppress(
    contactId: EntityId,
    reason: string,
    options?: { phone?: string | null; email?: string | null; name?: string | null },
  ): Promise<SuppressionRecord> {
    const phone = options?.phone?.trim() ?? null
    const email = options?.email?.trim().toLowerCase() ?? null
    
    const existing = Array.from(this.records.values()).find((record) =>
      (phone !== null && record.phone === phone) || 
      (email !== null && record.email === email)
    )

    if (existing) {
      if (phone) this.suppressedPhones.add(phone)
      if (email) this.suppressedEmails.add(email)
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

  async remove(id: EntityId): Promise<boolean> {
    const existing = this.records.get(id)
    if (!existing) return false
    this.records.delete(id)
    if (existing.phone) this.suppressedPhones.delete(existing.phone)
    if (existing.email) this.suppressedEmails.delete(existing.email)
    return true
  }

  async findAll(params: PaginationParams, filters?: any): Promise<{ data: SuppressionRecord[]; total: number }> {
    const data = Array.from(this.records.values())
    const total = data.length
    const start = (params.page - 1) * params.pageSize
    return { data: data.slice(start, start + params.pageSize), total }
  }
}
