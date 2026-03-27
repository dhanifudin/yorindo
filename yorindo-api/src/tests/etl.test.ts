import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildServer } from '../server.js'
import type { FastifyInstance } from 'fastify'

describe('ETL Upload & Triggers', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildServer()
  })

  afterAll(async () => {
    await app.close()
  })

  function buildMultipart(filename: string, content: string, contentType: string) {
    const boundary = '----TestBoundary'
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from(`Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`),
      Buffer.from(`Content-Type: ${contentType}\r\n\r\n`),
      Buffer.from(content),
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ])
    return { body, headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } }
  }

  it('POST /api/etl/upload should reject missing files', async () => {
    const boundary = '----TestBoundary'
    const body = Buffer.from(`--${boundary}--\r\n`)
    
    const response = await app.inject({
      method: 'POST',
      url: '/api/etl/upload',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body
    })

    expect(response.statusCode).toBe(400)
    const res = JSON.parse(response.body)
    expect(res.error.code).toBe('VALIDATION_ERROR')
  })

  it('POST /api/etl/upload should reject unsupported file extensions', async () => {
    const { body, headers } = buildMultipart('document.pdf', 'fake pdf content', 'application/pdf')

    const response = await app.inject({
      method: 'POST',
      url: '/api/etl/upload',
      headers,
      payload: body
    })

    expect(response.statusCode).toBe(400)
    const res = JSON.parse(response.body)
    expect(res.error.code).toBe('INVALID_FILE_TYPE')
  })

  it('POST /api/etl/upload should accept .csv files and return a jobId', async () => {
    const { body, headers } = buildMultipart('contacts.csv', 'name,phone\nJohn,1234', 'text/csv')

    const response = await app.inject({
      method: 'POST',
      url: '/api/etl/upload',
      headers,
      payload: body
    })

    expect(response.statusCode).toBe(202)
    const res = JSON.parse(response.body)
    expect(res.jobId).toBeDefined()
    expect(res.status).toBe('queued')
  })

  it('GET /api/etl/jobs/:jobId should return job status from MockQueueService', async () => {
    // 1. Upload to create job
    const { body, headers } = buildMultipart('contacts.xlsx', 'fakedata', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    const uploadRes = await app.inject({
      method: 'POST',
      url: '/api/etl/upload',
      headers,
      payload: body
    })
    const { jobId } = JSON.parse(uploadRes.body)

    // 2. Poll status
    const statusRes = await app.inject({
      method: 'GET',
      url: `/api/etl/jobs/${jobId}`
    })

    expect(statusRes.statusCode).toBe(200)
    const statusData = JSON.parse(statusRes.body)
    expect(statusData.status).toBe('queued')
  })
})
