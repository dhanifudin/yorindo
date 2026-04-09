-- ─────────────────────────────────────────────
-- Migration 013: Add template branding columns
-- Applied via: npx tsx scripts/migrate.ts
-- ─────────────────────────────────────────────
-- Adds logo_url, image_type, bg_opacity to templates table
-- for template branding/customization support.

ALTER TABLE templates ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS image_type VARCHAR(20) CHECK (image_type IN ('header', 'background'));
ALTER TABLE templates ADD COLUMN IF NOT EXISTS bg_opacity NUMERIC(3,2) DEFAULT 1.0;
