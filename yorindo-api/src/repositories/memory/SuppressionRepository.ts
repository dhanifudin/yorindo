import type { ISuppressionRepository } from '../../interfaces/repositories/ISuppressionRepository.js'
import type { PaginationParams } from '../../interfaces/repositories/IContactRepository.js'
import type { SuppressionRecord } from '../../types/domain.js'

export class InMemorySuppressionRepository implements ISuppressionRepository {
  private suppressedPhones: Set<string> = new Set()
  private records: Map<string, SuppressionRecord> = new Map()

  async isSuppressed(phone: string): Promise<boolean> {
    return this.suppressedPhones.has(phone)
  }

  async suppress(contactId: string, reason: string): Promise<void> {
    const record: SuppressionRecord = {
      id: crypto.randomUUID(),
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
