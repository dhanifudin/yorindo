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
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const response = await app.inject({
    method: 'POST',
    url: '/api/events',
    headers: { authorization: `Bearer ${adminToken}` },
    payload: {
      name: `Soft Delete Test ${unique}`,
      description: 'Event used for soft delete and restore tests',
      eventDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      timezone: 'Asia/Jakarta',
      capacity: 100,
      venue: 'Jakarta Convention Center',
      industryTags: ['teknologi'],
    },
  })

  expect(response.statusCode).toBe(201)
  return response.json() as Event & { deletedAt?: string | null }
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

describe('Event soft delete and recovery', () => {
  it('soft deletes an event and hides it from the default list', async () => {
    const event = await createDraftEvent()

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/events/${event.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(deleteRes.statusCode).toBe(204)

    const activeListRes = await app.inject({
      method: 'GET',
      url: '/api/events?page=1&pageSize=100',
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(activeListRes.statusCode).toBe(200)
    expect(activeListRes.json().data.some((item: { id: string }) => item.id === event.id)).toBe(false)
  })

  it('lists deleted events when deleted=true', async () => {
    const event = await createDraftEvent()

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/events/${event.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(deleteRes.statusCode).toBe(204)

    const deletedRes = await app.inject({
      method: 'GET',
      url: '/api/events?deleted=true&page=1&pageSize=100',
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(deletedRes.statusCode).toBe(200)
    const deletedEvent = deletedRes.json().data.find((item: { id: string }) => item.id === event.id)
    expect(deletedEvent).toBeDefined()
    expect(deletedEvent.deletedAt).toEqual(expect.any(String))
  })

  it('restores a soft-deleted event via the frontend contract POST /api/events/:id/restore', async () => {
    const event = await createDraftEvent()

    await app.inject({
      method: 'DELETE',
      url: `/api/events/${event.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    const restoreRes = await app.inject({
      method: 'POST',
      url: `/api/events/${event.id}/restore`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(restoreRes.statusCode).toBe(200)
    expect(restoreRes.json()).toMatchObject({
      id: event.id,
      deletedAt: null,
    })

    const activeListRes = await app.inject({
      method: 'GET',
      url: '/api/events?page=1&pageSize=100',
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(activeListRes.statusCode).toBe(200)
    expect(activeListRes.json().data.some((item: { id: string }) => item.id === event.id)).toBe(true)
  })

  it('also supports PATCH /api/events/:id/restore from the story contract', async () => {
    const event = await createDraftEvent()

    await app.inject({
      method: 'DELETE',
      url: `/api/events/${event.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    const restoreRes = await app.inject({
      method: 'PATCH',
      url: `/api/events/${event.id}/restore`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(restoreRes.statusCode).toBe(200)
    expect(restoreRes.json()).toMatchObject({
      id: event.id,
      deletedAt: null,
    })
  })
})
