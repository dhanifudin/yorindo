import * as Sentry from '@sentry/node'
import { config } from './config/index.js'
import { buildServer } from './server.js'
import { startEtlWorker } from './workers/etl.worker.js'

if (config.sentryDsn) {
  Sentry.init({ dsn: config.sentryDsn, environment: config.nodeEnv })
}

async function start(): Promise<void> {
  const fastify = await buildServer()
  let workerStarted = false

  try {
    if (config.redisUrl && config.nodeEnv !== 'test') {
      startEtlWorker()
      workerStarted = true
    }
    await fastify.listen({ port: config.port, host: '0.0.0.0' })
    fastify.log.info(`Server listening on port ${config.port}`)
    if (workerStarted) fastify.log.info('ETL worker started')
  } catch (err) {
    Sentry.captureException(err)
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
