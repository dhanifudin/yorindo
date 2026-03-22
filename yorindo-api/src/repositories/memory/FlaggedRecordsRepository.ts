import { faker } from '@faker-js/faker'
import type { IFlaggedRecordsRepository } from '../../interfaces/repositories/IFlaggedRecordsRepository.js'
import type { PaginationParams } from '../../interfaces/repositories/IContactRepository.js'
import type { FlaggedRecord, FlaggedRecordStatus, Contact } from '../../types/domain.js'

faker.seed(42)

export class InMemoryFlaggedRecordsRepository implements IFlaggedRecordsRepository {
  private records: Map<string, FlaggedRecord> = new Map()

  constructor() {
    this._seed()
  }

  private _seed(): void {
    const flagReasons = [
      ['invalid_phone', 'missing_name'],
      ['duplicate_suspected'],
      ['invalid_email'],
    ]
    for (let i = 0; i < 10; i++) {
      const id = crypto.randomUUID()
      const record: FlaggedRecord = {
        id,
        rawData: {
          name: faker.person.fullName(),
          phone: `08${faker.number.int({ min: 10000000, max: 99999999 })}`,
          email: faker.internet.email(),
        },
        flags: flagReasons[i % flagReasons.length],
        status: 'pending',
        uploadId: crypto.randomUUID(),
        resolvedBy: null,
        resolvedAt: null,
        createdAt: new Date(Date.now() - i * 3600000).toISOString(),
      }
      this.records.set(id, record)
    }
  }

  async findAll(params: PaginationParams, status?: FlaggedRecordStatus): Promise<{ data: FlaggedRecord[]; total: number }> {
    let data = Array.from(this.records.values())
    if (status) data = data.filter(r => r.status === status)
    const total = data.length
    const start = (params.page - 1) * params.pageSize
    return { data: data.slice(start, start + params.pageSize), total }
  }

  async findById(id: string): Promise<FlaggedRecord | null> {
    return this.records.get(id) ?? null
  }

  async create(data: Omit<FlaggedRecord, 'id' | 'createdAt'>): Promise<FlaggedRecord> {
    const record: FlaggedRecord = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date().toISOString(),
    }
    this.records.set(record.id, record)
    return record
  }

  async resolve(id: string, _resolvedData: Partial<Contact>, resolvedById: string): Promise<void> {
    const existing = this.records.get(id)
    if (existing) {
      this.records.set(id, {
        ...existing,
        status: 'resolved',
        resolvedBy: resolvedById,
        resolvedAt: new Date().toISOString(),
      })
    }
  }

  async discard(id: string, resolvedById: string): Promise<void> {
    const existing = this.records.get(id)
    if (existing) {
      this.records.set(id, {
        ...existing,
        status: 'discarded',
        resolvedBy: resolvedById,
        resolvedAt: new Date().toISOString(),
      })
    }
  }
}
