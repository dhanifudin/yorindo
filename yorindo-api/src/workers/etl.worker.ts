/**
 * ETL BullMQ Worker (Phase 2)
 *
 * This worker processes ETL jobs from the 'etl' BullMQ queue.
 * Requires Redis (REDIS_URL env var) — Phase 2 only.
 *
 * In Phase 1, the EtlService is used directly via API route handlers or tests.
 * This worker is only started when the worker process is explicitly launched.
 */

import { Worker } from 'bullmq'
import { getRedis } from '../lib/redis.js'
import { contactRepository, flaggedRecordsRepository, rawUploadRepository, auditLogRepository, etlNormalizationService } from '../container.js'
import { EtlService } from '../services/etl.service.js'

const etlService = new EtlService(contactRepository, flaggedRecordsRepository, rawUploadRepository, auditLogRepository, etlNormalizationService)

export function startEtlWorker(): Worker {
  const redis = getRedis()

  const worker = new Worker(
    'etl',
    async (job) => {
      const { filePath, uploadedBy } = job.data as { filePath: string; uploadedBy: string }
      return await etlService.processFile(filePath, uploadedBy)
    },
    {
      connection: redis,
      concurrency: 1, // One ETL job at a time to avoid AI provider rate limits
    },
  )

  worker.on('completed', (job, result) => {
    console.info(`ETL job ${job.id} completed:`, result)
  })

  worker.on('failed', (job, err) => {
    console.error(`ETL job ${job?.id} failed:`, err.message)
  })

  return worker
}
