import * as Sentry from '@sentry/node'
import { config } from './config/index.js'
import { buildServer } from './server.js'
import { startBlastWorker } from './workers/blast.worker.js'

if (config.sentryDsn) {
  Sentry.init({ dsn: config.sentryDsn, environment: config.nodeEnv })
}

async function start(): Promise<void> {
  const fastify = await buildServer()
  let blastWorker: ReturnType<typeof startBlastWorker> | null = null

  try {
    if (config.serviceImpl === 'real' && config.redisUrl) {
      blastWorker = startBlastWorker()
      fastify.log.info('Blast worker started')
    }
    await fastify.listen({ port: config.port, host: '0.0.0.0' })
    fastify.log.info(`Server listening on port ${config.port}`)
  } catch (err) {
    await blastWorker?.close().catch(() => undefined)
    Sentry.captureException(err)
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
