import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { getPool } from '../lib/postgres.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { createId } from '@paralleldrive/cuid2'

export const citiesRoutes: FastifyPluginAsync = async (fastify) => {
  // Cache for city data (5 minutes TTL)
  let cityCache: { data: unknown; expiresAt: number } | null = null
  const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  function clearCache() {
    cityCache = null
  }

  /**
   * Fetch all provinces from wilayah.id
   */
  async function fetchProvinces(): Promise<Array<{ code: string; name: string }>> {
    const res = await fetch('https://www.wilayah.id/api/provinces', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) throw new Error(`Failed to fetch provinces: ${res.status}`)
    return res.json()
  }

  /**
   * Fetch all regencies/cities from wilayah.id (paginated)
   */
  async function fetchAllRegencies(): Promise<Array<{
    province_code: string
    province_name: string
    code: string
    name: string
  }>> {
    const provinces = await fetchProvinces()
    const allRegencies: Array<{ province_code: string; province_name: string; code: string; name: string }> = []

    for (const prov of provinces) {
      try {
        const res = await fetch(`https://www.wilayah.id/api/regencies/${prov.code}`, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(10_000),
        })
        if (!res.ok) continue

        const data = await res.json()
        const items = Array.isArray(data) ? data : data.data ?? []

        for (const item of items) {
          allRegencies.push({
            province_code: prov.code,
            province_name: prov.name,
            code: item.code,
            name: item.name,
          })
        }
      } catch {
        // Skip province if fetch fails
        continue
      }
    }

    return allRegencies
  }

  // GET /api/cities
  fastify.get('/api/cities', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
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

  // POST /api/cities/sync — sync from wilayah.id
  fastify.post('/api/cities/sync', { preHandler: [requireAuth, requireAdmin] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const regencies = await fetchAllRegencies()

      const pool = getPool()
      let inserted = 0
      let updated = 0

      for (const item of regencies) {
        const result = await pool.query(
          `INSERT INTO cities (id, province_code, province_name, city_code, city_name, aliases)
           VALUES ($1, $2, $3, $4, $5, '[]')
           ON CONFLICT (city_code) DO UPDATE SET
             province_code = EXCLUDED.province_code,
             province_name = EXCLUDED.province_name,
             city_name = EXCLUDED.city_name,
             updated_at = NOW()
           RETURNING (xmax = 0) AS inserted`,
          [createId(), item.province_code, item.province_name, item.code, item.name],
        )

        if (result.rows[0]?.inserted) {
          inserted++
        } else {
          updated++
        }
      }

      // Clear cache after sync
      clearCache()

      return reply.status(200).send({ success: true, inserted, updated, total: regencies.length })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return reply.status(500).send({
        error: { code: 'SYNC_FAILED', message: `Gagal sinkronisasi dari wilayah.id: ${message}`, details: [] },
      })
    }
  })
}
