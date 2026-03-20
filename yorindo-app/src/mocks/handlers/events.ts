import { http, HttpResponse, delay } from 'msw'
import { faker } from '@faker-js/faker'
import type { AudienceRecommendationsResponse, BlastPayload, Event, PaginatedResponse, RegistrationWithContact } from '@/types/api'
import { djb2 } from '@/lib/djb2'
import { usersStore, userEventAssignments } from './users'

const TIMEZONES: Event['timezone'][] = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura']

// In-memory mutable store — mutations persist within session
let deletedEventsStore: (Event & { deletedAt: string })[] = []

export let eventsStore: Event[] = [
  {
    id: 'event-001',
    name: 'Seminar ERP Jakarta',
    slug: 'seminar-erp-jakarta',
    description: 'Seminar tentang implementasi ERP di industri manufaktur dan distribusi.',
    status: 'published',
    eventDate: '2026-04-15T02:00:00.000Z',
    timezone: 'Asia/Jakarta',
    capacity: 200,
    bannerUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=675&fit=crop',
    industryTags: ['teknologi'],
    eventType: 'conference',
    topicTags: ['cloud', 'ai'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'event-002',
    name: 'Workshop AI untuk Bisnis',
    slug: 'workshop-ai-untuk-bisnis',
    description: 'Workshop praktis penggunaan AI dalam operasional bisnis.',
    status: 'draft',
    eventDate: '2026-05-01T02:00:00.000Z',
    timezone: 'Asia/Jakarta',
    capacity: 50,
    bannerUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&h=675&fit=crop',
    industryTags: ['kesehatan'],
    eventType: 'seminar',
    topicTags: ['medtech', 'diagnostics'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'event-003',
    name: 'Forum Kesehatan Digital Surabaya',
    slug: 'forum-kesehatan-digital-surabaya',
    description: 'Forum diskusi transformasi digital di sektor kesehatan.',
    status: 'active',
    eventDate: '2026-03-20T02:00:00.000Z',
    timezone: 'Asia/Jakarta',
    capacity: 150,
    bannerUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&h=675&fit=crop',
    industryTags: ['keuangan', 'teknologi'],
    eventType: 'workshop',
    topicTags: ['fintech'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'event-004',
    name: 'Konferensi Manufaktur 2025',
    slug: 'konferensi-manufaktur-2025',
    description: 'Konferensi tahunan industri manufaktur Indonesia.',
    status: 'completed',
    eventDate: '2025-11-10T02:00:00.000Z',
    timezone: 'Asia/Jakarta',
    capacity: 300,
    industryTags: ['retail'],
    eventType: 'networking',
    topicTags: ['ecommerce'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'event-005',
    name: 'Summit Properti Bali',
    slug: 'summit-properti-bali',
    description: 'Summit investasi properti dan real estate di Bali.',
    status: 'cancelled',
    eventDate: '2026-02-28T02:00:00.000Z',
    timezone: 'Asia/Makassar',
    capacity: 100,
    industryTags: ['manufaktur'],
    eventType: 'webinar',
    topicTags: ['industry40'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export const eventHandlers = [
  http.get('/api/events', async ({ request }) => {
    await delay(400)
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const deleted = url.searchParams.get('deleted') === 'true'
    const page = parseInt(url.searchParams.get('page') ?? '1', 10)
    const pageSize = parseInt(url.searchParams.get('pageSize') ?? '50', 10)

    if (deleted) {
      const total = deletedEventsStore.length
      const data = deletedEventsStore.slice((page - 1) * pageSize, page * pageSize)
      return HttpResponse.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } })
    }

    const filtered = status ? eventsStore.filter((e) => e.status === status) : eventsStore
    const total = filtered.length
    const data = filtered.slice((page - 1) * pageSize, page * pageSize)

    return HttpResponse.json({
      data,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  }),

  http.post('/api/events', async ({ request }) => {
    await delay(600)
    const body = await request.json() as Partial<Event>
    const newEvent: Event = {
      id: faker.string.uuid(),
      slug: faker.helpers.slugify((body.name ?? 'new-event').toLowerCase()),
      status: 'draft',
      description: '',
      timezone: faker.helpers.arrayElement(TIMEZONES),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...body,
    } as Event
    eventsStore.push(newEvent)
    return HttpResponse.json(newEvent, { status: 201 })
  }),

  http.get('/api/events/public/:slug', async ({ params }) => {
    await delay(200)
    const event = eventsStore.find((e) => e.slug === params.slug && e.status === 'published')
    if (!event) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Event not found', details: [] } },
        { status: 404 }
      )
    }
    return HttpResponse.json(event)
  }),

  http.get('/api/events/:id', async ({ params }) => {
    await delay(300)
    const event = eventsStore.find((e) => e.id === params.id)
    if (!event) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Event not found', details: [] } },
        { status: 404 }
      )
    }
    return HttpResponse.json(event)
  }),

  http.put('/api/events/:id', async ({ params, request }) => {
    await delay(600)
    const body = await request.json() as Partial<Event>
    const idx = eventsStore.findIndex((e) => e.id === params.id)
    if (idx === -1) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Event not found', details: [] } },
        { status: 404 }
      )
    }
    eventsStore[idx] = { ...eventsStore[idx], ...body, updatedAt: new Date().toISOString() }
    return HttpResponse.json(eventsStore[idx])
  }),

  http.delete('/api/events/:id', async ({ params }) => {
    await delay(400)
    const event = eventsStore.find((e) => e.id === params.id)
    if (event) {
      deletedEventsStore.push({ ...event, deletedAt: new Date().toISOString() })
      eventsStore = eventsStore.filter((e) => e.id !== params.id)
    }
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/events/:id/participants', async () => {
    await delay(500)
    const participants = Array.from({ length: 50 }, () => ({
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      phone: `+62${faker.string.numeric(10)}`,
      ticketToken: faker.string.alphanumeric(12).toUpperCase(),
      status: 'approved',
    }))
    return HttpResponse.json({ data: participants, total: participants.length })
  }),

  http.get('/api/events/:id/registrations', async ({ params, request }) => {
    await delay(400)
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') ?? '1', 10)
    const pageSize = parseInt(url.searchParams.get('pageSize') ?? '20', 10)
    const status = url.searchParams.get('status')
    const eventId = params.id as string
    const { registrationsStore } = await import('./registrations')

    let filtered = registrationsStore.filter((r) => r.eventId === eventId)
    if (status) filtered = filtered.filter((r) => r.status === status)

    const total = filtered.length
    const { contactsPool } = await import('./contacts')

    const enriched: RegistrationWithContact[] = filtered
      .slice((page - 1) * pageSize, page * pageSize)
      .map((reg) => {
        const contact = contactsPool.find((c) => c.id === reg.contactId) ?? contactsPool[0]
        return {
          ...reg,
          contactName: contact.name,
          contactEmail: contact.email,
          contactPhone: contact.phone,
          contactFlagCategory: contact.flagCategory,
          aiScore: djb2(contact.id + eventId),
        }
      })

    const response: PaginatedResponse<RegistrationWithContact> = {
      data: enriched,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    }
    return HttpResponse.json(response)
  }),

  http.get('/api/events/:id/analytics', async () => {
    await delay(600)
    return HttpResponse.json({
      funnelData: [
        { stage: 'Invited', count: 500 },
        { stage: 'Registered', count: 200 },
        { stage: 'Approved', count: 180 },
        { stage: 'Attended', count: 142 },
      ],
      industryBreakdown: [
        { industry: 'teknologi', count: 45 },
        { industry: 'kesehatan', count: 30 },
        { industry: 'manufaktur', count: 25 },
      ],
      cityBreakdown: [
        { city: 'Jakarta', count: 80 },
        { city: 'Surabaya', count: 35 },
        { city: 'Bandung', count: 27 },
      ],
      registrationTimeSeries: Array.from({ length: 14 }, (_, i) => ({
        date: new Date(Date.now() - (13 - i) * 86400000).toISOString().split('T')[0],
        count: faker.number.int({ min: 5, max: 25 }),
      })),
    })
  }),

  http.get('/api/events/:id/attendance-stats', async () => {
    await delay(200)
    return HttpResponse.json({ total: 180, attended: 142, pending: 38 })
  }),

  http.get('/api/events/:id/survey', async () => {
    await delay(300)
    return HttpResponse.json({
      fields: [
        { id: 'q1', type: 'text', label: 'Apa jabatan Anda?', required: true },
        { id: 'q2', type: 'select', label: 'Industri perusahaan Anda?', options: ['Teknologi', 'Kesehatan', 'Manufaktur'], required: true },
      ],
    })
  }),

  http.put('/api/events/:id/survey', async ({ params }) => {
    await delay(400)
    const event = eventsStore.find((e) => e.id === params.id)
    if (!event) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Event not found', details: [] } },
        { status: 404 }
      )
    }
    return HttpResponse.json(event)
  }),

  http.post('/api/events/:id/blast', async ({ request }) => {
    await delay(400)
    const body = await request.json() as BlastPayload
    const recipientCount = body.contactIds?.length ?? 50
    const jobId = crypto.randomUUID()
    if (body.scheduledAt) {
      return HttpResponse.json({ jobId, status: 'scheduled', scheduledAt: body.scheduledAt, recipientCount }, { status: 202 })
    }
    return HttpResponse.json({ jobId, status: 'queued', recipientCount }, { status: 202 })
  }),

  http.post('/api/events/:id/clone', async ({ params }) => {
    await delay(700)
    const source = eventsStore.find((e) => e.id === params.id)
    if (!source) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Event not found', details: [] } },
        { status: 404 }
      )
    }
    const cloned: Event = {
      ...source,
      id: faker.string.uuid(),
      name: `${source.name} (Salinan)`,
      slug: `${source.slug}-copy-${faker.string.alphanumeric(4).toLowerCase()}`,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    eventsStore.push(cloned)
    return HttpResponse.json(cloned, { status: 201 })
  }),

  http.post('/api/events/:id/restore', async ({ params }) => {
    await delay(400)
    const deletedIdx = deletedEventsStore.findIndex((e) => e.id === params.id)
    if (deletedIdx === -1) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Event not found in deleted items', details: [] } },
        { status: 404 }
      )
    }
    const { deletedAt: _del, ...restored } = deletedEventsStore[deletedIdx]
    deletedEventsStore = deletedEventsStore.filter((e) => e.id !== params.id)
    eventsStore.push({ ...restored, updatedAt: new Date().toISOString() })
    return HttpResponse.json(restored)
  }),

  http.get('/api/events/:id/attendance', async () => {
    await delay(200)
    return HttpResponse.json({
      total: 180,
      attended: faker.number.int({ min: 60, max: 160 }),
      pending: faker.number.int({ min: 20, max: 60 }),
    })
  }),

  http.get('/api/events/:id/audience-recommendations', async ({ params }) => {
    await delay(600)
    const { contactsPool } = await import('./contacts')
    const eventId = params.id as string
    const event = eventsStore.find((e) => e.id === eventId)

    const excludedReasons: Record<string, number> = {}
    const eligible = contactsPool.filter((contact) => {
      if (contact.flagCategory === 'not-potential' || contact.flagCategory === 'spam') {
        const key = contact.flagCategory
        excludedReasons[key] = (excludedReasons[key] ?? 0) + 1
        return false
      }
      return true
    })

    const totalExcluded = contactsPool.length - eligible.length

    const recommendations = eligible
      .map((contact) => {
        const score = djb2(contact.id + eventId)
        const factors: string[] = []
        if (event?.industryTags?.[0] && contact.industryId === event.industryTags[0]) {
          factors.push(`industry:${contact.industryId}`)
        }
        if (contact.city === 'Jakarta') factors.push('location:jakarta')
        if (contact.completenessScore > 0.7) factors.push('completeness:high')
        return {
          contactId: contact.id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          industryId: contact.industryId,
          city: contact.city,
          companySize: contact.companySize,
          score,
          factors,
          reliabilityRate: (score % 10) / 10,
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)

    const response: AudienceRecommendationsResponse = {
      recommendations,
      totalMatched: eligible.length,
      totalExcluded,
      excludedReasons,
    }
    return HttpResponse.json(response)
  }),

  http.post('/api/events/:id/audience-preview', async ({ request }) => {
    await delay(400)
    const body = await request.json() as Record<string, unknown>
    let count = 247
    if (body.industry) count = Math.floor(count * 0.3)
    if (body.city) count = Math.floor(count * 0.4)
    if (body.companySize) count = Math.floor(count * 0.5)
    return HttpResponse.json({ count })
  }),

  http.post('/api/events/:id/blast/emergency', async () => {
    await delay(500)
    return HttpResponse.json({ jobId: `blast:emergency:${faker.number.int()}`, status: 'queued', recipientCount: 142 }, { status: 202 })
  }),

  http.get('/api/users/me/assigned-events', async ({ request }) => {
    await delay(300)
    const auth = request.headers.get('Authorization') ?? ''
    const token = auth.replace('Bearer ', '')
    let userId: string
    if (token === 'dev-token') {
      userId = request.headers.get('X-User-Id') ?? 'dev-admin'
    } else {
      const roleFromToken = token.replace('mock-token-', '') as 'admin' | 'staff' | 'viewer'
      userId = usersStore.find((u) => u.role === roleFromToken)?.id ?? 'user-001'
    }
    const devToReal: Record<string, string> = { 'dev-admin': 'user-001', 'dev-staff': 'user-002', 'dev-viewer': 'user-003' }
    const lookupId = devToReal[userId] ?? userId
    const assignedEventIds = Array.from(userEventAssignments.get(lookupId) ?? [])
    return HttpResponse.json(eventsStore.filter((e) => assignedEventIds.includes(e.id)))
  }),

  http.get('/api/events/:id/report/download', async ({ request }) => {
    await delay(1000)
    const url = new URL(request.url)
    const format = url.searchParams.get('format') ?? 'xlsx'
    // Return a minimal blob-compatible response
    return new HttpResponse('Mocked report content', {
      status: 200,
      headers: {
        'Content-Type': format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="report.${format}"`,
      },
    })
  }),
]
