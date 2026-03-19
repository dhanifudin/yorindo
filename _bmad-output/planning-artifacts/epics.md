---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
developmentApproach: fe-first
status: complete
completedAt: '2026-03-19'
---

# Yorindo - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Yorindo, decomposing requirements from the PRD and Architecture into implementable stories.

**Development Approach: FE-First**

The FE team builds the complete frontend against MSW mocks. The BE team implements the real API only after all FE stories are done. This means:

- **Phase 1 — FE (current priority):** All of Epic 1 + the FE layer of every story across Epics 2–9
- **Phase 2 — BE:** The BE layer of every story across Epics 2–9, implemented in epic order

Each story below is annotated with `[Phase 1: FE]` and `[Phase 2: BE]` AC sections where applicable. Phase 1 ACs are implemented first against MSW. Phase 2 ACs replace the MSW with real Fastify routes, repositories, and services — no FE changes required (MSW is transparent).

---

## Development Phase Plan

### Phase 1: FE Development (Build against MSW)

All of **Epic 1** must complete before any Phase 1 feature work begins (OpenAPI contract + MSW handlers are the foundation).

| Phase 1 Work | FE Deliverable |
|---|---|
| Epic 1 (all stories) | Both repos scaffolded, OpenAPI spec, all MSW handlers, CI/CD |
| Epic 2 FE | Login page, user management UI, route guards, event assignment UI |
| Epic 3 FE | Contacts table, upload form, ETL status monitor, flagged records review, duplicate merge UI, smart filter |
| Epic 4 FE | Event creation form, lifecycle controls, clone flow, survey builder, audience preview, soft delete/restore UI |
| Epic 5 FE | Template editor, blast config form, schedule picker, emergency blast, suppression management |
| Epic 6 FE | Public landing page, registration form, double opt-in confirmation page, approval queue, waitlist view, ticket display, self-cancellation |
| Epic 7 FE | PWA install flow, QR scanner UI, offline indicator + sync status, OTP recovery UI, name search, live attendance monitor |
| Epic 8 FE | Report page, vendor magic link landing, DPA acceptance page, analytics dashboard, YoriMind panel, download buttons |
| Epic 9 FE | Data request form, erasure request form, erasure/cancellation distinction UI |

### Phase 2: BE Development (Real Fastify API)

Implemented after Phase 1 is complete. BE stories are implemented in epic sequence (Epic 2 → 9).

| Phase 2 Work | BE Deliverable |
|---|---|
| Epic 2 BE | `POST /api/auth/*`, `GET/POST/PATCH/DELETE /api/users`, JWT middleware, Redis token blacklist |
| Epic 3 BE | `GET /api/contacts`, `POST /api/etl/upload`, ETL BullMQ worker + GPT-4o, flagged records CRUD, duplicate merge, smart filter route |
| Epic 4 BE | `POST/PATCH/DELETE /api/events`, state machine service, clone logic, survey schema storage, soft delete cron |
| Epic 5 BE | `POST /api/blast`, BullMQ blast worker, Everpro + Brevo integrations, template CRUD, suppression enforcement |
| Epic 6 BE | `POST /api/registrations`, approval scoring service, waitlist promotion, `qrcode` ticket generation, double opt-in cron |
| Epic 7 BE | `POST /api/scan/verify`, OTP service, `POST /api/scan/otp/*`, `GET /api/events/:id/participants` |
| Epic 8 BE | Report generation job, `GET /api/events/:id/report`, vendor magic link service, DPA acceptance, YoriMind cron + Claude API |
| Epic 9 BE | `POST /api/participants/data-request`, erasure job, anonymization service, suppression enforcement |

## Requirements Inventory

### Functional Requirements

FR1: Event admin can create an event with full configuration — name, date, venue, capacity, target segment criteria, approval mode, notification channel, scan format, double opt-in toggle, and cancellation deadline
FR2: Event admin can clone an existing event, inheriting all configuration with editable overrides
FR3: Event admin can manage event state transitions through the defined lifecycle (Draft → Published → Live → Completed → Archived)
FR4: Event admin can cancel a published or live event, triggering mandatory participant notification and ticket invalidation
FR5: Event admin can configure the approval mode per event (automatic / hybrid / manual) with a configurable score threshold
FR6: Event admin can configure the notification channel per event (WhatsApp or email)
FR7: Event admin can configure the scan format per event (QR code or barcode)
FR8: Event admin can set event capacity with a configurable buffer for waitlist and VIP holds
FR9: Super admin can import participant records from structured data sources into the platform database
FR10: System automatically matches new registrations against existing participant profiles using composite identity signals (phone, email, name, company)
FR11: Admin can review and merge duplicate participant profiles flagged by the identity matching system
FR12: System computes and maintains a profile completeness score for each participant record, updated on every registration
FR13: Admin can view a participant's full registration history, profile data, and event attendance record when reviewing an approval or account
FR14: Participant can update their profile information during registration, with changes persisted to their stored profile
FR15: Event admin can configure and send segmented invitation blasts to the participant database, filtered by industry, city, job title, and attendance history
FR16: Event admin can schedule blast delivery for a specified date and time
FR17: Super admin can create and edit notification message templates for each notification type, with named variable substitution
FR18: System enforces consent status and suppression list checks before including any contact in any outbound communication
FR19: System delivers notifications via the event-configured channel with automatic fallback handling on delivery failure
FR20: Event admin can trigger an emergency blast to all confirmed participants for a specific event
FR21: System maintains a suppression list of contacts who have opted out or requested data erasure, permanently excluding them from outbound communications
FR22: Participant can view event details and availability on a public event landing page before registering
FR23: Participant can register for a published event via a public web form
FR24: System pre-fills registration form fields for returning participants identified by their phone number
FR25: System captures configurable participant intent signals during registration
FR26: System processes each registration through the event-configured approval workflow (automatic, hybrid, or manual)
FR27: System scores registrations using rule-based criteria and surfaces confidence indicators explaining each approval decision to the reviewing admin
FR28: Admin can manually review, approve, reject, or waitlist individual registrations from the approval queue
FR29: System sends automated notifications to participants on every approval status change, using admin-configured templates
FR30: Approved participant can self-cancel their registration via a link in their ticket before the event-configured cancellation deadline
FR30a: If double opt-in is enabled, system sends a confirmation request on form submission; unconfirmed registrations expire after admin-configured window (default 24h); slot position not reserved during provisional window
FR31: System maintains a waitlist queue and automatically promotes waitlisted participants when confirmed slots become available
FR32: System re-queues unconfirmed waitlist slots after configurable number of failed auto-promotion attempts (default: 2)
FR33: Staff can scan participant QR codes or barcodes to confirm event-day check-in
FR34: Staff can initiate OTP-based identity recovery for participants who cannot present their ticket
FR35: Staff can search for participants by name to perform manual check-in
FR36: Staff can manually check in a participant with a logged override reason and staff identity record
FR37: Staff can perform all check-in actions (QR scan, OTP recovery, name search, manual override) without network connectivity; records synced on reconnect
FR38: System detects when a presented ticket belongs to a different event and notifies staff without exposing cross-event registration details
FR39: Event admin can monitor real-time check-in progress, queue status, and attendance count during event operations
FR40: System automatically generates a post-event attendance report upon event completion
FR41: System delivers the vendor report to the configured vendor contact via a time-limited access link requiring no account login
FR42: Vendor can download the event report in Excel and PDF formats
FR43: Report includes attendance rate, registration funnel, and participant demographic breakdown by industry, job title, and age distribution
FR44: Vendor must accept the current version of the data processing agreement before accessing any report; re-acceptance required when DPA version changes
FR45: Super admin can configure vendor contact email and report tier (standard / Lead Intelligence Suite) per event
FR46: Super admin can regenerate a post-event report for a completed event
FR47: Super admin can create, edit, and deactivate user accounts for all internal roles
FR48: System enforces role-based access control, restricting all capabilities to those permitted for each role
FR49: System maintains a full audit trail of all significant actions — event state changes, approval decisions, check-in overrides, admin account changes
FR50: Admin can soft-delete events and records with a configurable recovery window (default: 30 days) before permanent deletion
FR51: Admin can view and restore soft-deleted items within the recovery window
FR52: System requires explicit confirmation before executing destructive or irreversible admin actions
FR53: Super admin can override event state machine transitions with safeguarded access
FR54: System captures explicit participant consent at registration, linked to the specific event and stated data processing purpose
FR55: System maintains a consent status per participant and enforces it on all outbound communications
FR56: Participant can request a copy of their stored personal data
FR57: Participant can request erasure of their personal data, triggering anonymization and permanent suppression flag
FR58: System distinguishes between registration cancellation (status change, history retained) and data erasure (anonymization + permanent suppression)
FR59: System prevents any outbound communication to participants whose consent status is `legacy_unverified` or `suppressed`
FR60: System generates a Google Calendar deep link embedded in approval confirmation notifications
FR61: Before saving event target criteria, system displays count of participant records matching the configured filters
FR62: System detects duplicate registration attempts and redirects participant to existing registration status
FR63: Admin can manually requeue a rejected registration for re-review, or promote it to waitlisted or approved status, with action logged in audit trail

### NonFunctional Requirements

**Performance:**
NFR-P1: Registration page FCP ≤ 3 seconds on 4G (10 Mbps), cold load, Android Chrome
NFR-P2: Registration form submission → confirmation received ≤ 60 seconds end-to-end (includes async queue processing)
NFR-P3: Admin dashboard initial load ≤ 2 seconds on desktop broadband
NFR-P4: Check-in PWA participant list sync ≤ 30 seconds for 300 participants on WiFi
NFR-P5: QR/barcode scan → confirmation (online mode) ≤ 2 seconds full round-trip including server write
NFR-P6: QR/barcode scan → confirmation (offline mode) ≤ 1 second (IndexedDB lookup only)
NFR-P7: Post-event report generation ≤ 10 minutes (async background job)
NFR-P8: Vendor magic link report delivery ≤ 24 hours after event completion
NFR-P9: OTP delivery ≤ 30 seconds from request to message received
NFR-P10: Emergency blast queued and transmission initiated ≤ 30 seconds of admin action
NFR-P11: POST /registrations returns 201 ≤ 3 seconds normal load, ≤ 5 seconds burst; approve/reject action ≤ 1 second

**Reliability:**
NFR-R1: API annual uptime ≥ 99.5%; automated daily DB backup; RTO ≤ 2 hours; deployment blackout during event window ± 2 hours
NFR-R2: Event-day availability 100% during event window ± 2 hours
NFR-R3: Message delivery rate ≥ 95% WhatsApp + email combined (BullMQ retry + dual-channel fallback)
NFR-R4: OTP delivery success rate ≥ 99% (highest-priority queue)
NFR-R5: Zero attendance records lost due to offline sync failure
NFR-R6: Background sync completion after reconnect ≤ 60 seconds

**Security:**
NFR-S1: All data in transit encrypted via TLS 1.2 or higher
NFR-S2: All personal data at rest encrypted at the storage layer
NFR-S3: JWT access tokens expire after 15 minutes; refresh tokens after 7 days; invalidated on logout via server-side token blacklist
NFR-S4: OTP codes are single-use, expire after 5 minutes, invalidated immediately on use
NFR-S5: OTP requests rate-limited to maximum 3 per phone number per 10-minute window
NFR-S6: All inbound webhooks (Everpro, Brevo) verified via HMAC signature; unverified requests rejected with 401
NFR-S7: Public registration form protected by bot-detection mechanism; failed detection logs and flags — does not block registration
NFR-S8: All authenticated API requests validated against OpenAPI spec; schema violations return 400
NFR-S9: Role claims in JWT resolved from database on token issue — not trusted from client payload
NFR-S10: Staff PWA sessions expire after configurable inactivity period (default: 8 hours)
NFR-S11: All secrets stored in environment variables; never committed to version control
NFR-S12: Vendor report magic link: maximum 7-day expiry; triggers file download (not browser-viewable)
NFR-S13: Every vendor report magic link access (IP, timestamp, user agent) logged for UU PDP audit
NFR-S14: Registration form fields configurable per event — no personal data field collected by default if not required (UU PDP Art. 16)
NFR-S15: Participant consent withdrawal completable in ≤ 2 taps/clicks from any notification, without login (UU PDP Art. 9(2))
NFR-S16: All admin access to bulk participant data exports logged; logs retained minimum 1 year (UU PDP Art. 46)

**Scalability:**
NFR-SC1: Participant database: up to 100,000 records; search returns ≤ 500ms with 3 targeted indexes
NFR-SC2: ≥ 5 concurrent active events; admin dashboard load ≤ 2 seconds with 5 concurrent active events
NFR-SC3: Invitation blast transmission initiated within 30 minutes of scheduling
NFR-SC4: QR scan → check-in confirmation ≤ 2 seconds at 300-pax event-day peak
NFR-SC5: Participant search by phone, name, or industry returns results ≤ 500ms under normal load
NFR-SC6: ≥ 500 simultaneous registration form sessions; ≥ 10 simultaneous check-in devices; ≥ 5 concurrent admin sessions; ≥ 500 registrations in a 5-minute burst without timeout

**Data Integrity:**
NFR-DI1: Zero attendance records lost due to offline sync failure (IndexedDB persists through restart/reboot)
NFR-DI2: Zero duplicate attendance records in post-event report (deduplication on sync + report generation)
NFR-DI3: All audit trail entries immutable — no UPDATE or DELETE on audit_logs
NFR-DI4: Participant data erasure uses anonymization, not hard delete — historical records structurally intact
NFR-DI5: Offline-to-online sync conflicts resolved by first-write-wins; duplicate check-in attempts flagged in audit log

**Offline PWA:**
NFR-PWA1: Check-in PWA meets Chrome PWA installability criteria (manifest, Service Worker, HTTPS)
NFR-PWA2: Check-in PWA requests persistent storage permission on install
NFR-PWA3: Participant data cache invalidated on reconnect if server-side version token has changed; full re-download on version change

**Accessibility:**
NFR-A1: Public registration form meets WCAG 2.1 Level AA for form elements
NFR-A2: Admin dashboard and check-in PWA fully keyboard-navigable; all interactive elements reachable via Tab; all inputs have visible labels

### Additional Requirements

**From Architecture — Implementation Impact:**

- **OpenAPI 3.0 Spec (Sprint 0 gate):** OpenAPI spec must be written and approved by both FE and BE tech leads before any feature code is written. This is a hard gate — both teams blocked without it. Spec lives in `yorindo-api/openapi.yaml`. MSW handlers in `yorindo-app/src/mocks/` are generated from or validated against this spec.

- **Starter Template — Two Repos:**
  - `yorindo-api`: `mkdir yorindo-api && cd yorindo-api && npm init -y && npm install fastify @fastify/cors @fastify/helmet @fastify/rate-limit @fastify/cookie @fastify/multipart pg mongodb bullmq ioredis zod dotenv pino pino-http jsonwebtoken bcrypt xlsx node-cron qrcode openai @anthropic-ai/sdk && npm install -D typescript tsx vitest @vitest/coverage-v8 @types/pg @types/node @types/jsonwebtoken @types/bcrypt @types/node-cron @types/qrcode && npx tsc --init`
  - `yorindo-app`: `npx create-next-app@14 yorindo-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` + post-init installs (Zustand, React Query, RHF+Zod, TanStack Table, MSW, @faker-js/faker, idb, next-pwa, etc.)

- **Database Migrations:** `yorindo-api/db/migrations/` — numbered SQL files run by `scripts/migrate.ts`. Must be run before any feature story begins.
  - `001_initial_schema.sql` — contacts, events, registrations, vendors, industries, job_titles
  - `002_auth.sql` — users, user_events
  - `003_etl.sql` — flagged_records, audit_logs
  - `004_indexes.sql` — all required PostgreSQL indexes

- **Docker Compose:** Production `docker-compose.yml` (postgres:16-alpine, mongo:7, redis:7-alpine, nginx, api, app) + dev override `docker-compose.dev.yml`. Must be working before any feature development begins.

- **FE MSW Mocking:** FE team develops independently of BE using MSW (Mock Service Worker). All API calls intercepted by MSW handlers in `src/mocks/handlers/`. `@faker-js/faker` provides realistic seed data. DevToolbar provides role switching without login flow. FE types owned by FE team in `src/types/api.ts`.

- **CI/CD Pipeline:** GitHub Actions — lint → typecheck → test → build → push (GHCR) → SSH deploy (`docker compose pull && docker compose up -d`). Required secrets: `VPS_SSH_KEY`, `VPS_HOST`, `VPS_USER`, `GHCR_TOKEN`.

- **Repository Pattern:** All DB queries exclusively in `repositories/` files. Services call repos. Routes call services. Never query DB directly from routes.

- **Three Zustand Stores (FE — do not add more without review):** `authStore`, `eventStore`, `filterStore`

- **TanStack Table v8 — server-side (manual) mode:** All tables with >1K potential rows. Client-side pagination forbidden. Pagination API: `?page=&pageSize=&sortBy=&sortDir=`

- **BullMQ — two queues only:** `etl` and `blast`. Workers started from `main.ts` in same Node process as API server (MVP).

- **YoriMind pattern:** node-cron daily 02:00 WIB → VPS filesystem snapshot → Redis cache TTL 24h → Claude Sonnet API on cache miss.

- **Custom JWT auth:** Access token 15min (Zustand memory), refresh token 7d (httpOnly cookie). Token blacklist in Redis. Role resolved from DB on issue.

- **Roles:** `admin` (all events), `staff` (assigned events via user_events, scan only), `viewer` (assigned events via user_events, read-only analytics)

- **Offline scan:** next-pwa NetworkFirst for API, CacheFirst for static. IndexedDB via `idb`. `queueScan()` + `flushScanQueue()` on reconnect.

### UX Design Requirements

_No UX Design document exists for this project. UX patterns are derived from PRD user journeys and Architecture FE scaffold decisions._

### FR Coverage Map

| FR | Epic | Summary |
|---|---|---|
| FR1–FR8 | Epic 4 | Event create/clone/lifecycle/capacity/config/cancel |
| FR9–FR14 | Epic 3 | Contact import, identity matching, duplicate merge, profile scoring |
| FR15–FR21 | Epic 5 | Invitation blast, templates, scheduling, suppression, emergency blast |
| FR22–FR32, FR30a | Epic 6 | Registration form, double opt-in, approval workflow, waitlist, ticket |
| FR33–FR39 | Epic 7 | Check-in PWA — QR scan, OTP, name search, offline, live monitor |
| FR40–FR46 | Epic 8 | Attendance report, vendor magic link, DPA acceptance, YoriMind |
| FR47–FR48 | Epic 2 | User accounts, RBAC |
| FR49 | Cross-cutting | Audit trail — implemented incrementally within each epic's write operations (Epics 2–8) |
| FR50–FR51 | Epic 4 | Soft delete + recovery (events/records — first destructive action context) |
| FR52 | Distributed | Confirmation dialogs — implemented within each epic's destructive-action stories |
| FR53 | Epic 4 | Event state machine override (super admin safeguarded access) |
| FR54 | Epic 6 | Consent capture at registration |
| FR55, FR59 | Epic 5 | Consent enforcement + suppression on outbound communications |
| FR56–FR58 | Epic 9 | Participant self-service data rights — request copy, erasure, anonymization |
| FR60 | Epic 6 | Google Calendar deep link in approval confirmation notification |
| FR61 | Epic 4 | Target criteria count preview before committing event segment |
| FR62–FR63 | Epic 6 | Duplicate registration detection, requeue rejected registrations |

**All 64 FRs accounted for. ✅**

## Epic List

### Epic 1: Foundation, OpenAPI Contract & Developer Experience
Both development teams have fully operational environments with a shared OpenAPI contract gating all feature work. The FE team has complete MSW mocking for all planned API endpoints — enabling full parallel FE development with zero dependency on BE availability.
**FRs covered:** Foundation (no direct FRs — enables all epics)
**Architecture requirements:** Both repo scaffolds, OpenAPI 3.0 spec, Docker Compose (prod + dev override), DB migrations 001–004, CI/CD pipeline (GitHub Actions → GHCR → VPS SSH deploy), MSW handlers for all API domains, DevToolbar (role switcher), `src/types/api.ts` FE-owned type definitions.

### Epic 2: Team & Access Management
Super admin can create and manage internal user accounts (admin, staff, viewer); team members can securely log in with JWT and are automatically restricted to their role's permitted capabilities. Audit trail begins here.
**FRs covered:** FR47, FR48
**FR49 audit trail:** login, account-created, role-changed actions logged in this epic.
**NFRs:** NFR-S1, NFR-S2, NFR-S3, NFR-S9, NFR-S10, NFR-S11

### Epic 3: Contact Database & Participant Intelligence
Admin can build and maintain a clean, qualified participant database by importing Excel/CSV data, reviewing AI-normalized records (GPT-4o), resolving duplicate profiles, and searching/filtering contacts with AI-assisted smart industry classification.
**FRs covered:** FR9, FR10, FR11, FR12, FR13, FR14
**FR49 audit trail:** contact.imported, contact.merged, flagged.reviewed actions logged in this epic.
**NFRs:** NFR-SC1, NFR-SC5, NFR-P3

### Epic 4: Event Configuration & Management
Admin can create, configure, clone, publish, and manage events through their full lifecycle — with capacity management, survey template builder, segmentation criteria preview, state machine controls, soft delete with recovery, and event cancellation.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR50, FR51, FR52 (event-context confirmation dialogs), FR53, FR61
**FR49 audit trail:** event.created, event.published, event.cancelled, event.deleted, event.restored, event.state-override actions logged in this epic.
**NFRs:** NFR-SC2, NFR-P3

### Epic 5: Invitation Blast & Notifications
Admin can proactively invite targeted participants to events via WhatsApp (Everpro) and email (Brevo) — with consent enforcement, suppression list protection, message template management, scheduled delivery, and emergency blast capability.
**FRs covered:** FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR55, FR59
**FR49 audit trail:** blast.initiated, blast.scheduled, template.updated actions logged in this epic.
**NFRs:** NFR-P10, NFR-R3, NFR-SC3, NFR-S6, NFR-S15

### Epic 6: Participant Registration & Approval Workflow
Participants can discover events and complete registration via mobile-first forms with phone pre-fill and double opt-in; admins can manage the full approval-to-ticket pipeline with automated notifications, waitlist management, calendar link delivery, and duplicate registration detection.
**FRs covered:** FR22, FR23, FR24, FR25, FR26, FR27, FR28, FR29, FR30, FR30a, FR31, FR32, FR52 (registration-context confirmation dialogs), FR54, FR60, FR62, FR63
**FR49 audit trail:** registration.submitted, registration.approved, registration.rejected, registration.waitlisted, registration.attended actions logged in this epic.
**NFRs:** NFR-P1, NFR-P2, NFR-P11, NFR-R3, NFR-SC6, NFR-S7, NFR-S14, NFR-A1

### Epic 7: Event-Day Check-in (Offline-First PWA)
Staff can run seamless event-day check-in via QR scan, OTP identity recovery, name search, and manual override — fully offline-resilient with automatic background sync on reconnect and real-time attendance monitoring for admins.
**FRs covered:** FR33, FR34, FR35, FR36, FR37, FR38, FR39
**FR49 audit trail:** checkin.scan, checkin.otp-recovery, checkin.manual-override actions logged in this epic.
**NFRs:** NFR-P5, NFR-P6, NFR-P9, NFR-R2, NFR-R4, NFR-R5, NFR-R6, NFR-DI1, NFR-DI2, NFR-DI5, NFR-PWA1, NFR-PWA2, NFR-PWA3, NFR-SC4, NFR-S4, NFR-S5, NFR-A2

### Epic 8: Analytics, Reporting & YoriMind
Admin can access AI-powered event performance insights via the YoriMind panel with funnel charts and demographic breakdowns; vendors can securely download post-event reports via time-limited magic links with mandatory DPA acceptance and full access logging.
**FRs covered:** FR40, FR41, FR42, FR43, FR44, FR45, FR46
**FR49 audit trail:** report.generated, report.downloaded, vendor-link.accessed actions logged in this epic.
**NFRs:** NFR-P3, NFR-P7, NFR-P8, NFR-S12, NFR-S13

### Epic 9: Participant Data Rights & UU PDP Compliance
Participants can exercise their UU PDP data rights — requesting a copy of their stored data, requesting erasure with full anonymization and permanent suppression, and receiving clear distinction between registration cancellation and data erasure.
**FRs covered:** FR56, FR57, FR58
**NFRs:** NFR-DI3, NFR-DI4, NFR-S16, NFR-R1

---

## Epic 1: Foundation, OpenAPI Contract & Developer Experience

Both development teams have fully operational environments with a shared OpenAPI contract gating all feature work. The FE team has complete MSW mocking for all planned API endpoints — enabling full parallel FE development with zero dependency on BE.

### Story 1.1: Backend Repository Scaffold & Docker Compose

> **Phase:** Foundation (both phases require this — complete before any feature work)

As a developer,
I want the `yorindo-api` repository initialized with all required packages, TypeScript configuration, Fastify server skeleton, and Docker Compose setup for all services,
So that the full backend stack runs locally with a single command and matches the production environment structure.

**Acceptance Criteria:**

**Given** the repo is freshly cloned,
**When** `npm install` is run,
**Then** all packages install without errors and `npx tsx src/main.ts` starts the Fastify server

**Given** Docker Compose is installed,
**When** `docker compose -f docker-compose.yml -f docker-compose.dev.yml up` is run,
**Then** all six containers start (postgres:16-alpine, mongo:7, redis:7-alpine, api, app, nginx) without errors

**Given** the API container is running,
**When** `GET http://localhost:3000/api/health` is called,
**Then** it returns `{ "status": "ok" }` with HTTP 200

**Given** a required env var is missing from `.env`,
**When** the server starts,
**Then** `src/config/index.ts` throws a descriptive error at startup — not at first request

**Given** the dev override is active and a source file in `src/` is modified,
**When** the file is saved,
**Then** the API server hot-reloads (`legacyWatch: true` configured for WSL2)

**Given** an authenticated API request is made with a body that violates the OpenAPI schema,
**When** Fastify's AJV schema validation (configured from `openapi.yaml`) processes the request,
**Then** it returns HTTP 400 with `{ error: { code: 'VALIDATION_ERROR', message: '...', details: [...] } }` before the handler runs (NFR-S8)

---

### Story 1.2: Database Schema Migrations

> **Phase:** Foundation (required for Phase 2 BE; can be done in parallel with Phase 1 FE work)

As a developer,
I want all four PostgreSQL migration files written and executable via `scripts/migrate.ts`,
So that any team member can initialize the complete database schema from scratch with a single command.

**Acceptance Criteria:**

**Given** PostgreSQL is running via Docker Compose,
**When** `npx tsx scripts/migrate.ts` is run,
**Then** all 4 migration files execute in order (001→002→003→004) with a success log per file and zero errors

**Given** migration 001 runs,
**Then** tables `contacts`, `events`, `registrations`, `vendors`, `industries`, `job_titles` exist with UUID PKs (`gen_random_uuid()`), correct column types, and FK constraints as per the authoritative schema in architecture.md

**Given** migration 002 runs,
**Then** tables `users` (id, email, password_hash, role, name, timestamps) and `user_events` (id, user_id FK, event_id FK, granted_by FK, granted_at, UNIQUE(user_id, event_id)) exist

**Given** migration 003 runs,
**Then** tables `flagged_records` and `audit_logs` exist; `audit_logs` has JSONB `metadata` column and indexes on `actor_id`, `event_id`, `target_id`

**Given** migration 004 runs,
**Then** all required indexes exist: `contacts(industry_id)`, `contacts(city)`, `contacts(job_title_id)`, `registrations(event_id, status)`, `registrations(contact_id)`

**Given** the migration script is run a second time,
**Then** it completes without errors using `CREATE TABLE IF NOT EXISTS` (idempotent)

**Given** `scripts/seed.ts` is run,
**Then** realistic dev data is inserted (minimum: 2 users — admin + staff, 3 events in varied statuses, 10 contacts)
**And** the seed script exits immediately with an error if `NODE_ENV=production`

---

### Story 1.3: Frontend Repository Scaffold

> **Sprint Planning Note (Bob):** This story is large — it covers Next.js init, 3 Zustand stores, TanStack dependencies, next-pwa, and vitest. If sprint capacity is tight, it can be split: 1.3a (scaffold + routing + stores) and 1.3b (next-pwa + vitest config). The FE team must assess during sprint planning.

As a FE developer,
I want the `yorindo-app` repository initialized with Next.js 14 App Router, all required packages, three Zustand stores, next-pwa configuration, and vitest with `@/` alias resolution,
So that the FE team has a fully working local environment with PWA support and testing infrastructure from day one.

**Acceptance Criteria:**

**Given** the repo is freshly cloned,
**When** `npm install && npm run dev` is run,
**Then** the Next.js app starts on `http://localhost:3000` and the root page renders without errors

**Given** the app is running,
**When** `GET /api/health` is called,
**Then** the Next.js API route returns `{ "status": "ok" }` with HTTP 200

**Given** each Zustand store is imported,
**Then** `authStore` exports `{ accessToken, user, setAccessToken, clearAuth }`, `eventStore` exports `{ selectedEventId, setSelectedEvent }`, `filterStore` exports `{ industry, city, companySize, page, setFilter, resetFilter }` — all matching the documented types

**Given** `next.config.js` is configured with next-pwa NetworkFirst (API) and CacheFirst (static) rules,
**When** `npm run build` is run,
**Then** service worker files are generated in `public/` without build errors

**Given** `vitest.config.ts` defines `resolve.alias: { '@': path.resolve(__dirname, './src') }`,
**When** `npm run test` is run,
**Then** vitest resolves all `@/` imports and the empty test suite reports 0 failures

---

### Story 1.4: OpenAPI 3.0 Specification

> **Phase:** Foundation — **hard gate for Phase 1 FE**. No FE feature story begins until this is approved and merged.

As a developer,
I want a complete OpenAPI 3.0 specification at `yorindo-api/openapi.yaml` covering all planned endpoints,
So that both teams have an agreed type contract before any feature code is written — the Sprint 0 hard gate.

**Acceptance Criteria:**

**Given** the spec is complete,
**Then** it covers all endpoint groups: `/api/auth`, `/api/contacts`, `/api/events`, `/api/registrations`, `/api/scan/verify`, `/api/blast`, `/api/events/{id}/yorimind`, `/api/users`, `/api/health`

**Given** any endpoint definition,
**Then** it specifies HTTP method, path, request body schema (where applicable), response schemas for 200/201/400/401/403/404, and security requirement (bearer JWT or public)

**Given** the error response schema,
**Then** all 4xx/5xx responses use `{ error: { code: string, message: string, details: array } }` exclusively

**Given** the spec is linted,
**When** `npx @redocly/cli lint openapi.yaml` is run,
**Then** it passes with zero errors

**Given** any collection endpoint,
**Then** it documents query params `page`, `pageSize`, `sortBy`, `sortDir` and response `{ data: [], pagination: { page, pageSize, total, totalPages } }`

**Given** the spec is complete,
**When** both FE and BE tech leads approve it,
**Then** it is committed to `yorindo-api/openapi.yaml`
**And** no story in Epic 2 or later begins until this story is marked done

---

### Story 1.5: FE Type Definitions, MSW Foundation & DevToolbar

> **Phase 1: FE** — blocks all FE feature stories

As a FE developer,
I want FE-owned TypeScript type definitions from the OpenAPI spec, MSW browser and server worker setup, and the DevToolbar role switcher,
So that the FE team can develop type-safely against a mock API with role switching — no BE required.

**Acceptance Criteria:**

**Given** `src/types/api.ts` exists,
**Then** it exports TypeScript interfaces for: `Contact`, `Event`, `Registration`, `User`, `ScanResult`, `YoriMindResult`, `ApiError`, `PaginatedResponse<T>`, and all mutation body types

**Given** the app runs in `NODE_ENV=development`,
**When** `src/app/layout.tsx` loads,
**Then** the MSW service worker starts and the browser console logs `[MSW] Mocking enabled`

**Given** `vitest.setup.ts` imports `src/mocks/server.ts`,
**When** any test runs,
**Then** `server.listen({ onUnhandledRequest: 'warn' })` is active before the test, `server.resetHandlers()` runs after each test, `server.close()` runs after all tests

**Given** the app renders in `NODE_ENV=development`,
**Then** `<DevToolbar />` is visible in the bottom-right corner with three role buttons: `admin | staff | viewer`

**Given** the `staff` button is clicked,
**When** `useAuthStore().user` is read,
**Then** it returns `{ id: 'dev-staff', role: 'staff' }` and the staff button is visually active

**Given** `NODE_ENV=production`,
**When** `<DevToolbar />` renders,
**Then** it returns `null` immediately — no toolbar, no DOM output

---

### Story 1.6: MSW Mock Handlers for All API Domains

> **Phase 1: FE** — this story completes the mocking foundation; all feature FE stories can begin in parallel after this

As a FE developer,
I want complete MSW handlers for all API domains with `@faker-js/faker` seed data,
So that every FE feature epic can be developed independently with realistic, paginated, and filterable mock responses.

**Acceptance Criteria:**

**Given** `contacts.ts` handler is active,
**When** `GET /api/contacts?page=1&pageSize=20` is intercepted,
**Then** it returns 20 contacts from a seeded pool of 247, with correct `pagination` object and 400ms simulated delay

**Given** `contacts.ts` handler and a `?industry=kesehatan` filter param,
**When** the request is intercepted,
**Then** only contacts matching that industry slug are returned

**Given** `events.ts` handler is active,
**When** `GET /api/events` is intercepted,
**Then** events in all status variants are returned (at least one each: draft, published, active, completed, cancelled); mutations (POST/PATCH) return updated state with 600ms delay

**Given** `registrations.ts` handler is active,
**When** `PATCH /api/registrations/:id/status` with `{ status: 'approved' }` is intercepted,
**Then** it returns the updated registration with `status: 'approved'` and 600ms delay

**Given** `scan.ts` handler is active,
**When** `POST /api/scan/verify` is intercepted with token `MOCK_INVALID`,
**Then** it returns HTTP 401; with `MOCK_ALREADY` returns `{ alreadyAttended: true }`; any other token returns success with seeded attendee profile

**Given** `yorimind.ts` handler is active,
**When** `GET /api/events/:id/yorimind` is intercepted,
**Then** it returns the full YoriMind output shape with realistic Indonesian-language content and 1200ms delay

**Given** an unhandled request occurs in development,
**Then** MSW logs a console warning (`onUnhandledRequest: 'warn'`) — does not throw

**Given** the OpenAPI spec (Story 1.4) is approved,
**When** all handlers are written,
**Then** every handler's request/response shape conforms exactly to the approved `openapi.yaml` — any deviation from spec is a story defect, not a product decision

---

### Story 1.7: CI/CD Pipeline

> **Sprint Planning Note (Bob):** Story 1.7 can be started as a parallel track alongside Stories 1.2–1.5. CI/CD does not depend on MSW or OpenAPI being complete. Recommend assigning a separate developer to 1.7 from day one of Epic 1.

As a developer,
I want a GitHub Actions pipeline that lints, typechecks, tests, builds Docker images, pushes to GHCR, and deploys to VPS on pushes to main,
So that every merge to main automatically reaches production without manual steps.

**Acceptance Criteria:**

**Given** a push to any branch,
**When** the CI pipeline runs,
**Then** `eslint` and `tsc --noEmit` run for both repos; the pipeline fails on any type or lint error

**Given** a push to any branch,
**When** the test step runs,
**Then** `vitest run` executes for both repos; pipeline fails if any test fails

**Given** a push to `main` with passing lint + tests,
**When** the build step runs,
**Then** multi-stage Docker images are built for `yorindo-api` and `yorindo-app`

**Given** a successful build on `main`,
**When** the push step runs,
**Then** images tagged with the commit SHA are pushed to GHCR

**Given** a successful GHCR push,
**When** the deploy step runs,
**Then** the VPS is accessed via SSH and `docker compose pull && docker compose up -d` executes

**Given** the deploy completes,
**When** the health check step runs,
**Then** `curl https://domain/api/health` returns HTTP 200; the pipeline fails and alerts if it does not

**Given** pipeline secrets,
**Then** `VPS_SSH_KEY`, `VPS_HOST`, `VPS_USER`, `GHCR_TOKEN` are sourced exclusively from GitHub Actions secrets — never hardcoded

---

## Epic 2: Team & Access Management

Super admin can create and manage internal user accounts (admin, staff, viewer); team members can securely log in with JWT and are automatically restricted to their role's permitted capabilities.

> **Phase 1 (FE):** Login page with form + error states (MSW auth handler); user management table + create/edit/deactivate modals; route guard middleware (Next.js middleware.ts); event assignment UI — all wired to MSW
> **Phase 2 (BE):** `POST /api/auth/login|refresh|logout`, `GET/POST/PATCH/DELETE /api/users`, `POST/DELETE /api/users/:id/events`, JWT middleware, bcrypt, Redis token blacklist, `requireEventAccess` middleware

### Story 2.1: Admin Login & JWT Authentication

As an internal team member,
I want to log in with my email and password and receive a JWT access token,
So that I can securely access the platform and all subsequent API calls are authenticated.

**Acceptance Criteria:**

**Given** a valid email and password,
**When** `POST /api/auth/login` is called,
**Then** it returns an access token (15min HS256 JWT with `{ sub, role, jti }` payload) and sets an httpOnly `refresh_token` cookie (7 days)

**Given** an invalid email or wrong password,
**When** `POST /api/auth/login` is called,
**Then** it returns HTTP 401 with `{ error: { code: 'INVALID_CREDENTIALS', ... } }` — no information about which field was wrong

**Given** a valid access token,
**When** any authenticated endpoint is called with `Authorization: Bearer {token}`,
**Then** the request proceeds and `req.user` contains `{ sub, role, jti }`

**Given** an expired or malformed access token,
**When** an authenticated endpoint is called,
**Then** it returns HTTP 401 with `{ error: { code: 'INVALID_TOKEN', ... } }`

**Given** a valid httpOnly refresh cookie,
**When** `POST /api/auth/refresh` is called,
**Then** a new 15-min access token is returned without requiring re-login

**Given** a user logs out,
**When** `POST /api/auth/logout` is called,
**Then** the JWT `jti` is blacklisted in Redis and the refresh cookie is cleared; subsequent requests with that access token return 401

**Given** the login action,
**Then** a `login` entry is written to `audit_logs` with `actor_id`, `actor_role`, `created_at`

---

### Story 2.2: User Account Management

As a super admin,
I want to create, view, edit, and deactivate internal user accounts with assigned roles,
So that I can control who has access to the platform and what they can do.

**Acceptance Criteria:**

**Given** I am authenticated as `admin`,
**When** `POST /api/users` is called with `{ email, name, role, password }`,
**Then** the user is created with a bcrypt-hashed password and the correct role; a `user.created` audit entry is written

**Given** I am authenticated as `admin`,
**When** `GET /api/users` is called,
**Then** it returns all users with their id, name, email, role, and created_at — passwords never returned

**Given** I am authenticated as `admin`,
**When** `PATCH /api/users/:id` is called with `{ role: 'viewer' }`,
**Then** the user's role is updated and a `user.role-changed` audit entry is written

**Given** I am authenticated as `admin`,
**When** `DELETE /api/users/:id` is called,
**Then** the account is deactivated (soft delete — `deleted_at` set) and a `user.deactivated` audit entry is written

**Given** I am authenticated as `staff` or `viewer`,
**When** `POST /api/users` is called,
**Then** it returns HTTP 403 with `{ error: { code: 'FORBIDDEN', ... } }`

**Given** a non-admin tries to access `/admin/users` on the FE,
**When** the route guard runs,
**Then** they are redirected to the dashboard with no flash of admin content

---

### Story 2.3: Role-Based Route Guards (Frontend)

> **Phase 1 only** — pure FE story. No BE work. Uses `authStore` (set by DevToolbar in Phase 1, set by real JWT in Phase 2).

As a platform,
I want frontend routes automatically protected based on the authenticated user's role,
So that staff cannot access admin pages and viewers cannot access write-action pages.

**Acceptance Criteria:**

**Given** a user is not authenticated (no access token in `authStore`),
**When** any `/admin/*` or `/scan/*` route is accessed,
**Then** they are redirected to `/login` immediately

**Given** a `staff` user is authenticated,
**When** they navigate to `/admin/contacts` or `/admin/events`,
**Then** they are redirected to `/scan` (their permitted surface)

**Given** a `viewer` user is authenticated,
**When** they navigate to `/admin/contacts/upload` or any PATCH/POST action page,
**Then** they are redirected to the read-only analytics pages they are assigned to

**Given** an `admin` user is authenticated,
**When** they navigate to any route,
**Then** full access is granted with no redirect

**Given** a `staff` user's access token expires mid-session,
**When** any API call returns 401,
**Then** the FE attempts silent refresh once; on refresh failure redirects to `/login` and clears `authStore`

---

### Story 2.4: Event Access Assignment for Staff & Viewer

> **Sprint Planning Note (readiness review):** Phase 2 BE implementation of this story must occur after Epic 4 Story 4.1 is complete — events must exist in the database for assignment to be meaningful. Phase 1 FE is unaffected (MSW provides fake events).

As a super admin,
I want to assign staff and viewer accounts to specific events,
So that staff can only scan check-ins for their assigned events and viewers only see analytics for their assigned events.

**Acceptance Criteria:**

**Given** I am authenticated as `admin`,
**When** `POST /api/users/:id/events` is called with `{ eventId }`,
**Then** a `user_events` row is created (user_id, event_id, granted_by, granted_at) and a `user.event-assigned` audit entry is written

**Given** a `staff` user attempts to call `POST /api/scan/verify` for an event not in their `user_events`,
**When** `requireEventAccess` middleware runs,
**Then** it returns HTTP 403 with `{ error: { code: 'EVENT_ACCESS_DENIED', ... } }`

**Given** an `admin` user calls any event-scoped endpoint,
**When** `requireEventAccess` middleware runs,
**Then** it passes immediately — admin bypasses event scope checks

**Given** I am authenticated as `admin`,
**When** `DELETE /api/users/:id/events/:eventId` is called,
**Then** the `user_events` row is deleted and access is immediately revoked

---

## Epic 3: Contact Database & Participant Intelligence

Admin can build and maintain a clean, qualified participant database by importing Excel/CSV data, reviewing AI-normalized records, resolving duplicate profiles, and searching/filtering contacts with AI-assisted smart industry classification.

> **Phase 1 (FE):** Contacts table (TanStack Table, pagination, filter bar, smart filter input + debounce); upload form + file picker + job status poller; ETL job status page; flagged records review UI (side-by-side diff + approve/discard); duplicate merge UI (field selector); — all wired to MSW contacts/etl handlers
> **Phase 2 (BE):** `GET /api/contacts`, `POST /api/etl/upload`, BullMQ ETL worker + GPT-4o normalization + Zod validation, `GET /api/etl/jobs/:id`, `GET/PATCH /api/contacts/flagged`, `POST /api/contacts/:id/merge`, `POST /api/smart-filter/industry` (Claude Haiku), MongoDB raw_uploads document write, all repositories

### Story 3.1: Contact List with Server-Side Pagination & Filtering

As an admin,
I want to browse the contact database with pagination, sorting, and filtering by industry, city, and company size,
So that I can find and review specific participant segments efficiently.

**Acceptance Criteria:**

**Given** I am authenticated as `admin`,
**When** `GET /api/contacts?page=1&pageSize=50` is called,
**Then** it returns `{ data: Contact[], pagination: { page, pageSize, total, totalPages } }` with HTTP 200, results within 500ms

**Given** a filter param `?industry=kesehatan&city=Jakarta`,
**When** the contacts endpoint is called,
**Then** only contacts matching both filters are returned

**Given** the contacts page in the admin dashboard,
**When** it renders,
**Then** TanStack Table v8 in manual (server-side) mode displays the paginated data with sortable columns (name, industry, city, company, created_at)

**Given** the page or sort params change,
**When** React Query re-fetches,
**Then** the table updates without a full page reload and shows a skeleton loader during fetch

**Given** a `viewer` user accesses the contacts list,
**Then** it returns HTTP 403 — viewers cannot access the contact database

---

### Story 3.2: Excel/CSV Upload & ETL Job Trigger

As an admin,
I want to upload an Excel or CSV file of participant records and trigger the ETL normalization pipeline,
So that I can import bulk data into the contact database without manual entry.

**Acceptance Criteria:**

**Given** I am authenticated as `admin`,
**When** `POST /api/etl/upload` is called with a multipart file upload (`.xlsx` or `.csv`),
**Then** the file is saved to the `uploads_tmp` Docker volume and a BullMQ ETL job is enqueued; the endpoint returns HTTP 202 `{ jobId, status: 'queued' }`

**Given** a file larger than the configured max size,
**When** the upload is attempted,
**Then** it returns HTTP 400 `{ error: { code: 'FILE_TOO_LARGE', ... } }`

**Given** a file with an unsupported extension,
**When** the upload is attempted,
**Then** it returns HTTP 400 `{ error: { code: 'INVALID_FILE_TYPE', ... } }`

**Given** the ETL job is enqueued,
**When** `GET /api/etl/jobs/:jobId` is called,
**Then** it returns the current job status: `queued`, `processing`, `completed`, or `failed`

**Given** the upload form on the FE (`/admin/contacts/upload`),
**When** a file is selected and submitted,
**Then** the form shows an upload progress indicator and on success shows the job ID with a link to monitor status

---

### Story 3.3: ETL Processing — GPT-4o Normalization & Database Upsert

As a system,
I want the ETL worker to parse uploaded files, normalize records via GPT-4o in batches of 50, and upsert valid contacts into PostgreSQL,
So that raw imported data becomes clean, standardized participant records automatically.

**Acceptance Criteria:**

**Given** an ETL job is dequeued by `etl.worker.ts`,
**When** the file is read from `uploads_tmp`,
**Then** `xlsx` parses it into an array of row objects and the temp file is deleted after parsing

**Given** 50 rows are sent to GPT-4o with the standard system prompt,
**When** the response is received,
**Then** each row has `{ name, phone, email, industry_slug, job_title_slug, city, company_size, confidence, flags[] }` and passes Zod schema validation

**Given** a row with all field confidence ≥ 0.7,
**When** the upsert runs,
**Then** `ContactRepository.upsert()` inserts a new contact or updates an existing one matched by phone (`ON CONFLICT (phone) DO UPDATE`)

**Given** a row with any field confidence < 0.7,
**When** the ETL processes it,
**Then** the row is inserted into `flagged_records` with the raw data and flags; it is NOT upserted into `contacts`

**Given** GPT-4o returns invalid JSON or a Zod validation failure,
**When** the batch is processed,
**Then** the batch is retried up to 3 times with exponential backoff before being marked as failed

**Testing Strategy (Quinn):** ETL GPT-4o calls are never made in CI tests. The `etl.worker.ts` must accept a configurable `normalizer` function (default: GPT-4o, test override: deterministic stub returning pre-defined normalized rows). Vitest tests cover: valid batch upsert path, low-confidence flagging path, retry logic with simulated JSON parse failure. No real OpenAI API calls in test suite.

**Given** the ETL upsert runs for a contact row,
**Then** `contacts.completeness_score` is computed as the integer percentage of non-null profile fields (`name`, `phone`, `email`, `company`, `industry_id`, `job_title_id`, `city`, `company_size`) and persisted alongside the upsert (FR12)

**Given** the ETL job completes,
**Then** a `raw_uploads` document is created in MongoDB with `{ filename, uploaded_by, row_count, status: 'completed', flagged_rows }` and a `contact.imported` audit entry is written

---

### Story 3.4: Flagged Records Review & Resolution

As an admin,
I want to review AI-flagged contact records, correct errors, and either approve or discard them,
So that uncertain data is human-reviewed before entering the clean contact database.

**Acceptance Criteria:**

**Given** I am authenticated as `admin`,
**When** `GET /api/contacts/flagged?page=1&pageSize=50` is called,
**Then** it returns paginated flagged records with `{ raw_data, flags[], status: 'pending' }`

**Given** a flagged record is displayed in the FE (`/admin/contacts/flagged`),
**Then** the original raw field values and the AI flags are both shown side by side for comparison

**Given** I correct a flagged record's fields and submit,
**When** `PATCH /api/contacts/flagged/:id` is called with `{ resolved_data, action: 'approve' }`,
**Then** the corrected contact is upserted into `contacts` and the flagged record `status` is updated to `resolved`; a `flagged.reviewed` audit entry is written

**Given** I choose to discard a flagged record,
**When** `PATCH /api/contacts/flagged/:id` is called with `{ action: 'discard' }`,
**Then** the flagged record `status` is updated to `discarded` and no contact is created

**Given** the flagged records list,
**When** it renders,
**Then** TanStack Table v8 server-side mode shows the data with status filter (pending / resolved / discarded)

---

### Story 3.5: Duplicate Profile Detection & Merge

As an admin,
I want to review automatically flagged duplicate participant profiles and merge them into a single canonical record,
So that the contact database maintains one accurate profile per real participant.

**Acceptance Criteria:**

**Given** a new registration or ETL import occurs,
**When** the system checks composite identity signals (phone, email, name + company),
**Then** potential duplicates are flagged and surfaced in the admin dashboard for review (FR10)

**Given** I am on the duplicate review page,
**When** two profiles are shown side by side,
**Then** I can see all fields from both records and select which value to keep per field

**Given** I confirm the merge,
**When** `POST /api/contacts/:id/merge` is called with `{ mergeIntoId, fieldSelections }`,
**Then** the surviving record is updated with selected fields, the duplicate is soft-deleted, all registrations referencing the duplicate are re-linked to the surviving record, and a `contact.merged` audit entry is written

**Given** a merge is performed,
**When** the duplicate contact's ID is used in any subsequent API call,
**Then** it returns the surviving contact's data (redirect via ID mapping)

---

### Story 3.6: Smart Filter — AI Industry Autocomplete

As an admin,
I want to type a free-form industry term in the contact filter and have it automatically mapped to a canonical industry slug,
So that I don't need to know exact industry taxonomy values to filter contacts accurately.

**Acceptance Criteria:**

**Given** I type "rumah sakit" in the industry filter input,
**When** 500ms elapses (debounce),
**Then** `POST /api/smart-filter/industry` is called with `{ query: 'rumah sakit' }`

**Given** Claude Haiku returns a match with confidence ≥ 0.6,
**When** the response is received,
**Then** the filter applies the matched slug (e.g., `kesehatan`) and the contact list updates

**Given** Claude Haiku returns confidence < 0.6,
**When** the response is received,
**Then** `{ fallback: true }` is returned and the filter displays a standard dropdown of all industry options

**Given** the smart filter API call fails or times out,
**When** the error occurs,
**Then** the filter silently falls back to the standard dropdown — no error shown to the user

---

## Epic 4: Event Configuration & Management

Admin can create, configure, clone, publish, and manage events through their full lifecycle — with capacity management, survey template builder, segmentation criteria preview, state machine controls, soft delete with recovery, and event cancellation.

> **Phase 1 (FE):** Event creation form (RHF + Zod, all fields); event list with status badges + lifecycle action buttons; clone modal; survey builder (drag-and-drop field config); audience count preview (debounced preview call); soft delete + restore UI with recovery countdown; event cancellation confirmation dialog — all wired to MSW events handler
> **Phase 2 (BE):** `POST/PATCH/GET/DELETE /api/events`, state machine service (Draft→Published→Live→Completed→Archived), `POST /api/events/:id/clone`, survey schema JSONB storage, capacity preview endpoint, soft delete cron (purge after 30d), state-override endpoint (super admin), all event repositories, audit trail writes

### Story 4.1: Event Creation with Full Configuration

As an admin,
I want to create a new event with complete configuration including name, date, venue, capacity, approval mode, notification channel, and scan format,
So that the event is fully set up before I publish it for registrations.

**Acceptance Criteria:**

**Given** I am authenticated as `admin`,
**When** `POST /api/events` is called with a valid event body,
**Then** the event is created with `status: 'draft'`, a unique slug generated from the name, and HTTP 201 is returned with the full event object

**Given** an event with an existing slug,
**When** `POST /api/events` is called with the same name,
**Then** a suffix is appended to make the slug unique (e.g., `erp-seminar-jakarta-2`)

**Given** a missing required field (e.g., no `date`),
**When** `POST /api/events` is called,
**Then** it returns HTTP 400 `{ error: { code: 'VALIDATION_ERROR', details: [{ field: 'date', message: 'Required' }] } }`

**Given** the event is created,
**Then** an `event.created` audit entry is written with `actor_id`, `event_id`, and `created_at`

**Given** the event creation form in the FE (`/admin/events` → new event),
**When** I select approval mode `hybrid` and set a score threshold,
**Then** both fields are included in the `POST /api/events` body and saved correctly

---

### Story 4.2: Event Lifecycle Management (State Machine)

As an admin,
I want to transition events through their lifecycle (Draft → Published → Live → Completed → Archived) with proper guards,
So that events move predictably through states and invalid transitions are prevented.

**Acceptance Criteria:**

**Given** an event in `draft` status,
**When** `PATCH /api/events/:id` is called with `{ status: 'published' }`,
**Then** the status updates and the public registration page at `/register/{slug}` becomes accessible

**Given** an event in `published` status,
**When** `PATCH /api/events/:id` is called with `{ status: 'draft' }`,
**Then** it returns HTTP 400 `{ error: { code: 'INVALID_STATUS_TRANSITION', ... } }` — cannot revert to draft

**Given** an event in `published` or `live` status,
**When** `PATCH /api/events/:id` is called with `{ status: 'cancelled' }`,
**Then** the event is cancelled, all `approved` registrations are updated to `cancelled`, and a blast notification job is enqueued to notify participants; `event.cancelled` audit entry is written

**Given** a super admin uses the state override endpoint (`POST /api/events/:id/state-override`),
**When** a safeguarded override is requested with justification,
**Then** the state transitions even if it would normally be blocked; an `event.state-override` audit entry is written with the justification

**Given** the event detail page in the FE,
**When** I view an event's status,
**Then** only valid next-state transitions are shown as available action buttons

---

### Story 4.3: Event Clone

As an admin,
I want to clone an existing event and inherit all its configuration with editable overrides,
So that I can quickly set up recurring events without re-entering all configuration from scratch.

**Acceptance Criteria:**

**Given** I am authenticated as `admin`,
**When** `POST /api/events/:id/clone` is called,
**Then** a new event is created in `draft` status with all configuration copied from the source event, a new unique slug (`{original-slug}-copy`), and the original event's registrations and attendees are NOT copied

**Given** the cloned event,
**When** I update the `name` and `date` fields,
**Then** only those fields change — all other config (approval mode, notification channel, survey schema ID) is preserved from the source

**Given** the clone action in the FE (event list → kebab menu → Clone),
**When** I click Clone,
**Then** I am navigated to the cloned event's edit form with a success toast notification

---

### Story 4.4: Survey Template Builder

As an admin,
I want to build a custom survey template for each event using a drag-and-drop form builder,
So that I can capture event-specific participant intent signals beyond standard registration fields.

**Acceptance Criteria:**

**Given** I am on the survey builder page (`/admin/events/:id/builder`),
**When** I add a field of type `dropdown` with the label "Solutions Currently Evaluating" and options,
**Then** `PUT /api/events/:id/survey` saves the schema to MongoDB `survey_schemas` collection with the correct structure

**Given** a survey schema exists for an event,
**When** `GET /api/events/:id/survey` is called,
**Then** it returns the full schema with all fields, types, labels, required flags, and options

**Given** I reorder fields in the builder via drag-and-drop,
**When** I save,
**Then** the field order in the MongoDB document matches the displayed order

**Given** the event's survey schema,
**When** a participant visits `/register/{slug}`,
**Then** only the fields enabled in the survey schema are rendered — no hardcoded fields appear outside the schema

---

### Story 4.5: Event Capacity & Target Criteria with Audience Preview

As an admin,
I want to set event capacity with a waitlist buffer and configure target segment criteria with a live audience count preview,
So that I know exactly how many matched participants are in the database before committing to a blast or publish.

**Acceptance Criteria:**

**Given** I configure event capacity with `total: 200` and `buffer: 20`,
**When** the event is saved,
**Then** `events.capacity` stores `200` and `events.waitlist_buffer` stores `20`; the registration system accepts up to 200 approved + 20 waitlisted

**Given** I configure target criteria (`industry: 'manufaktur', city: 'Surabaya'`),
**When** I click "Preview Audience",
**Then** `POST /api/events/:id/audience-preview` returns the count of contacts in the database matching those filters (FR61), displayed immediately in the UI before saving

**Given** the audience preview count is 0,
**When** displayed in the FE,
**Then** a warning is shown: "No contacts match these criteria — review filters before publishing"

---

### Story 4.6: Soft Delete & Recovery for Events and Records

As an admin,
I want to soft-delete events and records with a 30-day recovery window,
So that accidental deletions can be reversed without permanent data loss.

**Acceptance Criteria:**

**Given** I am authenticated as `admin`,
**When** `DELETE /api/events/:id` is called,
**Then** the event's `deleted_at` timestamp is set (not hard deleted), it disappears from the active events list, and an `event.deleted` audit entry is written

**Given** a soft-deleted event,
**When** `GET /api/events` is called,
**Then** the deleted event does not appear in the list (filtered by `deleted_at IS NULL`)

**Given** I navigate to the deleted items view (`/admin/events?deleted=true`),
**When** I click "Restore" on a deleted event,
**Then** `PATCH /api/events/:id/restore` sets `deleted_at = NULL` and the event reappears in the active list; an `event.restored` audit entry is written

**Given** a system cron runs,
**When** a soft-deleted event's `deleted_at` is older than 30 days,
**Then** it is permanently hard-deleted from the database

**Given** a destructive action (delete) is triggered in the FE,
**When** the user clicks Delete,
**Then** a confirmation dialog appears with the event name and a warning about the 30-day recovery window before the DELETE request is sent

---

## Epic 5: Invitation Blast & Notifications

Admin can proactively invite targeted participants to events via WhatsApp (Everpro) and email (Brevo) — with consent enforcement, suppression list protection, message template management, scheduled delivery, and emergency blast capability.

> **Phase 1 (FE):** Template editor (rich text + variable substitution preview); blast config form (segment filters, channel selector, schedule picker); blast history list + delivery status; emergency blast modal with confirmation dialog; suppression list view — all wired to MSW blast handler
> **Phase 2 (BE):** `GET/POST/PATCH /api/blast/templates`, `POST /api/blast`, BullMQ blast worker, Everpro WhatsApp integration, Brevo email integration, HMAC webhook verification (NFR-S6), suppression enforcement at worker level, `POST /api/blast/emergency`, delivery status tracking, scheduled blast cron

### Story 5.1: Notification Message Template Management

As a super admin,
I want to create and edit notification message templates with named variable substitution,
So that all outbound communications use consistent, personalized messaging.

**Acceptance Criteria:**

**Given** I am authenticated as `admin`,
**When** `POST /api/templates` is called with `{ type: 'invitation', channel: 'whatsapp', body: 'Halo {{name}}, ...' }`,
**Then** the template is saved and returned with HTTP 201

**Given** a template with variables `{{name}}`, `{{event_title}}`, `{{date}}`, `{{venue}}`,
**When** a blast is sent,
**Then** each message is personalized by substituting the participant's actual values before delivery

**Given** I edit a template,
**When** `PATCH /api/templates/:id` is called,
**Then** the template is updated and a `template.updated` audit entry is written

**Given** a template preview action in the FE,
**When** I click "Preview",
**Then** the template renders with sample data substituted into all `{{variable}}` placeholders

---

### Story 5.2: Segmented Blast Configuration & Audience Targeting

As an admin,
I want to configure a segmented invitation blast filtered by industry, city, job title, and attendance history,
So that I send invitations only to participants who match the event's target profile.

**Acceptance Criteria:**

**Given** I am authenticated as `admin`,
**When** `POST /api/events/:id/blast` is called with `{ filters: { industry, city, jobTitle, neverAttended }, templateId, channel }`,
**Then** the blast job is enqueued in BullMQ with `202 Accepted` and `{ jobId, status: 'queued' }`

**Given** the blast configuration form in the FE,
**When** I adjust filters,
**Then** the audience count updates live (same preview mechanism as Story 4.5)

**Given** the blast is configured,
**When** `requireAuth` and `requireRole('admin')` middleware run,
**Then** staff and viewer roles receive HTTP 403 — blast is admin-only

**Given** a contact with `consent_status = 'suppressed'` matches the filters,
**When** the blast worker processes the job,
**Then** that contact is excluded from delivery and counted in `suppressed_count` in the job result (FR18, FR59)

---

### Story 5.3: Blast Scheduling & Delivery via Brevo & Everpro

As an admin,
I want to schedule blast delivery for a future date/time and have messages delivered via the configured channel,
So that invitations reach participants at the optimal time without manual intervention.

**Acceptance Criteria:**

**Given** `POST /api/events/:id/blast` is called with `{ scheduledAt: '2026-04-01T09:00:00Z' }`,
**When** the job is enqueued,
**Then** BullMQ delays the job until the scheduled time; the blast does not send immediately

**Given** the blast job executes,
**When** the configured channel is `email`,
**Then** `blast.service.ts` calls Brevo REST API with the personalized message for each eligible contact

**Given** the blast job executes,
**When** the configured channel is `whatsapp`,
**Then** `blast.service.ts` calls Everpro API with the personalized message for each eligible contact

**Given** a message delivery fails (Brevo/Everpro returns non-2xx),
**When** the error is caught,
**Then** BullMQ retries the individual message up to 3 times with exponential backoff (2s, 4s, 8s); after 3 failures the job moves to a `blast-failed` dead-letter queue and a `blast.delivery-failed` audit entry is written with the failed contact ID and error reason

**Given** more than 5% of a blast's recipients fail after all retries,
**When** the blast job finishes,
**Then** a `blast.high-failure-rate` event is logged to `audit_logs` flagged for admin review (supports NFR-R3 ≥95% delivery rate monitoring)

**Given** the blast job completes,
**Then** a `blast.initiated` audit entry is written with `event_id`, `recipient_count`, `suppressed_count`, `channel`

---

### Story 5.4: Emergency Blast

As an admin,
I want to trigger an immediate blast to all confirmed participants of a specific event,
So that I can communicate urgent changes (e.g., venue change, cancellation) without scheduling delays.

**Acceptance Criteria:**

**Given** I am authenticated as `admin`,
**When** `POST /api/events/:id/blast/emergency` is called with `{ message, channel }`,
**Then** a high-priority BullMQ job is enqueued immediately (no delay) targeting all `approved` registrations for the event

**Given** the emergency blast job executes,
**When** transmission is initiated,
**Then** it starts within 30 seconds of the API call (NFR-P10)

**Given** the emergency blast form in the FE,
**When** I click "Send Emergency Blast",
**Then** a confirmation dialog appears showing the recipient count and the message text before submission

---

### Story 5.5: Suppression List & Consent Enforcement

As an admin,
I want the system to automatically exclude opted-out and suppressed contacts from all outbound communications,
So that Yorindo remains compliant with participant consent preferences and UU PDP requirements.

**Acceptance Criteria:**

**Given** a participant clicks the unsubscribe link in any notification message,
**When** the unsubscribe endpoint is called (no login required),
**Then** the contact's `consent_status` is updated to `suppressed` within ≤ 2 taps/clicks (NFR-S15)

**Given** a contact with `consent_status = 'legacy_unverified'` or `'suppressed'`,
**When** any blast job runs,
**Then** that contact is excluded from the recipient list — zero exceptions (FR59)

**Given** a contact is added to the suppression list,
**Then** a `suppression.added` audit entry is written

**Given** the blast worker completes processing,
**When** the job result is logged,
**Then** `suppressed_count` accurately reflects the number of contacts excluded due to consent status

---

## Epic 6: Participant Registration & Approval Workflow

Participants can discover events and complete registration via mobile-first forms; admins can manage the full approval-to-ticket pipeline with automated notifications, waitlist management, and calendar link delivery.

> **Phase 1 (FE):** Public event landing page (`/register/[eventSlug]`); registration form (phone pre-fill, dynamic survey fields, consent checkbox, Google Calendar link on success); double opt-in confirmation page; approval queue table (TanStack Table, approve/reject/waitlist actions, score display); waitlist view; ticket display page (QR code via `react-qr-code`); self-cancellation page — all wired to MSW registrations handler
> **Phase 2 (BE):** `GET /api/events/:slug/public`, `POST /api/registrations`, `GET /api/contacts/lookup`, approval scoring service, `PATCH /api/registrations/:id/status`, double opt-in delivery + expiry cron, waitlist promotion logic, `qrcode` ticket JWT generation, notification dispatch, `POST /api/registrations/:id/cancel`, bot detection (NFR-S7), all registration repositories

### Story 6.1: Public Event Landing Page

As a participant,
I want to view event details and availability on a public landing page before registering,
So that I can make an informed decision about whether to register.

**Acceptance Criteria:**

**Given** an event with `status: 'published'`,
**When** `GET /register/{eventSlug}` is accessed (no authentication required),
**Then** the event name, date, venue, description, and remaining capacity are displayed

**Given** the event has reached full capacity (approved registrations = capacity),
**When** the landing page is accessed,
**Then** "Registrasi Penuh — Daftarkan ke Waiting List" is shown instead of the registration CTA

**Given** an event with `status: 'draft'` or `'cancelled'`,
**When** the landing page is accessed,
**Then** HTTP 404 is returned — draft/cancelled events are not publicly accessible

**Given** a first-time visitor on mobile (Android Chrome),
**When** the page loads,
**Then** First Contentful Paint is ≤ 3 seconds on simulated 4G (NFR-P1)

---

### Story 6.2: Participant Registration Form (Mobile-First)

As a participant,
I want to complete a registration form on my phone with pre-filled data if I've registered before,
So that I can register quickly without re-entering information I've already provided.

**Acceptance Criteria:**

**Given** a participant enters their phone number,
**When** the field loses focus and `GET /api/contacts/lookup?phone={phone}` is called,
**Then** if a matching contact exists, their name, email, company, and job title are pre-filled (FR24)

**Given** the registration form is submitted,
**When** `POST /api/registrations` is called (unprotected, rate-limited 10/IP/hour),
**Then** the registration is created with `status: 'pending'` and HTTP 201 is returned within 3 seconds normal load / 5 seconds burst (NFR-P11)

**Given** the same participant + event combination already exists,
**When** `POST /api/registrations` is called again,
**Then** it returns HTTP 200 with the existing registration status and a message "Your registration is already pending" — no duplicate created (FR62)

**Given** the survey schema has custom fields for this event,
**When** the form renders,
**Then** only those configured fields are displayed in addition to the standard fields; no field is shown that wasn't enabled by the admin (NFR-S14)

**Given** the form is submitted,
**Then** participant consent is captured: `{ consent_status: 'confirmed', event_id, purpose: '...', captured_at }` linked to the registration (FR54)

**Given** the form is submitted,
**When** the registration succeeds,
**Then** a Google Calendar deep link is included in the confirmation page (FR60)

---

### Story 6.3: Double Opt-In Confirmation Flow

> **Sprint Planning Note (Bob):** This story spans email delivery, token generation, expiry handling, and resend logic — flag as potentially oversized during sprint planning. If velocity requires, the expiry cron and resend flow can be deferred to a follow-up story.

As a participant,
I want to receive a confirmation request after submitting my registration when double opt-in is enabled,
So that my slot is only reserved after I explicitly confirm my intent.

**Acceptance Criteria:**

**Given** an event with `double_opt_in: true`,
**When** `POST /api/registrations` is submitted,
**Then** the registration is created with `status: 'provisional'` and a confirmation request is sent via the event-configured channel (WhatsApp or email)

**Given** a provisional registration,
**When** the participant clicks the confirmation link,
**Then** the registration status transitions to `pending` and enters the approval queue; a `registration.confirmed` audit entry is written

**Given** a provisional registration not confirmed within the admin-configured window (default: 24 hours),
**When** the expiry cron runs,
**Then** the registration status transitions to `expired`; the slot is NOT reserved and no queue position is assigned

**Given** a provisional registration,
**When** the slot count is displayed to admin,
**Then** provisional registrations are NOT counted in the approved capacity total

---

### Story 6.4: Registration Approval Queue & Admin Review

As an admin,
I want to review pending registrations, see their rule-based approval score, and approve, reject, or waitlist them,
So that I control who attends the event based on qualification criteria.

**Acceptance Criteria:**

**Given** I am authenticated as `admin` or `viewer`,
**When** `GET /api/events/:id/registrations?status=pending` is called,
**Then** a paginated list of pending registrations is returned with contact details and rule-based score + confidence indicators (FR27)

**Given** I approve a registration,
**When** `PATCH /api/registrations/:id/status` is called with `{ status: 'approved' }`,
**Then** the registration status updates, a QR ticket JWT is generated and stored in `ticket_token`, a blast job is enqueued to notify the participant, and a `registration.approved` audit entry is written

**Given** I reject a registration,
**When** `PATCH /api/registrations/:id/status` is called with `{ status: 'rejected' }`,
**Then** the registration status updates and a rejection notification blast job is enqueued; a `registration.rejected` audit entry is written

**Given** I manually requeue a rejected registration,
**When** `PATCH /api/registrations/:id/status` is called with `{ status: 'pending' }` from `rejected`,
**Then** the registration re-enters the approval queue and a `registration.requeued` audit entry is written (FR63)

**Given** the registrations table in the FE,
**When** it renders,
**Then** TanStack Table v8 server-side mode shows data with status filter tabs and approval action buttons per row

---

### Story 6.5: Waitlist Management & Auto-Promotion

As a participant,
I want to be added to a waitlist when an event is full and automatically promoted when a slot opens,
So that I have a fair chance to attend even if I registered late.

**Acceptance Criteria:**

**Given** an event at full capacity (approved = capacity),
**When** a new registration is submitted and approved by admin,
**Then** the registration is created with `status: 'waitlisted'` instead of `approved`

**Given** a waitlisted registration and an approved participant cancels,
**When** the cancellation is processed,
**Then** the next waitlisted registration is automatically promoted to `approved`, their ticket is generated, and a notification is sent

**Given** an auto-promoted participant does not confirm within the configurable deadline,
**When** the deadline passes,
**Then** their slot is returned to the waitlist and the next participant is promoted (FR32); after 2 failed auto-promotion attempts for the same slot, it returns to admin review

**Given** the waitlist queue,
**When** viewed by admin,
**Then** participants are listed in FIFO order with their queue position displayed

---

### Story 6.6: QR Ticket Generation & Delivery

As an approved participant,
I want to receive a QR code ticket via WhatsApp or email after my registration is approved,
So that I have a scannable ticket to present at event check-in.

**Acceptance Criteria:**

**Given** a registration transitions to `status: 'approved'`,
**When** `TicketService.generateToken()` is called,
**Then** a HS256 JWT ticket is generated with `{ sub: registrationId, eventId, type: 'ticket', exp: eventDate+1day }` and stored in `registrations.ticket_token`

**Given** the blast worker processes the ticket delivery job,
**When** the channel is `email`,
**Then** Brevo sends an HTML email with the QR code embedded as a base64 inline PNG (generated by `qrcode` npm package on the BE)

**Given** the blast worker processes the ticket delivery job,
**When** the channel is `whatsapp`,
**Then** Everpro sends a WhatsApp message with the QR code image attachment

**Given** the QR ticket JWT,
**When** it is decoded by the scan service,
**Then** `payload.type === 'ticket'` is verified and the `registrationId` matches an approved registration

---

### Story 6.7: Participant Self-Cancellation

As an approved participant,
I want to cancel my registration via a link in my ticket before the event's cancellation deadline,
So that I can release my slot for other participants if I can no longer attend.

**Acceptance Criteria:**

**Given** an approved participant clicks the cancellation link in their ticket,
**When** `POST /api/registrations/:id/cancel` is called with the cancellation token,
**Then** the registration status is updated to `cancelled`, the slot is released (capacity count decremented), and the waitlist auto-promotion is triggered

**Given** the event's cancellation deadline has passed,
**When** the self-cancellation link is clicked,
**Then** the endpoint returns HTTP 403 with a message "Cancellation deadline has passed" and the link in the ticket is shown as deactivated (FR30)

**Given** a self-cancellation is processed,
**Then** a `registration.self-cancelled` audit entry is written with `actor_id = registrationId` and `cancellation_type = 'self'`

---

## Epic 7: Event-Day Check-in (Offline-First PWA)

Staff can run seamless event-day check-in via QR scan, OTP identity recovery, name search, and manual override — fully offline-resilient with automatic sync on reconnect and real-time attendance monitoring for admins.

> **Phase 1 (FE):** PWA install prompt (designed banner, not browser default); QR scanner UI (`html5-qrcode`); scan result screen (success/already-attended/invalid/wrong-event states); offline indicator + queue counter badge; sync status toast with conflict summary; OTP input flow; name search + manual override form; live attendance monitor chart (polling) — all wired to MSW scan handler (MOCK_INVALID / MOCK_ALREADY test tokens)
> **Phase 2 (BE):** `POST /api/scan/verify`, registration status → `attended` write, `POST /api/scan/otp/request|verify`, OTP Redis storage + expiry + rate limit (NFR-S4/S5), `GET /api/events/:id/participants` (offline cache endpoint), `GET /api/events/:id/attendance` (live monitor SSE or polling), all scan repositories, audit trail writes

### Story 7.1: PWA Installation & Offline Participant Data Sync

As a staff member,
I want to install the check-in app on my tablet and download the participant list before the event,
So that I can perform check-in even when the venue WiFi is unreliable.

**Acceptance Criteria:**

**Given** Chrome on Android opens `/scan`,
**When** the PWA install prompt appears,
**Then** the app meets Chrome PWA installability criteria: valid web manifest, registered Service Worker, served over HTTPS (NFR-PWA1)

**Given** the browser `beforeinstallprompt` event fires,
**When** the `/scan` page is loaded for the first time,
**Then** a designed install banner is shown at the bottom of the screen (not the browser default mini-infobar) with: app icon, "Install Yorindo Check-in" label, and "Install" + "Not Now" buttons; clicking "Install" calls `promptEvent.prompt()` and dismisses the banner; "Not Now" dismisses for the session

**Given** the PWA is installed,
**When** it requests persistent storage,
**Then** the browser grants persistent storage permission — preventing eviction of IndexedDB data during the event (NFR-PWA2)

**Given** the app is opened before the event,
**When** `GET /api/events/:id/participants` is called,
**Then** up to 300 participant records are downloaded and cached in IndexedDB within 30 seconds on WiFi (NFR-P4)

**Given** the participant cache exists and the network is restored,
**When** the server-side version token has changed,
**Then** the full participant list is re-downloaded and the cache is invalidated (NFR-PWA3)

---

### Story 7.2: QR Code Scan Check-in (Online Mode)

As a staff member,
I want to scan a participant's QR code ticket and confirm their check-in in under 2 seconds,
So that the check-in queue moves quickly and participants feel welcomed.

**Acceptance Criteria:**

**Given** the camera is active on the `/scan` page,
**When** a valid ticket QR code is scanned,
**Then** `POST /api/scan/verify` is called with `{ token }` and a success confirmation (participant name + green indicator) is displayed within 2 seconds (NFR-P5)

**Given** the ticket belongs to a different event,
**When** `POST /api/scan/verify` is called,
**Then** it returns `{ error: { code: 'WRONG_EVENT' } }` and the UI displays "Tiket bukan untuk event ini" without exposing cross-event registration details (FR38)

**Given** the ticket has already been scanned (status = 'attended'),
**When** `POST /api/scan/verify` is called,
**Then** it returns `{ alreadyAttended: true, attendedAt }` and the UI displays an already-checked-in warning

**Given** an invalid or expired token is scanned,
**When** `POST /api/scan/verify` is called,
**Then** it returns HTTP 401 and the UI displays a clear invalid ticket error in Indonesian

**Given** a successful scan,
**Then** `registrations.status` is updated to `'attended'` and a `checkin.scan` audit entry is written

**MSW Test Tokens (for manual and automated testing of scan states):**
- `MOCK_INVALID` → 401 invalid/expired token response
- `MOCK_ALREADY` → 200 `{ alreadyAttended: true, attendedAt }` response
- Any other string → 200 success with seeded attendee profile

---

### Story 7.3: Offline Check-in Queue & Background Sync

As a staff member,
I want to continue scanning QR codes when offline, with scans automatically synced when connectivity is restored,
So that no attendance record is lost due to network issues during the event.

**Acceptance Criteria:**

**Given** the device has no network connectivity,
**When** a QR code is scanned,
**Then** the scan token is written to IndexedDB via `queueScan()` within 1 second (NFR-P6) and a success confirmation is displayed (optimistic UI)

**Given** offline scans are stored in IndexedDB,
**When** the device's `navigator.onLine` changes to `true`,
**Then** `flushScanQueue()` is called automatically and all pending scans are submitted to `POST /api/scan/verify`

**Given** the sync runs and a queued scan conflicts (participant already attended),
**When** the conflict is detected,
**Then** the conflict is surfaced in a post-sync summary showing: participant name, timestamp of original offline scan, and timestamp of the earlier attended record; the UI displays a toast "X conflict(s) detected after sync — tap to review" with a dismissible detail list (NFR-DI5)

**Given** the app is closed and reopened after offline scanning,
**When** the app reloads,
**Then** IndexedDB data persists and unsynced scans are still in the queue — browser storage eviction does not occur (NFR-R5, NFR-PWA2)

**Given** sync completes,
**Then** background sync completion occurs within 60 seconds of network restoration (NFR-R6)

**MSW Test Tokens (for testing offline-to-online sync conflict scenarios):**
- Use `MOCK_ALREADY` as the queued scan token to simulate a conflict response on flush
- Use any other string to simulate a successful flush with attendee profile

---

### Story 7.4: OTP-Based Identity Recovery

As a staff member,
I want to initiate OTP verification for a participant who cannot present their QR ticket,
So that legitimate attendees are not turned away due to a lost or inaccessible ticket.

**Acceptance Criteria:**

**Given** a participant cannot show their QR code,
**When** I tap "OTP Recovery" and enter the participant's phone number,
**Then** `POST /api/scan/otp/request` is called and an OTP is sent to the participant's registered phone via the event channel

**Given** the OTP delivery,
**When** the message is sent,
**Then** delivery occurs within 30 seconds (NFR-P9) and the OTP is single-use with a 5-minute expiry (NFR-S4)

**Given** the OTP request is made for the same phone number 4 times in 10 minutes,
**When** the 4th request is made,
**Then** it returns HTTP 429 — OTP rate-limited at 3 requests per phone per 10 minutes (NFR-S5)

**Given** the participant provides the correct OTP,
**When** `POST /api/scan/otp/verify` is called with `{ phone, otp }`,
**Then** their registration is marked `attended` and the success check-in screen is shown; OTP is invalidated immediately

---

### Story 7.5: Name Search & Manual Override Check-in

As a staff member,
I want to search for participants by name and perform a manual check-in with a logged override reason,
So that I can handle edge cases where neither QR nor OTP is available.

**Acceptance Criteria:**

**Given** I type a participant's name in the search field,
**When** `GET /api/events/:id/participants?name={query}` is called,
**Then** matching participants are returned within 500ms; results update as I type (debounced)

**Given** I select a participant from search results,
**When** I tap "Manual Check-in",
**Then** a confirmation dialog appears requiring me to enter an override reason before proceeding

**Given** I confirm the manual check-in with a reason,
**When** `POST /api/scan/manual-checkin` is called with `{ registrationId, reason }`,
**Then** the registration is marked `attended` and a `checkin.manual-override` audit entry is written with `{ actor_id (staff), reason, timestamp }`

**Given** a manual check-in is attempted while offline,
**When** the override is confirmed,
**Then** it is stored in IndexedDB with the reason and synced when connectivity restores

---

### Story 7.6: Real-Time Attendance Monitor (Admin Dashboard)

As an admin,
I want to see live check-in progress, queue status, and attendance count during the event,
So that I can make real-time decisions about staffing and capacity.

**Acceptance Criteria:**

**Given** an event is `live` and I am on the event detail page (`/admin/events/:id`),
**When** the page renders,
**Then** `GET /api/events/:id/attendance-stats` is polled every 5 seconds and the dashboard shows: total approved, attended count, attendance rate %, and a live check-in activity feed

**Given** the attendance stats update,
**When** the poll response arrives,
**Then** the numbers update without a full page reload — only the stats section re-renders

**Given** the live attendance counter,
**When** 5 concurrent check-in devices are scanning simultaneously,
**Then** the attendance count remains accurate within 1 polling interval (no double-counting due to DB-level unique constraint)

**Given** the event ends (status → `completed`),
**When** the page is viewed,
**Then** polling stops automatically and the final attendance stats are frozen

---

## Epic 8: Analytics, Reporting & YoriMind

Admin can access AI-powered event performance insights via the YoriMind panel with funnel charts and demographic breakdowns; vendors can securely download post-event reports via time-limited magic links with mandatory DPA acceptance.

> **Phase 1 (FE):** Post-event report page (attendance funnel chart via Recharts, demographic breakdowns, metric cards); vendor magic link landing page + DPA acceptance gate; analytics dashboard (filters, date range, export buttons); YoriMind panel (analysis text, root causes, recommendations table, "Refresh Insights" button, skeleton during 1200ms load); PDF + Excel download buttons — all wired to MSW yorimind/report handlers
> **Phase 2 (BE):** Report generation BullMQ job (triggered on event completion), `GET /api/events/:id/report`, vendor magic link generation + 7-day expiry + download-force header (NFR-S12), DPA acceptance endpoint, `GET /api/events/:id/yorimind` (node-cron + Redis TTL + Claude Sonnet API), `GET /api/events/:id/report/download?format=xlsx|pdf` (xlsx + pdfkit), access logging (NFR-S13, NFR-S16)

### Story 8.1: Post-Event Attendance Report Generation

As an admin,
I want a comprehensive attendance report automatically generated when an event completes,
So that I have an accurate record of event performance without manual data compilation.

**Acceptance Criteria:**

**Given** an event transitions to `status: 'completed'`,
**When** the state change is processed,
**Then** a BullMQ job is enqueued to generate the attendance report asynchronously

**Given** the report generation job runs,
**When** complete,
**Then** the report includes: total invited, registered, approved, attended, attendance rate, no-show rate, and demographic breakdowns by industry, job title, and city (FR43)

**Given** the report is generated,
**When** `GET /api/events/:id/report` is called by admin,
**Then** it returns the report data within 10 minutes of event completion (NFR-P7)

**Given** a super admin calls `POST /api/events/:id/report/regenerate`,
**When** the request is processed,
**Then** a new report generation job is enqueued and the existing report is replaced when complete (FR46)

---

### Story 8.2: Vendor Report Access via Magic Link & DPA

As a vendor/client,
I want to access the event report via a time-limited link without creating an account, after accepting the data processing agreement,
So that I receive the participant insights I was promised without the friction of platform registration.

**Acceptance Criteria:**

**Given** a super admin configures the vendor contact and report tier for an event,
**When** `POST /api/events/:id/vendor-link` is called,
**Then** a time-limited signed URL is generated (max 7-day expiry) and delivered to the configured vendor email (FR41, NFR-S12)

**Given** the vendor opens the magic link,
**When** they access the report page,
**Then** they are shown the current DPA version and must click "Accept" before the report content is visible (FR44)

**Given** the vendor accepts the DPA and downloads the report,
**When** the download is triggered,
**Then** the request is logged: IP address, timestamp, user agent stored in `audit_logs` for UU PDP compliance (NFR-S13)

**Given** the magic link has expired (> 7 days),
**When** it is accessed,
**Then** HTTP 403 is returned with a message to contact Yorindo for a new link

**Given** the DPA version changes after the vendor's acceptance,
**When** the vendor accesses the report again,
**Then** they must re-accept the new DPA version before viewing (FR44)

---

### Story 8.3: Analytics Dashboard — Funnel & Demographics

As an admin,
I want to view a visual analytics dashboard with registration funnel and participant demographic breakdowns,
So that I can understand event performance and participant composition at a glance.

**Acceptance Criteria:**

**Given** I am on the event detail page (`/admin/events/:id`),
**When** the analytics section renders,
**Then** a Recharts funnel chart shows: Invited → Registered → Approved → Attended with conversion rates between each stage

**Given** the analytics dashboard,
**When** the demographic section renders,
**Then** a Recharts pie/bar chart shows participant breakdown by industry, a city distribution map, and job title level breakdown

**Given** the analytics data,
**When** `GET /api/events/:id/analytics` is called,
**Then** the response is returned within 2 seconds (NFR-P3) and includes all funnel + demographic data in a single payload

**Given** multiple events are active simultaneously (≥ 5),
**When** admin loads any event's analytics dashboard,
**Then** load time remains ≤ 2 seconds (NFR-SC2)

---

### Story 8.4: YoriMind AI Analysis Panel

As an admin,
I want to view AI-generated insights about event performance with specific root causes and actionable recommendations,
So that I can improve future events based on data-driven intelligence rather than intuition.

**Acceptance Criteria:**

**Given** the daily cron runs at 02:00 WIB,
**When** `snapshot.service.ts` executes,
**Then** a JSON snapshot is generated for each event with `{ event, funnel_data, historical_comparison, attendee_segments }` and saved to `$SNAPSHOT_DIR/event_{id}_{date}.json`

**Given** I open `/admin/events/:id/yorimind`,
**When** `GET /api/events/:id/yorimind` is called,
**Then** Redis is checked for key `yorimind:event:{id}`; on cache hit the cached response is returned immediately

**Given** a cache miss,
**When** the latest snapshot file is read,
**Then** `claude-sonnet-4-6` is called with the YoriMind system prompt and snapshot JSON as context; the response is cached in Redis with TTL 24h

**Given** the YoriMind response,
**When** it is displayed in the FE,
**Then** it shows: `analysis` (narrative), `root_causes` (bullet list), `recommendations` (action/impact/priority table), `summary`, and `tracked_metrics`

**Given** I click "Refresh Insights",
**When** the refresh is triggered,
**Then** the Redis cache key is invalidated and a fresh Claude API call is made; a loading state shows during the 1200ms+ response time

---

### Story 8.5: Report Download (PDF & Excel)

As a vendor or admin,
I want to download the event report in PDF and Excel formats,
So that I can share the data in standard business formats.

**Acceptance Criteria:**

**Given** the report page is accessed (vendor via magic link, admin via dashboard),
**When** "Download Excel" is clicked,
**Then** `GET /api/events/:id/report/download?format=xlsx` returns an `.xlsx` file with attendance data, demographics, and funnel metrics as separate sheets

**Given** "Download PDF" is clicked,
**When** the download is triggered,
**Then** `pdfkit` generates a PDF report with formatted text sections and tabular data; the file downloads without browser rendering (triggers file download, not page navigation) (NFR-S12)

**Given** the report download,
**When** the file is generated,
**Then** the download triggers a `report.downloaded` audit entry with `{ actor_type: 'vendor'|'admin', event_id, format, ip_address }`

---

## Epic 9: Participant Data Rights & UU PDP Compliance

Participants can exercise their UU PDP data rights — requesting a copy of their stored data, requesting erasure with full anonymization and permanent suppression, and understanding the clear distinction between registration cancellation and data erasure.

> **Phase 1 (FE):** Data request form (phone + email input, confirmation screen, "your request has been submitted" state); erasure request form with two-step confirmation ("I understand this permanently removes my identity"); erasure vs. cancellation explanation page (clear UX copy in Indonesian) — all wired to MSW with stub 202 responses
> **Phase 2 (BE):** `POST /api/participants/data-request` (lookup + export job), `POST /api/participants/erasure-request` (queue anonymization job), anonymization service (per-table rules from Story 9.2 ACs), permanent suppression enforcement, audit trail writes (NFR-S16)

### Story 9.1: Participant Data Request (Copy of Stored Data)

As a participant,
I want to request a copy of all personal data Yorindo holds about me,
So that I can exercise my right to data portability under UU PDP Art. 28.

**Acceptance Criteria:**

**Given** a participant submits a data request with their phone number and email,
**When** `POST /api/participants/data-request` is called (no login required),
**Then** the system looks up all data linked to that phone/email and queues a data export job; a confirmation message is shown

**Given** the data export job completes,
**When** the participant receives a link,
**Then** the link delivers a JSON/PDF export containing: contact record, all registration records, all survey responses linked to their registrations, consent records, and audit trail entries where they are the subject

**Given** the data request,
**Then** a `data-request.submitted` audit entry is written and the request is logged for UU PDP accountability (NFR-S16)

---

### Story 9.2: Participant Data Erasure & Anonymization

As a participant,
I want to request erasure of my personal data, resulting in anonymization of my records and permanent opt-out from future communications,
So that I can exercise my right to erasure under UU PDP Art. 35.

**Acceptance Criteria:**

**Given** a participant submits an erasure request with phone and email verification,
**When** `POST /api/participants/erasure-request` is called,
**Then** the request is validated and an erasure job is queued; a confirmation of the pending erasure is returned

**Given** the erasure job runs,
**When** processing completes,
**Then** anonymization is applied per table as follows:
- **`contacts`:** `name = 'ANONYMIZED'`, `phone = sha256(original_phone)`, `email = null`, `company = null`, `job_title_id = null` — row retained
- **`registrations`:** all registration rows for this contact remain; `contact_id` FK is preserved (points to anonymized contact); no data removed
- **`audit_logs`:** immutable — not modified; `actor_id`/`target_id` remain for structural integrity
- **`consent_records`:** `consent_status` set to `'suppressed'`; purpose field nulled
The record structure is preserved in all tables for historical integrity (FR57, NFR-DI4)

**Given** the erasure is complete,
**When** the contact's phone is used in any future ETL import or registration,
**Then** the system detects the hash match, does NOT re-create the contact profile, and enforces the permanent suppression flag

**Given** the erasure completes,
**Then** the contact's `consent_status` is set to `'suppressed'` permanently; a `data-erasure.completed` audit entry is written

---

### Story 9.3: Erasure vs. Cancellation Distinction & Suppression Clarity

As an admin,
I want clear system-level distinction between registration cancellation (status change only) and data erasure (anonymization + suppression),
So that historical event data remains structurally intact while fully respecting participant erasure requests.

**Acceptance Criteria:**

**Given** a registration is cancelled (self-cancel or admin action),
**When** the cancellation is processed,
**Then** `registrations.status` changes to `'cancelled'` but all registration history, contact record, and audit trail entries remain fully intact and queryable (FR58)

**Given** a data erasure is completed for a participant,
**When** `GET /api/events/:id/registrations` is called by admin,
**Then** the registration record still appears in historical reports but all PII fields show as `'ANONYMIZED'` — attendance stats are not retroactively altered (NFR-DI4)

**Given** the distinction is presented to a participant requesting erasure via the unsubscribe/erasure flow,
**When** they choose "Erase my data" (vs. "Cancel registration"),
**Then** a clear explanation is shown: erasure removes your identity from our records permanently; cancellation only cancels your spot for this event

**Given** a suppressed contact's email or phone appears in any blast recipient query,
**When** the blast worker processes,
**Then** zero messages are sent to that contact — suppression is enforced at the worker level, not just the query level


---

## Epic 10: UI Design System & Mobile-Native Redesign

Adopt shadcn/ui (Radix primitives + Tailwind) as the project's design system (originally planned in architecture but not initialized), and redesign the three UX surfaces — Admin, Scan PWA, and Public — to deliver a mobile-native feel with consistent component usage.

> Phase 1 (FE only): All stories in this epic are frontend-only. No backend changes required.

### Story 10.1: shadcn/ui Foundation Setup

Initialize shadcn/ui CLI, configure CSS variable theming, install core components (Button, Input, Card, Badge, Select, Table, Dialog, Sheet, Sonner), and establish `src/lib/utils.ts` with `cn()` utility. Update Tailwind config to include shadcn theme extensions.

### Story 10.2: Admin Shell & Navigation Redesign

Replace hand-crafted nav and page layouts with shadcn Card, Table, Badge, Select, and Button components. Implement responsive sidebar (desktop) + bottom nav (mobile). Apply consistent spacing, typography, and color tokens across all 7 admin pages.

### Story 10.3: Scan PWA Mobile-Native Redesign

Redesign `/scan` as a full-screen mobile-native experience: bottom tab bar, full-screen QR camera viewfinder, Sonner-based scan result toasts (replacing inline result cards), Sheet drawer for event selection, large touch targets (≥44px), high-contrast scan states.

### Story 10.4: Public Pages Redesign

Redesign `/register/[eventSlug]` and `/data-rights/*` pages with mobile-first layouts, step-indicator for multi-step flows, shadcn Card for content sections, and trust-building visual hierarchy.
