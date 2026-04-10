-- ─────────────────────────────────────────────
-- Migration 014: Drop audit_logs FK constraints
-- Applied via: npx tsx scripts/migrate.ts
-- ─────────────────────────────────────────────
-- Audit logs are append-only historical records. They should not fail
-- when a user is deleted or when system processes create log entries
-- without a valid user context.
--
-- The indexes are preserved for query performance.

ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_actor_id_fkey;
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_event_id_fkey;
