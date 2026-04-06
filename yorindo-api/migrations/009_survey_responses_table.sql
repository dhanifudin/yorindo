-- Migration 009: Survey Responses Table + Dual Survey Schema Columns
-- Story: BE-4.4 (Survey Storage, Response Aggregation & Export)
-- Date: 2026-04-06
--
-- Purpose:
-- 1. Create survey_responses table for storing participant survey answers
-- 2. Add dual survey schema columns to events table (registration + post-event)
-- 3. Add post_survey_enabled toggle to events table
--
-- ID strategy: TEXT PRIMARY KEY with CUID2 (app-generated), consistent with
-- raw_uploads and duplicate_pairs in migration 008. No FK constraints to UUID
-- tables (events, registrations) — referential integrity enforced at app level.

-- ─── Survey Responses Table ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS survey_responses (
  id              TEXT PRIMARY KEY,
  event_id        TEXT NOT NULL,
  registration_id TEXT NOT NULL,
  survey_type     TEXT NOT NULL DEFAULT 'registration'
    CHECK (survey_type IN ('registration', 'post-event')),
  answers         JSONB NOT NULL DEFAULT '{}',
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_survey_responses_event_type ON survey_responses(event_id, survey_type);
CREATE INDEX IF NOT EXISTS idx_survey_responses_registration ON survey_responses(registration_id);

-- ─── Dual Survey Schema Columns on Events ─────────────────────────────────────

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS registration_survey_schema JSONB,
  ADD COLUMN IF NOT EXISTS post_survey_schema JSONB,
  ADD COLUMN IF NOT EXISTS post_survey_enabled BOOLEAN DEFAULT false;
