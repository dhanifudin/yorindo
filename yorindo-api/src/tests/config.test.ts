import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('dotenv/config', () => ({}))

describe('config validation', () => {
  const savedEnv: Record<string, string | undefined> = {}

  beforeEach(() => {
    // Save current values
    savedEnv.JWT_SECRET = process.env.JWT_SECRET
    savedEnv.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET
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
    // DATABASE_URL, MONGODB_URL, REDIS_URL intentionally absent

    const { config } = await import('../config/index.js')
    expect(config.repositoryImpl).toBe('memory')
    expect(config.serviceImpl).toBe('mock')
  })
})
