import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildServer } from '../server.js'
import type { FastifyInstance } from 'fastify'
import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { SEED_USER_IDS } from '../repositories/memory/_seeds.js'
import type { JwtPayload } from '../middleware/auth.js'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { Buffer } from 'buffer'
import process from 'process'

describe('ETL Upload & Triggers', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildServer()
  })

  afterAll(async () => {
    await app.close()
  })

  const getAuthToken = (role: 'admin' | 'staff' | 'viewer' = 'admin', id = SEED_USER_IDS[role]): string => {
    const payload: JwtPayload = { sub: id, role, jti: 'test-jti', iat: 1, exp: 9999999999 }
    return jwt.sign(payload, config.jwtSecret)
  }

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
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}`, 'authorization': `Bearer ${getAuthToken('admin')}` },
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
      headers: { ...headers, authorization: `Bearer ${getAuthToken('admin')}` },
      payload: body
    })

    expect(response.statusCode).toBe(400)
    const res = JSON.parse(response.body)
    expect(res.error.code).toBe('INVALID_FILE_TYPE')
  })

  it('POST /api/etl/upload should reject non-admin users', async () => {
    const { body, headers } = buildMultipart('contacts.csv', 'name,phone\nJohn,1234', 'text/csv')

    const response = await app.inject({
      method: 'POST',
      url: '/api/etl/upload',
      headers: { ...headers, authorization: `Bearer ${getAuthToken('staff')}` },
      payload: body
    })

    expect(response.statusCode).toBe(403)
  })

  it('POST /api/etl/upload should accept .xlsx files from Sample Data and return a jobId', async () => {
    const filePath = join(process.cwd(), '../Sampel Data (26.3).xlsx')
    const fileBuffer = await readFile(filePath).catch(() => null)
    
    // Fallback if file isn't present
    const content = fileBuffer || Buffer.from('fakedata')
    const boundary = '----TestBoundary'
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from(`Content-Disposition: form-data; name="file"; filename="Sampel Data (26.3).xlsx"\r\n`),
      Buffer.from(`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`),
      content,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ])

    const response = await app.inject({
      method: 'POST',
      url: '/api/etl/upload',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        authorization: `Bearer ${getAuthToken('admin')}`
      },
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
      headers: { ...headers, authorization: `Bearer ${getAuthToken('admin')}` },
      payload: body
    })
    const { jobId } = JSON.parse(uploadRes.body)

    // 2. Poll status
    const statusRes = await app.inject({
      method: 'GET',
      url: `/api/etl/jobs/${jobId}`,
      headers: { authorization: `Bearer ${getAuthToken('admin')}` }
    })

    expect(statusRes.statusCode).toBe(200)
    const statusData = JSON.parse(statusRes.body)
    expect(statusData.status).toBe('queued')
  })

  it('GET /api/etl/jobs/:jobId should return 404 for nonexistent jobs', async () => {
    const statusRes = await app.inject({
      method: 'GET',
      url: `/api/etl/jobs/nonexistent-job-id`,
      headers: { authorization: `Bearer ${getAuthToken('admin')}` }
    })

    expect(statusRes.statusCode).toBe(404)
  })
})
