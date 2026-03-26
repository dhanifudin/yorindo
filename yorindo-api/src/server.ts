import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import { healthRoutes } from './routes/health.js'
import { participantRoutes } from './routes/participants.routes.js'
import { authRoutes } from './routes/auth.routes.js'

export async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: process.env['LOG_LEVEL'] ?? 'info',
    },
  })

  // Security & utility plugins
  await fastify.register(helmet, {
    contentSecurityPolicy: false, // API — no HTML served
  })
  await fastify.register(cors, {
    origin: process.env['CORS_ORIGIN'] ?? true,
    credentials: true,
  })
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })
  await fastify.register(cookie, {
    secret: process.env['JWT_REFRESH_SECRET'] ?? 'dev-secret',
  })
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  })

  // Global error handler — standardized error shape
  fastify.setErrorHandler((error, _request, reply) => {
    const statusCode = error.statusCode ?? 500
    const isValidation = error.validation != null

    fastify.log.error(error)

    return reply.status(statusCode).send({
      error: {
        code: isValidation ? 'VALIDATION_ERROR' : (error.code ?? 'INTERNAL_ERROR'),
        message: error.message,
        details: error.validation ?? [],
      },
    })
  })

  // Routes
  await fastify.register(healthRoutes)
  await fastify.register(participantRoutes)
  await fastify.register(authRoutes)

  return fastify
}
