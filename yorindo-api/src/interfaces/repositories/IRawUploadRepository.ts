import type { RawUpload } from '../../types/domain.js'

export interface IRawUploadRepository {
  create(data: Omit<RawUpload, 'id' | 'createdAt'>): Promise<RawUpload>
  findById(id: string): Promise<RawUpload | null>
  update(id: string, data: Partial<RawUpload>): Promise<RawUpload | null>
}
