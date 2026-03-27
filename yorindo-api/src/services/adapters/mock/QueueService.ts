import type { IQueueService, QueueName, EnqueueOptions, JobStatus, JobInfo } from '../../../interfaces/services/IQueueService.js'
import { createId } from '@paralleldrive/cuid2'

interface EnqueuedJob {
  jobId: string
  queueName: QueueName
  job: object
  enqueuedAt: string
  status: JobStatus
}

export class MockQueueService implements IQueueService {
  private enqueuedJobs: EnqueuedJob[] = []

  async enqueue(queueName: QueueName, job: object, _opts?: EnqueueOptions): Promise<string> {
    const jobId = `mock-job-${createId()}`
    this.enqueuedJobs.push({
      jobId,
      queueName,
      job,
      enqueuedAt: new Date().toISOString(),
      status: 'queued',
    })
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
