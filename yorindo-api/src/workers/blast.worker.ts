import { Worker } from 'bullmq'
import {
  auditLogRepository,
  contactRepository,
  emailService,
  eventRepository,
  suppressionRepository,
  templateRepository,
  whatsAppService,
} from '../container.js'
import { getRedis } from '../lib/redis.js'
import { BlastService, type BlastJobData } from '../services/blast.service.js'

async function processBlastJob(job: { id?: string | number | null; data: BlastJobData }) {
  const blastService = new BlastService(
    emailService,
    whatsAppService,
    suppressionRepository,
    contactRepository,
    eventRepository,
    templateRepository,
    auditLogRepository,
  )

  return blastService.processJob(job.data)
}

export function startBlastWorker() {
  const redis = getRedis()
  const worker = new Worker('marketing', processBlastJob, {
    connection: redis,
    concurrency: 2,
  } as ConstructorParameters<typeof Worker>[2])

  worker.on('completed', (job, result) => {
    console.log('[blast.worker] Job completed', {
      jobId: job.id,
      result,
    })
  })

  worker.on('failed', (job, err) => {
    console.error('[blast.worker] Job failed', {
      jobId: job?.id,
      error: err.message,
    })
  })

  return worker
}
