import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('dotenv/config', () => ({}))

describe('config validation', () => {
  const savedEnv: Record<string, string | undefined> = {}

  beforeEach(() => {
    // Save current values
    savedEnv.JWT_SECRET = process.env.JWT_SECRET
    savedEnv.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET
    savedEnv.REPOSITORY_IMPL = process.env.REPOSITORY_IMPL
    savedEnv.SERVICE_IMPL = process.env.SERVICE_IMPL
    savedEnv.EMAIL_PROVIDER = process.env.EMAIL_PROVIDER
    savedEnv.WHATSAPP_PROVIDER = process.env.WHATSAPP_PROVIDER
    savedEnv.ETL_AI_PROVIDER = process.env.ETL_AI_PROVIDER
    savedEnv.YORIMIND_AI_PROVIDER = process.env.YORIMIND_AI_PROVIDER
    savedEnv.SMART_FILTER_AI_PROVIDER = process.env.SMART_FILTER_AI_PROVIDER
    // Clear module cache so re-import re-evaluates the config module
    vi.resetModules()
  })

  afterEach(() => {
    // Restore env
    if (savedEnv.JWT_SECRET === undefined) {
      delete process.env.JWT_SECRET
    } else {
      process.env.JWT_SECRET = savedEnv.JWT_SECRET
    }
    if (savedEnv.JWT_REFRESH_SECRET === undefined) {
      delete process.env.JWT_REFRESH_SECRET
    } else {
      process.env.JWT_REFRESH_SECRET = savedEnv.JWT_REFRESH_SECRET
    }
    if (savedEnv.REPOSITORY_IMPL === undefined) {
      delete process.env.REPOSITORY_IMPL
    } else {
      process.env.REPOSITORY_IMPL = savedEnv.REPOSITORY_IMPL
    }
    if (savedEnv.SERVICE_IMPL === undefined) {
      delete process.env.SERVICE_IMPL
    } else {
      process.env.SERVICE_IMPL = savedEnv.SERVICE_IMPL
    }
    if (savedEnv.EMAIL_PROVIDER === undefined) {
      delete process.env.EMAIL_PROVIDER
    } else {
      process.env.EMAIL_PROVIDER = savedEnv.EMAIL_PROVIDER
    }
    if (savedEnv.WHATSAPP_PROVIDER === undefined) {
      delete process.env.WHATSAPP_PROVIDER
    } else {
      process.env.WHATSAPP_PROVIDER = savedEnv.WHATSAPP_PROVIDER
    }
    if (savedEnv.ETL_AI_PROVIDER === undefined) {
      delete process.env.ETL_AI_PROVIDER
    } else {
      process.env.ETL_AI_PROVIDER = savedEnv.ETL_AI_PROVIDER
    }
    if (savedEnv.YORIMIND_AI_PROVIDER === undefined) {
      delete process.env.YORIMIND_AI_PROVIDER
    } else {
      process.env.YORIMIND_AI_PROVIDER = savedEnv.YORIMIND_AI_PROVIDER
    }
    if (savedEnv.SMART_FILTER_AI_PROVIDER === undefined) {
      delete process.env.SMART_FILTER_AI_PROVIDER
    } else {
      process.env.SMART_FILTER_AI_PROVIDER = savedEnv.SMART_FILTER_AI_PROVIDER
    }
    vi.resetModules()
  })

  it('throws when JWT_SECRET is missing', async () => {
    delete process.env.JWT_SECRET
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars'

    await expect(import('../config/index.js')).rejects.toThrow(
      'Missing required env var: JWT_SECRET',
    )
  })

  it('throws when JWT_REFRESH_SECRET is missing', async () => {
    process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long'
    delete process.env.JWT_REFRESH_SECRET

    await expect(import('../config/index.js')).rejects.toThrow(
      'Missing required env var: JWT_REFRESH_SECRET',
    )
  })

  it('does not throw when only JWT secrets are set (no DB urls needed)', async () => {
    process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long'
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars'
    // Clear provider env vars to test defaults
    delete process.env.REPOSITORY_IMPL
    delete process.env.SERVICE_IMPL
    delete process.env.EMAIL_PROVIDER
    delete process.env.WHATSAPP_PROVIDER
    delete process.env.ETL_AI_PROVIDER
    // DATABASE_URL, MONGODB_URL, REDIS_URL intentionally absent

    const { config } = await import('../config/index.js')
    expect(config.repositoryImpl).toBe('memory')
    expect(config.serviceImpl).toBe('mock')
  })
})
