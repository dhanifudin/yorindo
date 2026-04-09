import type { IQueueService, QueueName, EnqueueOptions, JobStatus, JobInfo } from '../../../interfaces/services/IQueueService.js'
import { createId } from '@paralleldrive/cuid2'
import { blastProgressStore } from '../../../lib/blast-progress-store.js'

interface EnqueuedJob {
  jobId: string
  queueName: QueueName
  job: object
  opts?: EnqueueOptions
  enqueuedAt: string
  status: JobStatus
}

export class MockQueueService implements IQueueService {
  private enqueuedJobs: EnqueuedJob[] = []

  async enqueue(queueName: QueueName, job: object, _opts?: EnqueueOptions): Promise<string> {
    const jobId = `mock-job-${createId()}`
    const entry: EnqueuedJob = {
      jobId,
      queueName,
      job,
      enqueuedAt: new Date().toISOString(),
      status: 'queued',
    }
    if (_opts) entry.opts = _opts
    this.enqueuedJobs.push(entry)

    // Simulate async job processing for blast jobs
    if (queueName === 'marketing') {
      this.simulateBlastJob(jobId, job as Record<string, unknown>)
    }

    return jobId
  }

  /** Simulate blast job processing with progress updates */
  private async simulateBlastJob(jobId: string, job: Record<string, unknown>): Promise<void> {
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

    // Mark as running after short delay
    await delay(1000)
    const jobData = job as { contactIds?: string[]; eventId: string; channel: string; templateId: string; templateName: string; scheduledAt?: string }
    const totalContacts = jobData.contactIds?.length ?? 247

    blastProgressStore.update(jobId, { status: 'running', sentCount: 0 })

    // Simulate progressive sending
    const batchSize = Math.max(1, Math.floor(totalContacts / 5))
    let sent = 0
    for (let i = 0; i < 5; i++) {
      await delay(500 + Math.random() * 500)
      sent = Math.min(totalContacts, sent + batchSize)
      blastProgressStore.update(jobId, { sentCount: sent })
    }

    // Complete
    blastProgressStore.update(jobId, {
      status: 'completed',
      sentCount: totalContacts,
      failedCount: 0,
      suppressedCount: 0,
      completedAt: new Date().toISOString(),
    })
  }

  async getStatus(jobId: string): Promise<JobInfo> {
    const found = this.enqueuedJobs.find(j => j.jobId === jobId)
    return {
      status: found?.status ?? 'failed',
    }
  }

  getEnqueuedJobs(): EnqueuedJob[] {
    return [...this.enqueuedJobs]
  }

  reset(): void {
    this.enqueuedJobs = []
  }
}
