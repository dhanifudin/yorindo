import { config } from './config/index.js'
import { buildServer } from './server.js'

async function start(): Promise<void> {
  const fastify = await buildServer()

  try {
    await fastify.listen({ port: config.port, host: '0.0.0.0' })
    fastify.log.info(`Server listening on port ${config.port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
