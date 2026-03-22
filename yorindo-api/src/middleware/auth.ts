import type { FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'

export interface JwtPayload {
  sub: string
  role: 'super_admin' | 'event_admin' | 'staff' | 'vendor_client' | 'participant'
  jti: string
  iat: number
  exp: number
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload
  }
}

export const authPlugin: FastifyPluginAsync = fp(async (fastify) => {
  fastify.decorateRequest('user', undefined)
})

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers['authorization']
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required', details: [] },
    })
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload
    request.user = payload
  } catch {
    return reply.status(401).send({
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token', details: [] },
    })
  }
}
