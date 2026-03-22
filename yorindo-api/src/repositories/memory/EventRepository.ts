import { faker } from '@faker-js/faker'
import type { IEventRepository, EventFilters } from '../../interfaces/repositories/IEventRepository.js'
import type { PaginationParams } from '../../interfaces/repositories/IContactRepository.js'
import type { Event, EventOverviewMetrics, UpcomingUncontactedResult, EventStatus } from '../../types/domain.js'

faker.seed(42)

const STATUSES: EventStatus[] = ['draft', 'published', 'active', 'completed', 'cancelled']

export class InMemoryEventRepository implements IEventRepository {
  private events: Map<string, Event> = new Map()

  constructor() {
    this._seed()
  }

  private _seed(): void {
    for (let i = 0; i < 5; i++) {
      const id = crypto.randomUUID()
      const status = STATUSES[i % STATUSES.length]
      const isPast = status === 'completed' || status === 'cancelled'
      const event: Event = {
        id,
        name: `Event ${faker.company.name()} ${2026 + i}`,
        slug: `event-${id.slice(0, 8)}`,
        date: isPast
          ? new Date(Date.now() - (i + 1) * 30 * 86400000).toISOString()
          : new Date(Date.now() + (i + 1) * 30 * 86400000).toISOString(),
        timezone: 'Asia/Jakarta',
        city: ['Jakarta', 'Bandung', 'Surabaya'][i % 3],
        venue: faker.location.streetAddress(),
        description: faker.lorem.paragraph(),
        capacity: (i + 1) * 50,
        waitlistBuffer: 10,
        approvalMode: 'manual',
        notificationChannel: 'email',
        scanFormat: 'qr',
        targetCriteria: { industries: ['teknologi'], cities: ['Jakarta'] },
        surveySchemaId: null,
        vendorId: null,
        status,
        deletedAt: null,
        createdAt: new Date(Date.now() - i * 86400000 * 10).toISOString(),
        updatedAt: new Date().toISOString(),
      }
      this.events.set(id, event)
    }
  }

  async findAll(params: PaginationParams, filters?: EventFilters): Promise<{ data: Event[]; total: number }> {
    let data = Array.from(this.events.values()).filter(e => e.deletedAt === null)

    if (filters?.status) data = data.filter(e => e.status === filters.status)
    if (filters?.city) data = data.filter(e => e.city === filters.city)
    if (filters?.search) {
      const q = filters.search.toLowerCase()
      data = data.filter(e => e.name.toLowerCase().includes(q))
    }

    const total = data.length
    const start = (params.page - 1) * params.pageSize
    return { data: data.slice(start, start + params.pageSize), total }
  }

  async findById(id: string): Promise<Event | null> {
    return this.events.get(id) ?? null
  }

  async findBySlug(slug: string): Promise<Event | null> {
    return Array.from(this.events.values()).find(e => e.slug === slug) ?? null
  }

  async create(data: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event> {
    const event: Event = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.events.set(event.id, event)
    return event
  }

  async update(id: string, data: Partial<Event>): Promise<Event | null> {
    const existing = this.events.get(id)
    if (!existing) return null
    const updated: Event = { ...existing, ...data, id, updatedAt: new Date().toISOString() }
    this.events.set(id, updated)
    return updated
  }

  async softDelete(id: string): Promise<void> {
    const existing = this.events.get(id)
    if (existing) {
      this.events.set(id, { ...existing, deletedAt: new Date().toISOString() })
    }
  }

  async restore(id: string): Promise<void> {
    const existing = this.events.get(id)
    if (existing) {
      this.events.set(id, { ...existing, deletedAt: null })
    }
  }

  async getOverviewMetrics(eventId: string): Promise<EventOverviewMetrics> {
    const event = this.events.get(eventId)
    const capacity = event?.capacity ?? 100
    return {
      invited: capacity * 3,
      registered: capacity,
      approved: Math.floor(capacity * 0.8),
      attended: Math.floor(capacity * 0.6),
      conversionRate: 0.6,
    }
  }

  async getUpcomingUncontacted(): Promise<UpcomingUncontactedResult | null> {
    const upcoming = Array.from(this.events.values()).find(
      e => e.status === 'published' && new Date(e.date) > new Date()
    )
    if (!upcoming) return null
    const daysTill = Math.floor((new Date(upcoming.date).getTime() - Date.now()) / 86400000)
    return { eventId: upcoming.id, eventName: upcoming.name, daysTillEvent: daysTill, uncontactedCount: 42 }
  }
}
