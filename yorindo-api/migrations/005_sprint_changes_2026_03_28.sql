-- ─────────────────────────────────────────────
-- Migration 005: Sprint Changes 2026-03-28
-- Applied via: npx tsx scripts/migrate.ts
-- ─────────────────────────────────────────────

-- ─────────────────────────────────────────────
-- events table: paid event + registration close + dual survey
-- ─────────────────────────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_paid             BOOL DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS price               DECIMAL(12,2);
ALTER TABLE events ADD COLUMN IF NOT EXISTS payment_method      VARCHAR(50);
ALTER TABLE events ADD COLUMN IF NOT EXISTS registration_closed BOOL DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS post_survey_enabled BOOL DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS post_survey_schema  JSONB;

-- rename survey_schema → registration_survey_schema (safe: column preserved, data intact)
DO $$ BEGIN
  ALTER TABLE events RENAME COLUMN survey_schema TO registration_survey_schema;
EXCEPTION WHEN undefined_column THEN
  -- already renamed in a previous run — idempotent
  NULL;
END $$;

-- ─────────────────────────────────────────────
-- registrations table: simplified status + attendance dimension
-- ─────────────────────────────────────────────
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS attendance_status VARCHAR(20)
  CHECK (attendance_status IN ('attended', 'no_show'));

-- Update reg_status enum: add provisional value
-- PostgreSQL cannot DROP enum values — application layer enforces the valid set:
--   provisional | pending | approved | rejected
-- Existing rows with waitlisted/cancelled are backfilled below.
ALTER TYPE reg_status ADD VALUE IF NOT EXISTS 'provisional';

-- Backfill legacy status values that are no longer valid at the application layer
UPDATE registrations SET status = 'rejected' WHERE status = 'cancelled';
UPDATE registrations SET status = 'pending'  WHERE status = 'waitlisted';

-- ─────────────────────────────────────────────
-- contacts table: SSO identity + participant profile staleness
-- ─────────────────────────────────────────────
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS google_sub         VARCHAR(255);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS profile_updated_at TIMESTAMPTZ;

-- Add unique constraint on google_sub (only if it doesn't already exist)
DO $$ BEGIN
  ALTER TABLE contacts ADD CONSTRAINT contacts_google_sub_unique UNIQUE (google_sub);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- ─────────────────────────────────────────────
-- New table: survey_responses
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS survey_responses (
  id              TEXT PRIMARY KEY,
  event_id        TEXT NOT NULL REFERENCES events(id),
  registration_id TEXT NOT NULL REFERENCES registrations(id),
  survey_type     TEXT NOT NULL DEFAULT 'registration'
    CHECK (survey_type IN ('registration', 'post-event')),
  answers         JSONB NOT NULL DEFAULT '{}',
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- events table: encrypted QR event key
-- ─────────────────────────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_key TEXT;
-- event_key: base64-encoded 256-bit AES-GCM key, generated server-side per event at publish time
-- NULL in dev/Phase 1 — key generation happens at event publish in Phase 2

-- ─────────────────────────────────────────────
-- registrations table: check-in audit columns
-- ─────────────────────────────────────────────
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS check_in_method VARCHAR(20)
  CHECK (check_in_method IN ('qr', 'manual'));
-- 'qr'     = staff scanned encrypted QR on their authorized device
-- 'manual' = staff found participant via name search
-- NULL     = not yet checked in

ALTER TABLE registrations ADD COLUMN IF NOT EXISTS checked_in_by TEXT REFERENCES users(id);

-- ─────────────────────────────────────────────
-- Indexes for new columns
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_contacts_google_sub ON contacts(google_sub) WHERE google_sub IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_profile_updated_at ON contacts(profile_updated_at);
CREATE INDEX IF NOT EXISTS idx_survey_responses_event_id ON survey_responses(event_id, survey_type);
CREATE INDEX IF NOT EXISTS idx_survey_responses_registration_id ON survey_responses(registration_id);
CREATE INDEX IF NOT EXISTS idx_registrations_attendance_status ON registrations(attendance_status);
CREATE INDEX IF NOT EXISTS idx_registrations_check_in_method ON registrations(check_in_method);
CREATE INDEX IF NOT EXISTS idx_registrations_checked_in_by ON registrations(checked_in_by);
