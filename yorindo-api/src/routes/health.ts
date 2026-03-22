import type { FastifyInstance } from 'fastify'

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/health', async (_request, reply) => {
    return reply.send({ status: 'ok' })
  })
}
