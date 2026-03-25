import { http, HttpResponse, delay } from 'msw'

// MSW seed accounts — password is always 'password123' for any of these
const MOCK_USERS = [
  { id: 'user-001', email: 'admin@yorindo.app', role: 'admin' as const },
  { id: 'user-002', email: 'budi@yorindo.app', role: 'staff' as const },
  { id: 'user-003', email: 'sari@yorindo.app', role: 'viewer' as const },
]

export const authHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    await delay(300)
    const body = await request.json() as { email?: string; password?: string }
    const found = MOCK_USERS.find((u) => u.email === body.email)
    if (!found || body.password !== 'password123') {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Kredensial tidak valid', details: [] } },
        { status: 401 }
      )
    }
    return HttpResponse.json({
      accessToken: `mock-token-${found.role}`,
      user: { id: found.id, role: found.role },
    })
  }),

  http.post('/api/auth/refresh', async () => {
    await delay(200)
    return HttpResponse.json({
      accessToken: 'mock-access-token-refreshed',
      user: { id: 'user-001', role: 'admin' },
    })
  }),

  http.post('/api/auth/logout', async () => {
    await delay(200)
    return new HttpResponse(null, { status: 204 })
  }),

  // Phase 1 mock: returns pre-fill data from "Google" (name + email only)
  http.post('/api/auth/google-mock', async ({ request }) => {
    await delay(300)
    const body = await request.json() as { mockName?: string; mockEmail?: string }
    return HttpResponse.json({
      name: body.mockName ?? 'Budi Peserta',
      email: body.mockEmail ?? 'budi.peserta@gmail.com',
    })
  }),

  // Creates a participant session after double opt-in confirmation
  http.post('/api/auth/google', async ({ request }) => {
    await delay(400)
    const body = await request.json() as { contactId?: string; participantEmail?: string; participantName?: string }
    return HttpResponse.json({
      accessToken: 'mock-token-participant',
      user: {
        id: body.contactId ?? 'contact-001',
        role: 'participant' as const,
        name: body.participantName ?? 'Budi Santoso',
        email: body.participantEmail ?? 'budi.santoso@email.com',
      },
    })
  }),
]
