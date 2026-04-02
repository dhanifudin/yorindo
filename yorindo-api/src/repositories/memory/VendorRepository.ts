import { createId } from '@paralleldrive/cuid2'
import type { IVendorRepository } from '../../interfaces/repositories/IVendorRepository.js'
import type { Vendor, EntityId } from '../../types/domain.js'

export class InMemoryVendorRepository implements IVendorRepository {
  private vendors: Map<EntityId, Vendor> = new Map()

  constructor() {
    this._seed()
  }

  private _seed() {
    const now = new Date().toISOString()
    const seeds: Vendor[] = [
      { id: 'vendor-001', name: 'Alibaba Cloud', contactEmail: 'sponsor@alibabacloud.com', industry: 'teknologi', logoUrl: null, website: 'https://alibabacloud.com', notes: '', createdAt: now, updatedAt: now },
      { id: 'vendor-002', name: 'AWS Indonesia', contactEmail: 'aws-sponsor@amazon.com', industry: 'teknologi', logoUrl: null, website: 'https://aws.amazon.com', notes: '', createdAt: now, updatedAt: now },
      { id: 'vendor-003', name: 'PT Mandiri Sekuritas', contactEmail: 'event@mandirisekuritas.co.id', industry: 'keuangan', logoUrl: null, website: 'https://mandirisekuritas.co.id', notes: 'Sponsor tetap untuk event fintech', createdAt: now, updatedAt: now },
      { id: 'vendor-004', name: 'Siemens Indonesia', contactEmail: 'siemens-id@siemens.com', industry: 'manufaktur', logoUrl: null, website: 'https://siemens.com/id', notes: '', createdAt: now, updatedAt: now },
    ]
    for (const v of seeds) {
      this.vendors.set(v.id, v)
    }
  }

  async findAll(page: number, pageSize: number): Promise<{ data: Vendor[]; total: number }> {
    const all = Array.from(this.vendors.values()).sort((a, b) => a.name.localeCompare(b.name))
    const start = (page - 1) * pageSize
    return {
      data: all.slice(start, start + pageSize),
      total: all.length,
    }
  }

  async findById(id: EntityId): Promise<Vendor | null> {
    return this.vendors.get(id) ?? null
  }

  async create(data: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vendor> {
    const now = new Date().toISOString()
    const vendor: Vendor = {
      ...data,
      id: createId(),
      createdAt: now,
      updatedAt: now,
    }
    this.vendors.set(vendor.id, vendor)
    return vendor
  }

  async update(id: EntityId, data: Partial<Vendor>): Promise<Vendor | null> {
    const existing = this.vendors.get(id)
    if (!existing) return null
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    }
    this.vendors.set(id, updated)
    return updated
  }

  async delete(id: EntityId): Promise<boolean> {
    return this.vendors.delete(id)
  }

  clear() {
    this.vendors.clear()
  }
}
