import type { IQueueService, QueueName, EnqueueOptions, JobStatus } from '../../../interfaces/services/IQueueService.js'

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
    const jobId = `mock-job-${crypto.randomUUID()}`
    this.enqueuedJobs.push({
      jobId,
      queueName,
      job,
      enqueuedAt: new Date().toISOString(),
      status: 'queued',
    })
    return jobId
  }

  async getStatus(jobId: string): Promise<JobStatus> {
    const found = this.enqueuedJobs.find(j => j.jobId === jobId)
    return found?.status ?? 'failed'
  }

  getEnqueuedJobs(): EnqueuedJob[] {
    return [...this.enqueuedJobs]
  }

  reset(): void {
    this.enqueuedJobs = []
  }
}
