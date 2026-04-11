import * as Sentry from '@sentry/node'
import Fastify from 'fastify'
import path from 'path'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { healthRoutes } from './routes/health.js'
import { participantRoutes } from './routes/participants.routes.js'
import { authRoutes } from './routes/auth.routes.js'
import { contactRoutes } from './routes/contacts.routes.js'
import { etlRoutes } from './routes/etl.routes.js'
import { usersRoutes } from './routes/users.routes.js'
import { eventsRoutes } from './routes/events.routes.js'
import { registrationsRoutes } from './routes/registrations.routes.js'
import { scanRoutes } from './routes/scan.routes.js'
import { vendorsRoutes } from './routes/vendors.routes.js'
import { templatesRoutes } from './routes/templates.routes.js'
import { surveysRoutes } from './routes/surveys.routes.js'
import { ticketsRoutes } from './routes/tickets.routes.js'
import { settingsRoutes } from './routes/settings.routes.js'
import { uploadsRoutes } from './routes/uploads.routes.js'
import { authPlugin } from './middleware/auth.js'
import { loadOpenApiDocument } from './lib/openapi.js'
import { config } from './config/index.js'

function normalizeFastifyPath(url: string): string {
  return url
    .replace(/^\/api/, '')
    .replace(/:([A-Za-z0-9_]+)/g, '{$1}')
}

function isInternalDocsRoute(url: string): boolean {
  return url === '/api/openapi.json' || url.startsWith('/api/docs')
}

export async function buildServer() {
  const openapi = loadOpenApiDocument()
  const documentedRoutes = new Set<string>()
  const registeredRoutes = new Set<string>()

  for (const [routePath, pathItem] of Object.entries(openapi.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem as Record<string, unknown>)) {
      if (['get', 'post', 'put', 'patch', 'delete'].includes(method) && operation) {
        documentedRoutes.add(`${method.toUpperCase()} ${routePath}`)
      }
    }
  }

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
  await fastify.register(authPlugin)
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  })
  await fastify.register(swagger, {
    mode: 'static',
    specification: {
      document: openapi as any,
    },
  })
  await fastify.register(swaggerUi, {
    routePrefix: '/api/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
    transformSpecificationClone: true,
  })

  fastify.addHook('onRoute', (routeOptions) => {
    const methods = Array.isArray(routeOptions.method) ? routeOptions.method : [routeOptions.method]
    for (const method of methods) {
      const upper = typeof method === 'string' ? method.toUpperCase() : ''
      if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(upper)) continue
      if (isInternalDocsRoute(routeOptions.url)) continue
      registeredRoutes.add(`${upper} ${normalizeFastifyPath(routeOptions.url)}`)
    }
  })

  // Global error handler — standardized error shape
  fastify.setErrorHandler((error, _request, reply) => {
    const statusCode = error.statusCode ?? 500
    const isValidation = error.validation != null

    fastify.log.error(error)

    if (statusCode >= 500) {
      Sentry.captureException(error)
    }

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
  await fastify.register(contactRoutes)
  await fastify.register(etlRoutes)
  await fastify.register(usersRoutes)
  await fastify.register(eventsRoutes)
  await fastify.register(templatesRoutes)
  await fastify.register(registrationsRoutes)
  await fastify.register(scanRoutes)
  await fastify.register(vendorsRoutes)
  await fastify.register(surveysRoutes)
  await fastify.register(ticketsRoutes)
  await fastify.register(settingsRoutes)
  await fastify.register(uploadsRoutes)

  fastify.get('/api/openapi.json', async (_request, reply) => {
    return reply.status(200).send(openapi)
  })

  await fastify.after()

  const undocumentedRoutes = Array.from(registeredRoutes).filter((routeKey) => !documentedRoutes.has(routeKey))
  if (undocumentedRoutes.length > 0) {
    throw new Error(`OpenAPI contract is missing registered routes: ${undocumentedRoutes.join(', ')}`)
  }

  // Static file serving for uploaded images (registered after OpenAPI validation — wildcard route not documented)
  const uploadsDir = config.uploadsDir || 'uploads'
  await fastify.register(fastifyStatic, {
    root: path.resolve(uploadsDir),
    prefix: '/api/uploads/',
  })

  return fastify
}
