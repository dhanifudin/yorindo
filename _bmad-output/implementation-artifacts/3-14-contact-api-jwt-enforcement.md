# Story 3.14: Contact API JWT Enforcement

**Story ID:** 3.14
**Story Key:** 3-14-contact-api-jwt-enforcement
**Epic:** Epic 3 — Contact Database & Participant Intelligence
**Phase:** Phase 2 (BE) — security hardening for internal contact APIs
**Status:** review
**Created:** 2026-04-02

---

## Story

As an admin,
I want all internal contact database endpoints to require JWT authentication and admin authorization,
So that sensitive participant data and contact maintenance actions cannot be accessed publicly.

> **Origin:** QA bug report on `story3-1-bugfix` found that multiple `/api/contacts*` endpoints still returned HTTP 200 without JWT.
>
> **Why this is a new story:** Story 2.1 already provides JWT auth and role middleware, but this issue is a gap enforcement problem in Epic 3 contact routes, not a missing auth foundation.

---

## Acceptance Criteria

**AC1 — Unauthenticated access is blocked:**
Given no `Authorization: Bearer <token>` header is sent,
When any internal contact endpoint below is called,
Then the API returns HTTP 401 with the standard error shape `{ error: { code, message, details } }`.

**Affected endpoints in scope:**
- `GET /api/contacts`
- `GET /api/contacts/health`
- `GET /api/contacts/facets`
- `GET /api/contacts/industry-suggestions`
- `GET /api/contacts/duplicates`
- `POST /api/contacts/:id/merge`

**AC2 — Non-admin access is blocked:**
Given a valid JWT for a non-admin internal role such as `staff` or `viewer`,
When any endpoint in scope is called,
Then the API returns HTTP 403 with `{ error: { code: 'FORBIDDEN', ... } }`.

**AC3 — Admin access still works:**
Given a valid admin JWT,
When `GET /api/contacts` is called with existing pagination, filter, and sorting params,
Then the endpoint still returns HTTP 200 with the same contact list contract and existing behavior unchanged.

**AC4 — Contact utility endpoints keep behavior for admin:**
Given a valid admin JWT,
When `GET /api/contacts/health`, `GET /api/contacts/facets`, `GET /api/contacts/industry-suggestions`, and `GET /api/contacts/duplicates` are called,
Then each endpoint still returns HTTP 200 with its current response contract unchanged.

**AC5 — Merge action is protected and preserved:**
Given a valid admin JWT,
When `POST /api/contacts/:id/merge` is called with a valid merge payload,
Then the merge still succeeds with HTTP 200 and the duplicate pair state changes as before.

**AC6 — Automated regression coverage exists:**
Given the contact route test suite,
When tests run,
Then it covers unauthorized (`401`), forbidden (`403`), and successful admin (`200`) access for the contact routes in scope.

---

## Tasks / Subtasks

- [x] **Task 1 — Audit contact route protection**
  - [x] Confirm which `/api/contacts*` endpoints are currently missing auth/role guards
  - [x] Reuse the existing auth middleware from Story 2.1 rather than introducing a new auth pattern

- [x] **Task 2 — Enforce JWT + admin role on contact routes**
  - [x] Apply `requireAuth` and `requireAdmin` to the internal contact list route
  - [x] Apply the same guard to contact utility routes: health, facets, and industry suggestions
  - [x] Apply the same guard to duplicate review and merge routes

- [x] **Task 3 — Preserve admin behavior**
  - [x] Verify existing query parsing, filtering, sorting, and pagination behavior for `GET /api/contacts` remains unchanged for admin
  - [x] Verify duplicate merge flow still works for admin

- [x] **Task 4 — Add regression tests**
  - [x] Add unauthorized access tests for the routes in scope
  - [x] Add forbidden access tests for `staff` and/or `viewer`
  - [x] Keep or add one success-path admin test for each protected route group

- [x] **Task 5 — Verify contract and type safety**
  - [x] Run targeted route tests
  - [x] Run TypeScript typecheck

---

## Dev Notes

### Bug Summary

QA confirmed that several `/api/contacts*` endpoints returned HTTP 200 without JWT. This is a security regression because the contact database is an internal admin workspace, not a public API surface.

### Existing Auth Foundation

Story 2.1 already introduced the required backend auth middleware and role helpers. Reuse the existing implementation in:

- `yorindo-api/src/middleware/auth.ts`
  - `requireAuth`
  - `requireAdmin`
  - `requireRoles(...)`

Do not create a second auth mechanism for this story.

### Route Scope

Primary implementation target:

- `yorindo-api/src/routes/contacts.routes.ts`

The current contact routes include both the original Story 3.1 list endpoint and later Epic 3 support endpoints added by Stories 3.5–3.8. This story hardens the entire internal contact route group in one pass because the bug is route-level, not UI-level.

### Role Policy for This Story

Use the current Epic 3 policy:

- `admin`: allowed
- `staff`: forbidden
- `viewer`: forbidden
- unauthenticated/public: unauthorized

This matches the original Epic 3 acceptance criteria for the contact database workspace.

### Regression Risk

The main risk is accidentally changing admin behavior while adding guards. The fix should be limited to route protection and related tests. Avoid changing DTO shape, filter logic, merge logic, or pagination behavior unless a test exposes an unrelated defect.

### Suggested Files

- `yorindo-api/src/routes/contacts.routes.ts`
- `yorindo-api/src/tests/contacts.routes.test.ts`
- `yorindo-api/openapi.yaml` if route security metadata needs to be made explicit

### Verification

Minimum verification expected:

```bash
cd yorindo-api
npm test -- src/tests/contacts.routes.test.ts
npx tsc --noEmit
```

If tests are grouped differently, include any repository or contract tests needed to cover merge flow and auth behavior.

---

## Dev Agent Record

### Implementation Plan

- Add admin-only protection to the internal contact route group
- Add auth regression tests for unauthorized and forbidden access
- Re-run existing admin success-path tests to ensure no behavioral regressions

### Debug Log

- Added a shared `adminOnly` preHandler config in `contacts.routes.ts` and applied it to the internal `/api/contacts*` routes that were previously public.
- Updated contact route tests so all existing success-path checks use an admin JWT and added route-level `401`/`403` regression coverage.

### Completion Notes

- Internal contact APIs now require JWT + admin role, closing the public access gap reported by QA.
- Existing admin list, facets, health, smart filter, duplicate review, and merge behavior remained unchanged after guard enforcement.
- Verification passed with `npm test -- src/tests/contacts.routes.test.ts` and `npx tsc --noEmit`.

---

## File List

- `yorindo-api/src/routes/contacts.routes.ts`
- `yorindo-api/src/tests/contacts.routes.test.ts`

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-04-02 | Story created for contact API JWT enforcement bugfix | Codex |
| 2026-04-02 | Implemented admin-only JWT enforcement for internal contact APIs and added regression tests | Codex |
