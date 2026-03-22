/**
 * PostgreSQL connection pool — Phase 2 only.
 * NOT imported at startup. Imported only by src/repositories/postgres/*.ts
 * when REPOSITORY_IMPL=postgres.
 */
import pg from 'pg'
import { config } from '../config/index.js'

const { Pool } = pg

export function createPool(): pg.Pool {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is required for REPOSITORY_IMPL=postgres')
  }
  return new Pool({
    connectionString: config.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  })
}

// Singleton — only created when first accessed in Phase 2
let _pool: pg.Pool | undefined
export function getPool(): pg.Pool {
  if (!_pool) _pool = createPool()
  return _pool
}
