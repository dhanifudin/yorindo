import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildServer } from '../server.js'

type RegistrationWithContact = {
  id: string
  eventId: string
  status: 'pending' | 'confirmed' | 'approved' | 'rejected' | 'waitlisted' | 'attended' | 'cancelled'
  ticketToken: string | null
  contactName: string
  contactCompany?: string
  contactEmail: string | null
  contactPhone: string
  contactFlagCategory: 'invalid-data' | 'duplicate' | null
  aiScore: number
  flagOverride: boolean
  surveyAnswers: Record<string, unknown>
}

let app: FastifyInstance
let adminToken = ''
let staffToken = ''

async function login(email: string, password: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password },
  })

  expect(response.statusCode).toBe(200)
  return response.json().accessToken as string
}

async function listRegistrations(token: string, query = '') {
  const separator = query ? '&' : ''
  const response = await app.inject({
    method: 'GET',
    url: `/api/registrations?page=1&pageSize=500${separator}${query}`,
    headers: { authorization: `Bearer ${token}` },
  })

  expect(response.statusCode).toBe(200)
  return response.json() as { data: RegistrationWithContact[]; pagination: { total: number; pageSize: number } }
}

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret'
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'
  app = await buildServer()
  await app.ready()

  adminToken = await login('admin@yorindo.id', 'Password123!')
  staffToken = await login('staff@yorindo.id', 'Password123!')
})

afterAll(async () => {
  await app.close()
})

describe('Registrations routes', () => {
  it('lists enriched registration rows and supports pageSize=500 for the approval queue', async () => {
    const response = await listRegistrations(adminToken)

    expect(response.pagination.pageSize).toBe(500)
    expect(response.data.length).toBeGreaterThan(0)
    expect(response.data[0]).toMatchObject({
      contactName: expect.any(String),
      contactPhone: expect.any(String),
      aiScore: expect.any(Number),
      flagOverride: expect.any(Boolean),
    })
    expect(response.data[0].aiScore).toBeGreaterThanOrEqual(0)
    expect(response.data[0].aiScore).toBeLessThanOrEqual(99)
  })

  it('returns registration detail with enriched contact data', async () => {
    const registrations = await listRegistrations(adminToken)
    const target = registrations.data[0]

    const response = await app.inject({
      method: 'GET',
      url: `/api/registrations/${target.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      id: target.id,
      eventId: target.eventId,
      contactName: expect.any(String),
      aiScore: expect.any(Number),
      surveyAnswers: expect.any(Object),
    })
  })

  it('updates a registration status via PUT and returns the enriched row used by the frontend', async () => {
    const registrations = await listRegistrations(adminToken, 'status=pending')
    const target = registrations.data[0]

    const response = await app.inject({
      method: 'PUT',
      url: `/api/registrations/${target.id}/status`,
      headers: {
        authorization: `Bearer ${adminToken}`,
        'content-type': 'application/json',
      },
      payload: { status: 'approved' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      id: target.id,
      status: 'approved',
      contactName: expect.any(String),
      aiScore: expect.any(Number),
    })
    expect(response.json().ticketToken).toEqual(expect.any(String))
  })

  it('clears an inherited flag via PATCH without changing the underlying registration id', async () => {
    const registrations = await listRegistrations(adminToken)
    const target = registrations.data.find((item) => item.contactFlagCategory !== null && item.flagOverride === false)

    expect(target).toBeDefined()

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/registrations/${target!.id}/clear-flag`,
      headers: { authorization: `Bearer ${staffToken}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      id: target!.id,
      flagOverride: true,
      contactFlagCategory: target!.contactFlagCategory,
    })
  })

  it('bulk approves multiple registrations via PUT for the queue action bar', async () => {
    const registrations = await listRegistrations(adminToken, 'status=pending')
    const ids = registrations.data.slice(0, 3).map((item) => item.id)

    expect(ids).toHaveLength(3)

    const response = await app.inject({
      method: 'PUT',
      url: '/api/registrations/bulk-approve',
      headers: {
        authorization: `Bearer ${staffToken}`,
        'content-type': 'application/json',
      },
      payload: { ids },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      approved: 3,
      total: 3,
    })
  })
})
