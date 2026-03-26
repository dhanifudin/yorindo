/**
 * Auth Routes
 *
 * POST /api/auth/login    — password verify → access + refresh tokens
 * POST /api/auth/refresh  — refresh cookie rotation → new access token
 * POST /api/auth/logout   — blacklist current access token jti
 */

import '@fastify/cookie'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { AuthService } from '../services/auth.service.js'
import { requireAuth, type JwtPayload } from '../middleware/auth.js'
import { userRepository } from '../container.js'
import { getRedisOptional } from '../lib/redis.js'

const REFRESH_COOKIE = 'refreshToken'
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days (ms)

const LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(userRepository, getRedisOptional())

  // ─── POST /api/auth/login ─────────────────────────────────────────────────
  fastify.post('/api/auth/login', async (request, reply) => {
    const result = LoginBodySchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: result.error.issues },
      })
    }

    const { email, password } = result.data

    try {
      const { accessToken, refreshToken, user } = await authService.login(email, password)

      reply.setCookie(REFRESH_COOKIE, refreshToken, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'lax',
        maxAge: REFRESH_COOKIE_MAX_AGE,
        path: '/api/auth',
      })

      return reply.status(200).send({ accessToken, user })
    } catch (err: unknown) {
      const e = err as { statusCode?: number; code?: string; message: string }
      return reply.status(e.statusCode ?? 500).send({
        error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message, details: [] },
      })
    }
  })

  // ─── POST /api/auth/refresh ───────────────────────────────────────────────
  fastify.post('/api/auth/refresh', async (request, reply) => {
    const refreshToken = request.cookies?.[REFRESH_COOKIE]
    if (!refreshToken) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Refresh token missing', details: [] },
      })
    }

    try {
      const { accessToken } = await authService.refresh(refreshToken)
      return reply.status(200).send({ accessToken })
    } catch (err: unknown) {
      const e = err as { statusCode?: number; code?: string; message: string }
      return reply.status(e.statusCode ?? 500).send({
        error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message, details: [] },
      })
    }
  })

  // ─── POST /api/auth/logout ────────────────────────────────────────────────
  fastify.post('/api/auth/logout', { preHandler: requireAuth }, async (request, reply) => {
    const payload = request.user as JwtPayload
    await authService.logout(payload.jti, payload.exp)

    reply.clearCookie(REFRESH_COOKIE, { path: '/api/auth' })
    return reply.status(204).send()
  })
}
