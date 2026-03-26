import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    env: {
      JWT_SECRET: 'test-jwt-secret',
      JWT_REFRESH_SECRET: 'test-jwt-refresh-secret',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
})
