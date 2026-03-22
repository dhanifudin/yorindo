/**
 * Erasure BullMQ Worker — Phase 2 only.
 * NOT auto-started at startup. Requires Redis + SERVICE_IMPL=real.
 *
 * Usage: call startErasureWorker() from Phase 2 server entry after Redis is confirmed.
 */
import { Worker } from 'bullmq'
import { getRedis } from '../lib/redis.js'
import { contactRepository, suppressionRepository } from '../container.js'
import { ErasureService, type ErasureRequest, type ErasureResult } from '../services/erasure.service.js'
import type { AuditEntry } from '../services/blast.service.js'

const consoleAuditLogger = {
  async log(entry: AuditEntry): Promise<void> {
    console.log(`[AUDIT] ${entry.level.toUpperCase()} ${entry.action}`, JSON.stringify(entry.metadata))
  },
}

async function processErasureJob(job: { data: ErasureRequest }): Promise<ErasureResult> {
  const erasureService = new ErasureService(
    contactRepository,
    suppressionRepository,
    consoleAuditLogger,
  )
  return erasureService.anonymizeContact(job.data)
}

export function startErasureWorker() {
  const redis = getRedis()

  const worker = new Worker('transactional', processErasureJob, {
    connection: redis,
    concurrency: 5,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    },
  } as ConstructorParameters<typeof Worker>[2])

  worker.on('completed', (job) => {
    console.log(`[erasure.worker] Job ${job.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[erasure.worker] Job ${job?.id} failed: ${err.message}`)
  })

  return worker
}
