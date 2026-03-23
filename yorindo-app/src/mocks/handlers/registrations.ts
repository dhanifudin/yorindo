import { http, HttpResponse, delay } from 'msw'
import { faker } from '@faker-js/faker'
import type { Registration, RegistrationWithContact, PaginatedResponse } from '@/types/api'
import { contactsPool } from './contacts'
import { djb2 } from '@/lib/djb2'

type StoredRegistration = Registration & { flagOverride: boolean }

// Distribute registrations across events for realistic mock data
// event-001: published (upcoming, Apr 2026) — pending/approved/waitlist mix, not near capacity
// event-003: active today (Mar 22 2026) — heavy attended, near capacity (80), check-in ongoing
// event-004: completed (Nov 2025) — all attended/cancelled/rejected; no pending/approved survivors
// event-005: cancelled (Feb 2026) — small number of cancelled/rejected registrations
// event-006: active today — mix of attended/approved/pending, near capacity (120)
// event-002 (draft) intentionally has NO registrations — drafts are not open for registration

type EventRegistrationConfig = {
  eventId: string
  count: number
  statusWeights: Registration['status'][]
  /** Unix ms of event date — used to anchor attendedAt for past events */
  eventDateMs: number
}

const EVENT_CONFIGS: EventRegistrationConfig[] = [
  {
    eventId: 'event-001',
    count: 35,
    statusWeights: ['pending', 'pending', 'approved', 'approved', 'approved', 'rejected', 'confirmed', 'confirmed', 'waitlisted', 'cancelled'],
    eventDateMs: new Date('2026-04-15T02:00:00Z').getTime(),
  },
  {
    eventId: 'event-003',
    count: 75,
    statusWeights: ['attended', 'attended', 'attended', 'attended', 'approved', 'approved', 'pending', 'rejected', 'waitlisted', 'confirmed'],
    eventDateMs: new Date('2026-03-22T02:00:00Z').getTime(),
  },
  {
    eventId: 'event-004',
    count: 40,
    // Completed event: attendees checked in, rest cancelled or rejected — no pending/approved survivors
    statusWeights: ['attended', 'attended', 'attended', 'attended', 'attended', 'cancelled', 'cancelled', 'rejected'],
    eventDateMs: new Date('2025-11-10T02:00:00Z').getTime(),
  },
  {
    eventId: 'event-005',
    count: 18,
    // Cancelled event: registrants who signed up before cancellation — all cancelled or rejected
    statusWeights: ['cancelled', 'cancelled', 'cancelled', 'rejected', 'pending'],
    eventDateMs: new Date('2026-02-28T02:00:00Z').getTime(),
  },
  {
    eventId: 'event-006',
    count: 110,
    statusWeights: ['attended', 'attended', 'attended', 'approved', 'approved', 'pending', 'pending', 'confirmed', 'waitlisted', 'rejected'],
    eventDateMs: new Date('2026-03-22T02:00:00Z').getTime(),
  },
]

let regCounter = 0
export const registrationsStore: StoredRegistration[] = EVENT_CONFIGS.flatMap(({ eventId, count, statusWeights, eventDateMs }) =>
  Array.from({ length: count }, (_, i) => {
    regCounter++
    const status = statusWeights[i % statusWeights.length]
    const daysAgo = count - i
    // attendedAt is anchored to the event date (± minutes per slot) — not today's date
    const attendedAt = status === 'attended'
      ? new Date(eventDateMs + (i % 60) * 60_000).toISOString()
      : null
    return {
      id: `reg-${String(regCounter).padStart(3, '0')}`,
      contactId: contactsPool[(regCounter - 1) % contactsPool.length].id,
      eventId,
      status,
      ticketToken: status === 'approved' || status === 'attended' || status === 'confirmed' ? `ticket-${faker.string.alphanumeric(20)}` : null,
      surveyAnswers: {},
      attendedAt,
      createdAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
      flagOverride: false,
    }
  })
)

function enrichRegistration(reg: StoredRegistration, eventId: string): RegistrationWithContact {
  const contact = contactsPool.find((c) => c.id === reg.contactId) ?? contactsPool[0]
  return {
    ...reg,
    contactName: contact.name,
    contactEmail: contact.email,
    contactPhone: contact.phone,
    contactFlagCategory: contact.flagCategory,
    aiScore: djb2(contact.id + eventId),
  }
}

export const registrationHandlers = [
  http.post('/api/registrations/:id/clear-flag', async ({ params }) => {
    await delay(300)
    const idx = registrationsStore.findIndex((r) => r.id === params.id)
    if (idx === -1) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Registration not found', details: [] } },
        { status: 404 }
      )
    }
    registrationsStore[idx] = { ...registrationsStore[idx], flagOverride: true }
    return HttpResponse.json(enrichRegistration(registrationsStore[idx], registrationsStore[idx].eventId))
  }),

  http.get('/api/registrations', async ({ request }) => {
    await delay(400)
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') ?? '1', 10)
    const pageSize = parseInt(url.searchParams.get('pageSize') ?? '20', 10)
    const status = url.searchParams.get('status')
    const eventId = url.searchParams.get('eventId')

    let filtered = registrationsStore
    if (status) filtered = filtered.filter((r) => r.status === status)
    if (eventId) filtered = filtered.filter((r) => r.eventId === eventId)

    const total = filtered.length
    const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

    // Enrich with contact data so RegistrationWithContact fields are available
    const data = paged.map((r) => enrichRegistration(r, r.eventId))

    const response: PaginatedResponse<RegistrationWithContact> = {
      data,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    }
    return HttpResponse.json(response)
  }),

  http.post('/api/registrations', async () => {
    await delay(400)
    const newReg: StoredRegistration = {
      id: faker.string.uuid(),
      contactId: contactsPool[registrationsStore.length % contactsPool.length].id,
      eventId: 'event-001',
      status: 'pending',
      ticketToken: null,
      surveyAnswers: {},
      attendedAt: null,
      createdAt: new Date().toISOString(),
      flagOverride: false,
    }
    registrationsStore.push(newReg)
    return HttpResponse.json(newReg, { status: 201 })
  }),

  http.get('/api/registrations/:id', async ({ params }) => {
    await delay(300)
    const reg = registrationsStore.find((r) => r.id === params.id)
    if (!reg) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Registration not found', details: [] } },
        { status: 404 }
      )
    }
    return HttpResponse.json(reg)
  }),

  http.get('/api/tickets/:token', async ({ params }) => {
    await delay(300)
    const token = params.token as string
    if (token === 'INVALID') {
      return HttpResponse.json(
        { error: { code: 'INVALID_TOKEN', message: 'Tiket tidak valid', details: [] } },
        { status: 404 }
      )
    }
    return HttpResponse.json({
      token,
      participantName: faker.person.fullName(),
      eventName: 'Seminar ERP Jakarta',
      eventDate: '2026-04-15T02:00:00.000Z',
      eventLocation: 'Jakarta Convention Center',
      registrationId: faker.string.uuid(),
    })
  }),

  http.get('/api/registrations/confirm/:token', async ({ params }) => {
    await delay(400)
    const token = params.token as string
    if (token === 'INVALID_TOKEN') {
      return HttpResponse.json(
        { error: { code: 'INVALID_TOKEN', message: 'Token tidak valid atau sudah kadaluarsa', details: [] } },
        { status: 400 }
      )
    }
    return HttpResponse.json({
      message: 'Registrasi berhasil dikonfirmasi',
      registration: {
        id: faker.string.uuid(),
        status: 'pending',
        eventName: 'Seminar ERP Jakarta',
        eventSlug: 'seminar-erp-jakarta',
        participantName: 'Budi Santoso',
      },
    })
  }),

  http.post('/api/registrations/:id/cancel', async ({ params }) => {
    await delay(400)
    const idx = registrationsStore.findIndex((r) => r.id === params.id)
    if (idx === -1) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Registration not found', details: [] } },
        { status: 404 }
      )
    }
    registrationsStore[idx] = { ...registrationsStore[idx], status: 'cancelled' }
    return HttpResponse.json(registrationsStore[idx])
  }),

  http.post('/api/registrations/:id/status', async ({ params, request }) => {
    await delay(600)
    const body = await request.json() as { status: Registration['status'] }
    const idx = registrationsStore.findIndex((r) => r.id === params.id)
    if (idx === -1) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Registration not found', details: [] } },
        { status: 404 }
      )
    }
    registrationsStore[idx] = {
      ...registrationsStore[idx],
      status: body.status,
      ticketToken: body.status === 'approved'
        ? `ticket-${faker.string.alphanumeric(20)}`
        : registrationsStore[idx].ticketToken,
      attendedAt: body.status === 'attended'
        ? new Date().toISOString()
        : registrationsStore[idx].attendedAt,
    }
    return HttpResponse.json(registrationsStore[idx])
  }),

  // POST /api/registrations/:id/resend-ticket — Story 4.11
  http.post('/api/registrations/:id/resend-ticket', async ({ params }) => {
    await delay(400)
    const reg = registrationsStore.find((r) => r.id === params.id)
    if (!reg) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Registration not found', details: [] } },
        { status: 404 }
      )
    }
    return HttpResponse.json({ message: 'Ticket resent', registrationId: reg.id }, { status: 202 })
  }),

  // PUT /api/registrations/bulk-approve — must be before /:id/status (literal path before wildcard)
  http.put('/api/registrations/bulk-approve', async ({ request }) => {
    await delay(800)
    const body = await request.json() as { ids: string[] }
    let approved = 0
    for (const id of body.ids) {
      const idx = registrationsStore.findIndex((r) => r.id === id)
      if (idx !== -1) {
        registrationsStore[idx] = {
          ...registrationsStore[idx],
          status: 'approved',
          ticketToken: `ticket-${faker.string.alphanumeric(20)}`,
        }
        approved++
      }
    }
    return HttpResponse.json({ approved, total: body.ids.length })
  }),

  // PUT /api/registrations/:id/status — hub approval queue (Story 4.10)
  http.put('/api/registrations/:id/status', async ({ params, request }) => {
    await delay(400)
    const body = await request.json() as { status: Registration['status'] }
    const idx = registrationsStore.findIndex((r) => r.id === params.id)
    if (idx === -1) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Registration not found', details: [] } },
        { status: 404 }
      )
    }
    registrationsStore[idx] = {
      ...registrationsStore[idx],
      status: body.status,
      ticketToken: body.status === 'approved'
        ? `ticket-${faker.string.alphanumeric(20)}`
        : registrationsStore[idx].ticketToken,
    }
    return HttpResponse.json(enrichRegistration(registrationsStore[idx], registrationsStore[idx].eventId))
  }),
]
