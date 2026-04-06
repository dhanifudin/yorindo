-- ─────────────────────────────────────────────
-- Migration 008: Phase 2 Schema Gaps
-- Bridges mismatches between DB schema and domain types
-- Applied via: npx tsx scripts/migrate.ts
-- ─────────────────────────────────────────────

-- ─────────────────────────────────────────────
-- contacts: denormalized free-text fields
-- (industry_id / job_title_id FK columns remain for legacy)
-- ─────────────────────────────────────────────
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS service_type TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS job_title    TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS department   TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS event_date   TEXT;

-- ─────────────────────────────────────────────
-- events: split date into start + end with time fields
-- ─────────────────────────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date   TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_time   TEXT;

-- ─────────────────────────────────────────────
-- vendors: add fields required by Vendor domain type
-- ─────────────────────────────────────────────
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS industry      TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS logo_url      TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS website       TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS notes         TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT NOW();

-- ─────────────────────────────────────────────
-- consent_records: add suppression fields
-- ─────────────────────────────────────────────
ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS phone  TEXT;
ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS email  TEXT;
ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS name   TEXT;
ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS reason TEXT;

-- ─────────────────────────────────────────────
-- registrations: ETL provenance fields
-- ─────────────────────────────────────────────
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS upload_source  TEXT
  CHECK (upload_source IN ('etl_import', 'onsite_import', 'form'));
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS event_date     TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS event_name_raw TEXT;

-- ─────────────────────────────────────────────
-- raw_uploads: ETL upload tracking
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS raw_uploads (
  id             TEXT PRIMARY KEY,
  filename       TEXT NOT NULL,
  uploaded_by    TEXT,
  row_count      INTEGER NOT NULL DEFAULT 0,
  upserted_count INTEGER NOT NULL DEFAULT 0,
  flagged_count  INTEGER NOT NULL DEFAULT 0,
  failed_count   INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raw_uploads_status ON raw_uploads(status);
CREATE INDEX IF NOT EXISTS idx_raw_uploads_created_at ON raw_uploads(created_at DESC);

-- ─────────────────────────────────────────────
-- duplicate_pairs: contact deduplication tracking
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS duplicate_pairs (
  id            TEXT PRIMARY KEY,
  primary_id    TEXT NOT NULL,
  duplicate_id  TEXT NOT NULL,
  match_score   NUMERIC(4,3) NOT NULL,
  match_reasons JSONB NOT NULL DEFAULT '[]',
  resolved_at   TIMESTAMPTZ,
  UNIQUE(primary_id, duplicate_id)
);

CREATE INDEX IF NOT EXISTS idx_duplicate_pairs_primary_id   ON duplicate_pairs(primary_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_pairs_duplicate_id ON duplicate_pairs(duplicate_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_pairs_resolved_at  ON duplicate_pairs(resolved_at);
