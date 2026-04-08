-- ─────────────────────────────────────────────
-- Migration 009: Registration Form Fields
-- Applied via: npx tsx scripts/migrate.ts
-- ─────────────────────────────────────────────
-- Adds registration form fields to registrations table:
--   industry, secondary_email, title, location

-- ─────────────────────────────────────────────
-- Registration Form Fields
-- ─────────────────────────────────────────────
ALTER TABLE registrations 
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS secondary_email VARCHAR(200),
  ADD COLUMN IF NOT EXISTS title VARCHAR(200),
  ADD COLUMN IF NOT EXISTS location VARCHAR(200);

-- Index for filtering by industry
CREATE INDEX IF NOT EXISTS idx_registrations_industry ON registrations(industry);

-- Index for filtering by location
CREATE INDEX IF NOT EXISTS idx_registrations_location ON registrations(location);
