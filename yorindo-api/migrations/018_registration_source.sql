-- ─────────────────────────────────────────────
-- Migration 018: Registration Source Tracking
-- Adds registration_source to track how participants registered
-- Adds blast_log_recipients to track which contacts received each blast
-- Applied via: npx tsx scripts/migrate.ts
-- ─────────────────────────────────────────────

-- ─────────────────────────────────────────────
-- registrations: track registration source
-- Values: 'blast' (invited via blast), 'organic' (found link themselves), 'ots' (walk-in)
-- ─────────────────────────────────────────────
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS registration_source TEXT
  CHECK (registration_source IN ('blast', 'organic', 'ots'));

-- ─────────────────────────────────────────────
-- blast_log_recipients: track individual blast recipients
-- Links blast_logs to contacts so we can determine who was invited
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blast_log_recipients (
  id            TEXT PRIMARY KEY,
  blast_log_id  TEXT NOT NULL REFERENCES blast_logs(id) ON DELETE CASCADE,
  contact_id    TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  event_id      TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  channel       VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(blast_log_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_blast_log_recipients_blast_log_id ON blast_log_recipients(blast_log_id);
CREATE INDEX IF NOT EXISTS idx_blast_log_recipients_contact_event ON blast_log_recipients(contact_id, event_id);
