import type { Event, EventOverviewMetrics, UpcomingUncontactedResult, EventStatus, UUID } from '../../types/domain.js'
import type { PaginationParams } from './IContactRepository.js'

export interface EventFilters {
  status?: EventStatus
  city?: string
  search?: string
}

export interface IEventRepository {
  findAll(params: PaginationParams, filters?: EventFilters): Promise<{ data: Event[]; total: number }>
  findById(id: UUID): Promise<Event | null>
  findBySlug(slug: string): Promise<Event | null>
  create(data: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event>
  update(id: UUID, data: Partial<Event>): Promise<Event | null>
  softDelete(id: UUID): Promise<void>
  restore(id: UUID): Promise<void>
  getOverviewMetrics(eventId: UUID): Promise<EventOverviewMetrics>
  getUpcomingUncontacted(): Promise<UpcomingUncontactedResult | null>
}
