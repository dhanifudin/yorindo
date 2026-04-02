import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { buildServer } from '../server.js'
import { config } from '../config/index.js'
import { userRepository, auditLogRepository } from '../container.js'
import { SEED_EVENT_IDS, SEED_USER_IDS } from '../repositories/memory/_seeds.js'
import jwt from 'jsonwebtoken'
import type { FastifyInstance } from 'fastify'
import type { JwtPayload } from '../middleware/auth.js'

describe('Users API', () => {
  let fastify: FastifyInstance

  beforeEach(async () => {
    fastify = await buildServer()
  })

  afterEach(async () => {
    await fastify.close()
  })

  const getAuthToken = (role: 'admin' | 'staff' | 'viewer' = 'admin', id = SEED_USER_IDS[role]): string => {
    const payload: JwtPayload = { sub: id, role, jti: 'test-jti', iat: 1, exp: 9999999999 }
    return jwt.sign(payload, config.jwtSecret)
  }

  describe('Role Guards', () => {
    it('returns 403 when a staff tries to GET /api/users', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/users',
        headers: { Authorization: `Bearer ${getAuthToken('staff')}` },
      })
      expect(response.statusCode).toBe(403)
      expect(response.json().error.code).toBe('FORBIDDEN')
    })
  })

  describe('GET /api/users', () => {
    it('returns all active users without passwords', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/users',
        headers: { Authorization: `Bearer ${getAuthToken('admin')}` },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.data.length).toBeGreaterThan(0)
      expect(body.data[0]).not.toHaveProperty('passwordHash')
      expect(body.data[0]).toHaveProperty('email')
    })
  })

  describe('GET /api/users/me/assigned-events', () => {
    it('returns only assigned events for staff', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/users/me/assigned-events',
        headers: { Authorization: `Bearer ${getAuthToken('staff')}` },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.data).toHaveLength(6)
      expect(body.data.map((event: { id: string }) => event.id)).toEqual([
        SEED_EVENT_IDS[2],
        SEED_EVENT_IDS[3],
        SEED_EVENT_IDS[4],
        SEED_EVENT_IDS[5],
        SEED_EVENT_IDS[6],
        SEED_EVENT_IDS[7],
      ])
    })

    it('returns all events for admin', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/users/me/assigned-events',
        headers: { Authorization: `Bearer ${getAuthToken('admin')}` },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.data).toHaveLength(12)
      expect(body.data[0]).toHaveProperty('eventDate')
      expect(body.data[0]).toHaveProperty('timezone')
    })
  })

  describe('POST /api/users', () => {
    it('creates a new user and an audit log', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/users',
        headers: { Authorization: `Bearer ${getAuthToken('admin')}` },
        payload: {
          email: 'new-user@yorindo.id',
          password: 'Password123!',
          name: 'New User',
          role: 'viewer',
        },
      })

      expect(response.statusCode).toBe(201)
      const body = response.json()
      expect(body).toHaveProperty('id')
      expect(body.email).toBe('new-user@yorindo.id')
      expect(body.role).toBe('viewer')

      const userInDb = await userRepository.findByEmail('new-user@yorindo.id')
      expect(userInDb).not.toBeNull()
      expect(userInDb?.passwordHash).not.toBe('Password123!') // should be hashed

      const auditLogs = await auditLogRepository.findAllByTarget(body.id)
      expect(auditLogs).toHaveLength(1)
      expect(auditLogs[0].action).toBe('user.created')
    })
  })

  describe('PATCH /api/users/:id', () => {
    it('updates a user role and creates an audit log', async () => {
      // First update the seed viewer user
      const targetId = SEED_USER_IDS.viewer

      const response = await fastify.inject({
        method: 'PATCH',
        url: `/api/users/${targetId}`,
        headers: { Authorization: `Bearer ${getAuthToken('admin')}` },
        payload: { role: 'staff' },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.role).toBe('staff')

      const updatedDb = await userRepository.findById(targetId)
      expect(updatedDb?.role).toBe('staff')

      const auditLogs = await auditLogRepository.findAllByTarget(targetId)
      const log = auditLogs.find(a => a.action === 'user.role-changed')
      expect(log).toBeDefined()
    })
  })

  describe('DELETE /api/users/:id', () => {
    it('deletes a user and creates an audit log', async () => {
      // First create a temp user to delete
      const user = await userRepository.create({
        email: 'to-delete@yorindo.id',
        passwordHash: 'dummy',
        name: 'Del',
        role: 'viewer',
      })

      const response = await fastify.inject({
        method: 'DELETE',
        url: `/api/users/${user.id}`,
        headers: { Authorization: `Bearer ${getAuthToken('admin')}` },
      })

      expect(response.statusCode).toBe(204)

      // Soft-deleted: findById returns null (filters deletedAt), but record still exists
      const checkActive = await userRepository.findById(user.id)
      expect(checkActive).toBeNull()
      const checkIncludingDeleted = await userRepository.findByIdIncludingDeleted(user.id)
      expect(checkIncludingDeleted).not.toBeNull()
      expect(checkIncludingDeleted?.deletedAt).not.toBeNull()

      const auditLogs = await auditLogRepository.findAllByTarget(user.id)
      const log = auditLogs.find(a => a.action === 'user.deactivated')
      expect(log).toBeDefined()
    })
  })

  describe('Event assignments', () => {
    it('allows assigning an event to a viewer and returns grantedAt metadata', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: `/api/users/${SEED_USER_IDS.viewer}/events`,
        headers: { Authorization: `Bearer ${getAuthToken('admin')}` },
        payload: { eventId: SEED_EVENT_IDS[3] },
      })

      expect(response.statusCode).toBe(201)
      const body = response.json()
      expect(body.userId).toBe(SEED_USER_IDS.viewer)
      expect(body.eventId).toBe(SEED_EVENT_IDS[3])
      expect(body.grantedAt).toBeTruthy()
    })

    it('rejects assigning an event to an admin account', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: `/api/users/${SEED_USER_IDS.admin}/events`,
        headers: { Authorization: `Bearer ${getAuthToken('admin')}` },
        payload: { eventId: SEED_EVENT_IDS[3] },
      })

      expect(response.statusCode).toBe(403)
      expect(response.json().error.code).toBe('FORBIDDEN')
    })
  })
})
