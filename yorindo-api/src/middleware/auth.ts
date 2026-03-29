import type { FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { getRedisOptional } from '../lib/redis.js'

export interface JwtPayload {
  sub: string
  role: 'admin' | 'viewer' | 'staff' | 'participant'
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

    // Check Redis blacklist (revoked tokens via logout)
    const redis = getRedisOptional()
    if (redis) {
      const blacklisted = await redis.exists(`blacklist:${payload.jti}`)
      if (blacklisted) {
        return reply.status(401).send({
          error: { code: 'TOKEN_REVOKED', message: 'Token has been revoked', details: [] },
        })
      }
    }

    request.user = payload
  } catch {
    return reply.status(401).send({
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token', details: [] },
    })
  }
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (!request.user) {
    return reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required', details: [] },
    })
  }

  if (request.user.role !== 'admin') {
    return reply.status(403).send({
      error: { code: 'FORBIDDEN', message: 'Admin privileges required', details: [] },
    })
  }
}

export function requireRoles(...roles: JwtPayload['role'][]) {
  return async function requireRoleSet(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (!request.user) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required', details: [] },
      })
    }

    if (!roles.includes(request.user.role)) {
      return reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: `Required role: ${roles.join(' | ')}`,
          details: [],
        },
      })
    }
  }
}
