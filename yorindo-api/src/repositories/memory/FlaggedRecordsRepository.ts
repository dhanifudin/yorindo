import { faker } from '@faker-js/faker'
import { createId } from '@paralleldrive/cuid2'
import type { IFlaggedRecordsRepository } from '../../interfaces/repositories/IFlaggedRecordsRepository.js'
import type { PaginationParams } from '../../interfaces/repositories/IContactRepository.js'
import type { FlaggedRecord, FlaggedRecordStatus, Contact } from '../../types/domain.js'
import { SEED_USER_IDS, SEED_UPLOAD_IDS } from './_seeds.js'

faker.seed(42)

const FLAG_REASON_SETS = [
  ['invalid_phone', 'missing_name'],
  ['duplicate_suspected'],
  ['invalid_email'],
  ['invalid_phone'],
  ['missing_name', 'invalid_email'],
]

export class InMemoryFlaggedRecordsRepository implements IFlaggedRecordsRepository {
  private records: Map<string, FlaggedRecord> = new Map()

  constructor() {
    this._seed()
  }

  private _seed(): void {
    const now = Date.now()

    for (let i = 0; i < 20; i++) {
      const id = createId()

      // 10 pending, 6 resolved, 4 discarded
      let status: FlaggedRecordStatus
      if (i < 10) status = 'pending'
      else if (i < 16) status = 'resolved'
      else status = 'discarded'

      const isResolved = status === 'resolved' || status === 'discarded'

      const record: FlaggedRecord = {
        id,
        rawData: {
          name: faker.person.fullName(),
          phone: `+628${faker.number.int({ min: 100000000, max: 999999999 })}`,
          email: i % 4 === 0 ? '' : faker.internet.email(),
          company: faker.company.name(),
          city: ['Jakarta', 'Bandung', 'Surabaya'][i % 3],
        },
        flags: FLAG_REASON_SETS[i % FLAG_REASON_SETS.length]!,
        status,
        uploadId: i < 10 ? SEED_UPLOAD_IDS[0]! : SEED_UPLOAD_IDS[2]!,
        resolvedBy: isResolved ? SEED_USER_IDS.event_admin : null,
        resolvedAt: isResolved ? new Date(now - (20 - i) * 3600000).toISOString() : null,
        createdAt: new Date(now - i * 3600000 * 3).toISOString(),
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
      id: createId(),
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
