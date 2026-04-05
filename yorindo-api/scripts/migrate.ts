/**
 * Database Migration Runner (Phase 2)
 *
 * Runs all SQL migration files in order against the PostgreSQL database.
 * Idempotent — safe to run multiple times (uses IF NOT EXISTS throughout).
 *
 * Usage: npx tsx scripts/migrate.ts
 * Requires: DATABASE_URL environment variable
 */

import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('Error: DATABASE_URL environment variable is required')
  process.exit(1)
}

const pool = new Pool({ connectionString: databaseUrl })

const migrations = [
  '001_core_schema.sql',
  '002_users_access.sql',
  '003_audit_flagged.sql',
  '004_indexes.sql',
  '005_sprint_changes_2026_03_28.sql',
  '006_location_fields.sql',
  '007_demo_support_tables.sql',
]

async function migrate(): Promise<void> {
  const migrationsDir = path.join(__dirname, '..', 'migrations')

  for (const file of migrations) {
    const filePath = path.join(migrationsDir, file)
    const sql = fs.readFileSync(filePath, 'utf8')
    await pool.query(sql)
    console.log(`✓ Migration ${file} applied`)
  }

  await pool.end()
  console.log('All migrations complete.')
}

migrate().catch((err: unknown) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
