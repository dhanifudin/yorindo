import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildServer } from '../server.js'
import { config } from '../config/index.js'
import jwt from 'jsonwebtoken'
import { SEED_USER_IDS } from '../repositories/memory/_seeds.js'
import type { JwtPayload } from '../middleware/auth.js'

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
})
