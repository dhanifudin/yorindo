-- ─────────────────────────────────────────────
-- Migration 012: Fix Template Type Constraint
-- Applied via: npx tsx scripts/migrate.ts
-- ─────────────────────────────────────────────
-- Updates templates table CHECK constraint to support all 5 types:
--   invitation, confirmation, rejection, ticket_delivery, cancellation
-- (Previously had 'reminder' instead of 'cancellation')

-- Step 1: Delete invalid rows that would violate the new constraint
-- (e.g. 'reminder' type or invalid 'cancellation' rows from old broken seed)
DELETE FROM templates WHERE type NOT IN ('invitation', 'confirmation', 'rejection', 'ticket_delivery');

-- Step 2: Drop the old constraint
ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_type_check;

-- Step 3: Add the new constraint with corrected types (including reminder)
ALTER TABLE templates
  ADD CONSTRAINT templates_type_check
  CHECK (type IN ('invitation', 'confirmation', 'rejection', 'ticket_delivery', 'cancellation', 'reminder'));
