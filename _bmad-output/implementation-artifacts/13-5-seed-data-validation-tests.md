---
title: 'Seed Data Validation Tests'
slug: '13-5-seed-data-validation-tests'
created: '2026-04-02'
status: 'ready-for-dev'
epic: 13
story: 5
tech_stack: ['vitest', 'pg', 'typescript']
files_to_create:
  - 'yorindo-api/scripts/seed.test.ts'
---

# Story 13.5: Seed Data Validation Tests

**Story ID:** 13.5
**Story Key:** 13-5-seed-data-validation-tests
**Epic:** Epic 13 — Demo Environment Deployment
**Status:** ready-for-dev

---

## Story

As a developer deploying the demo environment,
I want automated tests that validate the seed data is complete and correct,
so that broken seed data never reaches the demo environment.

---

## Acceptance Criteria

**AC1:** Given the seed validation tests exist, when they are run against a seeded database, then all tests pass with the expected data counts.

**AC2:** Given the seed validation tests exist, when they are run against an empty database, then they fail with clear error messages indicating what's missing.

**AC3:** Given the tests verify event dates, when active/published events are checked, then all dates are in the future or today (no stale dates).

**AC4:** Given the tests verify event dates, when completed/cancelled/archived events are checked, then all dates are in the past.

**AC5:** Given the tests run as part of CI, when the seed script produces invalid data, then the CI pipeline fails before deployment proceeds.

---

## Context for Development

### Test Categories

| Category | Validation |
|----------|-----------|
| **Events** | ≥ 10 events, ≥ 2 per active/published/draft/completed, all statuses represented |
| **Event dates** | Active/published ≥ today, completed/cancelled/archived < today |
| **Contacts** | ≥ 400 unique, ~40 duplicate pairs, 5-10 flagged, ~15 opted-out |
| **Registrations** | Active events ≥ 30 attended, published ≥ 5 pending, completed ≥ 20 survey responses |
| **Users** | 3 demo users exist with correct emails |
| **Templates** | ≥ 4 templates (invitation, confirmation, rejection, reminder) |
| **Vendors** | ≥ 2 vendors with sponsor relationships |
| **Blast history** | ≥ 5 blast records across active events |
| **Survey responses** | Completed events have ≥ 20 responses with aggregate data |

### Test Pattern

```typescript
// scripts/seed.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Pool } from 'pg'

let pool: Pool

beforeAll(() => {
  pool = new Pool({ connectionString: process.env.DATABASE_URL })
})

afterAll(() => pool.end())

describe('Demo seed data validation', () => {
  it('should have ≥ 10 events', async () => {
    const { rows } = await pool.query('SELECT COUNT(*) as total FROM events')
    expect(parseInt(rows[0].total, 10)).toBeGreaterThanOrEqual(10)
  })

  it('should have ≥ 2 active events with future dates', async () => {
    const { rows } = await pool.query(
      "SELECT COUNT(*) as total FROM events WHERE status = 'active' AND event_date >= CURRENT_DATE"
    )
    expect(parseInt(rows[0].total, 10)).toBeGreaterThanOrEqual(2)
  })

  // ... more tests
})
```

### Existing Files to Reference

- `yorindo-api/vitest.config.ts` — existing vitest configuration
- `yorindo-api/src/tests/` — existing test directory (reference for patterns)
- `yorindo-api/scripts/seed.ts` — seed script to test against

### Technical Decisions

- **Direct database queries:** Tests use `pg.Pool` directly — not repository layer — to validate actual database state
- **Run after seed, before deploy:** Tests execute as the last step of `make deploy-demo`
- **Separate from unit tests:** These are integration tests that require a running database — not part of `npm test`
- **Fast execution:** ~10-15 simple COUNT queries — should complete in < 2 seconds

---

## Implementation Plan

### Task 1: Create `scripts/seed.test.ts`

Implement all validation tests covering events, contacts, registrations, users, templates, vendors, blast history, and survey responses.

### Task 2: Add test runner to deploy pipeline

Update the Makefile `deploy-demo` target to run `npx vitest run scripts/seed.test.ts` after seeding. Exit with error if tests fail.

### Task 3: Add to CI pipeline

Add a CI job that runs seed validation against a test database. Block deployment if tests fail.

---

## Dependencies

- Story 13.2 (Demo Seed Script) — seed data must exist to validate against
- Story 13.3 (Deploy Reset Script) — Makefile must exist to add test runner step
- PostgreSQL must be running with seeded data before tests run
