import { http, HttpResponse, delay } from 'msw'
import { faker } from '@faker-js/faker'
import type { User } from '@/types/api'
import { makeMockCuid2 } from './id'

export const MOCK_USER_IDS = {
  admin: 'cuid2adminuser000000001x',
  staff: 'cuid2staffuser000000001x',
  viewer: 'cuid2vieweruser00000001x',
  devAdmin: 'cuid2devadminuser0000001',
  devStaff: 'cuid2devstaffuser0000001',
  devViewer: 'cuid2devvieweruser000001',
} as const

// user_id -> Set of eventIds
export const userEventAssignments: Map<string, Set<string>> = new Map([
  [MOCK_USER_IDS.staff, new Set(['event-001', 'event-003'])],
  [MOCK_USER_IDS.viewer, new Set(['event-001'])],
])

export let usersStore: User[] = [
  {
    id: MOCK_USER_IDS.admin,
    name: 'Admin Yorindo',
    email: 'admin@yorindo.id',
    role: 'admin',
    createdAt: new Date('2026-01-01').toISOString(),
    updatedAt: new Date('2026-01-01').toISOString(),
  },
  {
    id: MOCK_USER_IDS.staff,
    name: 'Budi Santoso',
    email: 'staff@yorindo.id',
    role: 'staff',
    createdAt: new Date('2026-02-10').toISOString(),
    updatedAt: new Date('2026-02-10').toISOString(),
  },
  {
    id: MOCK_USER_IDS.viewer,
    name: 'Sari Viewer',
    email: 'viewer@yorindo.id',
    role: 'viewer',
    createdAt: new Date('2026-02-15').toISOString(),
    updatedAt: new Date('2026-02-15').toISOString(),
  },
]

export const userHandlers = [
  http.get('/api/users/me', async ({ request }) => {
    await delay(200)
    const auth = request.headers.get('Authorization') ?? ''
    const token = auth.replace('Bearer ', '')
    const DEV_IDS: Record<string, User> = {
      [MOCK_USER_IDS.devAdmin]:  { id: MOCK_USER_IDS.devAdmin,  name: 'Admin Yorindo', email: 'admin@yorindo.id', role: 'admin', createdAt: '', updatedAt: '' },
      [MOCK_USER_IDS.devStaff]:  { id: MOCK_USER_IDS.devStaff,  name: 'Budi Santoso',  email: 'staff@yorindo.id', role: 'staff', createdAt: '', updatedAt: '' },
      [MOCK_USER_IDS.devViewer]: { id: MOCK_USER_IDS.devViewer, name: 'Sari Viewer',   email: 'viewer@yorindo.id', role: 'viewer', createdAt: '', updatedAt: '' },
    }
    if (token === 'dev-token') {
      const userId = request.headers.get('X-User-Id') ?? MOCK_USER_IDS.devAdmin
      const devUser = DEV_IDS[userId]
      if (devUser) return HttpResponse.json(devUser)
      return HttpResponse.json(usersStore.find((u) => u.id === userId) ?? usersStore[0])
    }
    const roleFromToken = token.replace('mock-token-', '') as User['role']
    const user = usersStore.find((u) => u.role === roleFromToken)
    return HttpResponse.json(user ?? usersStore[0])
  }),

  http.get('/api/users', async () => {
    await delay(300)
    return HttpResponse.json(usersStore)
  }),

  http.post('/api/users', async ({ request }) => {
    await delay(400)
    const body = await request.json() as { email: string; name: string; role: User['role']; password: string }
    const newUser: User = {
      id: makeMockCuid2(),
      email: body.email,
      name: body.name,
      role: body.role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    usersStore.push(newUser)
    return HttpResponse.json(newUser, { status: 201 })
  }),

  http.put('/api/users/:id', async ({ params, request }) => {
    await delay(300)
    const body = await request.json() as Partial<Pick<User, 'name' | 'role'>>
    const idx = usersStore.findIndex((u) => u.id === params.id)
    if (idx === -1) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found', details: [] } },
        { status: 404 }
      )
    }
    usersStore[idx] = { ...usersStore[idx], ...body, updatedAt: new Date().toISOString() }
    return HttpResponse.json(usersStore[idx])
  }),

  http.delete('/api/users/:id', async ({ params }) => {
    await delay(300)
    const idx = usersStore.findIndex((u) => u.id === params.id)
    if (idx === -1) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found', details: [] } },
        { status: 404 }
      )
    }
    usersStore = usersStore.filter((u) => u.id !== params.id)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/users/:id/events', async ({ params }) => {
    await delay(200)
    const eventIds = Array.from(userEventAssignments.get(params.id as string) ?? [])
    return HttpResponse.json({ eventIds })
  }),

  http.post('/api/users/:id/events', async ({ params, request }) => {
    await delay(300)
    const body = await request.json() as { eventId: string }
    const userId = params.id as string
    if (!userEventAssignments.has(userId)) {
      userEventAssignments.set(userId, new Set())
    }
    userEventAssignments.get(userId)!.add(body.eventId)
    return HttpResponse.json(
      { userId, eventId: body.eventId, grantedAt: new Date().toISOString() },
      { status: 201 }
    )
  }),

  http.delete('/api/users/:id/events/:eventId', async ({ params }) => {
    await delay(300)
    const userId = params.id as string
    const eventId = params.eventId as string
    userEventAssignments.get(userId)?.delete(eventId)
    return new HttpResponse(null, { status: 204 })
  }),
]
