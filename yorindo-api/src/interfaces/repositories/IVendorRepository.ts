import type { Vendor, EntityId } from '../../types/domain.js'

export interface IVendorRepository {
  findAll(page: number, pageSize: number): Promise<{ data: Vendor[]; total: number }>
  findById(id: EntityId): Promise<Vendor | null>
  create(data: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vendor>
  update(id: EntityId, data: Partial<Vendor>): Promise<Vendor | null>
  delete(id: EntityId): Promise<boolean>
}
