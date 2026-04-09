import { http, HttpResponse, delay } from 'msw'
import { registrationsStore } from './registrations'
import type { EmergencyBlastBody } from '@/types/api'

export interface BlastJob {
  jobId: string
  eventId: string
  channel: 'whatsapp' | 'email'
  templateId: string
  scheduledAt?: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'scheduled'
  sent: number
  total: number
  sentAt: string
}

// In-memory store of blast jobs (populated by POST /api/blast)
export const blastJobsStore: BlastJob[] = [
  {
    jobId: 'blast-hist-001',
    eventId: 'event-001',
    channel: 'whatsapp',
    templateId: 'tmpl-001',
    status: 'completed',
    sent: 312,
    total: 312,
    sentAt: '2026-03-20T09:00:00Z',
  },
  {
    jobId: 'blast-hist-002',
    eventId: 'event-001',
    channel: 'email',
    templateId: 'tmpl-002',
    status: 'completed',
    sent: 89,
    total: 89,
    sentAt: '2026-03-18T14:30:00Z',
  },
]

export const blastHandlers = [
  // GET /api/blast/history?eventId=:id
  http.get('/api/blast/history', async ({ request }) => {
    await delay(300)
    const url = new URL(request.url)
    const eventId = url.searchParams.get('eventId')
    const results = eventId
      ? blastJobsStore.filter((j) => j.eventId === eventId)
      : blastJobsStore
    return HttpResponse.json(
      results.map((j) => ({
        id: j.jobId,
        channel: j.channel,
        recipientCount: j.total,
        sentAt: j.sentAt,
        status: j.status,
      }))
    )
  }),

  // POST /api/events/:id/blast
  http.post('/api/events/:id/blast', async ({ request, params }) => {
    await delay(500)
    const body = await request.json() as {
      eventId?: string
      channel: 'whatsapp' | 'email'
      templateId: string
      contactIds?: string[]
      scheduledAt?: string
    }
    const eventId = (params.id as string) || (body.eventId as string) || 'unknown-event'
    const recipientCount = body.contactIds?.length ?? 247
    const job: BlastJob = {
      jobId: 'mock-job-1',
      eventId: eventId,
      channel: body.channel,
      templateId: body.templateId,
      scheduledAt: body.scheduledAt,
      status: body.scheduledAt ? 'scheduled' : 'queued',
      sent: 0,
      total: recipientCount,
      sentAt: new Date().toISOString(),
    }
    blastJobsStore.push(job)
    return HttpResponse.json({ jobId: job.jobId, status: job.status, recipientCount }, { status: 202 })
  }),

  // POST /api/events/:id/blast/emergency — emergency blast to approved registrants
  http.post('/api/events/:id/blast/emergency', async ({ request, params }) => {
    await delay(400)
    const body = await request.json() as EmergencyBlastBody
    if (!body.message?.trim()) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'message required', details: [] } },
        { status: 400 }
      )
    }
    const recipientCount = registrationsStore.filter(
      (r) => r.eventId === params.id && r.status === 'approved'
    ).length
    return HttpResponse.json(
      { jobId: 'emergency-job-1', recipientCount, status: 'queued' },
      { status: 202 }
    )
  }),

  // GET /api/blast/:jobId — status polling
  http.get('/api/blast/:jobId', async ({ params }) => {
    await delay(200)
    const job = blastJobsStore.find((j) => j.jobId === params.jobId)
    if (!job) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Job not found', details: [] } },
        { status: 404 }
      )
    }
    return HttpResponse.json({
      jobId: job.jobId,
      status: job.status,
      sent: job.sent,
      total: job.total,
    })
  }),
]
