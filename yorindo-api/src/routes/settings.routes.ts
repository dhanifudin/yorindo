import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { getPool } from '../lib/postgres.js'

const SettingKeySchema = z.object({
  key: z.string().min(1),
})

const SettingValueSchema = z.object({
  value: z.string().nullable(),
})

const SettingsListSchema = z.object({
  category: z.string().optional(),
})

export const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  const adminOnly = { preHandler: [requireAuth, requireAdmin] }

  // GET /api/settings
  fastify.get('/api/settings', adminOnly, async (request, reply) => {
    const pool = getPool()
    const { category } = SettingsListSchema.parse(request.query ?? {})

    let query = 'SELECT * FROM settings'
    const params: unknown[] = []

    if (category) {
      query += ' WHERE category = $1'
      params.push(category)
    }

    query += ' ORDER BY category, key'

    const { rows } = await pool.query(query, params)
    return reply.status(200).send(rows)
  })

  // GET /api/settings/:key
  fastify.get('/api/settings/:key', adminOnly, async (request, reply) => {
    const pool = getPool()
    const { key } = SettingKeySchema.parse(request.params)
    const { rows } = await pool.query('SELECT * FROM settings WHERE key = $1', [key])

    if (rows.length === 0) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Setting not found', details: [] },
      })
    }

    // Mask secret values
    const setting = rows[0]
    if (setting.is_secret) {
      setting.value = setting.value ? '••••••••' : null
    }

    return reply.status(200).send(setting)
  })

  // PUT /api/settings/:key
  fastify.put('/api/settings/:key', adminOnly, async (request, reply) => {
    const pool = getPool()
    const { key } = SettingKeySchema.parse(request.params)
    const { value } = SettingValueSchema.parse(request.body)

    const { rows } = await pool.query(
      `INSERT INTO settings (id, key, value, category, description, is_secret, updated_at)
       VALUES (gen_random_uuid()::text, $1, $2, 'general', '', FALSE, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
       RETURNING *`,
      [key, value],
    )

    return reply.status(200).send(rows[0])
  })

  // PATCH /api/settings/batch
  fastify.patch('/api/settings/batch', adminOnly, async (request, reply) => {
    const bodySchema = z.object({
      settings: z.record(z.string().nullable()),
      category: z.string().default('general'),
    })
    const { settings, category } = bodySchema.parse(request.body)

    console.log('[Settings] Saving batch settings:', {
      category,
      keys: Object.keys(settings),
    })

    // Keys that should be treated as secrets (masked when retrieved)
    const SECRET_KEYS = ['AI_API_KEY', 'GROQ_API_KEY', 'OPENAI_API_KEY', 'EVERPRO_API_KEY', 'MAILTRAP_PASS', 'MAILTRAP_USER', 'BREVO_API_KEY', 'SMTP_PASS', 'SMTP_USER']

    const pool = getPool()
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      for (const [key, value] of Object.entries(settings)) {
        const isSecret = SECRET_KEYS.includes(key)
        await client.query(
          `INSERT INTO settings (id, key, value, category, description, is_secret, updated_at)
           VALUES (gen_random_uuid()::text, $1, $2, $3, '', $4, NOW())
           ON CONFLICT (key) DO UPDATE SET value = $2, is_secret = $4, updated_at = NOW()`,
          [key, value, category, isSecret],
        )
      }

      await client.query('COMMIT')

      // Clear the AIInsightsService settings cache so it picks up new values
      try {
        const { clearSettingsCache } = await import('../services/adapters/real/AIInsightsService.js')
        clearSettingsCache()
        console.log('[Settings] Cache cleared for AIInsightsService')
      } catch {
        // Ignore if function doesn't exist
      }

      // Clear email provider config cache so it picks up new values immediately
      try {
        const { clearProviderConfigCache } = await import('../container.js')
        clearProviderConfigCache()
        console.log('[Settings] Cache cleared for email provider config')
      } catch {
        // Ignore
      }

      return reply.status(200).send({ updated: Object.keys(settings).length })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  })

  // GET /api/settings/providers
  fastify.get('/api/settings/providers', adminOnly, async (_request, reply) => {
    // Returns ALL settings grouped by category
    const pool = getPool()
    const { rows } = await pool.query(
      `SELECT key, value, category, is_secret FROM settings ORDER BY category, key`,
    )

    const aiSettings: Record<string, string | null> = {}
    const emailSettings: Record<string, string | null> = {}
    const whatsappSettings: Record<string, string | null> = {}
    const securitySettings: Record<string, string | null> = {}

    for (const row of rows) {
      const key = row.key as string
      const category = row.category as string
      let value = row.value as string | null

      if (row.is_secret && value) {
        value = '••••••••'
      }

      const target = category === 'email' ? emailSettings : category === 'whatsapp' ? whatsappSettings : category === 'security' ? securitySettings : aiSettings
      target[key] = value
    }

    const providers = {
      ai: aiSettings,
      email: emailSettings,
      whatsapp: whatsappSettings,
    }

    return reply.status(200).send(providers)
  })
}
