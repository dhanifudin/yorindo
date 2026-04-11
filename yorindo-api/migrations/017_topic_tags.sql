-- ─────────────────────────────────────────────
-- Migration 017: Topic Tags for Audience Targeting
-- Adds topic_tags to events and contacts for secondary audience matching
-- Applied via: npx tsx scripts/migrate.ts
-- ─────────────────────────────────────────────

-- ─────────────────────────────────────────────
-- events: topic tags for thematic content matching
-- ─────────────────────────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS topic_tags TEXT[] DEFAULT '{}';

-- ─────────────────────────────────────────────
-- contacts: topic tags for interest-based matching
-- ─────────────────────────────────────────────
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS topic_tags TEXT[] DEFAULT '{}';
