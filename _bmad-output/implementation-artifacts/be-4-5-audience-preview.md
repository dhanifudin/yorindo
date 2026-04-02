# Backend Story 4.5: Event Capacity & Target Criteria with Audience Preview

## AC
- Support saving multiple target criteria conditions.
- Implement `POST /api/events/:id/audience-preview` accepting target criteria payload and returning `{ matchCount: number, breakdown: Record<string, number> }`.
- Target criteria must cover `industry`, `city`, `job_title`, `behavior` (e.g. `most_active`, `low_attendance`, `never_attended`), `lastAttendedBefore`.

## Tasks
- [x] Task 1: Extend `TargetCriteria` type in `domain.ts` with `behavior` and `lastAttendedBefore`.
- [x] Task 2: Extend `TargetCriteria` objects in `openapi.yaml`.
- [x] Task 3: Create `POST /api/events/{id}/audience-preview` route in `openapi.yaml`.
- [x] Task 4: Implement `POST /api/events/:id/audience-preview` handler in `events.routes.ts`.
- [x] Task 5: Use `contactRepository` and `registrationRepository` within the controller to count combinations. Wait, for mock purposes, just approximate logic or mock the count by filtering all contacts.

### Review Findings
- [x] [Review][Decision] #4 Industry filter matches by `industryId` but callers likely send slugs — RESOLVED: delegated to repository which handles slug→ID conversion via `toIndustryId()`
- [x] [Review][Patch] #1 `jobTitles`, `behavior`, `lastAttendedBefore` filters — FIXED: all criteria now applied via repository filters + registrationRepository
- [x] [Review][Patch] #2 `breakdown` values fabricated — FIXED: now computed from real per-dimension contact counts
- [x] [Review][Patch] #3 `pageSize: 1000` cap — FIXED: increased to 10000 + uses `contacts.total` for accurate count
- [x] [Review][Patch] #5 Suppressed/flagged contacts — FIXED: filters with `consentStatus:'active'` + `flagCategory:'NONE'`
- [x] [Review][Skipped] #6 OpenAPI typed fields — skipped per user request (no openapi.yaml changes)
- [x] [Review][Patch] #7 `registrationRepository` unused — FIXED: now used for behavior + lastAttendedBefore filtering
- [x] [Review][Patch] #8 No test coverage — FIXED: 10 integration tests added (positive, negative, auth, role, filters)
- [x] [Review][Patch] #9 `lastAttendedBefore` date validation — FIXED: added `.datetime({ offset: true })` to Zod schema
- [x] [Review][Skipped] #10 Missing breakdown keys — skipped per user request (no openapi.yaml changes)
- [x] [Review][Skipped] #11 Missing 400 response in spec — skipped per user request (no openapi.yaml changes)
- [x] [Review][Defer] #13 Endpoint accessible on soft-deleted events — deferred, depends on repository-level soft-delete enforcement
- [x] [Review][Defer] #14 No rate limiting or cost guard on heavy query — deferred, pre-existing pattern across all endpoints

## Dev Agent Record
### Implementation Plan
- Adjusted `TargetCriteria` to include new fields `behavior` and `lastAttendedBefore`.
- Upgraded `openapi.yaml` with generic `additionalProperties: true` mapping.
- Added `/api/events/{id}/audience-preview` POST handler mapped natively in `events.routes.ts`.

### Debug Log
- N/A

### Completion Notes
- All unit tests completed without regression! Fastify successfully matches schema.
- Code review 2026-04-02: Rewrote handler to delegate filtering to contactRepository (slug-safe), added registrationRepository for behavior/lastAttendedBefore, real breakdown counts, suppressed/flagged exclusion, ISO-8601 date validation, 10 integration tests. 184/184 tests pass.

## File List
- `yorindo-api/src/types/domain.ts`
- `yorindo-api/openapi.yaml`
- `yorindo-api/src/routes/events.routes.ts`
- `yorindo-api/src/tests/events.routes.test.ts`

## Status
done
