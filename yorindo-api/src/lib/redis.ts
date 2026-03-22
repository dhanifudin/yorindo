/**
 * IORedis client — Phase 2 only.
 * NOT imported at startup. Imported only by real BullMQ workers
 * when SERVICE_IMPL=real or REPOSITORY_IMPL=postgres.
 */
import IORedis from 'ioredis'
import { config } from '../config/index.js'

let _redis: IORedis | undefined

export function getRedis(): IORedis {
  if (!config.redisUrl) {
    throw new Error('REDIS_URL is required for real queue/redis operations')
  }
  if (!_redis) {
    _redis = new IORedis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
    _redis.on('error', (err) => {
      console.error('Redis connection error', err.message)
    })
  }
  return _redis
}
