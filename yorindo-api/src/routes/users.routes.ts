import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import type { User } from '../types/domain.js'
import { userRepository, auditLogRepository, eventRepository } from '../container.js'
import { requireAuth, requireAdmin, type JwtPayload } from '../middleware/auth.js'
import { validateOpenApiRequest, validateOpenApiResponse } from '../lib/openapi-contract.js'

const CreateUserBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).nullable(),
  role: z.enum(['admin', 'viewer', 'staff', 'participant']),
})

const UpdateUserBody = z.object({
  name: z.string().min(1).nullable().optional(),
  role: z.enum(['admin', 'viewer', 'staff', 'participant']).optional(),
})

const PaginationQuery = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).optional().default(50),
})

const UserIdParams = z.object({ id: z.string().min(1) })
const UserEventParams = z.object({ id: z.string().min(1), eventId: z.string().min(1) })
const AssignEventBody = z.object({ eventId: z.string().min(1) })

export const usersRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply roles logic to the users feature routes
  fastify.addHook('preHandler', requireAuth)
  fastify.addHook('preHandler', requireAdmin)

  // ─── POST /api/users ──────────────────────────────────────────────────────
  fastify.post('/api/users', async (request, reply) => {
    const result = CreateUserBody.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid body', details: result.error.issues },
      })
    }
    const { email, password, name, role } = result.data
    validateOpenApiRequest({ path: '/users', method: 'post', body: result.data })

    const existingUser = await userRepository.findByEmail(email)
    if (existingUser) {
      return reply.status(409).send({
        error: { code: 'CONFLICT', message: 'User with this email already exists', details: [] },
      })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    
    // Create User
    const user = await userRepository.create({
      email,
      name,
      role,
      passwordHash,
    })

    // Write Audit Log
    const payload = request.user as JwtPayload
    await auditLogRepository.create({
      action: 'user.created',
      actorId: payload.sub,
      actorRole: payload.role,
      eventId: null,
      targetId: user.id,
      targetType: 'user',
      metadata: { role },
    })

    // Remove password hash from response
    const { passwordHash: _hash, ...safeUser } = user
    validateOpenApiResponse({ path: '/users', method: 'post', status: 201, body: safeUser })
    return reply.status(201).send(safeUser)
  })

  // ─── GET /api/users ───────────────────────────────────────────────────────
  fastify.get('/api/users', async (request, reply) => {
    const query = PaginationQuery.safeParse(request.query)
    const params = query.success ? query.data : { page: 1, pageSize: 50 }
    validateOpenApiRequest({ path: '/users', method: 'get', query: params })

    const { data: users, total } = await userRepository.findAll(params)

    const mapped = users.map(user => {
      const { passwordHash: _hash, ...rest } = user
      return rest
    })

    const responseBody = { data: mapped, pagination: { ...params, total, totalPages: Math.ceil(total / params.pageSize) } }
    validateOpenApiResponse({ path: '/users', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  // ─── PATCH /api/users/:id ─────────────────────────────────────────────────
  fastify.patch('/api/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    
    const result = UpdateUserBody.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid body', details: result.error.issues },
      })
    }
    validateOpenApiRequest({ path: '/users/{id}', method: 'patch', params: { id }, body: result.data })

    // Update user
    const updateData: Partial<User> = {}
    if (result.data.name !== undefined) updateData.name = result.data.name
    if (result.data.role !== undefined) updateData.role = result.data.role

    const updated = await userRepository.update(id, updateData)
    if (!updated) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'User not found', details: [] },
      })
    }

    // Write Audit Log
    const payload = request.user as JwtPayload
    const action = result.data.role ? 'user.role-changed' : 'user.updated'
    await auditLogRepository.create({
      action: action,
      actorId: payload.sub,
      actorRole: payload.role,
      eventId: null,
      targetId: updated.id,
      targetType: 'user',
      metadata: result.data,
    })

    const { passwordHash: _hash, ...safeUser } = updated
    validateOpenApiResponse({ path: '/users/{id}', method: 'patch', status: 200, body: safeUser })
    return reply.status(200).send(safeUser)
  })

  // ─── DELETE /api/users/:id ────────────────────────────────────────────────
  fastify.delete('/api/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const existing = await userRepository.findByIdIncludingDeleted(id)
    if (!existing) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'User not found', details: [] },
      })
    }

    if (existing.deletedAt) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'User not found', details: [] },
      })
    }

    // delete
    await userRepository.delete(id)

    // Write Audit Log
    const payload = request.user as JwtPayload
    await auditLogRepository.create({
      action: 'user.deactivated',
      actorId: payload.sub,
      actorRole: payload.role,
      eventId: null,
      targetId: id,
      targetType: 'user',
      metadata: null,
    })

    return reply.status(204).send()
  })

  fastify.get('/api/users/:id/events', async (request, reply) => {
    const params = UserIdParams.safeParse(request.params)
    if (!params.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid params', details: params.error.issues },
      })
    }

    const user = await userRepository.findById(params.data.id)
    if (!user) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'User not found', details: [] } })
    }

    const eventIds = await userRepository.getAssignedEvents(user.id)
    const events = (await Promise.all(eventIds.map((eventId) => eventRepository.findById(eventId)))).filter(Boolean)
    const responseBody = {
      data: events.map((event) => ({
        id: event!.id,
        name: event!.name,
        slug: event!.slug,
        description: event!.description ?? '',
        status: event!.status,
        eventDate: event!.date,
        timezone: event!.timezone,
        capacity: event!.capacity ?? undefined,
        targetCriteria: event!.targetCriteria ?? {},
        surveySchema: {},
        venue: event!.venue ?? undefined,
        industryTags: event!.targetCriteria?.industries ?? [],
        topicTags: [],
        createdAt: event!.createdAt,
        updatedAt: event!.updatedAt,
      })),
    }
    validateOpenApiRequest({ path: '/users/{id}/events', method: 'get', params: params.data })
    validateOpenApiResponse({ path: '/users/{id}/events', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.post('/api/users/:id/events', async (request, reply) => {
    const params = UserIdParams.safeParse(request.params)
    const body = AssignEventBody.safeParse(request.body)
    if (!params.success || !body.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          details: [
            ...(params.success ? [] : params.error.issues),
            ...(body.success ? [] : body.error.issues),
          ],
        },
      })
    }
    validateOpenApiRequest({ path: '/users/{id}/events', method: 'post', params: params.success ? params.data : undefined, body: body.success ? body.data : undefined })

    const user = await userRepository.findById(params.data.id)
    const event = await eventRepository.findById(body.data.eventId)
    if (!user || !event) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'User or event not found', details: [] } })
    }

    const assigned = await userRepository.getAssignedEvents(user.id)
    if (assigned.includes(event.id)) {
      return reply.status(409).send({ error: { code: 'CONFLICT', message: 'Assignment already exists', details: [] } })
    }

    const payload = request.user as JwtPayload
    await userRepository.assignEvent(user.id, event.id, payload.sub)
    await auditLogRepository.create({
      action: 'user.event-assigned',
      actorId: payload.sub,
      actorRole: payload.role,
      eventId: event.id,
      targetId: user.id,
      targetType: 'user',
      metadata: { eventId: event.id },
    })

    const responseBody = {
      id: `${user.id}:${event.id}`,
      userId: user.id,
      eventId: event.id,
      grantedAt: new Date().toISOString(),
    }
    validateOpenApiResponse({ path: '/users/{id}/events', method: 'post', status: 201, body: responseBody })
    return reply.status(201).send(responseBody)
  })

  fastify.delete('/api/users/:id/events/:eventId', async (request, reply) => {
    const params = UserEventParams.safeParse(request.params)
    if (!params.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid params', details: params.error.issues },
      })
    }

    const user = await userRepository.findById(params.data.id)
    if (!user) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'User not found', details: [] } })
    }

    await userRepository.revokeEvent(user.id, params.data.eventId)
    return reply.status(204).send()
  })
}
