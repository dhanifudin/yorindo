import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { getPool } from '../lib/postgres.js'
import { requireAuth, requireAdmin, requireRoles } from '../middleware/auth.js'
import { createId } from '@paralleldrive/cuid2'

export const industriesRoutes: FastifyPluginAsync = async (fastify) => {
  const adminOnly = { preHandler: [requireAuth, requireAdmin] }

  // GET /api/industries
  fastify.get('/api/industries', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const pool = getPool()
    const { rows } = await pool.query<{ id: string; slug: string; name: string }>(
      'SELECT id, slug, name FROM industries ORDER BY name',
    )
    return reply.status(200).send({ data: rows })
  })

  // POST /api/industries
  fastify.post('/api/industries', adminOnly, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = z.object({ name: z.string().min(1), slug: z.string().min(1) }).safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Nama dan slug wajib diisi', details: body.error.issues } })
    }

    const pool = getPool()
    const id = createId()
    await pool.query(
      'INSERT INTO industries (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (slug) DO NOTHING',
      [id, body.data.slug.toLowerCase().replace(/\s+/g, '-'), body.data.name],
    )

    const { rows } = await pool.query('SELECT id, slug, name FROM industries WHERE id = $1', [id])
    if (rows.length === 0) {
      return reply.status(409).send({ error: { code: 'CONFLICT', message: 'Slug sudah digunakan', details: [] } })
    }

    return reply.status(201).send(rows[0])
  })

  // PATCH /api/industries/:id
  fastify.patch('/api/industries/:id', adminOnly, async (request: FastifyRequest, reply: FastifyReply) => {
    const params = z.object({ id: z.string().min(1) }).safeParse((request as FastifyRequest).params)
    const body = z.object({ name: z.string().min(1).optional(), slug: z.string().min(1).optional() }).safeParse((request as FastifyRequest).body)

    if (!params.success || !body.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: [] } })
    }

    const pool = getPool()
    const sets: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (body.data.name) { sets.push(`name = $${idx++}`); values.push(body.data.name) }
    if (body.data.slug) { sets.push(`slug = $${idx++}`); values.push(body.data.slug.toLowerCase().replace(/\s+/g, '-')) }

    if (sets.length === 0) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Tidak ada field yang diubah', details: [] } })

    values.push(params.data.id)
    const { rows } = await pool.query(
      `UPDATE industries SET ${sets.join(', ')} WHERE id = $${idx} RETURNING id, slug, name`,
      values,
    )

    if (rows.length === 0) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Industri tidak ditemukan', details: [] } })
    return reply.status(200).send(rows[0])
  })

  // DELETE /api/industries/:id
  fastify.delete('/api/industries/:id', adminOnly, async (request: FastifyRequest, reply: FastifyReply) => {
    const params = z.object({ id: z.string().min(1) }).safeParse((request as FastifyRequest).params)
    if (!params.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid params', details: [] } })

    const pool = getPool()
    const { rowCount } = await pool.query('DELETE FROM industries WHERE id = $1', [params.data.id])
    if (rowCount === 0) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Industri tidak ditemukan', details: [] } })

    return reply.status(204).send()
  })
}
