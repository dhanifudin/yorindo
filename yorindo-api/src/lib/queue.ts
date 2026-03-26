/**
 * BullMQ Queue factory — Phase 2 only.
 * NOT imported at startup in Phase 1. Phase 1 uses MockQueueService.
 * Imported only by real worker files when SERVICE_IMPL=real.
 */
import { Queue, type ConnectionOptions } from 'bullmq'
import { getRedis } from './redis.js'

function createQueue(name: string): Queue {
  return new Queue(name, {
    connection: getRedis() as unknown as ConnectionOptions,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  })
}

// Four named queues — priority descending: otp > emergency-blast > transactional > marketing
export function getOtpQueue(): Queue { return createQueue('otp') }
export function getEmergencyBlastQueue(): Queue { return createQueue('emergency-blast') }
export function getTransactionalQueue(): Queue { return createQueue('transactional') }
export function getMarketingQueue(): Queue { return createQueue('marketing') }
export function getEtlQueue(): Queue { return createQueue('etl') }
