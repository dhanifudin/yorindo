import type { FastifyRequest, FastifyReply } from 'fastify'
import type { JwtPayload } from './auth.js'

type Role = JwtPayload['role']

export function requireRole(...roles: Role[]) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.user
    if (!user) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required', details: [] },
      })
    }
    if (!roles.includes(user.role)) {
      return reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: `Role '${user.role}' does not have access to this resource`,
          details: [],
        },
      })
    }
  }
}
