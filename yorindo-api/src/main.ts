import * as Sentry from '@sentry/node'
import { config } from './config/index.js'
import { buildServer } from './server.js'
import { startEtlWorker } from './workers/etl.worker.js'
import { startBlastWorker } from './workers/blast.worker.js'
import { syncCities } from './lib/cities-sync.js'

if (config.sentryDsn) {
  Sentry.init({ dsn: config.sentryDsn, environment: config.nodeEnv })
}

async function start(): Promise<void> {
  const fastify = await buildServer()
  let workerStarted = false
  let blastWorker: ReturnType<typeof startBlastWorker> | null = null

  try {
    if (config.redisUrl && config.nodeEnv !== 'test') {
      startEtlWorker()
      workerStarted = true
      // Start blast worker when Redis is available (both mock and real modes)
      blastWorker = startBlastWorker()
      fastify.log.info('Blast worker started')
    }

    // Sync cities data in the background — non-blocking so the server starts quickly
    if (config.nodeEnv !== 'test') {
      syncCities().then((result) => {
        fastify.log.info(
          `Cities synced: ${result.inserted} inserted, ${result.updated} updated, ${result.total} total`,
        )
      }).catch((err) => {
        fastify.log.warn({ err }, 'Background cities sync failed')
      })
    }

    await fastify.listen({ port: config.port, host: '0.0.0.0' })
    fastify.log.info(`Server listening on port ${config.port}`)
    if (workerStarted) fastify.log.info('ETL worker started')
  } catch (err) {
    await blastWorker?.close().catch(() => undefined)
    Sentry.captureException(err)
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
