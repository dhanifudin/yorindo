import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import type { User } from '../types/domain.js'
import { userRepository, auditLogRepository } from '../container.js'
import { requireAuth, requireAdmin, type JwtPayload } from '../middleware/auth.js'

const CreateUserBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).nullable(),
  role: z.enum(['admin', 'viewer', 'staff']),
})

const UpdateUserBody = z.object({
  name: z.string().min(1).nullable().optional(),
  role: z.enum(['admin', 'viewer', 'staff']).optional(),
})

const PaginationQuery = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).optional().default(50),
})

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
    return reply.status(201).send(safeUser)
  })

  // ─── GET /api/users ───────────────────────────────────────────────────────
  fastify.get('/api/users', async (request, reply) => {
    const query = PaginationQuery.safeParse(request.query)
    const params = query.success ? query.data : { page: 1, pageSize: 50 }

    const { data: users, total } = await userRepository.findAll(params)

    const mapped = users.map(user => {
      const { passwordHash: _hash, ...rest } = user
      return rest
    })

    return reply.status(200).send({ data: mapped, pagination: { ...params, total } })
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
    return reply.status(200).send(safeUser)
  })

  // ─── DELETE /api/users/:id ────────────────────────────────────────────────
  fastify.delete('/api/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const existing = await userRepository.findById(id)
    if (!existing) {
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
}
