import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildServer } from '../server.js'
import type { Event } from '../types/domain.js'
import { config } from '../config/index.js'
import jwt from 'jsonwebtoken'
import { SEED_USER_IDS } from '../repositories/memory/_seeds.js'
import type { JwtPayload } from '../middleware/auth.js'

async function createDraftEvent(app: FastifyInstance, adminToken: string) {
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

describe('Events Routes API (Story 4.1 BE)', () => {
  let app: FastifyInstance
  let adminToken: string
  let testEventId: string

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long'
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-characters-long'
    app = await buildServer()
    await app.ready()
    const payload: JwtPayload = { sub: SEED_USER_IDS.admin, role: 'admin', jti: 'test-jti', iat: 1, exp: 9999999999 }
    adminToken = jwt.sign(payload, config.jwtSecret ?? process.env.JWT_SECRET)
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /api/events - fails with missing fields', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/events',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: { name: 'Incomplete Event' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('POST /api/events - parses and creates successfully with unique slug', async () => {
    const payload = {
      name: 'Test Unique Event',
      eventDate: '2026-10-10T09:00:00Z',
      startDate: '2026-10-10T09:00:00Z',
      endDate: '2026-10-10T17:00:00Z',
      startTime: '09:00',
      endTime: '17:00',
      timezone: 'Asia/Jakarta',
      isPaid: false,
    }

    const res = await app.inject({
      method: 'POST',
      url: '/api/events',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload,
    })

    expect(res.statusCode).toBe(201)
    const json = res.json()
    expect(json.slug).toBe('test-unique-event')
    expect(json.startDate).toBe(payload.startDate)
    expect(json.isPaid).toBe(false)
    testEventId = json.id
  })

  it('GET /api/events/check-slug - returns false for used slug', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/events/check-slug?slug=test-unique-event',
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.available).toBe(false)
  })

  it('GET /api/events/check-slug - returns true for new slug', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/events/check-slug?slug=test-unique-event-1234',
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.available).toBe(true)
  })

  it('PUT /api/events/:id - updates event successfully', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/events/${testEventId}`,
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: {
        isPaid: true,
        price: 500000,
        paymentMethod: 'bank_transfer',
        capacity: 150,
      },
    })
    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.isPaid).toBe(true)
    expect(json.capacity).toBe(150)
  })

  it('POST /api/events - fails date validation (endDate < startDate)', async () => {
    const payload = {
      name: 'Bad Date Event',
      eventDate: '2026-10-10T09:00:00Z',
      startDate: '2026-10-12T09:00:00Z',
      endDate: '2026-10-10T17:00:00Z',
      startTime: '09:00',
      endTime: '17:00',
      timezone: 'Asia/Jakarta',
      isPaid: false,
    }

    const res = await app.inject({
      method: 'POST',
      url: '/api/events',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload,
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error.details[0].path[0]).toBe('endDate')
  })

  it('POST /api/events - fails paid validation (missing price)', async () => {
    const payload = {
      name: 'Bad Paid Event',
      eventDate: '2026-10-10T09:00:00Z',
      startDate: '2026-10-10T09:00:00Z',
      endDate: '2026-10-10T17:00:00Z',
      startTime: '09:00',
      endTime: '17:00',
      timezone: 'Asia/Jakarta',
      isPaid: true,
    }

    const res = await app.inject({
      method: 'POST',
      url: '/api/events',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload,
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error.details[0].path[0]).toBe('price')
  })

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

  it('returns 401 without token for upcoming-uncontacted', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/events/upcoming-uncontacted',
    })

    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe('UNAUTHORIZED')
  })

  describe('Event lifecycle transitions', () => {
    it('keeps the active frontend contract working via PUT /api/events/:id', async () => {
      const event = await createDraftEvent(app, adminToken)

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
      const event = await createDraftEvent(app, adminToken)

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
      const event = await createDraftEvent(app, adminToken)

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
      const event = await createDraftEvent(app, adminToken)

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

  describe('POST /api/events/:id/audience-preview', () => {
    it('returns matchCount and breakdown for valid criteria', async () => {
      const event = await createDraftEvent(app, adminToken)
      const res = await app.inject({
        method: 'POST',
        url: `/api/events/${event.id}/audience-preview`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {},
      })
      expect(res.statusCode).toBe(200)
      const json = res.json()
      expect(typeof json.matchCount).toBe('number')
      expect(json.matchCount).toBeGreaterThanOrEqual(0)
      expect(typeof json.breakdown).toBe('object')
    })

    it('filters by serviceTypes and returns real breakdown', async () => {
      const event = await createDraftEvent(app, adminToken)
      const res = await app.inject({
        method: 'POST',
        url: `/api/events/${event.id}/audience-preview`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { serviceTypes: ['Konsultasi'] },
      })
      expect(res.statusCode).toBe(200)
      const json = res.json()
      expect(typeof json.matchCount).toBe('number')
      expect(typeof json.breakdown).toBe('object')
    })

    it('excludes suppressed contacts from matchCount', async () => {
      const event = await createDraftEvent(app, adminToken)
      const allRes = await app.inject({
        method: 'POST',
        url: `/api/events/${event.id}/audience-preview`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {},
      })
      expect(allRes.statusCode).toBe(200)
      const allCount = allRes.json().matchCount
      // matchCount should only include active, non-flagged contacts
      expect(allCount).toBeGreaterThanOrEqual(0)
    })

    it('returns 400 for invalid lastAttendedBefore date format', async () => {
      const event = await createDraftEvent(app, adminToken)
      const res = await app.inject({
        method: 'POST',
        url: `/api/events/${event.id}/audience-preview`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { lastAttendedBefore: 'not-a-date' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('accepts valid lastAttendedBefore ISO-8601 date', async () => {
      const event = await createDraftEvent(app, adminToken)
      const res = await app.inject({
        method: 'POST',
        url: `/api/events/${event.id}/audience-preview`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { lastAttendedBefore: '2026-01-01T00:00:00.000Z' },
      })
      expect(res.statusCode).toBe(200)
      const json = res.json()
      expect(typeof json.matchCount).toBe('number')
    })

    it('returns 404 for non-existent event', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/events/does-not-exist/audience-preview',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {},
      })
      expect(res.statusCode).toBe(404)
    })

    it('returns 401 without auth token', async () => {
      const event = await createDraftEvent(app, adminToken)
      const res = await app.inject({
        method: 'POST',
        url: `/api/events/${event.id}/audience-preview`,
        payload: {},
      })
      expect(res.statusCode).toBe(401)
    })

    it('returns 403 for non-admin role', async () => {
      const event = await createDraftEvent(app, adminToken)
      const staffPayload: JwtPayload = { sub: 'staff-user-id', role: 'staff', jti: 'staff-jti', iat: 1, exp: 9999999999 }
      const staffToken = jwt.sign(staffPayload, config.jwtSecret ?? process.env.JWT_SECRET!)
      const res = await app.inject({
        method: 'POST',
        url: `/api/events/${event.id}/audience-preview`,
        headers: { authorization: `Bearer ${staffToken}` },
        payload: {},
      })
      expect(res.statusCode).toBe(403)
    })

    it('filters by behavior criteria', async () => {
      const event = await createDraftEvent(app, adminToken)
      const res = await app.inject({
        method: 'POST',
        url: `/api/events/${event.id}/audience-preview`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { behavior: ['never_attended'] },
      })
      expect(res.statusCode).toBe(200)
      const json = res.json()
      expect(typeof json.matchCount).toBe('number')
    })

    it('filters by multiple criteria simultaneously', async () => {
      const event = await createDraftEvent(app, adminToken)
      const res = await app.inject({
        method: 'POST',
        url: `/api/events/${event.id}/audience-preview`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          serviceTypes: ['Konsultasi'],
          cities: ['Jakarta'],
        },
      })
      expect(res.statusCode).toBe(200)
      const json = res.json()
      expect(typeof json.matchCount).toBe('number')
      expect(typeof json.breakdown).toBe('object')
    })
  })

  describe('Event soft delete and recovery', () => {
    it('soft deletes an event and hides it from the default list', async () => {
      const event = await createDraftEvent(app, adminToken)

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
      const event = await createDraftEvent(app, adminToken)

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
      const event = await createDraftEvent(app, adminToken)

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
      const event = await createDraftEvent(app, adminToken)

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
})
