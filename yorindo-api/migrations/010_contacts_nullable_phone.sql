-- ─────────────────────────────────────────────
-- Migration 010: Make contacts.phone nullable
-- Applied via: npx tsx scripts/migrate.ts
-- ─────────────────────────────────────────────
-- Allows contacts imported without a phone number to be stored.
-- The unique constraint is preserved but NULL values are excluded
-- (PostgreSQL UNIQUE allows multiple NULLs by default).
--
-- The hasPhone filter (phone IS NOT NULL AND phone <> '') already
-- handles excluding these from blast targeting.

ALTER TABLE contacts ALTER COLUMN phone DROP NOT NULL;
