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
  name: z.string().min(1),
  role: z.enum(['admin', 'viewer', 'staff', 'participant']),
})

const UpdateUserBody = z.object({
  name: z.string().min(1).nullable().optional(),
  role: z.enum(['admin', 'viewer', 'staff', 'participant']).optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' })

const PaginationQuery = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).optional().default(50),
})

const UserIdParams = z.object({ id: z.string().min(1) })
const UserEventParams = z.object({ id: z.string().min(1), eventId: z.string().min(1) })
const AssignEventBody = z.object({ eventId: z.string().min(1) })

export const usersRoutes: FastifyPluginAsync = async (fastify) => {
  const adminOnly = { preHandler: [requireAuth, requireAdmin] }

  // ─── GET /api/users/me ────────────────────────────────────────────────────
  fastify.get('/api/users/me', { preHandler: requireAuth }, async (request, reply) => {
    const payload = request.user as JwtPayload
    const user = await userRepository.findById(payload.sub)
    if (!user) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'User not found', details: [] },
      })
    }
    const { passwordHash: _hash, ...safeUser } = user
    return reply.status(200).send(safeUser)
  })

  fastify.get('/api/users/me/assigned-events', { preHandler: requireAuth }, async (request, reply) => {
    const payload = request.user as JwtPayload
    if (payload.role === 'admin') {
      const result = await eventRepository.findAll({ page: 1, pageSize: 200 })
      const responseBody = {
        data: result.data.map((event) => ({
          id: event.id,
          name: event.name,
          slug: event.slug,
          description: event.description ?? '',
          status: event.status,
          eventDate: event.startDate,
          timezone: event.timezone,
          capacity: event.capacity ?? undefined,
          targetCriteria: event.targetCriteria ?? {},
          surveySchema: {},
          venue: event.venue ?? undefined,
          industryTags: event.targetCriteria?.serviceTypes ?? [],
          eventType: 'conference',
          topicTags: [],
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
        })),
      }
      validateOpenApiResponse({ path: '/users/me/assigned-events', method: 'get', status: 200, body: responseBody })
      return reply.status(200).send(responseBody)
    }

    const eventIds = await userRepository.getAssignedEvents(payload.sub)
    const events = (await Promise.all(eventIds.map((eventId) => eventRepository.findById(eventId)))).filter(Boolean)
    const responseBody = {
      data: events.map((event) => ({
        id: event!.id,
        name: event!.name,
        slug: event!.slug,
        description: event!.description ?? '',
        status: event!.status,
        eventDate: event!.startDate,
        timezone: event!.timezone,
        capacity: event!.capacity ?? undefined,
        targetCriteria: event!.targetCriteria ?? {},
        surveySchema: {},
        venue: event!.venue ?? undefined,
        industryTags: event!.targetCriteria?.serviceTypes ?? [],
        eventType: 'conference',
        topicTags: [],
        createdAt: event!.createdAt,
        updatedAt: event!.updatedAt,
      })),
    }
    validateOpenApiResponse({ path: '/users/me/assigned-events', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  // ─── POST /api/users ──────────────────────────────────────────────────────
  fastify.post('/api/users', adminOnly, async (request, reply) => {
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

    // Write Audit Log (non-blocking)
    const payload = request.user as JwtPayload
    try {
      await auditLogRepository.create({
        action: 'user.created',
        actorId: payload.sub,
        actorRole: payload.role,
        eventId: null,
        targetId: user.id,
        targetType: 'user',
        metadata: { role },
      })
    } catch (auditErr) {
      console.warn('Audit log write failed on user.created:', auditErr)
    }

    // Remove password hash from response
    const { passwordHash: _hash, ...safeUser } = user
    validateOpenApiResponse({ path: '/users', method: 'post', status: 201, body: safeUser })
    return reply.status(201).send(safeUser)
  })

  // ─── GET /api/users ───────────────────────────────────────────────────────
  fastify.get('/api/users', adminOnly, async (request, reply) => {
    const query = PaginationQuery.safeParse(request.query)
    if (!query.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid query params', details: query.error.issues },
      })
    }
    const params = query.data
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
  fastify.patch('/api/users/:id', adminOnly, async (request, reply) => {
    const paramsResult = UserIdParams.safeParse(request.params)
    if (!paramsResult.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid params', details: paramsResult.error.issues },
      })
    }
    const { id } = paramsResult.data

    const payload = request.user as JwtPayload
    if (id === payload.sub) {
      return reply.status(400).send({
        error: { code: 'FORBIDDEN', message: 'Cannot modify your own account', details: [] },
      })
    }

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

    // Write Audit Log (non-blocking)
    const action = result.data.role ? 'user.role-changed' : 'user.updated'
    try {
      await auditLogRepository.create({
        action: action,
        actorId: payload.sub,
        actorRole: payload.role,
        eventId: null,
        targetId: updated.id,
        targetType: 'user',
        metadata: result.data,
      })
    } catch (auditErr) {
      console.warn('Audit log write failed on user.updated:', auditErr)
    }

    const { passwordHash: _hash, ...safeUser } = updated
    validateOpenApiResponse({ path: '/users/{id}', method: 'patch', status: 200, body: safeUser })
    return reply.status(200).send(safeUser)
  })

  // ─── DELETE /api/users/:id ────────────────────────────────────────────────
  fastify.delete('/api/users/:id', adminOnly, async (request, reply) => {
    const paramsResult = UserIdParams.safeParse(request.params)
    if (!paramsResult.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid params', details: paramsResult.error.issues },
      })
    }
    const { id } = paramsResult.data

    const payload = request.user as JwtPayload
    if (id === payload.sub) {
      return reply.status(400).send({
        error: { code: 'FORBIDDEN', message: 'Cannot delete your own account', details: [] },
      })
    }

    const existing = await userRepository.findByIdIncludingDeleted(id)
    if (!existing || existing.deletedAt) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'User not found', details: [] },
      })
    }

    await userRepository.delete(id)

    // Write Audit Log (non-blocking)
    try {
      await auditLogRepository.create({
        action: 'user.deactivated',
        actorId: payload.sub,
        actorRole: payload.role,
        eventId: null,
        targetId: id,
        targetType: 'user',
        metadata: null,
      })
    } catch (auditErr) {
      console.warn('Audit log write failed on user.deactivated:', auditErr)
    }

    return reply.status(204).send()
  })

  fastify.get('/api/users/:id/events', adminOnly, async (request, reply) => {
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
        eventDate: event!.startDate,
        timezone: event!.timezone,
        capacity: event!.capacity ?? undefined,
        targetCriteria: event!.targetCriteria ?? {},
        surveySchema: {},
        venue: event!.venue ?? undefined,
        industryTags: event!.targetCriteria?.serviceTypes ?? [],
        topicTags: [],
        createdAt: event!.createdAt,
        updatedAt: event!.updatedAt,
      })),
    }
    validateOpenApiRequest({ path: '/users/{id}/events', method: 'get', params: params.data })
    validateOpenApiResponse({ path: '/users/{id}/events', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })

  fastify.post('/api/users/:id/events', adminOnly, async (request, reply) => {
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

    if (user.role !== 'staff' && user.role !== 'viewer') {
      return reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Only staff and viewer accounts can receive event assignments',
          details: [],
        },
      })
    }

    const assigned = await userRepository.getAssignedEvents(user.id)
    if (assigned.includes(event.id)) {
      return reply.status(409).send({ error: { code: 'CONFLICT', message: 'Assignment already exists', details: [] } })
    }

    const payload = request.user as JwtPayload
    const assignment = await userRepository.assignEvent(user.id, event.id, payload.sub)
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
      grantedAt: assignment.grantedAt,
    }
    validateOpenApiResponse({ path: '/users/{id}/events', method: 'post', status: 201, body: responseBody })
    return reply.status(201).send(responseBody)
  })

  fastify.delete('/api/users/:id/events/:eventId', adminOnly, async (request, reply) => {
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

    const assigned = await userRepository.getAssignedEvents(user.id)
    if (!assigned.includes(params.data.eventId)) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Event assignment not found', details: [] } })
    }

    await userRepository.revokeEvent(user.id, params.data.eventId)
    return reply.status(204).send()
  })
}
