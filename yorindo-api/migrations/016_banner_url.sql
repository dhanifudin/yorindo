-- ─────────────────────────────────────────────
-- Migration 016: Event Banner URL & Payment Fields
-- Adds banner_url to events table for event banner images
-- Adds missing is_paid, price, payment_method columns to events
-- Applied via: npx tsx scripts/migrate.ts
-- ─────────────────────────────────────────────

-- ─────────────────────────────────────────────
-- events: banner URL for event poster/banner image
-- ─────────────────────────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Clean up any stale blob: URLs from previous mockUploadImage sessions
-- Blob URLs are session-scoped and become invalid after page reload
UPDATE events SET banner_url = NULL WHERE banner_url LIKE 'blob:%';

-- ─────────────────────────────────────────────
-- events: payment fields (required by domain type & routes)
-- ─────────────────────────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_paid       BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS price          NUMERIC(10,2);
ALTER TABLE events ADD COLUMN IF NOT EXISTS payment_method TEXT;
