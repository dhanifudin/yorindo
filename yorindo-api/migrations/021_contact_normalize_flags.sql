-- ─────────────────────────────────────────────
-- Migration 021: Contact Normalization Flags
-- Extends flagCategory enum to include normalization flags
-- Applied via: npx tsx scripts/migrate.ts
-- ─────────────────────────────────────────────

-- PostgreSQL: add new values to the existing enum
ALTER TYPE flag_category ADD VALUE IF NOT EXISTS 'industry-unmatched';
ALTER TYPE flag_category ADD VALUE IF NOT EXISTS 'jobtitle-unmatched';
