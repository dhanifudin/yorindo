---
title: 'Demo Seed Script with Relative Dates'
slug: '13-2-demo-seed-script-with-relative-dates'
created: '2026-04-02'
status: 'ready-for-dev'
epic: 13
story: 2
tech_stack: ['typescript', 'pg', 'cuid2', 'bcrypt']
files_to_create:
  - 'yorindo-api/scripts/seed-demo.ts'
files_to_modify:
  - 'yorindo-api/scripts/seed.ts'
---

# Story 13.2: Demo Seed Script with Relative Dates

**Story ID:** 13.2
**Story Key:** 13-2-demo-seed-script-with-relative-dates
**Epic:** Epic 13 — Demo Environment Deployment
**Status:** ready-for-dev

---

## Story

As a demo administrator,
I want a seed script that populates PostgreSQL with realistic data using relative dates,
so that every deployment shows events in the correct lifecycle stage regardless of when it's deployed.

---

## Acceptance Criteria

**AC1:** Given the seed script is run with `--demo` flag, when it completes, then the database contains 10 events across all 6 statuses (active, published, draft, completed, cancelled, archived).

**AC2:** Given the seed script runs, when event dates are checked, then all dates are computed relative to `new Date()` at runtime — no hardcoded dates that go stale.

**AC3:** Given the seed script runs, when the database is queried, then it contains:
- ≥ 2 active events (one ongoing today, one starting within 7 days)
- ≥ 2 published events (14+ days out)
- ≥ 2 draft events (60+ days out)
- ≥ 2 completed events (30+ days in past)
- ≥ 1 cancelled event
- ≥ 1 archived event

**AC4:** Given the seed script runs, when contacts are queried, then there are ~500 unique contacts with realistic Indonesian data, ~40 duplicate pairs, 5-10 flagged records (mix of `duplicate` and `invalid-data`), and ~15 opted-out contacts.

**AC5:** Given the seed script runs, when registrations are queried, then active events have ≥ 30 attended registrations, published events have ≥ 5 pending registrations, and completed events have ≥ 20 survey responses.

**AC6:** Given the seed script runs, when users are queried, then 3 demo users exist: admin@demo.com, viewer@demo.com, staff@demo.com — all with password `demo123`.

**AC7:** Given the seed script runs, when blast history is queried, then the active events have 3-5 blast records showing invitation history.

**AC8:** Given the seed script completes, when it validates its own output, then it logs "✅ Seed validation passed" or fails with specific error messages if counts are incorrect.

---

## Context for Development

### Event Data Spec

All dates computed as `new Date() ± N days`. Full spec:

| Event | Status | Date Offset | City | Capacity | Registrations | Paid |
|-------|--------|-------------|------|----------|---------------|------|
| TechConf Jakarta 2026 | active | -1 day (ongoing) | Jakarta | 500 | 80 (42 attended) | No |
| AI Summit Bandung | active | +2 days | Bandung | 200 | 120 | Yes (150K) |
| ERP Workshop Surabaya | published | +14 days | Surabaya | 80 | 35 (5 pending) | Yes (75K) |
| Fintech Networking Bali | published | +30 days | Denpasar | 150 | 20 | No |
| Cloud Conference Jakarta | draft | +60 days | Jakarta | 300 | 0 | No |
| Data Summit Yogyakarta | draft | +90 days | Yogyakarta | 100 | 0 | No |
| DevOps Meetup Jakarta | completed | -30 days | Jakarta | 60 | 55 (42 attended) | No |
| Marketing Forum Bandung | completed | -60 days | Bandung | 200 | 150 (98 attended) | No |
| HR Tech Summit | cancelled | -15 days | Jakarta | 120 | 15 | No |
| Startup Pitch Night | archived | -180 days | Jakarta | 250 | 200 (145 attended) | No |

### Survey Schemas

- **TechConf Jakarta:** Registration (4 fields: jabatan, industri, topik minat, ekspektasi) + Post-event (3 fields: rating, topik favorit, saran)
- **AI Summit Bandung:** Registration only (3 fields)
- **ERP Workshop:** Registration only (2 fields)
- **DevOps Meetup:** Both surveys (2 fields each)
- **Marketing Forum:** Both surveys (2 fields each)
- **Startup Pitch Night:** Both surveys (2 fields each)

### Blast History

- **TechConf Jakarta:** 3 blasts (email 10d ago, WA 7d ago, reminder email 2d ago)
- **AI Summit Bandung:** 2 blasts (email 5d ago, WA 3d ago)

### Flagged Records (8 total)

- 4 `duplicate` — phone/email matches existing contacts
- 4 `invalid-data` — format issues, missing fields

### Contact Distribution

- Industries: teknologi (30%), keuangan (20%), kesehatan (15%), manufaktur (15%), retail (10%), pendidikan (10%)
- Company sizes: 1-50 (25%), 51-200 (35%), 201-1000 (25%), 1000+ (15%)
- Cities: Jakarta (35%), Bandung (20%), Surabaya (15%), Denpasar (10%), Yogyakarta (10%), other (10%)
- Phone prefixes: +6281, +6285, +6287, +62812 (realistic Indonesian mobile)

### Existing Files to Reference

- `yorindo-api/scripts/seed.ts` — existing seed script to extend with `--demo` flag
- `yorindo-api/scripts/migrate.ts` — migration runner (no changes needed)
- `yorindo-api/src/repositories/memory/_seeds.ts` — industry/job-title lookup data, CUID2 seed IDs
- `yorindo-api/src/types/domain.ts` — all domain type definitions

### Technical Decisions

- **Relative date helper:** `const d = (days: number, hour = 9) => { const date = new Date(); date.setDate(date.getDate() + days); date.setHours(hour, 0, 0, 0); return date.toISOString() }`
- **Password hashing:** Use bcrypt with `saltRounds = 10` for demo users
- **Phone normalization:** All phones in E.164 format (`+62812...`)
- **Idempotent:** Script should be safe to run on empty or existing data (use `INSERT ... ON CONFLICT` or `TRUNCATE` first)
- **Self-validating:** After seeding, run verification queries and log pass/fail

---

## Implementation Plan

### Task 1: Create `scripts/seed-demo.ts`

Implement the full demo seed script with all 10 events, ~500 contacts, registrations, survey responses, blast history, flagged records, templates, vendors, and users.

### Task 2: Add `--demo` flag to `scripts/seed.ts`

Modify the existing seed script to accept `--demo` flag that delegates to `seed-demo.ts` logic.

### Task 3: Self-validation

After seeding, run verification queries:
- Count events per status
- Verify all active/published events are in the future or today
- Verify all completed events are in the past
- Verify user count and known emails exist
- Verify flagged record count is 5-10
- Log pass/fail for each check

---

## Dependencies

- PostgreSQL migrations 001-006 must be applied before seed runs
- All tables must exist: contacts, events, registrations, users, flagged_records, consent_records, templates, vendors, event_sponsors, survey_responses, audit_logs, raw_uploads, user_events, blast_logs
