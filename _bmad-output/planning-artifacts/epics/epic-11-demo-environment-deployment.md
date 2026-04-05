# Epic 11: Demo Environment Deployment

**Epic Number:** 11
**Epic Key:** epic-11-demo-deployment
**Status:** backlog
**Created:** 2026-04-02

---

## Epic Statement

As a team deploying and showcasing the Yorindo platform,
we want a unified VPS deployment topology with three endpoints — `yorindo.dhanifudin.com` (FE preview with MSW mocks, replacing GitHub Pages), `api.dhanifudin.com` (standalone API, already deployed), and `demo.dhanifudin.com` (full-stack demo with postgres and seed data) — so that all environments are consistently managed via Docker Compose on VPS.

---

## Context

- **Target URL:** `https://demo.dhanifudin.com`
- **Reset semantics:** Every deployment wipes all data and re-seeds from scratch
- **Data persistence:** PostgreSQL (via `REPOSITORY_IMPL=postgres`)
- **Services:** `yorindo-app` (Next.js), `yorindo-api` (Fastify), `postgres`
- **Service adapters:** Mock mode for external services (Brevo, Everpro, OpenAI) unless real keys available
- **Memory repositories:** Kept permanently for fast unit tests — not removed after postgres implementation

---

## Acceptance Criteria

**AC1:** Given a fresh server at `demo.dhanifudin.com`, when `make deploy-demo` is run, then all three services (app, API, postgres) are running and accessible via HTTPS.

**AC2:** Given a deployment is complete, when the database is queried, then it contains the full demo seed dataset (10 events, ~500 contacts, ~500 registrations, survey responses, blast history, flagged records, templates, vendors, users).

**AC3:** Given the demo is deployed, when a user logs in with known credentials (admin@demo.com, viewer@demo.com, staff@demo.com), then they see a fully populated dashboard with real-looking metrics.

**AC4:** Given the demo seed data, when dates are checked, then all event dates are relative to the current date — no hardcoded dates that go stale.

**AC5:** Given the demo is deployed, when the public registration form is visited for a published event, then a visitor can actually register and their data appears in the admin dashboard.

**AC6:** Given `make deploy-demo` is run again, then all existing data is wiped and re-seeded — the demo is idempotent.

---

## Stories

| Story | Title | Status |
|-------|-------|--------|
| 11.1 | Docker Compose Demo Profile | backlog |
| 11.2 | Demo Seed Script with Relative Dates | backlog |
| 11.3 | Deploy Reset Script & Makefile | backlog |
| 11.4 | HTTPS & Domain Configuration | backlog |
| 11.5 | Seed Data Validation Tests | backlog |
| 11.6 | VPS Frontend Preview Deployment (Replace GitHub Pages) | backlog |

---

## Technical Notes

- Docker Compose `down -v` for full volume deletion (nuclear reset)
- Seed script extends existing `scripts/seed.ts` with `--demo` flag
- Migration runs via `npx tsx scripts/migrate.ts` on container start
- Seed script runs after migrations, validates its own output
- Memory repositories remain in `src/repositories/memory/` permanently for unit test speed

---

## Dependencies

- Epic 4 (Event Configuration) — Story 4.4 survey builder must be implemented for survey seed data
- Epic 5 (Blast) — blast history seed requires blast tables in schema
- PostgreSQL migrations 001-006 must all be applied before seed script runs
