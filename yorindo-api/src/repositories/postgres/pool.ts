import { Pool } from 'pg'
import { config } from '../../config/index.js'

let _pool: Pool | null = null

export function getPool(): Pool {
  if (!_pool) {
    if (!config.databaseUrl) {
      throw new Error('DATABASE_URL is required when REPOSITORY_IMPL=postgres')
    }
    _pool = new Pool({ connectionString: config.databaseUrl })
  }
  return _pool
}
