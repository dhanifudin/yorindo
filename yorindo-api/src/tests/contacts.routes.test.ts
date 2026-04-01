import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import jwt from 'jsonwebtoken'
import { buildServer } from '../server.js'
import { config } from '../config/index.js'
import { SEED_CONTACT_IDS, SEED_USER_IDS } from '../repositories/memory/_seeds.js'
import type { JwtPayload } from '../middleware/auth.js'

let app: FastifyInstance

function getAuthToken(role: 'admin' | 'staff' | 'viewer' = 'admin', id = SEED_USER_IDS[role]): string {
  const payload: JwtPayload = { sub: id, role, jti: 'test-jti', iat: 1, exp: 9999999999 }
  return jwt.sign(payload, config.jwtSecret)
}

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long'
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-characters-long'
  app = await buildServer()
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

describe('GET /api/contacts/health', () => {
  it('returns contacts health counters', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/contacts/health',
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({
      flagged: 13,
      duplicates: 6,
      missingEmail: 15,
    })
  })
})

describe('GET /api/contacts/facets', () => {
  it('returns filter facets with slug, label, and count', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/contacts/facets',
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.industry).toBeInstanceOf(Array)
    expect(body.city).toBeInstanceOf(Array)
    expect(body.companySize).toBeInstanceOf(Array)
    expect(body.industry[0]).toMatchObject({
      slug: expect.any(String),
      label: expect.any(String),
      count: expect.any(Number),
    })
    expect(body.city[0]).toMatchObject({
      slug: expect.any(String),
      label: expect.any(String),
      count: expect.any(Number),
    })
    expect(body.companySize[0]).toMatchObject({
      slug: expect.any(String),
      label: expect.any(String),
      count: expect.any(Number),
    })
    expect(body.city.reduce((sum: number, item: { count: number }) => sum + item.count, 0)).toBe(120)
    expect(body.companySize.reduce((sum: number, item: { count: number }) => sum + item.count, 0)).toBe(120)
  })
})

describe('GET /api/contacts', () => {
  it('returns paginated contacts with default page size', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/contacts?page=1&pageSize=20',
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data).toHaveLength(20)
    expect(body.pagination.total).toBe(120)
    expect(body.pagination.totalPages).toBe(6)
    expect(body.data[0]).toHaveProperty('company')
  })

  it('filters contacts by industry', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/contacts?page=1&pageSize=20&industry=teknologi',
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.pagination.total).toBeGreaterThan(0)
    expect(body.pagination.total).toBeLessThan(120)
    expect(body.data.every((contact: { industryId: string }) => contact.industryId === 'teknologi')).toBe(true)
  })

  it('filters contacts by companySize using FE enum values', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/contacts?page=1&pageSize=20&companySize=medium',
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.pagination.total).toBeGreaterThan(0)
    expect(body.data.every((contact: { companySize: string }) => contact.companySize === 'medium')).toBe(true)
  })

  it('sorts contacts by name ascending', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/contacts?page=1&pageSize=5&sortBy=name&sortDir=asc',
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    const names = body.data.map((contact: { name: string }) => contact.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  })

  it('returns 400 for invalid pagination params', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/contacts?page=0&pageSize=20',
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('VALIDATION_ERROR')
  })
})

describe('GET /api/contacts/industry-suggestions', () => {
  it('returns canonical industry suggestions for a free-form query', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/contacts/industry-suggestions?q=teknologi%20informasi',
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.suggestions.length).toBeGreaterThan(0)
    expect(body.suggestions[0].slug).toBe('teknologi')
    expect(body.matchedSlug).toBe('teknologi')
    expect(body.fallback).toBe(false)
  })

  it('returns fallback when no canonical industry is a confident match', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/contacts/industry-suggestions?q=xyzabc',
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.matchedSlug).toBeNull()
    expect(body.fallback).toBe(true)
  })

  it('returns empty suggestions for a query shorter than 2 characters', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/contacts/industry-suggestions?q=t',
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.suggestions).toEqual([])
    expect(body.matchedSlug).toBeNull()
    expect(body.fallback).toBe(false)
  })
})

describe('GET /api/contacts/:id/history', () => {
  it('returns contact event history for admins sorted by most recent event date', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/contacts/${SEED_CONTACT_IDS[0]}/history`,
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.registrations.length).toBeGreaterThan(0)
    expect(body.registrations[0]).toMatchObject({
      eventId: expect.any(String),
      eventName: expect.any(String),
      eventDate: expect.any(String),
      status: expect.any(String),
    })

    const eventDates = body.registrations.map((item: { eventDate: string }) => item.eventDate)
    expect(eventDates).toEqual([...eventDates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime()))
  })

  it('rejects unauthenticated access to contact history', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/contacts/${SEED_CONTACT_IDS[0]}/history`,
    })

    expect(res.statusCode).toBe(401)
  })

  it('rejects non-admin access to contact history', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/contacts/${SEED_CONTACT_IDS[0]}/history`,
      headers: { authorization: `Bearer ${getAuthToken('staff')}` },
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 404 for unknown contact history requests', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/contacts/not-a-real-contact-id/history',
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
    })

    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe('NOT_FOUND')
  })
})

describe('Duplicate contacts routes', () => {
  it('returns duplicate pairs with pagination', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/contacts/duplicates?page=1&pageSize=3',
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data).toHaveLength(3)
    expect(body.pagination.total).toBe(6)
    expect(body.data[0]).toHaveProperty('primary')
    expect(body.data[0]).toHaveProperty('duplicate')
  })

  it('merges a duplicate pair and removes it from the duplicate list', async () => {
    const beforeRes = await app.inject({
      method: 'GET',
      url: '/api/contacts/duplicates?page=1&pageSize=10',
    })
    const beforeBody = beforeRes.json()
    const pair = beforeBody.data[0]

    const mergeRes = await app.inject({
      method: 'POST',
      url: `/api/contacts/${pair.primary.id}/merge`,
      payload: {
        mergeIntoId: pair.primary.id,
        fieldSelections: {
          email: 'duplicate',
          city: 'duplicate',
        },
      },
    })

    expect(mergeRes.statusCode).toBe(200)
    const merged = mergeRes.json()
    expect(merged.id).toBe(pair.primary.id)
    expect(merged.email).toBe(pair.duplicate.email)
    expect(merged.city).toBe(pair.duplicate.city)

    const afterRes = await app.inject({
      method: 'GET',
      url: '/api/contacts/duplicates?page=1&pageSize=10',
    })
    const afterBody = afterRes.json()
    expect(afterBody.pagination.total).toBe(beforeBody.pagination.total - 1)
  })

  it('returns 404 when merging an unknown duplicate pair', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/contacts/not-a-real-contact-id/merge',
    })

    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe('NOT_FOUND')
  })
})

describe('Flagged records routes', () => {
  it('lists paginated flagged records for admins', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/contacts/flagged?page=1&pageSize=5',
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data).toHaveLength(5)
    expect(body.pagination.total).toBeGreaterThan(0)
    expect(body.data[0]).toMatchObject({
      id: expect.any(String),
      rawData: expect.any(Object),
      suggestedData: expect.any(Object),
      reason: expect.any(String),
      status: expect.any(String),
    })
  })

  it('rejects non-admin access to flagged records', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/contacts/flagged?page=1&pageSize=5',
      headers: { authorization: `Bearer ${getAuthToken('staff')}` },
    })

    expect(res.statusCode).toBe(403)
  })

  it('approves a flagged record with corrections and upserts it into contacts', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/contacts/flagged?page=1&pageSize=20',
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
    })
    const pending = listRes.json().data.find((item: { status: string }) => item.status === 'pending')

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/contacts/flagged/${pending.id}`,
      headers: {
        authorization: `Bearer ${getAuthToken('admin')}`,
        'content-type': 'application/json',
      },
      payload: {
        action: 'approve',
        data: {
          name: 'Approved Contact',
          phone: '+6281234567899',
          email: 'approved@example.com',
          city: 'Jakarta',
          company: 'PT Approved',
          companySize: 'medium',
        },
      },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.status).toBe('resolved')
    expect(body.suggestedData.name).toBe('Approved Contact')
    expect(body.suggestedData.phone).toBe('+6281234567899')

    const contactsRes = await app.inject({
      method: 'GET',
      url: '/api/contacts?page=1&pageSize=100',
    })
    expect(contactsRes.statusCode).toBe(200)
    expect(contactsRes.json().data.some((contact: { phone: string; name: string }) => (
      contact.phone === '+6281234567899' && contact.name === 'Approved Contact'
    ))).toBe(true)
  })

  it('discards a flagged record', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/contacts/flagged?page=1&pageSize=20',
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
    })
    const pending = listRes.json().data.find((item: { status: string }) => item.status === 'pending')

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/contacts/flagged/${pending.id}`,
      headers: {
        authorization: `Bearer ${getAuthToken('admin')}`,
        'content-type': 'application/json',
      },
      payload: {
        action: 'discard',
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('discarded')
  })

  it('returns 404 for unknown flagged record ids', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/contacts/flagged/not-a-real-id',
      headers: {
        authorization: `Bearer ${getAuthToken('admin')}`,
        'content-type': 'application/json',
      },
      payload: {
        action: 'discard',
      },
    })

    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe('NOT_FOUND')
  })
})
