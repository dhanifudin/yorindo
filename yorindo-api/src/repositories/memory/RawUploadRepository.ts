import type { IRawUploadRepository } from '../../interfaces/repositories/IRawUploadRepository.js'
import type { RawUpload } from '../../types/domain.js'
import { createId } from '@paralleldrive/cuid2'
import { SEED_USER_IDS, SEED_UPLOAD_IDS } from './_seeds.js'

export class InMemoryRawUploadRepository implements IRawUploadRepository {
  private uploads: Map<string, RawUpload> = new Map()

  constructor() {
    this._seed()
  }

  private _seed(): void {
    const seeds: RawUpload[] = [
      {
        id: SEED_UPLOAD_IDS[0]!,
        filename: 'contacts-batch-maret-2026.xlsx',
        uploadedBy: SEED_USER_IDS.event_admin,
        rowCount: 100,
        upsertedCount: 90,
        flaggedCount: 10,
        failedCount: 0,
        status: 'completed',
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
      {
        id: SEED_UPLOAD_IDS[1]!,
        filename: 'contacts-teknologi-q1.xlsx',
        uploadedBy: SEED_USER_IDS.staff,
        rowCount: 0,
        upsertedCount: 0,
        flaggedCount: 0,
        failedCount: 0,
        status: 'pending',
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      },
      {
        id: SEED_UPLOAD_IDS[2]!,
        filename: 'contacts-invalid-format.csv',
        uploadedBy: SEED_USER_IDS.event_admin,
        rowCount: 50,
        upsertedCount: 0,
        flaggedCount: 10,
        failedCount: 40,
        status: 'failed',
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
    ]

    for (const upload of seeds) {
      this.uploads.set(upload.id, upload)
    }
  }

  async create(data: Omit<RawUpload, 'id' | 'createdAt'>): Promise<RawUpload> {
    const id = createId()
    const upload: RawUpload = {
      ...data,
      id,
      createdAt: new Date().toISOString()
    }
    this.uploads.set(id, upload)
    return upload
  }

  async findById(id: string): Promise<RawUpload | null> {
    return this.uploads.get(id) ?? null
  }

  async update(id: string, data: Partial<RawUpload>): Promise<RawUpload | null> {
    const existing = this.uploads.get(id)
    if (!existing) return null

    const updated = { ...existing, ...data }
    this.uploads.set(id, updated)
    return updated
  }
}
