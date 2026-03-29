-- ─────────────────────────────────────────────
-- Migration 006: Contact Location Fields (wilayah.id integration)
-- Applied via: npx tsx scripts/migrate.ts
-- SCP-2026-03-28-D
-- ─────────────────────────────────────────────

-- ─────────────────────────────────────────────
-- contacts table: structured location fields
-- ─────────────────────────────────────────────
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS province_code TEXT;
-- province_code: dot-separated Kemendagri code, e.g. "31" (DKI Jakarta)
-- Source: wilayah.id API / ETL city-to-code mapping
-- ALWAYS store as TEXT — codes are dot-separated strings, never integers

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS province_name TEXT;
-- province_name: denormalized display name, e.g. "DKI Jakarta"

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS city_code TEXT;
-- city_code: dot-separated regency/city code, e.g. "31.71" (Kota Jakarta Pusat)
-- ALWAYS store as TEXT — codes are dot-separated strings, never integers

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS city_name TEXT;
-- city_name: denormalized display name, e.g. "Kota Jakarta Pusat"

-- Existing contacts.city TEXT column is preserved as legacy free-text fallback.
-- New province_code/city_code/province_name/city_name are the authoritative structured fields.

-- ─────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_contacts_province_code ON contacts(province_code);
CREATE INDEX IF NOT EXISTS idx_contacts_city_code ON contacts(city_code);
