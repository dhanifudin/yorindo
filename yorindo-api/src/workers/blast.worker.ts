/**
 * Blast BullMQ Worker — Phase 2 only.
 * NOT auto-started at startup. Requires Redis (getRedis()) + SERVICE_IMPL=real.
 *
 * Usage: call startBlastWorker() from Phase 2 server entry after Redis is confirmed.
 */
import { Worker } from 'bullmq'
import { getRedis } from '../lib/redis.js'
import { emailService, whatsAppService, suppressionRepository, contactRepository, eventRepository } from '../container.js'
import { BlastService, type BlastJobData, type AuditEntry } from '../services/blast.service.js'

// In-memory audit logger for Phase 1 tests / Phase 2 pre-DB setup
const consoleAuditLogger = {
  async log(entry: AuditEntry): Promise<void> {
    console.log(`[AUDIT] ${entry.level.toUpperCase()} ${entry.action}`, JSON.stringify(entry.metadata))
  },
}

async function processBlastJob(job: { data: BlastJobData }) {
  const blastService = new BlastService(
    emailService,
    whatsAppService,
    suppressionRepository,
    contactRepository,
    eventRepository,
    consoleAuditLogger,
  )
  return blastService.processJob(job.data)
}

export function startBlastWorker() {
  const redis = getRedis()

  const worker = new Worker('marketing', processBlastJob, {
    connection: redis,
    concurrency: 2,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    },
  } as ConstructorParameters<typeof Worker>[2])

  worker.on('completed', (job) => {
    console.log(`[blast.worker] Job ${job.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[blast.worker] Job ${job?.id} failed: ${err.message}`)
  })

  return worker
}
