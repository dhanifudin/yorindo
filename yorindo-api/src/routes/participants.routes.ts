import type { FastifyInstance } from 'fastify'
import { contactRepository, suppressionRepository } from '../container.js'
import { ErasureService, ErasureError } from '../services/erasure.service.js'
import type { AuditEntry } from '../services/blast.service.js'

const consoleAuditLogger = {
  async log(entry: AuditEntry): Promise<void> {
    console.log(`[AUDIT] ${entry.level.toUpperCase()} ${entry.action}`, JSON.stringify(entry.metadata))
  },
}

export async function participantRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{
    Body: { phone: string; email: string }
  }>('/api/participants/erasure-request', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 hour',
      },
    },
    schema: {
      body: {
        type: 'object',
        required: ['phone', 'email'],
        properties: {
          phone: { type: 'string', minLength: 8, maxLength: 20 },
          email: { type: 'string', format: 'email' },
        },
      },
    },
  }, async (request, reply) => {
    const { phone, email } = request.body

    const erasureService = new ErasureService(
      contactRepository,
      suppressionRepository,
      consoleAuditLogger,
    )

    try {
      const result = await erasureService.anonymizeContact({ phone, email })
      return reply.status(202).send(result)
    } catch (err) {
      if (err instanceof ErasureError) {
        return reply.status(err.httpStatus).send({
          error: {
            code: err.code,
            message: err.message,
          },
        })
      }
      throw err
    }
  })
}
