-- ─────────────────────────────────────────────
-- Migration 007: Demo Support Tables
-- Applied via: npx tsx scripts/migrate.ts
-- ─────────────────────────────────────────────
-- Adds tables needed for demo seed validation:
--   templates, event_sponsors, blast_logs

-- ─────────────────────────────────────────────
-- Templates: notification message templates
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS templates (
  id         TEXT PRIMARY KEY,
  name       VARCHAR(200) NOT NULL,
  type       VARCHAR(30) NOT NULL CHECK (type IN ('invitation', 'confirmation', 'rejection', 'ticket_delivery', 'cancellation', 'reminder')),
  channel    VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  subject    VARCHAR(300),
  body       TEXT NOT NULL,
  variables  JSONB DEFAULT '[]',  -- array of variable names used in template
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Event Sponsors: junction between events and vendors
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_sponsors (
  id            TEXT PRIMARY KEY,
  event_id      TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  vendor_id     TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  tier          VARCHAR(20) DEFAULT 'standard' CHECK (tier IN ('premium', 'standard', 'supporter')),
  display_order INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_event_sponsors_event_id ON event_sponsors(event_id);
CREATE INDEX IF NOT EXISTS idx_event_sponsors_vendor_id ON event_sponsors(vendor_id);

-- ─────────────────────────────────────────────
-- Blast Logs: invitation blast history
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blast_logs (
  id              TEXT PRIMARY KEY,
  event_id        TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  template_id     TEXT,
  channel         VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  recipient_count INTEGER DEFAULT 0,
  status          VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'sending', 'completed', 'failed')),
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blast_logs_event_id ON blast_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_blast_logs_sent_at ON blast_logs(sent_at DESC);
