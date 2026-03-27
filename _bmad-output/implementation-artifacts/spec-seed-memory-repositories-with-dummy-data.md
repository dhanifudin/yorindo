---
title: 'Seed Memory Repositories with Realistic Dummy Data'
type: 'chore'
created: '2026-03-27'
status: 'done'
baseline_commit: 'b265d79d4296b165fc463edc1d0f3ba71989464d'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** All memory repositories start nearly empty or with minimal, cross-reference-mismatched seed data, making it impossible to demo or develop against realistic app state — registrations reference random IDs that don't correspond to actual events or contacts, surveys/audits/suppressions are empty, and only 2 of 5 user roles are represented.

**Approach:** Introduce a shared seed-constants file with fixed stable IDs, then rewrite each repository's `_seed()` method to produce rich, internally-consistent data covering the full range of entity states and all user roles (password: `Password123!`).

## Boundaries & Constraints

**Always:**
- All IDs (seeded and runtime-created) must use CUID2 via `createId()` from `@paralleldrive/cuid2` — no `crypto.randomUUID()` anywhere in memory repositories
- Seeded IDs in `_seeds.ts` must be pre-defined CUID2-format string literals (lowercase alphanumeric, no hyphens, 24 chars, starts with a letter) so cross-repo references stay consistent across restarts
- Passwords for all seeded users must be `Password123!` (bcrypt cost 10, hashed once and reused)
- Seeded data must cover every enum value: all 6 `EventStatus`, all 7 `RegistrationStatus`, all 5 `UserRole`, all 3 `ConsentStatus`, all 3 `FlaggedRecordStatus`
- Keep existing `faker.seed(42)` convention for deterministic faker output
- All Indonesian locale context: cities, phone `+62` prefix, event names, company names

**Ask First:**
- If adding a `Vendor` repository is needed beyond seeding `vendorId` refs in events

**Never:**
- Modify repository method signatures or interfaces
- Add new packages; `@faker-js/faker`, `bcrypt`, and `@paralleldrive/cuid2` are already in dependencies
- Seed passwords as plain text
- Use `crypto.randomUUID()` — CUID2 only

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| All roles login | POST /auth/login with each seeded email + `Password123!` | JWT returned, role matches | N/A |
| Registration cross-ref | GET /events/:id/registrations | Returns registrations whose `contactId` and `eventId` exist in their respective repos | N/A |
| Survey schema exists | GET /events/:id/survey (for events with survey) | Returns schema with fields | N/A |
| Suppressed contact | GET /contacts?consentStatus=suppressed | Returns ≥1 suppressed contacts | N/A |

</frozen-after-approval>

## Code Map

- `src/repositories/memory/_seeds.ts` -- NEW: shared seed constants (CUID2-format string literals for IDs, user hashes, lookup tables)
- `src/repositories/memory/UserRepository.ts` -- rewrite `_seed()` + fix `create()` to use `createId()`; 5 users one per role, all Password123!
- `src/repositories/memory/EventRepository.ts` -- rewrite `_seed()` + fix `create()` to use `createId()`; 12 events covering all 6 statuses
- `src/repositories/memory/ContactRepository.ts` -- rewrite `_seed()` + fix `upsert()` to use `createId()`; 120 contacts, proper industryId refs, all consent statuses
- `src/repositories/memory/RegistrationRepository.ts` -- rewrite `_seed()` + fix `create()` to use `createId()`; 60 registrations using real event/contact IDs, all 7 statuses
- `src/repositories/memory/SurveyRepository.ts` -- add `_seed()` + fix response creation to use `createId()`; schemas for 3 events + responses
- `src/repositories/memory/AuditLogRepository.ts` -- already uses `createId()`, add `_seed()`: 20 log entries for common actions
- `src/repositories/memory/FlaggedRecordsRepository.ts` -- fix `create()` to use `createId()` + rewrite `_seed()`: 20 records covering all 3 statuses
- `src/repositories/memory/SuppressionRepository.ts` -- add `_seed()` + fix `create()` to use `createId()`; 5 suppression records
- `src/repositories/memory/RawUploadRepository.ts` -- already uses `createId()`, add `_seed()`: 3 upload records (completed, pending, failed)

## Tasks & Acceptance

**Execution:**
- [x] `src/repositories/memory/_seeds.ts` -- CREATE: export `SEED_EVENT_IDS` (12 CUID2 literals), `SEED_CONTACT_IDS` (120 CUID2 literals), `SEED_USER_IDS` (3 CUID2 literals keyed by role: `admin`, `staff`, `viewer`), `SEED_VENDOR_IDS` (3 CUID2 literals), `SEED_UPLOAD_IDS` (3 CUID2 literals), `PASSWORD123_HASH` (bcrypt.hashSync result), `INDONESIAN_INDUSTRIES` and `INDONESIAN_JOB_TITLES` lookup arrays with id+name — all IDs are hand-crafted valid CUID2 strings (24 chars, lowercase alphanumeric, leading letter, no hyphens)
- [x] `src/repositories/memory/UserRepository.ts` -- rewrite `_seed()` to add 3 users: `admin` (admin@yorindo.id), `staff` (staff@yorindo.id), `viewer` (viewer@yorindo.id) — all using `PASSWORD123_HASH` from _seeds
- [x] `src/repositories/memory/EventRepository.ts` -- rewrite `_seed()`: 12 events using `SEED_EVENT_IDS`, import faker, cover all 6 statuses (2 each), vary approvalMode, notificationChannel, capacity, vendorId (3 events with vendor), surveySchemaId (3 events), realistic Indonesian event names and cities
- [x] `src/repositories/memory/ContactRepository.ts` -- rewrite `_seed()`: 120 contacts using `SEED_CONTACT_IDS`, use `INDONESIAN_INDUSTRIES` ids, `INDONESIAN_JOB_TITLES` ids, all 3 consent statuses distributed realistically (80% active, 15% legacy_unverified, 5% suppressed), all 3 sources, varied company sizes and cities
- [x] `src/repositories/memory/RegistrationRepository.ts` -- rewrite `_seed()`: 60 registrations using `SEED_EVENT_IDS` and `SEED_CONTACT_IDS` (distribute contacts across multiple events), all 7 statuses, tickets for approved/attended, flagOverride=true on ~5 entries, add 2 blast history entries per active/completed event
- [x] `src/repositories/memory/SurveyRepository.ts` -- add constructor + `_seed()`: create survey schemas for SEED_EVENT_IDS[0..2] with 3–4 realistic fields each (text, radio, select types); add 5 survey responses for attended registrations
- [x] `src/repositories/memory/AuditLogRepository.ts` -- add constructor + `_seed()`: 20 entries for actions: `user.login`, `event.create`, `event.status_change`, `registration.approve`, `registration.reject`, `contact.flag`, `blast.send`
- [x] `src/repositories/memory/FlaggedRecordsRepository.ts` -- rewrite `_seed()`: 20 records — 10 pending, 6 resolved (resolvedBy = admin user ID), 4 discarded; rawData resembles contact upload row
- [x] `src/repositories/memory/SuppressionRepository.ts` -- add constructor + `_seed()`: 5 suppression records, contactIds from SEED_CONTACT_IDS[115..119], reasons from: 'unsubscribed', 'hard_bounce', 'user_request', 'spam_complaint', 'admin_manual'
- [x] `src/repositories/memory/RawUploadRepository.ts` -- add constructor + `_seed()`: 3 uploads — completed (100 rows, 90 upserted, 10 flagged), pending (0 counts), failed (50 rows, 0 upserted)

**Acceptance Criteria:**
- Given the API starts with `REPOSITORY_IMPL=memory`, when GET /api/users is called, then 5 users are returned with distinct roles
- Given each seeded user email + password `Password123!`, when POST /api/auth/login, then a JWT is returned for all 5 accounts
- Given the API starts, when GET /api/events, then ≥12 events are returned covering all 6 EventStatus values
- Given the API starts, when GET /api/events/:id/registrations for any active event, then registrations are returned whose contactId values appear in GET /api/contacts
- Given the API starts, when GET /api/contacts?consentStatus=suppressed, then ≥1 results are returned
- Given the API starts, when GET /api/events/:surveyEventId/survey, then a schema with ≥3 fields is returned

## Design Notes

**CUID2 everywhere:** Architecture mandates `createId()` from `@paralleldrive/cuid2` for all primary keys — no `crypto.randomUUID()`. `AuditLogRepository` and `RawUploadRepository` already comply; all others need their `create()`/`upsert()` methods updated. CUID2 format: `[a-z][a-z0-9]{23}` (24 chars, no hyphens, URL-safe).

**Shared seed constants approach:** All repositories import `_seeds.ts` for fixed IDs. Pre-defined string literals ensure cross-repo consistency across restarts without constructor coupling. `_seeds.ts` must not import from any repository.

**bcrypt at seed time:** `bcrypt.hashSync('Password123!', 10)` runs once in `_seeds.ts` module initialization. Cost 10 ≈ 100ms; acceptable for a one-time startup side-effect in dev.

**Faker seed preserved:** Each repository file that uses faker keeps `faker.seed(42)` to preserve deterministic output. `_seeds.ts` does not use faker.

## Verification

**Commands:**
- `cd yorindo-api && npm run build` -- expected: 0 TypeScript errors
- `cd yorindo-api && npm start` -- expected: server starts, no ERR_MODULE_NOT_FOUND
- `curl -s http://localhost:3000/api/health` -- expected: `{"status":"ok"}`
- `curl -s -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@yorindo.id","password":"Password123!"}' | grep token` -- expected: JWT token present
- `curl -s http://localhost:3000/api/events | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['data']), 'events')"` -- expected: 12 events

## Suggested Review Order

**Seed contracts**

- Start with the fixed IDs and shared lookup tables used across all repositories.
  [`_seeds.ts:17`](../../yorindo-api/src/repositories/memory/_seeds.ts#L17)

- Review the explicit registration and contact seed IDs that stabilize cross-repo references.
  [`_seeds.ts:33`](../../yorindo-api/src/repositories/memory/_seeds.ts#L33)

**Cross-repo seeded state**

- Event statuses, survey links, vendors, and targeting now align around deterministic demo data.
  [`EventRepository.ts:27`](../../yorindo-api/src/repositories/memory/EventRepository.ts#L27)

- Contact seeds now cover volume, consent distribution, Indonesian metadata, and suppression parity.
  [`ContactRepository.ts:13`](../../yorindo-api/src/repositories/memory/ContactRepository.ts#L13)

- Registration seeding now uses stable IDs, full status coverage, and deterministic blast history.
  [`RegistrationRepository.ts:10`](../../yorindo-api/src/repositories/memory/RegistrationRepository.ts#L10)

- Survey schemas and seeded responses now attach to the same deterministic event/registration graph.
  [`SurveyRepository.ts:7`](../../yorindo-api/src/repositories/memory/SurveyRepository.ts#L7)

**Operational history and moderation data**

- Audit entries now point at the seeded users, events, contacts, and registrations.
  [`AuditLogRepository.ts:6`](../../yorindo-api/src/repositories/memory/AuditLogRepository.ts#L6)

- Flagged imports and raw upload summaries now reconcile across upload outcomes.
  [`FlaggedRecordsRepository.ts:25`](../../yorindo-api/src/repositories/memory/FlaggedRecordsRepository.ts#L25)

- Suppression records now match the seeded contact phones used by delivery flows.
  [`SuppressionRepository.ts:7`](../../yorindo-api/src/repositories/memory/SuppressionRepository.ts#L7)

- Raw upload seeds provide completed, pending, and failed processing states for demos.
  [`RawUploadRepository.ts:13`](../../yorindo-api/src/repositories/memory/RawUploadRepository.ts#L13)

**Verification coverage**

- Auth tests now prove all five seeded roles can log in with `Password123!`.
  [`auth.routes.test.ts:25`](../../yorindo-api/src/tests/auth.routes.test.ts#L25)

- Repository tests now check seeded suppression and survey retrieval behavior.
  [`repositories.test.ts:262`](../../yorindo-api/src/tests/repositories.test.ts#L262)

- ETL and blast tests now reflect the richer baseline seed counts and suppression behavior.
  [`etl.service.test.ts:89`](../../yorindo-api/src/tests/etl.service.test.ts#L89)
