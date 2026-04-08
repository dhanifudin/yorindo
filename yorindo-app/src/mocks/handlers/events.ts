import { http, HttpResponse, delay } from 'msw'
import { faker } from '@faker-js/faker'
import type { AudienceRecommendationsResponse, AttachSponsorBody, BlastPayload, Event, EventSponsor, PaginatedResponse, RegistrationWithContact } from '@/types/api'
import { djb2 } from '@/lib/djb2'
import { usersStore, userEventAssignments, MOCK_USER_IDS } from './users'
import { makeMockCuid2 } from './id'

// In-memory mutable store — mutations persist within session
let deletedEventsStore: (Event & { deletedAt: string })[] = []

// ─── Event In-Memory Store ───────────────────────────────────────────────────

export const eventSponsorsStore = new Map<string, EventSponsor[]>([
  ['event-001', [
    { id: 'es-001-1', event_id: 'event-001', vendor_id: 'vendor-001', vendor_name: 'Alibaba Cloud', tier: 'premium', display_order: 0 },
    { id: 'es-001-2', event_id: 'event-001', vendor_id: 'vendor-003', vendor_name: 'PT Mandiri Sekuritas', tier: 'standard', display_order: 1 },
  ]],
])

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
    venue: 'Jakarta Convention Center, Hall A',
    industryTags: ['teknologi'],
    eventType: 'conference',
    topicTags: ['cloud', 'ai'],
    is_paid: false,
    price: 0,
    payment_method: null,
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
    venue: 'The Westin Jakarta, Ballroom',
    industryTags: ['kesehatan'],
    eventType: 'seminar',
    topicTags: ['medtech', 'diagnostics'],
    is_paid: false,
    price: 0,
    payment_method: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'event-003',
    name: 'Forum Kesehatan Digital Surabaya',
    slug: 'forum-kesehatan-digital-surabaya',
    description: 'Forum diskusi transformasi digital di sektor kesehatan Indonesia.',
    status: 'active',
    eventDate: '2026-03-22T02:00:00.000Z',
    timezone: 'Asia/Jakarta',
    capacity: 80,
    bannerUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&h=675&fit=crop',
    venue: 'Grand City Convention & Exhibition, Surabaya',
    industryTags: ['kesehatan'],
    eventType: 'conference',
    topicTags: ['medtech', 'digitalisasi'],
    is_paid: false,
    price: 0,
    payment_method: null,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
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
    venue: 'Balai Kartini, Jakarta',
    industryTags: ['retail'],
    eventType: 'networking',
    topicTags: ['ecommerce'],
    is_paid: false,
    price: 0,
    payment_method: null,
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
    venue: 'Bali International Convention Centre, Nusa Dua',
    industryTags: ['properti'],
    eventType: 'conference',
    topicTags: ['realestate', 'investasi'],
    is_paid: false,
    price: 0,
    payment_method: null,
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'event-006',
    name: 'Networking Fintech Indonesia 2026',
    slug: 'networking-fintech-indonesia-2026',
    description: 'Pertemuan pelaku industri fintech, perbankan digital, dan investor untuk mendorong ekosistem keuangan digital Indonesia.',
    status: 'active',
    eventDate: '2026-03-22T07:00:00.000Z',
    timezone: 'Asia/Jakarta',
    capacity: 120,
    bannerUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=675&fit=crop',
    venue: 'The Ritz-Carlton Jakarta, Pacific Place',
    industryTags: ['keuangan', 'teknologi'],
    eventType: 'networking',
    topicTags: ['fintech', 'banking', 'investasi'],
    is_paid: false,
    price: 0,
    payment_method: null,
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'e44rnx7cg7cstacu725iolms',
    name: 'Konferensi Kesehatan Digital 2026',
    slug: 'konferensi-kesehatan-digital-2026',
    description: 'Konferensi transformasi digital sektor kesehatan: AI, telemedicine, dan manajemen data rumah sakit.',
    status: 'active',
    eventDate: '2026-04-20T02:00:00.000Z',
    timezone: 'Asia/Jakarta',
    capacity: 500,
    bannerUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&h=675&fit=crop',
    venue: 'Jakarta Convention Center, Assembly Hall',
    industryTags: ['kesehatan', 'teknologi'],
    eventType: 'conference',
    topicTags: ['medtech', 'ai', 'telemedicine'],
    is_paid: false,
    price: 0,
    payment_method: null,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export const eventHandlers = [
  http.get('/api/events/upcoming-uncontacted', async () => {
    await delay(300)
    return HttpResponse.json({
      event: {
        id: 'event-upcoming-001',
        name: 'Konferensi Teknologi 2026',
        eventDate: '2026-03-28T02:00:00.000Z',
        industryTags: ['teknologi'],
      },
      daysUntil: 8,
      uncontactedCount: 45,
    })
  }),

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
      id: makeMockCuid2(),
      slug: faker.helpers.slugify((body.name ?? 'new-event').toLowerCase()),
      status: 'draft',
      description: '',
      is_paid: false,
      price: 0,
      payment_method: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...body,
    } as Event
    eventsStore.push(newEvent)
    return HttpResponse.json(newEvent, { status: 201 })
  }),

  http.get('/api/events/public/:slug', async ({ params }) => {
    await delay(200)
    const event = eventsStore.find((e) => e.slug === params.slug && (e.status === 'published' || e.status === 'active'))
    if (!event) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Event not found', details: [] } },
        { status: 404 }
      )
    }
    const sponsors = (eventSponsorsStore.get(event.id) ?? [])
      .map((s) => ({
        vendor_id: s.vendor_id,
        name: s.vendor_name,
        tier: s.tier,
        logo_url: undefined,
        website: undefined,
        display_order: s.display_order,
      }))
      .sort((a, b) => a.display_order - b.display_order)
    return HttpResponse.json({ ...event, sponsors })
  }),

  http.get('/api/events/:id/overview', async ({ params }) => {
    await delay(300)
    const event = eventsStore.find((e) => e.id === params.id)
    if (!event) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Event not found', details: [] } },
        { status: 404 }
      )
    }
    const capacity = event.capacity ?? 200
    const blastCount = 2000
    const registrationCount = Math.floor(blastCount * 0.2)
    const approvedCount = Math.floor(registrationCount * 0.75)
    const attendedCount = event.status === 'completed' ? Math.floor(approvedCount * 0.85) : 0
    return HttpResponse.json({
      blastCount,
      registrationCount,
      approvedCount,
      attendedCount,
      lastBlastAt: '2026-04-01T09:00:00Z',
      pendingApprovals: registrationCount - approvedCount,
      seatsRemaining: Math.max(capacity - approvedCount, 0),
      daysUntilEvent: Math.ceil((new Date(event.eventDate).getTime() - Date.now()) / 86400000),
    })
  }),

  // ── Sponsor sub-resource — must be before GET /api/events/:id wildcard ──
  http.get('/api/events/:id/sponsors', async ({ params }) => {
    await delay(300)
    const sponsors = eventSponsorsStore.get(params.id as string) ?? []
    return HttpResponse.json(sponsors)
  }),

  http.post('/api/events/:id/sponsors', async ({ params, request }) => {
    await delay(400)
    const body = await request.json() as AttachSponsorBody
    const eventId = params.id as string
    const { vendorsStore } = await import('./vendors')
    const vendor = vendorsStore.find((v) => v.id === body.vendorId)
    if (!vendor) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Vendor not found', details: [] } },
        { status: 404 }
      )
    }
    const existing = eventSponsorsStore.get(eventId) ?? []
    if (existing.some((s) => s.vendor_id === body.vendorId)) {
      return HttpResponse.json(
        { error: { code: 'DUPLICATE', message: 'Vendor already attached to this event', details: [] } },
        { status: 409 }
      )
    }
    const newSponsor: EventSponsor = {
      id: makeMockCuid2(),
      event_id: eventId,
      vendor_id: body.vendorId,
      vendor_name: vendor.name,
      tier: body.tier ?? 'standard',
      display_order: body.displayOrder ?? existing.length,
    }
    eventSponsorsStore.set(eventId, [...existing, newSponsor])
    return HttpResponse.json(newSponsor, { status: 201 })
  }),

  http.patch('/api/events/:id/sponsors/:vendorId', async ({ params, request }) => {
    await delay(300)
    const body = await request.json() as Partial<Pick<EventSponsor, 'display_order'>>
    const eventId = params.id as string
    const vendorId = params.vendorId as string
    const sponsors = eventSponsorsStore.get(eventId) ?? []
    const idx = sponsors.findIndex((s) => s.vendor_id === vendorId)
    if (idx === -1) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Sponsor not found', details: [] } },
        { status: 404 }
      )
    }
    sponsors[idx] = { ...sponsors[idx], ...body }
    eventSponsorsStore.set(eventId, sponsors)
    return HttpResponse.json(sponsors[idx])
  }),

  http.delete('/api/events/:id/sponsors/:vendorId', async ({ params }) => {
    await delay(300)
    const eventId = params.id as string
    const vendorId = params.vendorId as string
    const sponsors = eventSponsorsStore.get(eventId) ?? []
    const updated = sponsors.filter((s) => s.vendor_id !== vendorId)
    eventSponsorsStore.set(eventId, updated)
    return new HttpResponse(null, { status: 204 })
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
    const { registrationsStore } = await import('./registrations')
    const registeredCount = registrationsStore.filter(
      (r) => r.eventId === params.id && ['approved', 'confirmed', 'attended'].includes(r.status)
    ).length

    return HttpResponse.json({ ...event, registeredCount })
  }),

  http.patch('/api/events/:id', async ({ params, request }) => {
    await delay(500)
    const body = await request.json() as Partial<Event>
    const id = params.id as string
    const idx = eventsStore.findIndex((e) => e.id === id)
    if (idx === -1) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Event tidak ditemukan', details: [] } },
        { status: 404 }
      )
    }

    const currentEvent = eventsStore[idx]
    
    // Status transition guards (Story 4.2)
    if (body.status && body.status !== currentEvent.status) {
      const from = currentEvent.status
      const to = body.status
      const isValid = (
        (from === 'draft' && (to === 'published' || to === 'cancelled')) ||
        (from === 'published' && (to === 'active' || to === 'cancelled')) ||
        (from === 'active' && (to === 'completed' || to === 'cancelled')) ||
        (from === 'completed' && to === 'archived') ||
        (from === 'cancelled' && to === 'archived')
      )

      if (!isValid) {
        return HttpResponse.json(
          { 
            error: { 
              code: 'INVALID_TRANSITION', 
              message: `Transisi status tidak valid dari "${from}" ke "${to}"`, 
              details: [] 
            } 
          },
          { status: 422 }
        )
      }

      // Additional guard for 'completed'
      if (to === 'completed') {
        const eventDate = new Date(currentEvent.eventDate)
        if (eventDate > new Date()) {
          return HttpResponse.json(
            { 
              error: { 
                code: 'PREMATURE_COMPLETION', 
                message: 'Event hanya dapat diselesaikan setelah tanggal event berlalu', 
                details: [] 
              } 
            },
            { status: 422 }
          )
        }
      }
    }

    eventsStore[idx] = { 
      ...currentEvent, 
      ...body, 
      updatedAt: new Date().toISOString() 
    }
    return HttpResponse.json(eventsStore[idx])
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

  http.get('/api/events/:id/checkin/stats', async ({ params }) => {
    await delay(300)
    const { registrationsStore } = await import('./registrations')
    const eventId = params.id as string
    const eventRegs = registrationsStore.filter((r) => r.eventId === eventId)
    const approved = eventRegs.filter((r) => r.status === 'approved').length
    const attended = eventRegs.filter((r) => r.status === 'attended').length
    const total = eventRegs.filter((r) => ['approved', 'attended', 'confirmed'].includes(r.status)).length
    return HttpResponse.json({ approved, attended, total })
  }),

  http.get('/api/events/:id/participants', async () => {
    await delay(500)
    const participants = Array.from({ length: 50 }, () => ({
      id: makeMockCuid2(),
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


  http.post('/api/events/:id/blast', async ({ request }) => {
    await delay(400)
    const body = await request.json() as BlastPayload
    const recipientCount = body.contactIds?.length ?? 50
    const jobId = makeMockCuid2()
    if (body.scheduledAt) {
      return HttpResponse.json({ jobId, status: 'scheduled', scheduledAt: body.scheduledAt, recipientCount }, { status: 202 })
    }
    return HttpResponse.json({ jobId, status: 'queued', recipientCount }, { status: 202 })
  }),

  http.post('/api/events/:id/clone', async ({ params }) => {
    await delay(700)
    const sourceId = params.id as string
    const source = eventsStore.find((e) => e.id === sourceId)
    if (!source) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Event not found', details: [] } },
        { status: 404 }
      )
    }
    const newId = makeMockCuid2()
    const cloned: Event = {
      ...source,
      id: newId,
      name: `${source.name} (Salinan)`,
      slug: `${source.slug}-copy-${faker.string.alphanumeric(4).toLowerCase()}`,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    eventsStore.push(cloned)

    // Deep clone: Sponsors
    const sponsors = eventSponsorsStore.get(sourceId)
    if (sponsors) {
      eventSponsorsStore.set(newId, sponsors.map(s => ({ 
        ...s, 
        id: makeMockCuid2(), 
        event_id: newId 
      })))
    }

    // Deep clone: Survey
    if (source.registrationSurveySchema) {
      cloned.registrationSurveySchema = JSON.parse(JSON.stringify(source.registrationSurveySchema))
    }
    if (source.postSurveySchema) {
      cloned.postSurveySchema = JSON.parse(JSON.stringify(source.postSurveySchema))
    }

    return HttpResponse.json(cloned, { status: 201 })
  }),

  http.patch('/api/events/:id/restore', async ({ params }) => {
    await delay(400)
    const deletedIdx = deletedEventsStore.findIndex((e) => e.id === params.id)
    if (deletedIdx === -1) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Event not found in deleted items', details: [] } },
        { status: 404 }
      )
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      if (contact.flagCategory === 'invalid-data' || contact.flagCategory === 'duplicate') {
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
        if (event?.industryTags?.[0] && contact.serviceType === event.industryTags[0]) {
          factors.push(`serviceType:${contact.serviceType}`)
        }
        if (contact.city === 'Jakarta') factors.push('location:jakarta')
        if (contact.completenessScore > 0.7) factors.push('completeness:high')
        return {
          contactId: contact.id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          serviceType: contact.serviceType,
          city: contact.city,
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
    if (body.serviceType) count = Math.floor(count * 0.3)
    if (body.city) count = Math.floor(count * 0.4)
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
      userId = request.headers.get('X-User-Id') ?? MOCK_USER_IDS.devAdmin
    } else {
      const roleFromToken = token.replace('mock-token-', '') as 'admin' | 'staff' | 'viewer'
      userId = usersStore.find((u) => u.role === roleFromToken)?.id ?? MOCK_USER_IDS.admin
    }
    const devToReal: Record<string, string> = {
      [MOCK_USER_IDS.devAdmin]: MOCK_USER_IDS.admin,
      [MOCK_USER_IDS.devStaff]: MOCK_USER_IDS.staff,
      [MOCK_USER_IDS.devViewer]: MOCK_USER_IDS.viewer,
    }
    const lookupId = devToReal[userId] ?? userId
    const assignedEventIds = Array.from(userEventAssignments.get(lookupId) ?? [])
    return HttpResponse.json(eventsStore.filter((e) => assignedEventIds.includes(e.id)))
  }),

  // GET /api/events/:id/confirmation — Story 4.11
  http.get('/api/events/:id/confirmation', async () => {
    await delay(400)
    return HttpResponse.json({
      stats: { ticketSent: 180, pendingConfirmation: 45, waitlisted: 20 },
      registrations: Array.from({ length: 30 }, (_, i) => ({
        id: `reg-conf-${i}`,
        contact: { name: `Peserta ${i + 1}`, company: `PT Maju ${i + 1}` },
        channel: i % 2 === 0 ? 'whatsapp' : 'email',
        ticketSentAt: i < 20 ? '2026-04-01T10:00:00Z' : null,
        confirmationStatus: i < 15 ? 'confirmed' : i < 25 ? 'pending' : 'waitlisted',
      })),
    })
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
