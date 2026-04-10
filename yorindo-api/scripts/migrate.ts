/**
 * Database Migration Runner (Phase 2)
 *
 * Runs all SQL migration files in order against the PostgreSQL database.
 * Idempotent — safe to run multiple times (uses IF NOT EXISTS throughout).
 *
 * Usage: npx tsx scripts/migrate.ts
 * Requires: DATABASE_URL or individual POSTGRES_* variables
 */

import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function buildDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const user = process.env.POSTGRES_USER ?? 'yorindo'
  const password = process.env.POSTGRES_PASSWORD ?? ''
  const host = process.env.POSTGRES_HOST ?? 'localhost'
  const port = process.env.POSTGRES_PORT ?? '5432'
  const db = process.env.POSTGRES_DB ?? 'yorindo'
  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${db}`
}

const databaseUrl = buildDatabaseUrl()
const pool = new Pool({ connectionString: databaseUrl })

const migrations = [
  '001_core_schema.sql',
  '002_users_access.sql',
  '003_audit_flagged.sql',
  '004_indexes.sql',
  '005_sprint_changes_2026_03_28.sql',
  '006_location_fields.sql',
  '007_demo_support_tables.sql',
  '008_phase2_schema_gaps.sql',
  '009_registration_form_fields.sql',
  '010_contacts_nullable_phone.sql',
  '011_drop_contacts_unique_phone_email.sql',
  '012_fix_template_type_constraint.sql',
  '013_template_branding_columns.sql',
  '014_drop_audit_logs_fk_constraints.sql',
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
