import type { FastifyPluginAsync, FastifyReply } from 'fastify'
import { z } from 'zod'
import { validateOpenApiRequest, validateOpenApiResponse } from '../lib/openapi-contract.js'
import { requireAuth } from '../middleware/auth.js'
import { listTemplates } from '../data/templates.js'

const TemplatesQuerySchema = z.object({})

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
  fastify.get('/api/templates', { preHandler: requireAuth }, async (request, reply) => {
    const parsed = TemplatesQuerySchema.safeParse(request.query ?? {})
    if (!parsed.success) {
      return replyValidationError(reply, parsed.error.issues, 'Invalid query params')
    }

    validateOpenApiRequest({ path: '/templates', method: 'get', query: parsed.data })
    const responseBody = listTemplates()
    validateOpenApiResponse({ path: '/templates', method: 'get', status: 200, body: responseBody })
    return reply.status(200).send(responseBody)
  })
}
