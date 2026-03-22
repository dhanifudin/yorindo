# Requirements Inventory

## Functional Requirements

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
FR34: Staff can verify a participant's identity using their KTP (national physical ID card) — staff reads the name from the KTP, searches the participant list by name, confirms the match, and manually approves check-in with a logged reason
FR35: Staff can search for participants by name to perform manual check-in
FR36: Staff can manually check in a participant with a logged override reason and staff identity record
FR37: Staff can perform all check-in actions (QR scan, KTP name search, manual override) without network connectivity; records synced automatically on reconnect via Background Sync API
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

## NonFunctional Requirements

**Performance:**
NFR-P1: Registration page FCP ≤ 3 seconds on 4G (10 Mbps), cold load, Android Chrome
NFR-P2: Registration form submission → confirmation received ≤ 60 seconds end-to-end (includes async queue processing)
NFR-P3: Admin dashboard initial load ≤ 2 seconds on desktop broadband
NFR-P4: Check-in PWA participant list sync ≤ 30 seconds for 300 participants on WiFi
NFR-P5: QR/barcode scan → confirmation (online mode) ≤ 2 seconds full round-trip including server write
NFR-P6: QR/barcode scan → confirmation (offline mode) ≤ 1 second (IndexedDB lookup only)
NFR-P7: Post-event report generation ≤ 10 minutes (async background job)
NFR-P8: Vendor magic link report delivery ≤ 24 hours after event completion
NFR-P9: ~~OTP delivery ≤ 30 seconds~~ — _Superseded: OTP identity recovery replaced by KTP manual verification (FR34 updated). NFR-P9 is void._
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
NFR-S4: ~~OTP codes are single-use, expire after 5 minutes~~ — _Superseded: OTP replaced by KTP manual verification (FR34 updated). NFR-S4 is void._
NFR-S5: ~~OTP requests rate-limited to maximum 3 per phone number per 10-minute window~~ — _Superseded: OTP removed. NFR-S5 is void._
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

## Additional Requirements

**From Architecture — Implementation Impact:**

- **OpenAPI 3.0 Spec (Sprint 0 gate):** OpenAPI spec must be written and approved by both FE and BE tech leads before any feature code is written. This is a hard gate — both teams blocked without it. Spec lives in `yorindo-api/openapi.yaml`. MSW handlers in `yorindo-app/src/mocks/` are generated from or validated against this spec.

- **Tech Stack — Authoritative:** **Next.js 14 App Router** (FE) + **Fastify + TypeScript** (BE). This is the canonical stack per Architecture.md and Epics. The PRD document references an earlier draft stack (Vite+React+Express) — **disregard PRD tech stack section; Architecture.md + Epics are source of truth.**

- **Starter Template — Two Repos:**
  - `yorindo-api`: `mkdir yorindo-api && cd yorindo-api && npm init -y && npm install fastify @fastify/cors @fastify/helmet @fastify/rate-limit @fastify/cookie @fastify/multipart pg mongodb bullmq ioredis zod dotenv pino pino-http jsonwebtoken bcrypt xlsx node-cron qrcode && npm install -D typescript tsx vitest @vitest/coverage-v8 @types/pg @types/node @types/jsonwebtoken @types/bcrypt @types/node-cron @types/qrcode && npx tsc --init`
  - **AI provider SDKs are installed per `*_AI_PROVIDER` env var selection** — do NOT install all at scaffold time. Add the relevant SDK only when implementing the real adapter (Phase 2): `openai` for OpenAI, `@anthropic-ai/sdk` for Anthropic, etc. Never import AI SDKs directly in route handlers — always via the service adapter.
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

- **AI Provider Abstraction — MANDATORY:** All AI calls go through service adapter interfaces. Concrete provider is selected at runtime via env vars:
  - `ETL_AI_PROVIDER` — controls `IEtlNormalizationService` implementation (`openai` | `anthropic` | `google` | custom)
  - `YORIMIND_AI_PROVIDER` — controls `IYoriMindService` implementation
  - `SMART_FILTER_AI_PROVIDER` — controls `ISmartFilterService` implementation
  - Default (Phase 1/testing): all resolve to `MockEtlNormalizationService`, `MockYoriMindService`, `MockSmartFilterService`
  - Provider SDK packages are installed only when implementing the real adapter — never at scaffold time
  - `ISmartFilterService` interface added to `src/interfaces/services/` (alongside existing AI service interfaces)

- **Three Zustand Stores (FE — do not add more without review):** `authStore`, `eventStore`, `filterStore`

- **TanStack Table v8 — server-side (manual) mode:** All tables with >1K potential rows. Client-side pagination forbidden. Pagination API: `?page=&pageSize=&sortBy=&sortDir=`

- **BullMQ — four named queues:** `otp` (highest priority) > `emergency-blast` > `transactional` > `marketing`. Workers started from `main.ts` in same Node process as API server (MVP). _(Updated per PRD §Queue Architecture — supersedes prior "two queues" note)_

- **YoriMind pattern:** node-cron daily 02:00 WIB → VPS filesystem snapshot → Redis cache TTL 24h → `IYoriMindService.analyzeEvent(snapshot)` on cache miss. Concrete AI provider resolved from `YORIMIND_AI_PROVIDER` env var via `container.ts`. Never call any AI SDK directly from `yorimind.service.ts`.

- **Custom JWT auth:** Access token 15min (Zustand memory), refresh token 7d (httpOnly cookie). Token blacklist in Redis. Role resolved from DB on issue.

- **Roles:** `super_admin` (platform-wide — users, templates, vendor config, state overrides), `event_admin` (full control of assigned events), `staff` (assigned events via user_events — scan + check-in only), `vendor_client` (magic-link report access, no login), `participant` (self-service registration/data rights portal). _(Updated per PRD §Roles — supersedes prior 3-role definition; `super_admin`+`event_admin` replace prior `admin` umbrella)_

- **Offline scan:** next-pwa NetworkFirst for API, CacheFirst for static. IndexedDB via `idb`. `queueScan()` + `flushScanQueue()` on reconnect.

## UX Design Requirements

Two complete UX design specifications exist for this project:

1. **Event Pipeline Hub UX** — `_bmad-output/planning-artifacts/ux-event-pipeline.md`
   - Covers the 6-tab Event Pipeline Hub at `/app/events/:id` (Overview, Undangan, Registrasi, Konfirmasi, Check-in, Laporan)
   - Design direction: Command Bridge composite (A+D+E)
   - Defines 5 custom components: `<FunnelVisualization>`, `<BlockerStrip>`, `<BulkApproveBar>`, `<AiScoreBadge>`, `<ScanResultOverlay>`
   - Includes KTP-based manual check-in (replaces OTP for identity recovery — see FR34 note below)
   - Offline-first: Background Sync API, seamless automatic flush — no manual sync button

2. **General UX Design Specification** — `_bmad-output/planning-artifacts/ux-design-specification.md`
   - Covers broader app UX patterns, component library decisions, and design system

**FR34 Decision — Resolved (2026-03-22):** KTP manual verification adopted. FR34 and Story 7.4 updated to KTP-only flow. OTP endpoints removed from Epic 7 scope. NFR-P9, NFR-S4, NFR-S5 voided.

## FR Coverage Map

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
