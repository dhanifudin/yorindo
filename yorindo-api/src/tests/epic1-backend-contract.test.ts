import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildServer } from '../server.js'

let app: FastifyInstance
let adminToken = ''
let staffToken = ''
let seededEventId = ''
let seededActiveEventId = ''

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret'
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'
  app = await buildServer()
  await app.ready()

  const adminLogin = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'admin@yorindo.id', password: 'Password123!' },
  })
  adminToken = adminLogin.json().accessToken

  const staffLogin = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'staff@yorindo.id', password: 'Password123!' },
  })
  staffToken = staffLogin.json().accessToken

  const eventsResponse = await app.inject({
    method: 'GET',
    url: '/api/events?page=1&pageSize=1',
    headers: { authorization: `Bearer ${adminToken}` },
  })
  seededEventId = eventsResponse.json().data[0].id

  const registrationsResponse = await app.inject({
    method: 'GET',
    url: '/api/registrations?page=1&pageSize=1',
    headers: { authorization: `Bearer ${adminToken}` },
  })
  seededActiveEventId = registrationsResponse.json().data[0].eventId
})

afterAll(async () => {
  await app.close()
})

describe('Epic 1 backend contract routes', () => {
  it('lists events from /api/events', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/events?page=1&pageSize=5',
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.length).toBeGreaterThan(0)
    expect(body.pagination.total).toBeGreaterThan(0)
  })

  it('lists event registrations from /api/events/:id/registrations', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/events/${seededActiveEventId}/registrations?page=1&pageSize=5`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data[0]).toHaveProperty('contactName')
  })

  it('returns YoriMind analysis for an event', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/events/${seededActiveEventId}/yorimind`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toHaveProperty('summary')
  })

  it('creates a public registration', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/registrations',
      payload: {
        eventId: seededActiveEventId,
        name: 'Epic One Tester',
        email: 'epic1@example.com',
        phone: '+6281230001111',
        surveyAnswers: { expectation: 'Belajar kontrak API' },
      },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json().eventId).toBe(seededActiveEventId)
  })

  it('queues event blast via /api/events/:id/blast', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/events/${seededActiveEventId}/blast`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        templateId: 'template-001',
        channel: 'email',
      },
    })

    expect(response.statusCode).toBe(202)
    expect(response.json()).toHaveProperty('jobId')
  })

  it('verifies ticket scans for staff', async () => {
    const registrations = await app.inject({
      method: 'GET',
      url: '/api/registrations?page=1&pageSize=50&status=approved',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    const approved = registrations.json().data.find((item: { ticketToken?: string | null }) => item.ticketToken)

    const response = await app.inject({
      method: 'POST',
      url: '/api/scan/verify',
      headers: { authorization: `Bearer ${staffToken}` },
      payload: { token: approved.ticketToken },
    })

    expect(response.statusCode).toBe(200)
    expect(['success', 'already_attended']).toContain(response.json().status)
  })
})
