import { http, HttpResponse, delay } from 'msw'
import { faker } from '@faker-js/faker'
import type { Registration, PaginatedResponse } from '@/types/api'

const registrationsStore: Registration[] = Array.from({ length: 30 }, (_, i) => ({
  id: `reg-${String(i + 1).padStart(3, '0')}`,
  contactId: faker.string.uuid(),
  eventId: 'event-001',
  status: faker.helpers.arrayElement([
    'pending', 'confirmed', 'approved', 'rejected', 'waitlisted', 'attended', 'cancelled',
  ] as Registration['status'][]),
  ticketToken: faker.datatype.boolean() ? `ticket-${faker.string.alphanumeric(20)}` : null,
  surveyAnswers: {},
  attendedAt: faker.datatype.boolean() ? faker.date.recent().toISOString() : null,
  createdAt: faker.date.past().toISOString(),
}))

export const registrationHandlers = [
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
    const newReg: Registration = {
      id: faker.string.uuid(),
      contactId: faker.string.uuid(),
      eventId: 'event-001',
      status: 'pending',
      ticketToken: null,
      surveyAnswers: {},
      attendedAt: null,
      createdAt: new Date().toISOString(),
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

  http.patch('/api/registrations/:id/status', async ({ params, request }) => {
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
      // Generate ticket token when approved
      ticketToken: body.status === 'approved'
        ? `ticket-${faker.string.alphanumeric(20)}`
        : registrationsStore[idx].ticketToken,
      // Set attendedAt when attended
      attendedAt: body.status === 'attended'
        ? new Date().toISOString()
        : registrationsStore[idx].attendedAt,
    }
    return HttpResponse.json(registrationsStore[idx])
  }),
]
