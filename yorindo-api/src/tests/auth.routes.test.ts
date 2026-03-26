/**
 * Auth Routes Tests — Story 2.1 Phase 2 BE
 *
 * Tests use InMemoryUserRepository (seeded with admin/staff users).
 * No real Redis or DB needed — REDIS_URL not set → blacklist is no-op.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildServer } from '../server.js'

let app: FastifyInstance

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret'
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'
  app = await buildServer()
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

describe('POST /api/auth/login', () => {
  it('returns 200 with accessToken for valid admin credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@yorindo.id', password: 'admin1234' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveProperty('accessToken')
    expect(typeof body.accessToken).toBe('string')
    expect(body.user.role).toBe('event_admin')
  })

  it('returns 200 with accessToken for valid staff credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'staff@yorindo.id', password: 'staff1234' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveProperty('accessToken')
    expect(body.user.role).toBe('staff')
  })

  it('returns 401 for wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@yorindo.id', password: 'wrongpassword' },
    })
    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe('INVALID_CREDENTIALS')
  })

  it('returns 401 for unknown email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'unknown@yorindo.id', password: 'any1234' },
    })
    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe('INVALID_CREDENTIALS')
  })

  it('returns 400 for invalid request body (missing fields)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'notanemail' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('VALIDATION_ERROR')
  })
})

describe('POST /api/auth/logout', () => {
  it('returns 204 with valid token', async () => {
    // 1. Login first
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@yorindo.id', password: 'admin1234' },
    })
    const { accessToken } = loginRes.json()

    // 2. Logout
    const logoutRes = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { authorization: `Bearer ${accessToken}` },
    })
    expect(logoutRes.statusCode).toBe(204)
  })

  it('returns 401 without auth token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
    })
    expect(res.statusCode).toBe(401)
  })
})

describe('POST /api/auth/refresh', () => {
  it('returns 401 without refresh cookie', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
    })
    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe('UNAUTHORIZED')
  })

  it('returns 401 with invalid refresh token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      cookies: { refreshToken: 'invalid.token.here' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 200 with new accessToken for valid refresh token', async () => {
    // Login to get refresh cookie
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@yorindo.id', password: 'admin1234' },
    })
    const cookies = loginRes.cookies
    const refreshCookie = cookies.find(c => c.name === 'refreshToken')
    expect(refreshCookie).toBeDefined()

    const refreshRes = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      cookies: { refreshToken: refreshCookie!.value },
    })
    expect(refreshRes.statusCode).toBe(200)
    expect(refreshRes.json()).toHaveProperty('accessToken')
  })
})
