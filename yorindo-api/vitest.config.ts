import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    env: {
      JWT_SECRET: 'test-jwt-secret',
      JWT_REFRESH_SECRET: 'test-jwt-refresh-secret',
      // Prevent dotenv from loading redis://redis:6379 from .env during tests.
      // getRedisOptional() returns null when REDIS_URL is empty → blacklist is a no-op.
      REDIS_URL: '',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
})
