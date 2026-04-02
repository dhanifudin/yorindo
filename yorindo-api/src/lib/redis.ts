/**
 * IORedis client — Phase 2 only.
 * NOT imported at startup. Imported only by real BullMQ workers
 * when SERVICE_IMPL=real or REPOSITORY_IMPL=postgres.
 */
import { Redis } from 'ioredis'
import { config } from '../config/index.js'

let _redis: Redis | undefined

export function getRedis(): Redis {
  if (config.nodeEnv === 'test') {
    throw new Error('Redis is disabled in test environment')
  }
  if (!config.redisUrl) {
    throw new Error('REDIS_URL is required for real queue/redis operations')
  }
  if (!_redis) {
    _redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
    _redis.on('error', (err: Error) => {
      console.error('Redis connection error', err.message)
    })
  }
  return _redis
}

/**
 * Returns a Redis client when REDIS_URL is configured,
 * or null for Phase 1 / test environments without Redis.
 */
export function getRedisOptional(): Redis | null {
  if (config.nodeEnv === 'test' || !config.redisUrl) return null
  return getRedis()
}
