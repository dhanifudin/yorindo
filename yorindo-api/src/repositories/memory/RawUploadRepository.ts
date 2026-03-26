import type { IRawUploadRepository } from '../../interfaces/repositories/IRawUploadRepository.js'
import type { RawUpload } from '../../types/domain.js'
import { createId } from '@paralleldrive/cuid2'

export class InMemoryRawUploadRepository implements IRawUploadRepository {
  private uploads: Map<string, RawUpload> = new Map()

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
