-- ─────────────────────────────────────────────
-- Migration 011: Drop UNIQUE constraints on contacts.phone and contacts.email
-- Applied via: npx tsx scripts/migrate.ts
-- ─────────────────────────────────────────────
-- Allows multiple contact records with the same phone or email.
-- Duplicate detection is handled in ContactRepository.upsert:
-- any new contact whose phone/email matches an existing record is
-- auto-flagged as 'duplicate' and registered in duplicate_pairs.

ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_phone_key;
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_email_key;
