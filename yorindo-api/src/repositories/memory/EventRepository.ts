import { faker } from '@faker-js/faker'
import { createId } from '@paralleldrive/cuid2'
import type { IEventRepository, EventFilters } from '../../interfaces/repositories/IEventRepository.js'
import type { PaginationParams } from '../../interfaces/repositories/IContactRepository.js'
import type { Event, EventOverviewMetrics, UpcomingUncontactedResult, EventStatus } from '../../types/domain.js'
import { SEED_EVENT_IDS, SEED_VENDOR_IDS, INDONESIAN_INDUSTRIES } from './_seeds.js'

faker.seed(42)

const EVENT_NAMES = [
  'Tech Summit Jakarta 2026',
  'Workshop Digital Marketing B2B',
  'Konferensi Kesehatan Nasional',
  'Seminar Keuangan & Investasi',
  'Forum Manufaktur Indonesia',
  'Bootcamp Data Science',
  'Expo Pendidikan Tinggi',
  'Gathering Pengusaha Muda',
  'Webinar Transformasi Digital',
  'Pameran Properti Jakarta',
  'Summit Retail & E-Commerce',
  'Konferensi HR & Talent 2026',
] as const

const CITIES = ['Jakarta', 'Bandung', 'Surabaya', 'Yogyakarta', 'Medan', 'Semarang'] as const

const STATUSES: EventStatus[] = [
  'draft', 'draft',
  'completed', 'published',
  'active', 'active',
  'published', 'completed',
  'cancelled', 'cancelled',
  'archived', 'archived',
]

// Survey schema IDs for the first 3 events (opaque seeded strings)
export const SURVEY_SCHEMA_IDS = [
  '507f1f77bcf86cd799439011',
  '507f1f77bcf86cd799439012',
  '507f1f77bcf86cd799439013',
]

export class InMemoryEventRepository implements IEventRepository {
  private events: Map<string, Event> = new Map()

  constructor() {
    this._seed()
  }

  private _seed(): void {
    const now = Date.now()

    for (let i = 0; i < 12; i++) {
      const id = SEED_EVENT_IDS[i]!
      const status = STATUSES[i]!
      const isPast = status === 'completed' || status === 'cancelled' || status === 'archived'
      const isActive = status === 'active'

      const eventDate = isPast
        ? new Date(now - (i + 1) * 20 * 86400000).toISOString()
        : isActive
          ? new Date(now + 7 * 86400000).toISOString()
          : new Date(now + (i + 1) * 25 * 86400000).toISOString()

      const event: Event = {
        id,
        name: EVENT_NAMES[i]!,
        slug: EVENT_NAMES[i]!.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        startDate: eventDate,
        startTime: '09:00',
        endDate: eventDate,
        endTime: '17:00',
        timezone: i % 3 === 0 ? 'Asia/Makassar' : i % 3 === 1 ? 'Asia/Jayapura' : 'Asia/Jakarta',
        city: CITIES[i % CITIES.length]!,
        venue: faker.address.streetAddress() + ', ' + CITIES[i % CITIES.length],
        description: faker.lorem.paragraph(),
        bannerUrl: i % 3 === 0 ? `https://images.unsplash.com/photo-${1540575467063 + i}-w1200-h675-fit=crop` : null,
        capacity: [50, 100, 150, 200, 250, 300, 75, 120, 80, 400, 60, 500][i]!,
        waitlistBuffer: 10,
        approvalMode: i % 3 === 0 ? 'auto' : i % 3 === 1 ? 'hybrid' : 'manual',
        notificationChannel: i % 2 === 0 ? 'email' : 'whatsapp',
        scanFormat: 'qr',
        targetCriteria: {
          serviceTypes: [INDONESIAN_INDUSTRIES[i % INDONESIAN_INDUSTRIES.length]!.name],
          cities: [CITIES[i % CITIES.length]!],
        },
        surveySchemaId: i < 3 ? SURVEY_SCHEMA_IDS[i]! : null,
        vendorId: i < 3 ? SEED_VENDOR_IDS[i]! : null,
        status,
        isPaid: i % 2 === 0,
        price: i % 2 === 0 ? 500000 : null,
        paymentMethod: i % 2 === 0 ? 'bank_transfer' : null,
        topicTags: i % 2 === 0 ? ['ai', 'digital'] : null,
        deletedAt: null,
        createdAt: new Date(now - (12 - i) * 10 * 86400000).toISOString(),
        updatedAt: new Date(now - i * 86400000).toISOString(),
      }
      this.events.set(id, event)
    }
  }

  async findAll(params: PaginationParams, filters?: EventFilters): Promise<{ data: Event[]; total: number }> {
    let data = Array.from(this.events.values())

    if (filters?.deleted === 'only') {
      data = data.filter((event) => event.deletedAt !== null)
    } else {
      data = data.filter((event) => event.deletedAt === null)
    }

    if (filters?.ids?.length) data = data.filter(e => filters.ids!.includes(e.id))
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
      id: createId(),
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
      otsCount: Math.floor(capacity * 0.15),
      conversionRate: 0.6,
    }
  }

  async getUpcomingUncontacted(): Promise<UpcomingUncontactedResult | null> {
    const upcoming = Array.from(this.events.values())
      .filter((event) => {
        if (!['published', 'active'].includes(event.status)) return false
        const daysTill = Math.floor((new Date(event.startDate).getTime() - Date.now()) / 86400000)
        return daysTill >= 0 && daysTill <= 14
      })
      .sort((left, right) => new Date(left.startDate).getTime() - new Date(right.startDate).getTime())[0]
    if (!upcoming) return null
    const daysTill = Math.floor((new Date(upcoming.startDate).getTime() - Date.now()) / 86400000)
    return { eventId: upcoming.id, eventName: upcoming.name, daysTillEvent: daysTill, uncontactedCount: 42 }
  }
}
