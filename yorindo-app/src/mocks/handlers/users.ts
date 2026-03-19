import { http, HttpResponse, delay } from 'msw'
import { faker } from '@faker-js/faker'
import type { User } from '@/types/api'

// user_id -> Set of eventIds
const userEventAssignments: Map<string, Set<string>> = new Map([
  ['user-002', new Set(['event-001', 'event-003'])],
  ['user-003', new Set(['event-001'])],
])

let usersStore: User[] = [
  {
    id: 'user-001',
    name: 'Super Admin',
    email: 'admin@yorindo.app',
    role: 'admin',
    createdAt: new Date('2026-01-01').toISOString(),
    updatedAt: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'user-002',
    name: 'Budi Santoso',
    email: 'budi@yorindo.app',
    role: 'staff',
    createdAt: new Date('2026-02-10').toISOString(),
    updatedAt: new Date('2026-02-10').toISOString(),
  },
  {
    id: 'user-003',
    name: 'Sari Dewi',
    email: 'sari@yorindo.app',
    role: 'viewer',
    createdAt: new Date('2026-02-15').toISOString(),
    updatedAt: new Date('2026-02-15').toISOString(),
  },
]

export const userHandlers = [
  http.get('/api/users', async () => {
    await delay(300)
    return HttpResponse.json(usersStore)
  }),

  http.post('/api/users', async ({ request }) => {
    await delay(400)
    const body = await request.json() as { email: string; name: string; role: User['role']; password: string }
    const newUser: User = {
      id: faker.string.uuid(),
      email: body.email,
      name: body.name,
      role: body.role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    usersStore.push(newUser)
    return HttpResponse.json(newUser, { status: 201 })
  }),

  http.patch('/api/users/:id', async ({ params, request }) => {
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
