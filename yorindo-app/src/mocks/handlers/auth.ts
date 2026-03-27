import { http, HttpResponse, delay } from 'msw'
import { MOCK_USER_IDS } from './users'
import { makeMockCuid2 } from './id'

// MSW seed accounts — password is always 'Password123!' for any of these
const MOCK_USERS = [
  { id: MOCK_USER_IDS.admin, email: 'admin@yorindo.id', role: 'admin' as const },
  { id: MOCK_USER_IDS.staff, email: 'staff@yorindo.id', role: 'staff' as const },
  { id: MOCK_USER_IDS.viewer, email: 'viewer@yorindo.id', role: 'viewer' as const },
]

export const authHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    await delay(300)
    const body = await request.json() as { email?: string; password?: string }
    const found = MOCK_USERS.find((u) => u.email === body.email)
    if (!found || body.password !== 'Password123!') {
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
      user: { id: MOCK_USER_IDS.admin, role: 'admin' },
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
        id: body.contactId ?? makeMockCuid2(),
        role: 'participant' as const,
        name: body.participantName ?? 'Budi Santoso',
        email: body.participantEmail ?? 'budi.santoso@email.com',
      },
    })
  }),
]
