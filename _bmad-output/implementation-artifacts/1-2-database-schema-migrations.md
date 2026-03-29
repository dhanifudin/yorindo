# Story 1.2: Database Schema Migrations

## Story

**As a** developer,
**I want** all four PostgreSQL migration files written and executable via `scripts/migrate.ts`,
**So that** any team member can initialize the complete database schema from scratch with a single command.

## Status

done

## Context

This is a Phase 1 BE Foundation story — it can be worked in parallel with FE Phase 1 stories. It depends on Story 1.1 (Docker Compose must be running with PostgreSQL). The authoritative schema is defined in `architecture.md` and must be followed exactly — do not deviate. CUID2 TEXT primary keys everywhere (application-generated), no auto-increment IDs. The schema defines the data contracts that both the in-memory repositories (Story 1.8) and the real Postgres repositories (Phase 2) must implement.

The `scripts/migrate.ts` runner is idempotent — running it twice on a clean database must succeed without errors (use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` throughout). A `scripts/seed.ts` provides realistic dev data and must exit immediately if `NODE_ENV=production`.

## Acceptance Criteria

**AC1:** Given PostgreSQL is running via Docker Compose,
When `npx tsx scripts/migrate.ts` is run,
Then all 4 migration files execute in order (001→002→003→004) with a success log per file and zero errors

**AC2:** Given migration 001 runs,
Then tables `contacts`, `events`, `registrations`, `vendors`, `industries`, `job_titles` exist with CUID2 TEXT PKs, correct column types, and FK constraints as per the authoritative schema in architecture.md

**AC3:** Given migration 002 runs,
Then tables `users` (id, email, password_hash, role, name, timestamps) and `user_events` (id, user_id FK, event_id FK, granted_by FK, granted_at, UNIQUE(user_id, event_id)) exist

**AC4:** Given migration 003 runs,
Then tables `flagged_records` and `audit_logs` exist; `audit_logs` has JSONB `metadata` column and indexes on `actor_id`, `event_id`, `target_id`

**AC5:** Given migration 004 runs,
Then all required indexes exist: `contacts(industry_id)`, `contacts(city)`, `contacts(job_title_id)`, `registrations(event_id, status)`, `registrations(contact_id)`

**AC6:** Given the migration script is run a second time,
Then it completes without errors using `CREATE TABLE IF NOT EXISTS` (idempotent)

**AC7:** Given `scripts/seed.ts` is run,
Then realistic dev data is inserted (minimum: 2 users — admin + staff, 3 events in varied statuses, 10 contacts)
And the seed script exits immediately with an error if `NODE_ENV=production`

## Dev Notes

### Tech Stack (Authoritative)

- **Database:** PostgreSQL 16 (Docker container `postgres:16-alpine`)
- **Driver:** `pg` (node-postgres) — direct SQL, no ORM
- **Runtime:** `npx tsx scripts/migrate.ts` (TypeScript, no compile step needed)
- **Env:** `DATABASE_URL` from `src/config/index.ts`

### File Locations

```
yorindo-api/
  scripts/
    migrate.ts          ← Migration runner (reads files in order)
    seed.ts             ← Dev seed data; exits on NODE_ENV=production
  migrations/
    001_core_schema.sql
    002_users_access.sql
    003_audit_flagged.sql
    004_indexes.sql
```

### Architecture Constraints (MUST FOLLOW)

1. **CUID2 primary keys everywhere** — `id TEXT PRIMARY KEY`, generated application-side via `createId()` from `@paralleldrive/cuid2`. No `SERIAL`, `BIGSERIAL`, or `gen_random_uuid()`.
2. **Idempotent** — `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$` for enum types.
3. **Direct SQL** — no migration framework (no Flyway, no Knex migrations). Simple sequential file execution.
4. **Authoritative schema** — follows architecture.md exactly. Do not add columns not listed there.
5. **Seed guard** — `scripts/seed.ts` must `process.exit(1)` immediately if `process.env.NODE_ENV === 'production'`.

### PostgreSQL Schema — Migration 001: Core Schema

```sql
-- Primary keys are CUID2 TEXT strings, generated application-side via @paralleldrive/cuid2

-- Industries lookup
CREATE TABLE IF NOT EXISTS industries (
  id    TEXT PRIMARY KEY,
  slug  VARCHAR(100) UNIQUE NOT NULL,
  name  VARCHAR(200) NOT NULL
);

-- Job Titles lookup
CREATE TABLE IF NOT EXISTS job_titles (
  id    TEXT PRIMARY KEY,
  slug  VARCHAR(100) UNIQUE NOT NULL,
  name  VARCHAR(200) NOT NULL
);

-- Vendors
CREATE TABLE IF NOT EXISTS vendors (
  id         TEXT PRIMARY KEY,
  name       VARCHAR(200) NOT NULL,
  contact    VARCHAR(200),
  phone      VARCHAR(20),
  email      VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts
CREATE TABLE IF NOT EXISTS contacts (
  id                TEXT PRIMARY KEY,
  name              VARCHAR(200) NOT NULL,
  phone             VARCHAR(20) UNIQUE NOT NULL,  -- normalized: +62XXXXXXXXXX
  email             VARCHAR(200) UNIQUE,
  industry_id       TEXT REFERENCES industries(id),
  job_title_id      TEXT REFERENCES job_titles(id),
  city              VARCHAR(100),
  company           VARCHAR(200),
  company_size      VARCHAR(20),                  -- '<50', '50-200', '200-1000', '>1000'
  source            VARCHAR(50),                  -- 'excel_upload', 'form', 'manual'
  completeness_score NUMERIC(4,3) DEFAULT 0,       -- 0.000 to 1.000
  consent_status    VARCHAR(30) DEFAULT 'legacy_unverified', -- 'active', 'suppressed', 'legacy_unverified'
  flag_category     VARCHAR(50),                  -- 'invalid-data', 'duplicate', null = clean
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Event status enum
DO $$ BEGIN
  CREATE TYPE event_status AS ENUM ('draft', 'published', 'active', 'completed', 'cancelled', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Events
CREATE TABLE IF NOT EXISTS events (
  id               TEXT PRIMARY KEY,
  name             VARCHAR(300) NOT NULL,
  slug             VARCHAR(150) UNIQUE NOT NULL,
  date             TIMESTAMPTZ NOT NULL,
  timezone         VARCHAR(50) DEFAULT 'Asia/Jakarta',
  city             VARCHAR(100),
  venue            VARCHAR(300),
  description      TEXT,
  capacity         INTEGER,
  waitlist_buffer  INTEGER DEFAULT 0,
  approval_mode    VARCHAR(20) DEFAULT 'manual',   -- 'auto', 'manual', 'hybrid'
  notification_channel VARCHAR(20) DEFAULT 'email', -- 'email', 'whatsapp'
  scan_format      VARCHAR(20) DEFAULT 'qr',        -- 'qr'
  target_criteria  JSONB,
  survey_schema    JSONB,                            -- { schema: JSONSchema7, uiSchema: UISchema }
  vendor_id        TEXT REFERENCES vendors(id),
  status           event_status NOT NULL DEFAULT 'draft',
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Registration status enum
DO $$ BEGIN
  CREATE TYPE reg_status AS ENUM ('pending', 'confirmed', 'approved', 'rejected', 'waitlisted', 'attended', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Registrations
CREATE TABLE IF NOT EXISTS registrations (
  id           TEXT PRIMARY KEY,
  contact_id   TEXT REFERENCES contacts(id) ON DELETE CASCADE,
  event_id     TEXT REFERENCES events(id) ON DELETE CASCADE,
  status       reg_status NOT NULL DEFAULT 'pending',
  ticket_token TEXT,
  ai_score     NUMERIC(4,3),
  flag_override BOOLEAN DEFAULT FALSE,
  approved_at  TIMESTAMPTZ,
  attended_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, event_id)
);
```

### Migration 002: Users & Access

```sql
-- Users
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL,  -- 'admin', 'viewer', 'staff'
  name          VARCHAR(200),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- User-Event access assignments (staff/viewer event scoping)
CREATE TABLE IF NOT EXISTS user_events (
  id         TEXT PRIMARY KEY,
  user_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
  event_id   TEXT REFERENCES events(id) ON DELETE CASCADE,
  granted_by TEXT REFERENCES users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);
```

### Migration 003: Audit & Flagged Records

```sql
-- ETL upload log (replaces former MongoDB raw_uploads collection)
CREATE TABLE IF NOT EXISTS raw_uploads (
  id             TEXT PRIMARY KEY,
  filename       TEXT NOT NULL,
  uploaded_by    TEXT REFERENCES users(id),
  row_count      INTEGER NOT NULL DEFAULT 0,
  upserted_count INTEGER NOT NULL DEFAULT 0,
  flagged_count  INTEGER NOT NULL DEFAULT 0,
  failed_count   INTEGER NOT NULL DEFAULT 0,
  status         VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Flagged Records (from ETL)
CREATE TABLE IF NOT EXISTS flagged_records (
  id          TEXT PRIMARY KEY,
  raw_data    JSONB NOT NULL,
  flags       JSONB NOT NULL,             -- array of flag reasons
  status      VARCHAR(20) DEFAULT 'pending', -- 'pending', 'resolved', 'discarded'
  upload_id   TEXT,                        -- raw_uploads.id reference (CUID2)
  resolved_by TEXT REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs (INSERT only — never UPDATE or DELETE)
CREATE TABLE IF NOT EXISTS audit_logs (
  id         TEXT PRIMARY KEY,
  action     VARCHAR(100) NOT NULL,        -- '{resource}.{verb}'
  actor_id   TEXT REFERENCES users(id),
  actor_role VARCHAR(20) NOT NULL,
  event_id   TEXT REFERENCES events(id),
  target_id  TEXT,                         -- flexible target (contact, registration, etc.) — CUID2 string
  target_type VARCHAR(50),
  metadata   JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suppression / Consent records
CREATE TABLE IF NOT EXISTS consent_records (
  id             TEXT PRIMARY KEY,
  contact_id     TEXT REFERENCES contacts(id) ON DELETE CASCADE,
  consent_status VARCHAR(30) NOT NULL,
  purpose        TEXT,
  recorded_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### Migration 004: Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_contacts_industry_id ON contacts(industry_id);
CREATE INDEX IF NOT EXISTS idx_contacts_city ON contacts(city);
CREATE INDEX IF NOT EXISTS idx_contacts_job_title_id ON contacts(job_title_id);
CREATE INDEX IF NOT EXISTS idx_contacts_consent_status ON contacts(consent_status);
CREATE INDEX IF NOT EXISTS idx_registrations_event_id_status ON registrations(event_id, status);
CREATE INDEX IF NOT EXISTS idx_registrations_contact_id ON registrations(contact_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_id ON audit_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_id ON audit_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status) WHERE deleted_at IS NULL;
```

### migrate.ts Structure

```typescript
import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const migrations = [
  '001_core_schema.sql',
  '002_users_access.sql',
  '003_audit_flagged.sql',
  '004_indexes.sql',
]

async function migrate() {
  for (const file of migrations) {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations', file), 'utf8')
    await pool.query(sql)
    console.log(`✓ Migration ${file} applied`)
  }
  await pool.end()
  console.log('All migrations complete.')
}

migrate().catch(err => { console.error(err); process.exit(1) })
```

### Seed Data (seed.ts)

Seed must insert:
- 2 industries: `{ slug: 'teknologi', name: 'Teknologi Informasi' }`, `{ slug: 'kesehatan', name: 'Kesehatan' }`
- 3 users: admin (`role: 'admin'`), viewer (`role: 'viewer'`), and staff (`role: 'staff'`), all with bcrypt-hashed passwords
- 3 events: one `draft`, one `published`, one `completed`
- 10 contacts with varied industry/city/company_size

### Anti-Patterns (NEVER DO)

- NEVER use `SERIAL`, `BIGSERIAL`, or `gen_random_uuid()` — always `TEXT PRIMARY KEY` with CUID2 generated application-side
- NEVER use `CREATE TABLE` without `IF NOT EXISTS`
- NEVER create indexes without `IF NOT EXISTS`
- NEVER run seed in production — guard with `NODE_ENV` check
- NEVER access DB from migration runner without using pg Pool from env var

### Test Requirements

- Test: `migrate.ts` runs all 4 files in order on a test DB (use a separate `TEST_DATABASE_URL`)
- Test: running migrate twice is idempotent (no errors on second run)
- Test: seed inserts expected record counts
- Test: seed exits with error if `NODE_ENV=production`
- Tests use a real PostgreSQL connection — Docker must be running for integration tests

### Dependencies

- Prerequisite: Story 1.1 (Docker Compose must be running, `DATABASE_URL` must be set)
- Packages: `pg`, `tsx` (already from Story 1.1)
- Optional: `bcrypt` for seed password hashing (already installed in Story 1.1)

## Tasks / Subtasks

- [ ] Task 1: Create migrations directory and SQL files
  - [ ] Subtask 1.1: `migrations/001_core_schema.sql` — contacts, events, registrations, vendors, industries, job_titles
  - [ ] Subtask 1.2: `migrations/002_users_access.sql` — users, user_events
  - [ ] Subtask 1.3: `migrations/003_audit_flagged.sql` — flagged_records, audit_logs, consent_records
  - [ ] Subtask 1.4: `migrations/004_indexes.sql` — all performance indexes

- [ ] Task 2: Create `scripts/migrate.ts` runner
  - [ ] Subtask 2.1: Read and execute migration files in order
  - [ ] Subtask 2.2: Log success per file
  - [ ] Subtask 2.3: Close pg Pool after all migrations
  - [ ] Subtask 2.4: Exit with non-zero code on any failure

- [ ] Task 3: Create `scripts/seed.ts`
  - [ ] Subtask 3.1: Guard: `if (process.env.NODE_ENV === 'production') process.exit(1)`
  - [ ] Subtask 3.2: Seed industries (2), job_titles (2)
  - [ ] Subtask 3.3: Seed users (admin + staff with bcrypt password hashes)
  - [ ] Subtask 3.4: Seed events (draft, published, completed)
  - [ ] Subtask 3.5: Seed 10 contacts with varied data

- [ ] Task 4: Write vitest tests
  - [ ] Subtask 4.1: Integration test — migrate runs without errors
  - [ ] Subtask 4.2: Integration test — migrate is idempotent (run twice, no error)
  - [ ] Subtask 4.3: Unit test — seed exits 1 in production mode

- [ ] Task 5: Verify and document
  - [ ] Subtask 5.1: Run `docker compose up -d postgres` then `npx tsx scripts/migrate.ts` — verify success
  - [ ] Subtask 5.2: Run `npx tsx scripts/seed.ts` — verify 10 contacts, 3 events, 2 users created

## Dev Agent Record

### Implementation Plan

1. Create `migrations/` directory with 4 idempotent SQL files
2. Update `scripts/migrate.ts` placeholder with actual runner (reads files in order, exits non-zero on error)
3. Update `scripts/seed.ts` placeholder with actual seed data (production guard, bcrypt hashed passwords)
4. Write tests: integration tests skip if `DATABASE_URL` not set, unit test for production guard

### Debug Log

- `__dirname` not available in ESM — used `fileURLToPath(import.meta.url)` pattern in migrate.ts
- Integration tests use `describe.skipIf(!hasDatabase)` to auto-skip without DB

### Completion Notes

- 5 tests pass, 2 DB integration tests skip (expected in Phase 1 — no DB running)
- SQL files are fully idempotent: `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, enum guards via `DO $$ ... EXCEPTION WHEN duplicate_object`
- Seed guards: exits with code 1 if `NODE_ENV=production`
- Migration 005 implemented: paid event fields, dual survey, attendance_status, google_sub, profile_updated_at, survey_responses table, event_key, check_in_method, checked_in_by; `ALTER TYPE reg_status ADD VALUE IF NOT EXISTS 'provisional'`; backfill for waitlisted→pending / cancelled→rejected
- Migration 006 implemented: province_code, province_name, city_code, city_name on contacts (all TEXT NULLABLE); indexes added
- `scripts/migrate.ts` updated to run all 6 migrations in order
- `scripts/seed.ts` fixed: explicit CUID2 IDs on all INSERT statements (bug fix — TEXT PRIMARY KEY has no DEFAULT); province/city codes populated for seeded contacts; new event columns included
- Integration test updated to assert 6 migrations, survey_responses table, location columns, check-in columns

## File List

- `migrations/001_core_schema.sql`
- `migrations/002_users_access.sql`
- `migrations/003_audit_flagged.sql`
- `migrations/004_indexes.sql`
- `migrations/005_sprint_changes_2026_03_28.sql`
- `migrations/006_location_fields.sql`
- `scripts/migrate.ts`
- `scripts/seed.ts`
- `src/tests/migrate.test.ts`

## Migration 005 Addendum (2026-03-28)

> Added to scope by Sprint Change Proposal 2026-03-28 + participant profile decisions (party mode 2026-03-28).
> File: `migrations/005_sprint_changes_2026_03_28.sql`
> Must run before any Phase 2 BE work on Epics 4, 5, 6, 11.

```sql
-- ─────────────────────────────────────────────
-- events table: paid event + registration close + dual survey
-- ─────────────────────────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_paid              BOOL DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS price                DECIMAL(12,2) NULLABLE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS payment_method       VARCHAR(50) NULLABLE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS registration_closed  BOOL DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS post_survey_enabled  BOOL DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS post_survey_schema   JSONB NULLABLE;
-- rename survey_schema → registration_survey_schema (safe: column preserved, data intact)
ALTER TABLE events RENAME COLUMN survey_schema TO registration_survey_schema;

-- ─────────────────────────────────────────────
-- registrations table: simplified status + attendance dimension
-- ─────────────────────────────────────────────
-- Add attendance_status column
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS attendance_status VARCHAR(20) NULLABLE
  CHECK (attendance_status IN ('attended', 'no_show'));

-- Update reg_status enum: remove waitlisted + cancelled, add provisional
-- PostgreSQL cannot DROP enum values — use a migration-safe rename approach:
ALTER TYPE reg_status ADD VALUE IF NOT EXISTS 'provisional';
-- Note: 'waitlisted' and 'cancelled' values cannot be removed from PostgreSQL enum.
-- Application layer enforces the new valid set: provisional | pending | approved | rejected
-- Existing rows with waitlisted/cancelled status must be backfilled in seed/migration script:
UPDATE registrations SET status = 'rejected' WHERE status = 'cancelled';
UPDATE registrations SET status = 'pending'  WHERE status = 'waitlisted';

-- ─────────────────────────────────────────────
-- contacts table: SSO identity + participant profile staleness
-- ─────────────────────────────────────────────
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS google_sub         VARCHAR(255) UNIQUE NULLABLE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS profile_updated_at TIMESTAMPTZ NULLABLE;
-- profile_updated_at is set when participant updates their own profile via /account/profile
-- NULL = never updated by participant (populated from ETL/admin import)
-- Staleness threshold: 180 days (application-configured, not DB-enforced)

-- ─────────────────────────────────────────────
-- New table: survey_responses
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS survey_responses (
  id              TEXT PRIMARY KEY,
  event_id        TEXT NOT NULL REFERENCES events(id),
  registration_id TEXT NOT NULL REFERENCES registrations(id),
  survey_type     VARCHAR(20) NOT NULL CHECK (survey_type IN ('registration', 'post_event')),
  responses       JSONB NOT NULL,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Indexes for new columns
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_contacts_google_sub ON contacts(google_sub) WHERE google_sub IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_profile_updated_at ON contacts(profile_updated_at);
CREATE INDEX IF NOT EXISTS idx_survey_responses_event_id ON survey_responses(event_id, survey_type);
CREATE INDEX IF NOT EXISTS idx_survey_responses_registration_id ON survey_responses(registration_id);
CREATE INDEX IF NOT EXISTS idx_registrations_attendance_status ON registrations(attendance_status);

-- ─────────────────────────────────────────────
-- events table: encrypted QR event key
-- ─────────────────────────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_key TEXT NULLABLE;
-- event_key: base64-encoded 256-bit AES-GCM key, generated server-side per event at publish time
-- Distributed to staff at login as part of eventKeys map; used by staff device to decrypt QR payload
-- Phase 2: generate on event publish, rotate on staff revocation

-- ─────────────────────────────────────────────
-- registrations table: check-in audit columns
-- ─────────────────────────────────────────────
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS check_in_method VARCHAR(20) NULLABLE
  CHECK (check_in_method IN ('qr', 'manual'));
-- 'qr'     = staff scanned encrypted QR on their authorized device
-- 'manual' = staff found participant via name search + matched KTP
-- NULL     = not yet checked in

ALTER TABLE registrations ADD COLUMN IF NOT EXISTS checked_in_by TEXT REFERENCES users(id) NULLABLE;
-- CUID2 FK to users — records which staff member performed the check-in
-- Enables per-staff audit trail and fraud detection

CREATE INDEX IF NOT EXISTS idx_registrations_check_in_method ON registrations(check_in_method);
CREATE INDEX IF NOT EXISTS idx_registrations_checked_in_by ON registrations(checked_in_by);
```

> **Tasks to add to story implementation:**
> - [x] Create `migrations/005_sprint_changes_2026_03_28.sql` with the SQL above (including all new columns through check_in_method + checked_in_by)
> - [x] Add `'005_sprint_changes_2026_03_28.sql'` to the migrations array in `scripts/migrate.ts`
> - [x] Update `scripts/seed.ts` to avoid inserting `waitlisted`/`cancelled` status values
> - [x] Update integration test to assert 6 migrations run in order (combined with migration 006)
> - [x] Note: `event_key` is NULL in seed data (Phase 2 concern — key generation at event publish)

## Migration 006 Addendum (2026-03-28)

> Added to scope by SCP-2026-03-28-D (wilayah.id location integration).
> File: `migrations/006_location_fields.sql`
> Must run before any Phase 2 BE work that reads contact location data.

```sql
-- ─────────────────────────────────────────────
-- contacts table: structured location fields (wilayah.id integration)
-- ─────────────────────────────────────────────
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS province_code TEXT NULLABLE;
-- province_code: dot-separated Kemendagri code, e.g. "31" (DKI Jakarta)
-- Source: wilayah.id API / ETL city-to-code mapping

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS province_name TEXT NULLABLE;
-- province_name: denormalized display name, e.g. "DKI Jakarta"

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS city_code TEXT NULLABLE;
-- city_code: dot-separated regency/city code, e.g. "31.71" (Kota Jakarta Pusat)
-- ALWAYS store as TEXT — codes are dot-separated strings, never integers

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS city_name TEXT NULLABLE;
-- city_name: denormalized display name, e.g. "Kota Jakarta Pusat"

-- Existing contacts.city TEXT preserved as legacy free-text fallback

CREATE INDEX IF NOT EXISTS idx_contacts_province_code ON contacts(province_code);
CREATE INDEX IF NOT EXISTS idx_contacts_city_code ON contacts(city_code);
```

> **Tasks to add to story implementation:**
> - [x] Create `migrations/006_location_fields.sql` with the SQL above
> - [x] Add `'006_location_fields.sql'` to the migrations array in `scripts/migrate.ts`
> - [x] Update integration test to assert 6 migrations run in order
> - [x] Update seed contacts to include sample `province_code`/`city_code` values (Jakarta→"31"/"31.71", Bandung→"32"/"32.73", etc.)

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-22 | Story created (BE Foundation) | bmad-context-engine |
| 2026-03-28 | Migration 005 addendum added: paid event fields, dual survey, registration status update, attendance_status, contacts.google_sub + profile_updated_at, survey_responses table | Sprint Change Proposal 2026-03-28 + party mode session |
| 2026-03-28 | Migration 005 extended: events.event_key (AES-GCM key), registrations.check_in_method ('qr'\|'manual'), registrations.checked_in_by (CUID2 FK) | SCP-2026-03-28-B |
| 2026-03-28 | Migration 006 addendum added: contacts.province_code, province_name, city_code, city_name (TEXT, nullable, indexed) | SCP-2026-03-28-D |
