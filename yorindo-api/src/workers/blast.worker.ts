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
import { blastProgressStore } from '../lib/blast-progress-store.js'
import { BlastService, type BlastJobData } from '../services/blast.service.js'

async function processBlastJob(job: { id?: string | number | null; data: BlastJobData }) {
  const jobData = job.data
  const jobId = String(job.id ?? jobData.templateId)

  // Register job in progress store
  blastProgressStore.register({
    jobId,
    eventId: jobData.eventId,
    channel: jobData.channel,
    templateId: jobData.templateId,
    templateName: jobData.templateName,
    totalContacts: jobData.contactIds?.length ?? 0,
    sentCount: 0,
    failedCount: 0,
    suppressedCount: 0,
    status: jobData.scheduledAt ? 'scheduled' : 'running',
    startedAt: new Date().toISOString(),
    completedAt: null,
    scheduledAt: jobData.scheduledAt ?? null,
  })

  const blastService = new BlastService(
    emailService,
    whatsAppService,
    suppressionRepository,
    contactRepository,
    eventRepository,
    templateRepository,
    auditLogRepository,
  )

  const result = await blastService.processJob(jobData)

  // Update final status
  blastProgressStore.update(jobId, {
    sentCount: result.sentCount,
    failedCount: result.failedCount,
    suppressedCount: result.suppressedCount,
    status: result.failureRate > 0.5 ? 'failed' : 'completed',
    completedAt: new Date().toISOString(),
  })

  return result
}

export function startBlastWorker() {
  const redis = getRedis()
  const worker = new Worker('marketing', processBlastJob, {
    connection: redis,
    concurrency: 2,
    settings: {
      backoffStrategies: {
        exponential: (attempts: number) => Math.pow(2, attempts) * 1000,
      },
    },
    limiter: {
      max: 10,
      duration: 1000,
    },
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
