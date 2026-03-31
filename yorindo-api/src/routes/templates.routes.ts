import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { InMemoryTemplateRepository } from '../repositories/memory/TemplateRepository.js'
import { InMemoryAuditLogRepository } from '../repositories/memory/AuditLogRepository.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { Template } from '../types/domain.js'

export const templateRepo = new InMemoryTemplateRepository()
export const auditRepo = new InMemoryAuditLogRepository()

export const templatesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', requireAuth)
  fastify.addHook('preHandler', requireAdmin)

  fastify.get('/api/templates', async (_request, reply) => {
    const templates = await templateRepo.findAll()
    return reply.status(200).send(templates)
  })

  const createSchema = z.object({
    name: z.string().min(1),
    type: z.enum(['invitation', 'confirmation', 'rejection', 'ticket_delivery']),
    channel: z.enum(['email', 'whatsapp']),
    body: z.string().min(1)
  })

  fastify.post('/api/templates', async (request, reply) => {
    const body = createSchema.parse(request.body)
    const template = await templateRepo.create(body)

    await auditRepo.create({
      action: 'template.created',
      actorId: request.user?.sub || null,
      actorRole: request.user?.role || 'admin',
      eventId: null,
      targetId: template.id,
      targetType: 'template',
      metadata: { name: template.name }
    })

    return reply.status(201).send(template)
  })

  const updateSchema = z.object({
    name: z.string().min(1).optional(),
    type: z.enum(['invitation', 'confirmation', 'rejection', 'ticket_delivery']).optional(),
    channel: z.enum(['email', 'whatsapp']).optional(),
    body: z.string().min(1).optional()
  })

  fastify.patch('/api/templates/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = updateSchema.parse(request.body)

    const updated = await templateRepo.update(id, body as Partial<Template>)
    if (!updated) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Template not found', details: [] }
      })
    }

    await auditRepo.create({
      action: 'template.updated',
      actorId: request.user?.sub || null,
      actorRole: request.user?.role || 'admin',
      eventId: null,
      targetId: id,
      targetType: 'template',
      metadata: { fields: Object.keys(body) }
    })

    return reply.status(200).send(updated)
  })

  fastify.delete('/api/templates/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const deleted = await templateRepo.delete(id)
    if (!deleted) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Template not found', details: [] }
      })
    }

    await auditRepo.create({
      action: 'template.deleted',
      actorId: request.user?.sub || null,
      actorRole: request.user?.role || 'admin',
      eventId: null,
      targetId: id,
      targetType: 'template',
      metadata: null
    })

    return reply.status(204).send()
  })
}
