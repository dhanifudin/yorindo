import { http, HttpResponse, delay } from 'msw'
import { faker } from '@faker-js/faker'
import type { Registration, RegistrationWithContact, PaginatedResponse } from '@/types/api'
import { contactsPool } from './contacts'
import { djb2 } from '@/lib/djb2'

type StoredRegistration = Registration & { flagOverride: boolean }

// Distribute registrations across the first 3 events for realistic mock data
const EVENT_IDS = ['event-001', 'event-002', 'event-003']
const STATUSES: Registration['status'][] = ['pending', 'approved', 'approved', 'approved', 'rejected', 'waitlisted', 'attended', 'attended', 'cancelled', 'confirmed']

export const registrationsStore: StoredRegistration[] = Array.from({ length: 60 }, (_, i) => {
  const status = STATUSES[i % STATUSES.length]
  return {
    id: `reg-${String(i + 1).padStart(3, '0')}`,
    contactId: contactsPool[i % contactsPool.length].id,
    eventId: EVENT_IDS[i % EVENT_IDS.length],
    status,
    ticketToken: status === 'approved' || status === 'attended' ? `ticket-${faker.string.alphanumeric(20)}` : null,
    surveyAnswers: {},
    attendedAt: status === 'attended' ? faker.date.recent({ days: 30 }).toISOString() : null,
    createdAt: new Date(Date.now() - (60 - i) * 86400000).toISOString(),
    flagOverride: false,
  }
})

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
    const data = filtered.slice((page - 1) * pageSize, page * pageSize)

    const response: PaginatedResponse<Registration> = {
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
]
