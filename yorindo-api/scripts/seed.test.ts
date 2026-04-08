/**
 * Seed Data Validation Tests
 *
 * Validates that the demo seed script produced correct, complete data.
 * These tests run against a real PostgreSQL database with seeded data.
 *
 * Usage:
 *   DATABASE_URL=postgresql://yorindo:demo123@localhost:5432/yorindo npx vitest run scripts/seed.test.ts
 *
 * Skipped automatically if DATABASE_URL is not set (Phase 1 / CI without DB).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Pool } from 'pg'

const hasDatabase = Boolean(process.env.DATABASE_URL)

let pool: Pool

beforeAll(() => {
  if (hasDatabase) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 })
  }
})

afterAll(async () => {
  if (pool) await pool.end()
})

// ─── Helper ────────────────────────────────────────────────────────────────────
async function count(query: string, params?: unknown[]): Promise<number> {
  if (!pool) throw new Error('count() called without DATABASE_URL — is hasDatabase true?')
  const { rows } = await pool.query<{ total: string }>(query, params)
  return parseInt(rows[0].total, 10)
}

// ─── Event Counts ──────────────────────────────────────────────────────────────

describe.skipIf(!hasDatabase)('Demo seed validation — Events', () => {
  it('should have ≥ 10 events', async () => {
    const total = await count('SELECT COUNT(*) as total FROM events')
    expect(total).toBeGreaterThanOrEqual(10)
  })

  it('should have ≥ 2 active events', async () => {
    const total = await count("SELECT COUNT(*) as total FROM events WHERE status = 'active'")
    expect(total).toBeGreaterThanOrEqual(2)
  })

  it('should have ≥ 2 published events', async () => {
    const total = await count("SELECT COUNT(*) as total FROM events WHERE status = 'published'")
    expect(total).toBeGreaterThanOrEqual(2)
  })

  it('should have ≥ 2 draft events', async () => {
    const total = await count("SELECT COUNT(*) as total FROM events WHERE status = 'draft'")
    expect(total).toBeGreaterThanOrEqual(2)
  })

  it('should have ≥ 2 completed events', async () => {
    const total = await count("SELECT COUNT(*) as total FROM events WHERE status = 'completed'")
    expect(total).toBeGreaterThanOrEqual(2)
  })

  it('should have ≥ 1 cancelled event', async () => {
    const total = await count("SELECT COUNT(*) as total FROM events WHERE status = 'cancelled'")
    expect(total).toBeGreaterThanOrEqual(1)
  })

  it('should have ≥ 1 archived event', async () => {
    const total = await count("SELECT COUNT(*) as total FROM events WHERE status = 'archived'")
    expect(total).toBeGreaterThanOrEqual(1)
  })

  it('should have ≥ 1 paid event (price > 0)', async () => {
    const total = await count("SELECT COUNT(*) as total FROM events WHERE is_paid = true AND price > 0")
    expect(total).toBeGreaterThanOrEqual(1)
  })
})

// ─── Event Dates (Relative Date Validation) ───────────────────────────────────

describe.skipIf(!hasDatabase)('Demo seed validation — Event Dates', () => {
  it('active events should have dates within the current window (±2 days)', async () => {
    const { rows } = await pool!.query(`
      SELECT name, date FROM events
      WHERE status = 'active'
      AND date < CURRENT_DATE - INTERVAL '2 days'
    `)
    expect(rows.length).toBe(0)
  })

  it('published events should have dates in the future', async () => {
    const { rows } = await pool!.query(`
      SELECT name, date FROM events
      WHERE status = 'published' AND date < CURRENT_DATE
    `)
    expect(rows.length).toBe(0)
  })

  it('draft events should have dates in the future', async () => {
    const { rows } = await pool!.query(`
      SELECT name, date FROM events
      WHERE status = 'draft' AND date < CURRENT_DATE
    `)
    expect(rows.length).toBe(0)
  })

  it('completed events should have dates in the past', async () => {
    const { rows } = await pool!.query(`
      SELECT name, date FROM events
      WHERE status = 'completed' AND date >= CURRENT_DATE
    `)
    expect(rows.length).toBe(0)
  })

  it('cancelled events should have dates in the past', async () => {
    const { rows } = await pool!.query(`
      SELECT name, date FROM events
      WHERE status = 'cancelled' AND date >= CURRENT_DATE
    `)
    expect(rows.length).toBe(0)
  })

  it('archived events should have dates in the past', async () => {
    const { rows } = await pool!.query(`
      SELECT name, date FROM events
      WHERE status = 'archived' AND date >= CURRENT_DATE
    `)
    expect(rows.length).toBe(0)
  })
})

// ─── Contacts ──────────────────────────────────────────────────────────────────

describe.skipIf(!hasDatabase)('Demo seed validation — Contacts', () => {
  it('should have ≥ 500 unique contacts', async () => {
    const total = await count('SELECT COUNT(*) as total FROM contacts')
    expect(total).toBeGreaterThanOrEqual(500)
  })

  it('should have ≥ 4 flagged records (in flagged_records table)', async () => {
    const total = await count("SELECT COUNT(*) as total FROM flagged_records WHERE status IN ('pending', 'reviewing')")
    expect(total).toBeGreaterThanOrEqual(4)
    expect(total).toBeLessThanOrEqual(12)
  })

  it('should have ~15 opted-out contacts (consent_status = suppressed)', async () => {
    const total = await count("SELECT COUNT(*) as total FROM contacts WHERE consent_status = 'suppressed'")
    expect(total).toBeGreaterThanOrEqual(10)
    expect(total).toBeLessThanOrEqual(20)
  })

  it('should have ≥ 10 unresolved duplicate pairs', async () => {
    const total = await count('SELECT COUNT(*) as total FROM duplicate_pairs WHERE resolved_at IS NULL')
    expect(total).toBeGreaterThanOrEqual(10)
  })

  it('should have contacts marked as duplicate (flag_category = duplicate)', async () => {
    const total = await count("SELECT COUNT(*) as total FROM contacts WHERE flag_category = 'duplicate'")
    expect(total).toBeGreaterThanOrEqual(10)
  })

  it('should have contacts with missing email', async () => {
    const total = await count('SELECT COUNT(*) as total FROM contacts WHERE email IS NULL AND deleted_at IS NULL')
    expect(total).toBeGreaterThanOrEqual(5)
  })

  it('should have contacts with missing phone', async () => {
    const total = await count('SELECT COUNT(*) as total FROM contacts WHERE phone IS NULL AND deleted_at IS NULL')
    expect(total).toBeGreaterThanOrEqual(5)
  })
})

// ─── Registrations ─────────────────────────────────────────────────────────────

describe.skipIf(!hasDatabase)('Demo seed validation — Registrations', () => {
  it('active events should have ≥ 30 attended registrations', async () => {
    const total = await count(`
      SELECT COUNT(*) as total FROM registrations r
      JOIN events e ON r.event_id = e.id
      WHERE e.status = 'active'
      AND r.attendance_status = 'attended'
    `)
    expect(total).toBeGreaterThanOrEqual(30)
  })

  it('published events should have ≥ 5 pending registrations', async () => {
    const total = await count(`
      SELECT COUNT(*) as total FROM registrations r
      JOIN events e ON r.event_id = e.id
      WHERE e.status = 'published' AND r.status = 'pending'
    `)
    expect(total).toBeGreaterThanOrEqual(5)
  })
})

// ─── Users ─────────────────────────────────────────────────────────────────────

describe.skipIf(!hasDatabase)('Demo seed validation — Users', () => {
  it('should have 3 demo users with correct roles', async () => {
    const { rows } = await pool!.query(`
      SELECT email, role FROM users WHERE email IN (
        'admin@yorindo.id', 'staff@yorindo.id', 'viewer@yorindo.id'
      )
    `)
    expect(rows.length).toBe(3)
    const roles = rows.map(r => r.role).sort()
    expect(roles).toEqual(['admin', 'staff', 'viewer'])
  })
})

// ─── Templates ─────────────────────────────────────────────────────────────────

describe.skipIf(!hasDatabase)('Demo seed validation — Templates', () => {
  it('should have ≥ 6 templates', async () => {
    const total = await count('SELECT COUNT(*) as total FROM templates')
    expect(total).toBeGreaterThanOrEqual(6)
  })

  it('should have email invitation template', async () => {
    const { rows } = await pool!.query(`
      SELECT COUNT(*) as total FROM templates 
      WHERE type = 'invitation' AND channel = 'email'
    `)
    expect(parseInt(rows[0].total, 10)).toBeGreaterThanOrEqual(1)
  })

  it('should have whatsapp invitation template', async () => {
    const { rows } = await pool!.query(`
      SELECT COUNT(*) as total FROM templates 
      WHERE type = 'invitation' AND channel = 'whatsapp'
    `)
    expect(parseInt(rows[0].total, 10)).toBeGreaterThanOrEqual(1)
  })
})

// ─── Vendors ───────────────────────────────────────────────────────────────────

describe.skipIf(!hasDatabase)('Demo seed validation — Vendors', () => {
  it('should have ≥ 2 vendors', async () => {
    const total = await count('SELECT COUNT(*) as total FROM vendors')
    expect(total).toBeGreaterThanOrEqual(2)
  })

  it('should have ≥ 1 event-sponsor relationship', async () => {
    const total = await count('SELECT COUNT(*) as total FROM event_sponsors')
    expect(total).toBeGreaterThanOrEqual(1)
  })
})

// ─── Blast History ─────────────────────────────────────────────────────────────

describe.skipIf(!hasDatabase)('Demo seed validation — Blast History', () => {
  it('should have ≥ 5 total blast log records', async () => {
    const total = await count('SELECT COUNT(*) as total FROM blast_logs')
    expect(total).toBeGreaterThanOrEqual(5)
  })
})

// ─── Survey Responses ──────────────────────────────────────────────────────────

describe.skipIf(!hasDatabase)('Demo seed validation — Survey Responses', () => {
  it('should have ≥ 20 survey responses on completed events', async () => {
    const total = await count(`
      SELECT COUNT(*) as total FROM survey_responses sr
      JOIN registrations r ON sr.registration_id = r.id
      JOIN events e ON r.event_id = e.id
      WHERE e.status = 'completed'
    `)
    expect(total).toBeGreaterThanOrEqual(20)
  })
})
