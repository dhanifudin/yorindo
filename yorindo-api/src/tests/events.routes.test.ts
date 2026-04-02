import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildServer } from '../server.js'

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
