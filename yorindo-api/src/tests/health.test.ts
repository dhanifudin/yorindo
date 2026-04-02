import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'

// Set required env vars before importing server
process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars'

const { buildServer } = await import('../server.js')

describe('GET /api/health', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildServer()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns 200 with { status: "ok" }', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })

  it('serves the OpenAPI JSON through Fastify docs integration', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/docs/json',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.openapi).toBe('3.0.3')
    expect(body.paths).toBeTruthy()
  })

  it('serves the Swagger UI HTML for manual testing', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/docs',
    })

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toContain('docs/static/index.html')

    const htmlResponse = await app.inject({
      method: 'GET',
      url: '/api/docs/static/index.html',
    })

    expect(htmlResponse.statusCode).toBe(200)
    expect(htmlResponse.headers['content-type']).toContain('text/html')
  })
})
