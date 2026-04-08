import type { FastifyPluginAsync, FastifyReply } from 'fastify'
import { z } from 'zod'
import { validateOpenApiRequest, validateOpenApiResponse } from '../lib/openapi-contract.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { InMemoryTemplateRepository } from '../repositories/memory/TemplateRepository.js'
import { InMemoryAuditLogRepository } from '../repositories/memory/AuditLogRepository.js'
import { Template } from '../types/domain.js'

// Template routes - supports both PATCH and PUT for updates
// repositories
export const templateRepo = new InMemoryTemplateRepository()
export const auditRepo = new InMemoryAuditLogRepository()

// helper for consistent validation error
function replyValidationError(reply: FastifyReply, details: unknown, message: string) {
  return reply.status(400).send({
    error: {
      code: 'VALIDATION_ERROR',
      message,
      details,
    },
  })
}

export const templatesRoutes: FastifyPluginAsync = async (fastify) => {
  // 🔒 enforce auth + admin globally for this route group
  fastify.addHook('preHandler', requireAuth)
  fastify.addHook('preHandler', requireAdmin)

  // =========================
  // GET /api/templates
  // =========================
  fastify.get('/api/templates', async (request, reply) => {
    validateOpenApiRequest({ path: '/templates', method: 'get' })

    const templates = await templateRepo.findAll()

    validateOpenApiResponse({
      path: '/templates',
      method: 'get',
      status: 200,
      body: templates,
    })

    return reply.status(200).send(templates)
  })

  // =========================
  // POST /api/templates
  // =========================
  const createSchema = z.object({
    name: z.string().min(1),
    type: z.enum(['invitation', 'confirmation', 'rejection', 'ticket_delivery']),
    channel: z.enum(['email', 'whatsapp']),
    body: z.string().min(1),
  })

  fastify.post('/api/templates', async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) {
      return replyValidationError(reply, parsed.error.issues, 'Invalid request body')
    }

    validateOpenApiRequest({
      path: '/templates',
      method: 'post',
      body: parsed.data,
    })

    const template = await templateRepo.create(parsed.data)

    await auditRepo.create({
      action: 'template.created',
      actorId: request.user?.sub ?? null,
      actorRole: request.user?.role ?? 'unknown',
      eventId: null,
      targetId: template.id,
      targetType: 'template',
      metadata: { name: template.name },
    })

    validateOpenApiResponse({
      path: '/templates',
      method: 'post',
      status: 201,
      body: template,
    })

    return reply.status(201).send(template)
  })

  // =========================
  // PATCH /api/templates/:id
  // =========================
  const paramsSchema = z.object({
    id: z.string().trim().min(1),
  })

  const updateSchema = z.object({
    name: z.string().min(1).optional(),
    type: z.enum(['invitation', 'confirmation', 'rejection', 'ticket_delivery']).optional(),
    channel: z.enum(['email', 'whatsapp']).optional(),
    body: z.string().min(1).optional(),
  })

  const handleUpdateTemplate = async (request: any, reply: FastifyReply) => {
    const paramsParsed = paramsSchema.safeParse(request.params)
    if (!paramsParsed.success) {
      return replyValidationError(reply, paramsParsed.error.issues, 'Invalid params')
    }

    const bodyParsed = updateSchema.safeParse(request.body)
    if (!bodyParsed.success) {
      return replyValidationError(reply, bodyParsed.error.issues, 'Invalid request body')
    }

    validateOpenApiRequest({
      path: '/templates/{id}',
      method: 'patch',
      params: paramsParsed.data,
      body: bodyParsed.data,
    })

    const updated = await templateRepo.update(
      paramsParsed.data.id,
      bodyParsed.data as Partial<Template>
    )

    if (!updated) {
      return reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Template not found',
          details: [],
        },
      })
    }

    await auditRepo.create({
      action: 'template.updated',
      actorId: request.user?.sub ?? null,
      actorRole: request.user?.role ?? 'unknown',
      eventId: null,
      targetId: paramsParsed.data.id,
      targetType: 'template',
      metadata: { fields: Object.keys(bodyParsed.data) },
    })

    validateOpenApiResponse({
      path: '/templates/{id}',
      method: 'patch',
      status: 200,
      body: updated,
    })

    return reply.status(200).send(updated)
  }

  // Support both PATCH and PUT for template updates
  fastify.patch('/api/templates/:id', handleUpdateTemplate)
  fastify.put('/api/templates/:id', handleUpdateTemplate)

  // =========================
  // DELETE /api/templates/:id
  // =========================
  fastify.delete('/api/templates/:id', async (request, reply) => {
    const paramsParsed = paramsSchema.safeParse(request.params)
    if (!paramsParsed.success) {
      return replyValidationError(reply, paramsParsed.error.issues, 'Invalid params')
    }

    validateOpenApiRequest({
      path: '/templates/{id}',
      method: 'delete',
      params: paramsParsed.data,
    })

    const deleted = await templateRepo.delete(paramsParsed.data.id)

    if (!deleted) {
      return reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Template not found',
          details: [],
        },
      })
    }

    await auditRepo.create({
      action: 'template.deleted',
      actorId: request.user?.sub ?? null,
      actorRole: request.user?.role ?? 'unknown',
      eventId: null,
      targetId: paramsParsed.data.id,
      targetType: 'template',
      metadata: null,
    })

    validateOpenApiResponse({
      path: '/templates/{id}',
      method: 'delete',
      status: 204,
      body: null,
    })

    return reply.status(204).send()
  })
}
