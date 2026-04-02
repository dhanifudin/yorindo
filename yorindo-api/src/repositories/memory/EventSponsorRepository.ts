import { createId } from '@paralleldrive/cuid2'
import type { IEventSponsorRepository } from '../../interfaces/repositories/IEventSponsorRepository.js'
import type { EventSponsor, EntityId } from '../../types/domain.js'

export class InMemoryEventSponsorRepository implements IEventSponsorRepository {
  private sponsors: Map<EntityId, EventSponsor> = new Map()

  constructor() {
    this._seed()
  }

  private _seed() {
    const now = new Date().toISOString()
    const seeds: EventSponsor[] = [
      // vendor-001 (2 linked)
      { id: 'sponsor-1', eventId: 'cuid2event00000000000003', vendorId: 'vendor-001', tier: 'premium', displayOrder: 1, createdAt: now },
      { id: 'sponsor-2', eventId: 'cuid2event00000000000004', vendorId: 'vendor-001', tier: 'standard', displayOrder: 2, createdAt: now },
      // vendor-002 (1 linked)
      { id: 'sponsor-3', eventId: 'cuid2event00000000000005', vendorId: 'vendor-002', tier: 'premium', displayOrder: 1, createdAt: now },
      // vendor-003 (3 linked)
      { id: 'sponsor-4', eventId: 'cuid2event00000000000006', vendorId: 'vendor-003', tier: 'supporter', displayOrder: 5, createdAt: now },
      { id: 'sponsor-5', eventId: 'cuid2event00000000000007', vendorId: 'vendor-003', tier: 'supporter', displayOrder: 3, createdAt: now },
      { id: 'sponsor-6', eventId: 'cuid2event00000000000008', vendorId: 'vendor-003', tier: 'supporter', displayOrder: 4, createdAt: now },
      // vendor-004 (0 linked)
    ]
    for (const s of seeds) {
      this.sponsors.set(s.id, s)
    }
  }

  async findByEvent(eventId: EntityId): Promise<EventSponsor[]> {
    return Array.from(this.sponsors.values())
      .filter(s => s.eventId === eventId)
      .sort((a, b) => a.displayOrder - b.displayOrder)
  }

  async countByVendor(vendorId: EntityId): Promise<number> {
    return Array.from(this.sponsors.values()).filter(s => s.vendorId === vendorId).length
  }

  async create(data: Omit<EventSponsor, 'id' | 'createdAt'>): Promise<EventSponsor> {
    const sponsor: EventSponsor = {
      ...data,
      id: createId(),
      createdAt: new Date().toISOString(),
    }
    this.sponsors.set(sponsor.id, sponsor)
    return sponsor
  }

  async update(eventId: EntityId, vendorId: EntityId, data: Partial<EventSponsor>): Promise<EventSponsor | null> {
    const sponsor = Array.from(this.sponsors.values()).find(s => s.eventId === eventId && s.vendorId === vendorId)
    if (!sponsor) return null
    const updated = { ...sponsor, ...data }
    this.sponsors.set(sponsor.id, updated)
    return updated
  }

  async delete(eventId: EntityId, vendorId: EntityId): Promise<boolean> {
    const sponsor = Array.from(this.sponsors.values()).find(s => s.eventId === eventId && s.vendorId === vendorId)
    if (!sponsor) return false
    return this.sponsors.delete(sponsor.id)
  }

  clear() {
    this.sponsors.clear()
  }
}
