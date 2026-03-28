import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildServer } from '../server.js'

let app: FastifyInstance

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
