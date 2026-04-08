---
title: 'Drop UNIQUE on contacts phone/email — flag duplicates on insert'
type: 'refactor'
created: '2026-04-08'
status: 'done'
baseline_commit: 'd7950ad8006c4b7accbffe8f1c352696373e48a8'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `contacts.phone` and `contacts.email` carry `UNIQUE` constraints, which prevents storing legitimately duplicate contact records that originate from different upload sources. The ETL `ON CONFLICT (phone) DO UPDATE` silently overwrites existing data instead of surfacing the collision.

**Approach:** Drop both UNIQUE constraints via a new migration. Rework `ContactRepository.upsert` from upsert-by-phone to plain INSERT: before inserting, detect any existing non-deleted contact with the same phone or email, auto-flag the new record as `duplicate`, and register a `duplicate_pairs` row so the admin can resolve it via the existing Triage UI.

## Boundaries & Constraints

**Always:**
- The new record is always inserted (never silently dropped or merged).
- Duplicate detection in `upsert` checks phone first, then email (if no phone match).
- New contact gets `flag_category = 'duplicate'`; existing contact is untouched.
- `duplicate_pairs` row is created with `ON CONFLICT DO NOTHING` (idempotent).
- `match_reasons` must be a `string[]` to satisfy the OpenAPI schema.
- `findByPhone` must remain deterministic — add `ORDER BY created_at ASC LIMIT 1`.

**Ask First:**
- If a caller passes `flagCategory` explicitly on a record that is also a duplicate, confirm whether to override with `'duplicate'` or preserve the caller-supplied value.

**Never:**
- Do not change the public signature of `upsert` or `findByPhone`.
- Do not touch `users.email` UNIQUE — only `contacts` table.
- Do not change the ETL service or the registration route's `findByPhone`/`update` logic — they call `upsert` and get dedup for free.
- Do not alter `mergeDuplicate` — it still soft-deletes the duplicate contact.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| New contact, no collision | No existing contact shares phone or email | Inserted with caller-supplied `flagCategory` (usually `null`) | — |
| Phone collision | Existing active contact has same phone | New contact inserted with `flag_category = 'duplicate'`; `duplicate_pairs` row created (existing=primary, new=duplicate); score `0.95`, reasons `['phone_exact']` | — |
| Email collision (no phone match) | No phone match, but existing contact has same email | New contact inserted with `flag_category = 'duplicate'`; `duplicate_pairs` row created; score `0.85`, reasons `['email_exact']` | — |
| Both phone and email collision | Both match same or different contacts | Use the phone match as primary; email match ignored | — |
| Null phone and null email | Both fields null on new contact | Plain insert, no collision check | — |
| `findByPhone` with duplicates in DB | Multiple contacts share same phone | Returns the oldest (lowest `created_at`), `LIMIT 1` | — |

</frozen-after-approval>

## Code Map

- `yorindo-api/migrations/011_drop_contacts_unique_phone_email.sql` -- new migration: DROP INDEX for phone/email unique constraints
- `yorindo-api/scripts/migrate.ts` -- add `011_drop_contacts_unique_phone_email.sql` to the migrations list
- `yorindo-api/src/repositories/postgres/ContactRepository.ts:325` -- `upsert`: replace `ON CONFLICT (phone) DO UPDATE` with plain INSERT + pre-check + duplicate_pair registration
- `yorindo-api/src/repositories/postgres/ContactRepository.ts:200` -- `findByPhone`: add `ORDER BY created_at ASC LIMIT 1` for deterministic result

## Tasks & Acceptance

**Execution:**
- [x] `yorindo-api/migrations/011_drop_contacts_unique_phone_email.sql` -- CREATE: SQL to drop the unique constraints on `contacts.phone` and `contacts.email`; comment explains intent
- [x] `yorindo-api/scripts/migrate.ts` -- ADD: append `'011_drop_contacts_unique_phone_email.sql'` to the `migrations` array
- [x] `yorindo-api/src/repositories/postgres/ContactRepository.ts` -- MODIFY `findByPhone`: append `ORDER BY created_at ASC LIMIT 1` to the SELECT query
- [x] `yorindo-api/src/repositories/postgres/ContactRepository.ts` -- MODIFY `upsert`: (1) wrap in `withTransaction`; (2) check for phone collision, then email collision; (3) plain INSERT with resolved `flag_category`; (4) if collision found, insert `duplicate_pairs` row; (5) return mapped contact

**Acceptance Criteria:**
- Given a contact is inserted with a phone number that already exists in the DB, when `upsert` is called, then a new contact row is created, its `flag_category` is `'duplicate'`, and a `duplicate_pairs` row links the existing (primary) and new (duplicate) contacts.
- Given a contact is inserted with an email that already exists (and no phone match), when `upsert` is called, then the same duplicate flagging applies with `match_reasons = ['email_exact']`.
- Given two contacts with the same phone exist and `findByPhone` is called, then it returns the older one (lower `created_at`) without error.
- Given `GET /api/contacts/duplicates` is called after an upsert collision, then the new pair appears in the response and `matchReasons` is an array of strings (OpenAPI contract passes).
- Given the migration is applied, then `INSERT INTO contacts (phone, ...) VALUES ('+62811', ...)` can be executed twice without a unique violation.

## Design Notes

**Collision check order in `upsert`:**
```ts
// 1. phone match (stronger signal)
if (data.phone) {
  const { rows } = await client.query(
    'SELECT * FROM contacts WHERE phone = $1 AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 1', [data.phone]
  )
  existingMatch = rows[0] ?? null
}
// 2. email match (only if no phone match found)
if (!existingMatch && data.email) {
  const { rows } = await client.query(
    'SELECT * FROM contacts WHERE email = $1 AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 1', [data.email]
  )
  existingMatch = rows[0] ?? null
}
```

**Resolved `flag_category`:** if `existingMatch` found, always use `'duplicate'` regardless of what caller passed in `data.flagCategory`.

## Verification

**Commands:**
- `docker compose -f docker-compose.dev.yml exec -T api node_modules/.bin/tsx scripts/migrate.ts` -- expected: `✓ Migration 011_drop_contacts_unique_phone_email.sql applied`
- `docker compose -f docker-compose.dev.yml exec -T api npm test` -- expected: all tests pass
- `docker compose -f docker-compose.dev.yml exec -T api npm run lint` -- expected: no errors

## Spec Change Log

## Suggested Review Order

**Schema change**

- Migration: drops UNIQUE constraints, enabling duplicate phone/email rows
  [`011_drop_contacts_unique_phone_email.sql:1`](../../yorindo-api/migrations/011_drop_contacts_unique_phone_email.sql#L1)

**Core logic — collision detection & flagging**

- Entry point: `upsert` replaced with transaction + collision check + plain INSERT
  [`ContactRepository.ts:325`](../../yorindo-api/src/repositories/postgres/ContactRepository.ts#L325)

- Phone collision check: case-sensitive exact match, returns oldest record
  [`ContactRepository.ts:331`](../../yorindo-api/src/repositories/postgres/ContactRepository.ts#L331)

- Email collision check: case-insensitive via `lower()`, only runs if no phone match
  [`ContactRepository.ts:342`](../../yorindo-api/src/repositories/postgres/ContactRepository.ts#L342)

- `duplicate_pairs` row inserted with score 0.95 (phone) or 0.85 (email) + string reasons
  [`ContactRepository.ts:387`](../../yorindo-api/src/repositories/postgres/ContactRepository.ts#L387)

- `findByPhone` made deterministic with `ORDER BY created_at ASC LIMIT 1`
  [`ContactRepository.ts:200`](../../yorindo-api/src/repositories/postgres/ContactRepository.ts#L200)

**Config**

- Migration added to the ordered list
  [`migrate.ts:35`](../../yorindo-api/scripts/migrate.ts#L35)
