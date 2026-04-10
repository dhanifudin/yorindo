-- ─────────────────────────────────────────────
-- Migration 015: Settings table for external service configuration
-- Applied via: npx tsx scripts/migrate.ts
-- ─────────────────────────────────────────────
-- Stores external service configuration (API keys, service providers, etc.)
-- that can be managed from the admin settings UI instead of env vars.

CREATE TABLE IF NOT EXISTS settings (
  id          TEXT PRIMARY KEY,
  key         VARCHAR(100) NOT NULL UNIQUE,
  value       TEXT,
  category    VARCHAR(50) NOT NULL,
  description TEXT,
  is_secret   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
