import { Pool } from 'pg'
import { config } from '../../config/index.js'

let _pool: Pool | null = null

export function getPool(): Pool {
  if (!_pool) {
    if (!config.databaseUrl) {
      throw new Error('REPOSITORY_IMPL=postgres requires POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, and POSTGRES_HOST to be set')
    }
    _pool = new Pool({ connectionString: config.databaseUrl })
  }
  return _pool
}
