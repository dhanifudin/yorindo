import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import jwt from 'jsonwebtoken'
import { buildServer } from '../server.js'
import { config } from '../config/index.js'
import { SEED_USER_IDS } from '../repositories/memory/_seeds.js'
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

describe('Contacts route auth guards', () => {
  it('returns 401 for unauthenticated access to internal contact routes', async () => {
    const responses = await Promise.all([
      app.inject({ method: 'GET', url: '/api/contacts?page=1&pageSize=20' }),
      app.inject({ method: 'GET', url: '/api/contacts/health' }),
      app.inject({ method: 'GET', url: '/api/contacts/facets' }),
      app.inject({ method: 'GET', url: '/api/contacts/industry-suggestions?q=teknologi' }),
      app.inject({ method: 'GET', url: '/api/contacts/duplicates?page=1&pageSize=10' }),
      app.inject({
        method: 'POST',
        url: '/api/contacts/cuid2contact000000000001/merge',
        payload: { mergeIntoId: 'cuid2contact000000000001' },
      }),
    ])

    for (const response of responses) {
      expect(response.statusCode).toBe(401)
      expect(response.json().error.code).toBe('UNAUTHORIZED')
    }
  })

  it('returns 403 for staff access to internal contact routes', async () => {
    const headers = { authorization: `Bearer ${getAuthToken('staff')}` }
    const responses = await Promise.all([
      app.inject({ method: 'GET', url: '/api/contacts?page=1&pageSize=20', headers }),
      app.inject({ method: 'GET', url: '/api/contacts/health', headers }),
      app.inject({ method: 'GET', url: '/api/contacts/facets', headers }),
      app.inject({ method: 'GET', url: '/api/contacts/industry-suggestions?q=teknologi', headers }),
      app.inject({ method: 'GET', url: '/api/contacts/duplicates?page=1&pageSize=10', headers }),
      app.inject({
        method: 'POST',
        url: '/api/contacts/cuid2contact000000000001/merge',
        headers,
        payload: { mergeIntoId: 'cuid2contact000000000001' },
      }),
    ])

    for (const response of responses) {
      expect(response.statusCode).toBe(403)
      expect(response.json().error.code).toBe('FORBIDDEN')
    }
  })
})

describe('GET /api/contacts/health', () => {
  it('returns contacts health counters', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/contacts/health',
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
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
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
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
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
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
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
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
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.pagination.total).toBeGreaterThan(0)
    expect(body.data.every((contact: { companySize: string }) => contact.companySize === 'medium')).toBe(true)
  })

  it('filters contacts by city using case-insensitive partial matches', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/contacts?page=1&pageSize=20&city=jak',
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.pagination.total).toBeGreaterThan(0)
    expect(body.data.every((contact: { city: string }) => contact.city.toLowerCase().includes('jak'))).toBe(true)
  })

  it('filters contacts by flagged state', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/contacts?page=1&pageSize=20&flagFilter=flagged',
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.pagination.total).toBeGreaterThan(0)
    expect(body.data.every((contact: { flagCategory: string | null }) => contact.flagCategory !== null)).toBe(true)
  })

  it('filters contacts with missing email only', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/contacts?page=1&pageSize=20&missingEmail=true',
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.pagination.total).toBe(15)
    expect(body.data.every((contact: { email: string | null }) => contact.email === null)).toBe(true)
  })

  it('searches contacts by free-text query', async () => {
    const seed = await app.inject({
      method: 'GET',
      url: '/api/contacts?page=1&pageSize=1',
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
    })
    const contact = seed.json().data[0]
    const query = String(contact.name).split(' ')[0]

    const res = await app.inject({
      method: 'GET',
      url: `/api/contacts?page=1&pageSize=20&q=${encodeURIComponent(query)}`,
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.pagination.total).toBeGreaterThan(0)
    expect(body.data.some((item: { id: string }) => item.id === contact.id)).toBe(true)
  })

  it('sorts contacts by name ascending', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/contacts?page=1&pageSize=5&sortBy=name&sortDir=asc',
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
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
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
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
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
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
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
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
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.suggestions).toEqual([])
    expect(body.matchedSlug).toBeNull()
    expect(body.fallback).toBe(false)
  })
})

describe('Suppression routes', () => {
  it('lists suppression entries with pagination', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/contacts/suppression?page=1&pageSize=20',
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.length).toBeGreaterThan(0)
    expect(body.data[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      email: expect.any(String),
      phone: expect.any(String),
      suppressedAt: expect.any(String),
      reason: expect.any(String),
    })
  })

  it('adds and searches a manual suppression entry', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/contacts/suppression',
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
      payload: {
        email: 'blocked@example.com',
        phone: '+6281999999999',
        reason: 'manually_added',
      },
    })

    expect(createRes.statusCode).toBe(201)
    const created = createRes.json()
    expect(created.email).toBe('blocked@example.com')
    expect(created.phone).toBe('+6281999999999')

    const searchRes = await app.inject({
      method: 'GET',
      url: '/api/contacts/suppression?q=blocked@example.com&pageSize=20',
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
    })

    expect(searchRes.statusCode).toBe(200)
    expect(searchRes.json().data.some((entry: { id: string }) => entry.id === created.id)).toBe(true)
  })

  it('removes a suppression entry', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/contacts/suppression',
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
      payload: {
        email: 'remove-me@example.com',
        reason: 'manually_added',
      },
    })

    const created = createRes.json()
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/contacts/suppression/${created.id}`,
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
    })

    expect(deleteRes.statusCode).toBe(204)

    const searchRes = await app.inject({
      method: 'GET',
      url: '/api/contacts/suppression?q=remove-me@example.com&pageSize=20',
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
    })
    expect(searchRes.json().data).toHaveLength(0)
  })
})

describe('Duplicate contacts routes', () => {
  it('returns duplicate pairs with pagination', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/contacts/duplicates?page=1&pageSize=3',
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
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
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
    })
    const beforeBody = beforeRes.json()
    const pair = beforeBody.data[0]

    const mergeRes = await app.inject({
      method: 'POST',
      url: `/api/contacts/${pair.primary.id}/merge`,
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
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
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
    })
    const afterBody = afterRes.json()
    expect(afterBody.pagination.total).toBe(beforeBody.pagination.total - 1)
  })

  it('returns 404 when merging an unknown duplicate pair', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/contacts/not-a-real-contact-id/merge',
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
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
      headers: { authorization: `Bearer ${getAuthToken('admin')}` },
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
