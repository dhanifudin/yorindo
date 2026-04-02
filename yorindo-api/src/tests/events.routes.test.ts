import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildServer } from '../server.js'
import { config } from '../config/index.js'
import jwt from 'jsonwebtoken'
import { SEED_USER_IDS } from '../repositories/memory/_seeds.js'
import type { JwtPayload } from '../middleware/auth.js'

let app: FastifyInstance
let adminToken: string
let testEventId: string

beforeAll(async () => {
  app = await buildServer()
  await app.ready()

  const payload: JwtPayload = {
    sub: SEED_USER_IDS.admin,
    role: 'admin',
    jti: 'test-jti',
    iat: 1,
    exp: 9999999999,
  }

  adminToken = jwt.sign(payload, config.jwtSecret)
})

afterAll(async () => {
  await app.close()
})

/**
 * =========================
 * Event CRUD Tests
 * =========================
 */
describe('Events Routes API (Story 4.1 BE)', () => {
  it('POST /api/events - fails with missing fields', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/events',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: { name: 'Incomplete Event' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('POST /api/events - creates successfully', async () => {
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
    testEventId = json.id
  })

  it('GET /api/events/check-slug - used slug', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/events/check-slug?slug=test-unique-event',
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.json().available).toBe(false)
  })

  it('PUT /api/events/:id - updates event', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/events/${testEventId}`,
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: { isPaid: true, price: 500000 },
    })
    expect(res.statusCode).toBe(200)
  })
})

/**
 * =========================
 * Upcoming Uncontacted
 * =========================
 */
describe('GET /api/events/upcoming-uncontacted', () => {
  it('returns upcoming event data', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/events/upcoming-uncontacted',
      headers: { Authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()

    expect(body.event).not.toBeNull()
    expect(body.daysUntil).toBeGreaterThanOrEqual(0)
    expect(body.uncontactedCount).toBeGreaterThan(0)
  })

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/events/upcoming-uncontacted',
    })

    expect(res.statusCode).toBe(401)
  })
})
