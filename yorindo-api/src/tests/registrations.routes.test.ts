import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildServer } from '../server.js'

describe('Registration and confirmation routes', () => {
  let app: FastifyInstance
  let adminToken = ''
  let confirmationEventId = ''
  let resendRegistrationId = ''
  let pendingRegistrationId = ''

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret'
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'
    app = await buildServer()
    await app.ready()

    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@yorindo.id', password: 'Password123!' },
    })
    adminToken = adminLogin.json().accessToken

    const approvedRegs = await app.inject({
      method: 'GET',
      url: '/api/registrations?page=1&pageSize=100&status=approved',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    const approved = approvedRegs.json().data[0]
    confirmationEventId = approved.eventId
    resendRegistrationId = approved.id

    const pendingRegs = await app.inject({
      method: 'GET',
      url: '/api/registrations?page=1&pageSize=100&status=pending',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    pendingRegistrationId = pendingRegs.json().data[0].id
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /api/events/:id/confirmation returns confirmation stats and rows', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/events/${confirmationEventId}/confirmation`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.stats).toMatchObject({
      ticketSent: expect.any(Number),
      pendingConfirmation: expect.any(Number),
    })
    expect(body.stats.waitlisted).toBeUndefined()
    expect(Array.isArray(body.registrations)).toBe(true)
    expect(body.registrations.length).toBeGreaterThan(0)
    expect(body.registrations[0]).toMatchObject({
      id: expect.any(String),
      contact: {
        name: expect.any(String),
        company: expect.any(String),
      },
      channel: expect.stringMatching(/^(email|whatsapp)$/),
      confirmationStatus: expect.stringMatching(/^(confirmed|pending)$/),
    })
    expect(body.registrations.every((registration: { confirmationStatus: string }) => registration.confirmationStatus !== 'waitlisted')).toBe(true)
  })

  it('POST /api/registrations/:id/resend-ticket accepts resend for an approved registration', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/registrations/${resendRegistrationId}/resend-ticket`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(202)
    expect(res.json()).toMatchObject({
      accepted: true,
      registrationId: resendRegistrationId,
      channel: expect.stringMatching(/^(email|whatsapp)$/),
      resentAt: expect.any(String),
    })
  })

  it('POST /api/registrations/:id/resend-ticket rejects resend for non-approved registrations', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/registrations/${pendingRegistrationId}/resend-ticket`,
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(409)
    expect(res.json()).toMatchObject({
      error: {
        code: 'INVALID_REGISTRATION_STATUS',
      },
    })
  })

  it('PUT /api/registrations/:id/status updates registration status for frontend compatibility', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/registrations/${pendingRegistrationId}/status`,
      headers: {
        authorization: `Bearer ${adminToken}`,
        'content-type': 'application/json',
      },
      payload: { status: 'approved' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({
      id: pendingRegistrationId,
      status: 'approved',
    })
  })

  it('PATCH /api/registrations/:id/status remains supported for mock/frontend contract compatibility', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/registrations/${pendingRegistrationId}/status`,
      headers: {
        authorization: `Bearer ${adminToken}`,
        'content-type': 'application/json',
      },
      payload: { status: 'confirmed' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({
      id: pendingRegistrationId,
      status: 'confirmed',
    })
  })
})
