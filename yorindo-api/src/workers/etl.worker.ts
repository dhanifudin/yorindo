import { Worker, type ConnectionOptions } from 'bullmq'
import {
  auditLogRepository,
  contactRepository,
  deduplicationService,
  etlNormalizationService,
  flaggedRecordsRepository,
  rawUploadRepository,
  registrationRepository,
} from '../container.js'
import { getRedis } from '../lib/redis.js'
import { EtlService } from '../services/etl.service.js'

const etlService = new EtlService(
  contactRepository,
  flaggedRecordsRepository,
  rawUploadRepository,
  auditLogRepository,
  registrationRepository,
  etlNormalizationService,
  deduplicationService,
)

export function startEtlWorker(): Worker {
  const redis = getRedis()

  const worker = new Worker(
    'etl',
    async (job) => {
      const data = job.data as {
        filePath: string
        uploadedBy: string
        eventId?: string | null
        uploadSource?: 'etl_import' | 'onsite_import'
        originalFilename?: string | null
      }

      const options: {
        eventId?: string | null
        uploadSource?: 'etl_import' | 'onsite_import'
        originalFilename?: string | null
        onProgress?: (percent: number) => void
      } = {}

      if (data.eventId !== undefined) options.eventId = data.eventId
      if (data.uploadSource !== undefined) options.uploadSource = data.uploadSource
      if (data.originalFilename !== undefined) options.originalFilename = data.originalFilename
      options.onProgress = (percent: number) => job.updateProgress(percent)

      console.info('[ETL] Worker picked up job', {
        jobId: job.id,
        filePath: data.filePath,
        uploadedBy: data.uploadedBy,
        eventId: data.eventId ?? null,
        uploadSource: data.uploadSource ?? 'etl_import',
        originalFilename: data.originalFilename ?? null,
      })
      return etlService.processFile(data.filePath, data.uploadedBy, options)
    },
    {
      connection: redis as unknown as ConnectionOptions,
      concurrency: 1,
    },
  )

  worker.on('completed', (job, result) => {
    console.info(`ETL job ${job.id} completed:`, result)
  })

  worker.on('failed', (job, err) => {
    console.error(`ETL job ${job?.id} failed:`, {
      message: err.message,
      stack: err.stack,
    })
  })

  return worker
}
