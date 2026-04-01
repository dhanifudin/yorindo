import type { EventSponsor, EntityId } from '../../types/domain.js'

export interface IEventSponsorRepository {
  findByEvent(eventId: EntityId): Promise<EventSponsor[]>
  countByVendor(vendorId: EntityId): Promise<number>
  create(data: Omit<EventSponsor, 'id' | 'createdAt'>): Promise<EventSponsor>
  update(eventId: EntityId, vendorId: EntityId, data: Partial<EventSponsor>): Promise<EventSponsor | null>
  delete(eventId: EntityId, vendorId: EntityId): Promise<boolean>
}
