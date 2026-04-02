import type { IQueueService, QueueName, EnqueueOptions, JobStatus, JobInfo } from '../../../interfaces/services/IQueueService.js'
import { createId } from '@paralleldrive/cuid2'

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
    return jobId
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
