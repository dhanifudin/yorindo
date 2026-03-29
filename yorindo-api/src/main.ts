import * as Sentry from '@sentry/node'
import { config } from './config/index.js'
import { buildServer } from './server.js'

if (config.sentryDsn) {
  Sentry.init({ dsn: config.sentryDsn, environment: config.nodeEnv })
}

async function start(): Promise<void> {
  const fastify = await buildServer()

  try {
    await fastify.listen({ port: config.port, host: '0.0.0.0' })
    fastify.log.info(`Server listening on port ${config.port}`)
  } catch (err) {
    Sentry.captureException(err)
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
