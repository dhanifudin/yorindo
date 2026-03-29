import type { Event, EventOverviewMetrics, UpcomingUncontactedResult, EventStatus, EntityId } from '../../types/domain.js'
import type { PaginationParams } from './IContactRepository.js'

export interface EventFilters {
  ids?: EntityId[]
  status?: EventStatus
  city?: string
  search?: string
}

export interface IEventRepository {
  findAll(params: PaginationParams, filters?: EventFilters): Promise<{ data: Event[]; total: number }>
  findById(id: EntityId): Promise<Event | null>
  findBySlug(slug: string): Promise<Event | null>
  create(data: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event>
  update(id: EntityId, data: Partial<Event>): Promise<Event | null>
  softDelete(id: EntityId): Promise<void>
  restore(id: EntityId): Promise<void>
  getOverviewMetrics(eventId: EntityId): Promise<EventOverviewMetrics>
  getUpcomingUncontacted(): Promise<UpcomingUncontactedResult | null>
}
