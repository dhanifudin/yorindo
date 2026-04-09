/**
 * Shared in-memory store for tracking blast job progress.
 * Used by both the blast worker (writes progress) and API routes (reads status).
 */

export interface BlastJobProgress {
  jobId: string
  eventId: string
  channel: 'email' | 'whatsapp'
  templateId: string
  templateName: string
  totalContacts: number
  sentCount: number
  failedCount: number
  suppressedCount: number
  status: 'queued' | 'running' | 'completed' | 'failed' | 'scheduled'
  startedAt: string
  completedAt: string | null
  scheduledAt: string | null
}

class BlastProgressStore {
  private jobs = new Map<string, BlastJobProgress>()

  register(job: BlastJobProgress): void {
    this.jobs.set(job.jobId, job)
  }

  update(jobId: string, patch: Partial<Pick<BlastJobProgress, 'sentCount' | 'failedCount' | 'suppressedCount' | 'status' | 'completedAt'>>): void {
    const job = this.jobs.get(jobId)
    if (!job) return
    Object.assign(job, patch)
  }

  get(jobId: string): BlastJobProgress | undefined {
    return this.jobs.get(jobId)
  }

  getAll(): BlastJobProgress[] {
    return Array.from(this.jobs.values())
  }

  getByEventId(eventId: string): BlastJobProgress[] {
    return Array.from(this.jobs.values()).filter((j) => j.eventId === eventId)
  }
}

export const blastProgressStore = new BlastProgressStore()
