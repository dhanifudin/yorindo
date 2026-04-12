import { http, HttpResponse, delay } from 'msw'
import { faker } from '@faker-js/faker'

interface ImportJob {
  jobId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress?: number
  rowsProcessed?: number
  totalRows?: number
  flaggedRows?: number
  createdAt: string
  completedAt?: string
  error?: string
}

const jobsStore: Map<string, ImportJob> = new Map()

// Simulate job progression
function advanceJob(jobId: string) {
  const job = jobsStore.get(jobId)
  if (!job) return
  if (job.status === 'queued') {
    setTimeout(() => {
      const j = jobsStore.get(jobId)
      if (j) jobsStore.set(jobId, { ...j, status: 'processing', progress: 30, totalRows: 150, rowsProcessed: 45 })
    }, 2000)
    setTimeout(() => {
      const j = jobsStore.get(jobId)
      if (j) jobsStore.set(jobId, {
        ...j, status: 'completed', progress: 100,
        rowsProcessed: 150, totalRows: 150, flaggedRows: 8,
        completedAt: new Date().toISOString(),
      })
    }, 5000)
  }
}

export const importHandlers = [
  http.post('/api/etl/upload', async ({ request }) => {
    await delay(800)
    const contentType = request.headers.get('content-type') ?? ''
    if (!contentType.includes('multipart/form-data')) {
      return HttpResponse.json(
        { error: { code: 'INVALID_REQUEST', message: 'Expected multipart/form-data', details: [] } },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return HttpResponse.json(
        { error: { code: 'NO_FILE', message: 'No file uploaded', details: [] } },
        { status: 400 }
      )
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!['xlsx', 'csv'].includes(ext)) {
      return HttpResponse.json(
        { error: { code: 'INVALID_FILE_TYPE', message: 'Only .xlsx and .csv files are accepted', details: [] } },
        { status: 400 }
      )
    }

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      return HttpResponse.json(
        { error: { code: 'FILE_TOO_LARGE', message: 'File exceeds 10MB limit', details: [] } },
        { status: 400 }
      )
    }

    const jobId = `import:${faker.number.int({ min: 1000, max: 9999 })}`
    const job: ImportJob = {
      jobId,
      status: 'queued',
      progress: 0,
      createdAt: new Date().toISOString(),
    }
    jobsStore.set(jobId, job)
    advanceJob(jobId)

    return HttpResponse.json({ jobId, status: 'queued' }, { status: 202 })
  }),

  http.get('/api/etl/jobs/:jobId', async ({ params }) => {
    await delay(200)
    const jobId = params.jobId as string
    const job = jobsStore.get(jobId)
    if (!job) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Job not found', details: [] } },
        { status: 404 }
      )
    }
    return HttpResponse.json(job)
  }),
]
