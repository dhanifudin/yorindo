export type QueueName = 'otp' | 'emergency-blast' | 'transactional' | 'marketing' | 'etl'

export interface EnqueueOptions {
  delay?: number      // milliseconds
  priority?: number   // higher = processed first in BullMQ
}

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed'

export interface JobInfo {
  status: JobStatus
  progress?: unknown
}

export interface IQueueService {
  /**
   * Enqueue a job into the named queue.
   * Returns a jobId that can be used to check status.
   */
  enqueue(queueName: QueueName, job: object, opts?: EnqueueOptions): Promise<string>

  /**
   * Get the current status of a job by its jobId.
   */
  getStatus(jobId: string): Promise<JobInfo>
}
