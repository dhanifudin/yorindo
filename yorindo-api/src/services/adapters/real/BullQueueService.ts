import type { IQueueService, QueueName, EnqueueOptions, JobInfo } from '../../../interfaces/services/IQueueService.js'
import {
  getOtpQueue,
  getEmergencyBlastQueue,
  getTransactionalQueue,
  getMarketingQueue,
  getEtlQueue
} from '../../../lib/queue.js'
import type { Queue, Job } from 'bullmq'

export class BullQueueService implements IQueueService {
  private getQueueInstance(name: QueueName): Queue {
    switch (name) {
      case 'otp': return getOtpQueue()
      case 'emergency-blast': return getEmergencyBlastQueue()
      case 'transactional': return getTransactionalQueue()
      case 'marketing': return getMarketingQueue()
      case 'etl': return getEtlQueue()
      default: throw new Error(`Unknown queue name: ${name}`)
    }
  }

  async enqueue(queueName: QueueName, jobData: object, opts?: EnqueueOptions): Promise<string> {
    const queue = this.getQueueInstance(queueName)
    const bullOpts: any = {}
    if (opts?.delay !== undefined) bullOpts.delay = opts.delay
    if (opts?.priority !== undefined) bullOpts.priority = opts.priority

    const bullJob = await queue.add(queueName, jobData, bullOpts)

    if (!bullJob.id) {
      throw new Error(`Failed to enqueue job in ${queueName}: missing job.id`)
    }
    return bullJob.id.toString()
  }

  async getStatus(jobId: string): Promise<JobInfo> {
    // We don't know which queue the job is in strictly by ID in BullMQ unless we check them all,
    // but typically for our use case we only check ETL queue jobs or we can check all of them.
    // For now, we will just check ETL queue since that's what we need, but to be generic we can check all.
    const queues = [
      getEtlQueue(),
      getOtpQueue(),
      getEmergencyBlastQueue(),
      getTransactionalQueue(),
      getMarketingQueue()
    ]

    for (const q of queues) {
      const job = await q.getJob(jobId)
      if (job) {
        return this.mapJobStatus(job)
      }
    }

    return { status: 'failed' } // Not found (or expired)
  }

  private async mapJobStatus(job: Job): Promise<JobInfo> {
    const state = await job.getState()
    let status: JobInfo['status'] = 'queued'

    if (state === 'active') status = 'processing'
    else if (state === 'completed') status = 'completed'
    else if (state === 'failed') status = 'failed'
    else if (state === 'delayed' || state === 'waiting' || state === 'waiting-children') status = 'queued'

    return {
      status,
      progress: job.progress,
    }
  }
}
