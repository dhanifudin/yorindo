import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildServer } from '../server.js'
import type { Event } from '../types/domain.js'

let app: FastifyInstance
let adminToken = ''

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long'
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-characters-long'
  app = await buildServer()
  await app.ready()

  const login = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'admin@yorindo.id', password: 'Password123!' },
  })
  adminToken = login.json().accessToken
})

afterAll(async () => {
  await app.close()
})

async function createDraftEvent() {
  const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  const response = await app.inject({
    method: 'POST',
    url: '/api/events',
    headers: { authorization: `Bearer ${adminToken}` },
    payload: {
      name: `Lifecycle Test ${unique}`,
      description: 'Event used for lifecycle route tests',
      eventDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      timezone: 'Asia/Jakarta',
      capacity: 100,
      venue: 'Jakarta Convention Center',
      industryTags: ['teknologi'],
    },
  })

  expect(response.statusCode).toBe(201)
  return response.json() as Event & { eventDate: string }
}

describe('GET /api/events/upcoming-uncontacted', () => {
  it('returns the upcoming event banner payload for authenticated admin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/events/upcoming-uncontacted',
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.event).not.toBeNull()
    expect(body.event).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      eventDate: expect.any(String),
      industryTags: expect.any(Array),
    })
    expect(body.daysUntil).toBeGreaterThanOrEqual(0)
    expect(body.daysUntil).toBeLessThanOrEqual(14)
    expect(body.uncontactedCount).toBeGreaterThan(0)
  })

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/events/upcoming-uncontacted',
    })

    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe('UNAUTHORIZED')
  })
})

describe('Event lifecycle transitions', () => {
  it('keeps the active frontend contract working via PUT /api/events/:id', async () => {
    const event = await createDraftEvent()

    const res = await app.inject({
      method: 'PUT',
      url: `/api/events/${event.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: 'published' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({
      id: event.id,
      status: 'published',
    })
  })

  it('supports PATCH /api/events/:id for valid transitions', async () => {
    const event = await createDraftEvent()

    const publishRes = await app.inject({
      method: 'PATCH',
      url: `/api/events/${event.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: 'published' },
    })

    expect(publishRes.statusCode).toBe(200)
    expect(publishRes.json().status).toBe('published')

    const cancelRes = await app.inject({
      method: 'PATCH',
      url: `/api/events/${event.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: 'cancelled' },
    })

    expect(cancelRes.statusCode).toBe(200)
    expect(cancelRes.json().status).toBe('cancelled')
  })

  it('rejects invalid status transitions with a clear error', async () => {
    const event = await createDraftEvent()

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/events/${event.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: 'completed' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toMatchObject({
      error: {
        code: 'INVALID_EVENT_TRANSITION',
      },
    })
    expect(res.json().error.details[0]).toMatchObject({
      from: 'draft',
      to: 'completed',
      allowedTransitions: ['published'],
    })
  })

  it('allows completed events to be archived', async () => {
    const event = await createDraftEvent()

    for (const nextStatus of ['published', 'active', 'completed', 'archived'] as const) {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/events/${event.id}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { status: nextStatus },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().status).toBe(nextStatus)
    }
  })
})
