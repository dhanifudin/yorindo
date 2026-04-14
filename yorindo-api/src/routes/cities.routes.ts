import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { getPool } from '../lib/postgres.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { syncCities } from '../lib/cities-sync.js'

export const citiesRoutes: FastifyPluginAsync = async (fastify) => {
  // Cache for city data (5 minutes TTL)
  let cityCache: { data: unknown; expiresAt: number } | null = null
  const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  function clearCache() {
    cityCache = null
  }

  // GET /api/cities (public — needed for registration form)
  fastify.get('/api/cities', async (request: FastifyRequest, reply: FastifyReply) => {
    // Check cache first
    if (cityCache && Date.now() < cityCache.expiresAt) {
      return reply.status(200).send(cityCache.data)
    }

    const pool = getPool()
    const { rows } = await pool.query(
      `SELECT province_code, province_name, city_code, city_name, aliases
       FROM cities ORDER BY province_name, city_name`,
    )

    const result = { data: rows }

    // Set cache
    cityCache = { data: result, expiresAt: Date.now() + CACHE_TTL }

    return reply.status(200).send(result)
  })

  // GET /api/cities/by-province
  fastify.get('/api/cities/by-province', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { province } = request.query as { province?: string }
    if (!province) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'province query param required', details: [] } })
    }

    const pool = getPool()
    const { rows } = await pool.query(
      `SELECT city_code, city_name, aliases FROM cities WHERE province_name = $1 ORDER BY city_name`,
      [province],
    )

    return reply.status(200).send({ data: rows })
  })

  // POST /api/cities/sync — sync from wilayah data source
  fastify.post('/api/cities/sync', { preHandler: [requireAuth, requireAdmin] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await syncCities()
      clearCache()
      return reply.status(200).send(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return reply.status(500).send({
        error: { code: 'SYNC_FAILED', message: `Gagal sinkronisasi data wilayah: ${message}`, details: [] },
      })
    }
  })
}
