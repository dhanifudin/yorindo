import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildServer } from '../server.js'
import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'

describe('Templates API', () => {
  let server: FastifyInstance

  beforeAll(async () => {
    server = await buildServer()
    await server.ready()
  })

  afterAll(async () => {
    await server.close()
  })

  const createToken = (role: string = 'admin') => {
    return jwt.sign({ sub: 'user-id', role, jti: 'test-jti' }, config.jwtSecret)
  }

  it('should return 401 when unauthenticated', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/templates'
    })
    expect(res.statusCode).toBe(401)
  })

  it('should return 403 when not admin', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/templates',
      headers: { authorization: `Bearer ${createToken('viewer')}` }
    })
    expect(res.statusCode).toBe(403)
  })

  it('should return templates when admin', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/templates',
      headers: { authorization: `Bearer ${createToken('admin')}` }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(12) // seeded templates (6 types × 2 channels)
  })

  it('should create template', async () => {
    const body = {
      name: 'Test Template',
      type: 'invitation',
      channel: 'whatsapp',
      body: 'Hello *Test*'
    }
    const res = await server.inject({
      method: 'POST',
      url: '/api/templates',
      headers: { authorization: `Bearer ${createToken('admin')}` },
      payload: body
    })
    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject(body)
  })

  it('should update template', async () => {
    // get a template to update
    const templates = await server.inject({
      method: 'GET',
      url: '/api/templates',
      headers: { authorization: `Bearer ${createToken('admin')}` }
    }).then(r => r.json())
    
    const target = templates[0]
    
    const res = await server.inject({
      method: 'PATCH',
      url: `/api/templates/${target.id}`,
      headers: { authorization: `Bearer ${createToken('admin')}` },
      payload: { name: 'Updated Name' }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('Updated Name')
  })

  it('should delete template', async () => {
    const templates = await server.inject({
      method: 'GET',
      url: '/api/templates',
      headers: { authorization: `Bearer ${createToken('admin')}` }
    }).then(r => r.json())
    
    const target = templates[0]
    
    const res = await server.inject({
      method: 'DELETE',
      url: `/api/templates/${target.id}`,
      headers: { authorization: `Bearer ${createToken('admin')}` }
    })
    expect(res.statusCode).toBe(204)
    
    const verify = await server.inject({
      method: 'GET',
      url: '/api/templates',
      headers: { authorization: `Bearer ${createToken('admin')}` }
    }).then(r => r.json())
    
    expect(verify.find((t: any) => t.id === target.id)).toBeUndefined()
  })
})
