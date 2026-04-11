-- ─────────────────────────────────────────────
-- Migration 019: Survey Responses Table
-- Stores individual survey responses for registration and post-event surveys
-- Applied via: npx tsx scripts/migrate.ts
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS survey_responses (
  id               TEXT PRIMARY KEY,
  event_id         TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  registration_id  TEXT NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  survey_type      VARCHAR(20) NOT NULL DEFAULT 'registration' CHECK (survey_type IN ('registration', 'post-event')),
  answers          JSONB NOT NULL DEFAULT '{}',
  submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_survey_responses_event_type ON survey_responses(event_id, survey_type);
CREATE INDEX IF NOT EXISTS idx_survey_responses_registration ON survey_responses(registration_id);
