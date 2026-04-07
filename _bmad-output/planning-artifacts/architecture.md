---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-03-19'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/prd-validation-report.md
  - _bmad-output/brainstorming/brainstorming-session-2026-03-18-001.md
  - docs/yorindo_system_design_v1_18 03 26.pdf
workflowType: 'architecture'
project_name: 'yorindo'
user_name: 'Dian'
date: '2026-03-19'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

> **Note:** Stack revised 2026-03-19 to align with System Design Document (Yolanda Roring, KADA Program v1.0 March 2026). All prior Express/Vite/MongoDB-only decisions superseded.
> **Note:** Deployment simplified 2026-03-19 — all infrastructure self-hosted via Docker Compose on VPS. External services: Everpro (WhatsApp) and Brevo (email) only. Supabase, Railway, Upstash, Atlas, Cloudflare, Sentry, Uptime Robot removed.
> **Reconciliation note (2026-03-27):** The authoritative implementation model is OpenAPI contract-first, Next.js 16 + Fastify + TypeScript, PostgreSQL + JSONB as the planning default persistent store, RBAC with `admin`, `viewer`, `staff`, and `participant`, `/app/*` for internal dashboards, and KTP-based manual identity verification for lost-ticket recovery. Any older references below should be interpreted through this reconciled model.

## Reconciled Decisions (Authoritative)

Use this section as the source of truth when any lower section or historical example disagrees.

- Contract: `openapi.yaml` is the sprint gate; shared TypeScript types are derived from the approved OpenAPI contract rather than replacing it.
- Stack: `yorindo-app` uses Next.js 16 App Router; `yorindo-api` uses Fastify + TypeScript.
- Roles: dashboard/product access uses `admin`, `viewer`, `staff`, and `participant`, with route and capability restrictions applied per role.
- Routes: internal product workspace lives under `/app/*`; check-in remains under `/scan`; public registration remains under `/register/*`.
- Check-in recovery: lost-ticket handling uses cached participant lookup plus KTP-assisted manual verification; OTP is not part of the event-day recovery flow.
- Data planning default: PostgreSQL plus JSONB is the canonical planning model for operational data; legacy Mongo-oriented examples lower in the file are retained only as historical implementation notes.

## Historical Appendix Status

Detailed scaffolds, schema sketches, and older route or storage examples later in this file are preserved for traceability, but they are non-normative wherever they conflict with the reconciled decisions above.

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
Four major capability areas forming a closed operational cycle:

- **F1 — Contact Database:** ETL pipeline from Excel/CSV upload → GPT-4o normalization → admin review → PostgreSQL contacts. 500K scalability target.
- **F2 — Event Registration:** Event creation, survey template builder (drag-drop), public registration form, approval/rejection workflow, QR ticket generation and delivery via email/WA.
- **F3 — Check-in PWA:** Camera-based QR scan surface (staff role), offline scan queue via IndexedDB, single-use JWT ticket validation, live attendance counter.
- **F4 — Analytics & YoriMind:** Daily snapshot cron → VPS filesystem → Claude API analysis → admin dashboard with funnel charts, attendee distribution, YoriMind AI panel, PDF export.

Three UX surfaces: public participant registration (mobile-first, zero-account), admin dashboard (desktop-first), and check-in PWA (mobile-first, offline-resilient).

**Non-Functional Requirements (architecturally decisive):**
- Performance: FCP ≤ 3s on 4G; QR scan ≤ 2s; dashboard load ≤ 2s
- Reliability: 99.5% uptime; 100% event-day availability; 0 offline scan records lost
- Security: Custom JWT (15min access / 7d refresh httpOnly cookie); QR ticket JWT HS256 single-use; rate limit 10 submit/IP/hour on public registration
- Scalability: 500K contact records; ≥ 5 concurrent events; ≥ 500 simultaneous registration sessions; 30K-contact blast throughput
- Data Integrity: PostgreSQL + JSONB; immutable raw_uploads log; CUID2/opaque string primary keys throughout operational data

**Scale & Complexity:**
- Primary domain: Full-stack web (Next.js PWA + Fastify REST API)
- Complexity level: High (3 AI integrations, hybrid DB, async ETL pipeline, offline PWA)
- Major architectural components: ~14

---

### Technology Stack (Definitive)

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Frontend framework | Next.js | 16 (App Router) | SSR + SSG + API Routes |
| Language | TypeScript | 5.x | Strict mode enabled; both repos |
| Styling | Tailwind CSS + shadcn/ui | 3.x + Radix | Design system + utility classes |
| PWA | serwist | 9.x | Turbopack-compatible service worker |
| State management | Zustand | 4.x | Lightweight, no Redux overhead |
| Form handling | React Hook Form + Zod | latest | Client + server validation |
| Dynamic form rendering | @rjsf/core + @rjsf/shadcn | latest | rjsf renders JSON Schema → participant registration form + admin survey preview; supported widgets: text, textarea, radio, select, checkboxes, range, date, time (mirrors Google Forms, excludes file upload) |
| QR generate | react-qr-code | latest | Encode JWT → QR image |
| QR scan | html5-qrcode | latest | Camera, cross-browser |
| Data tables | TanStack Table | 8.x | Server-side pagination, headless |
| Charts | Recharts | 2.x | TypeScript-friendly |
| Backend framework | Fastify | 4.x | Faster than Express, plugin ecosystem |
| Backend runtime | Node.js | 20 LTS | LTS, Docker-compatible |
| DB query (SQL) | node-postgres (pg) | latest | Direct SQL, no ORM; JSONB columns for schema/response storage |
| ID generation | @paralleldrive/cuid2 | latest | CUID2 primary keys — collision-resistant, URL-safe, ~24 chars, no hyphens |
| Queue | BullMQ | 3.x | Redis-backed, reliable job processing |
| Validation | Zod | 3.x | Runtime type safety, schema inference |
| Auth | jsonwebtoken + bcrypt | latest | Custom JWT, HS256, httpOnly cookie refresh |
| API mocking | MSW + @faker-js/faker | latest | Dev/test only; swap to real API via env var |
| IndexedDB | idb | latest | Offline scan queue for PWA |
| Testing | Vitest + Testing Library | latest | Fast feedback for React and Next.js components |
| Containerization | Docker + Compose | latest | Dev environment only |
| AI — ETL | `IEtlNormalizationService` adapter | configured via `ETL_AI_PROVIDER` | Contact normalization & classification; swap provider without code change |
| AI — Analytics | `IYoriMindService` adapter | configured via `YORIMIND_AI_PROVIDER` | YoriMind event analysis; swap provider without code change |
| AI — Smart Filter | `ISmartFilterService` adapter | configured via `SMART_FILTER_AI_PROVIDER` | Industry autocomplete; swap provider without code change |

**Infrastructure:**

| Component | Tool / Service | Notes |
|---|---|---|
| App hosting | VPS (any provider) | Docker Compose on Linux |
| Reverse proxy / SSL | Nginx | SSL via Let's Encrypt/Certbot, static serving, API proxy |
| PostgreSQL | Docker (postgres:16-alpine) | VPS volume-mounted data; sole persistent store — relational tables + JSONB columns |
| Redis / Queue | Docker (redis:7-alpine) | AOF persistence enabled |
| File Storage | VPS filesystem | Docker volume; MinIO S3-compatible upgrade path |
| Email Blast | Brevo | External — REST API, 300 free/day |
| WA Blast | Everpro | External — WhatsApp Business API |
| CI/CD | GitHub Actions → SSH deploy | `docker compose pull && docker compose up -d` |

---

### Technical Constraints & Dependencies

1. **OpenAPI contract-first gate (two-team gate):** OpenAPI 3.0 is the shared source of truth before coding. Backend exposes the contract in `openapi.yaml`; frontend consumes generated or synchronized TypeScript types derived from that contract. Type drift = build error, and contract drift blocks feature work.

2. **VPS setup prerequisite:** VPS provisioned with Docker + Docker Compose installed. SSH key added to GitHub Actions secrets. `docker-compose.yml` and `.env` placed on VPS before Sprint 1 CI/CD is tested.

3. **Everpro WhatsApp Business API setup:** Pre-Sprint 0 business task (2–4 week lead time). Delays re-consent campaign, which blocks first production blast.

4. **Let's Encrypt / Nginx setup:** SSL certificate must be provisioned on VPS before public launch. Certbot with Nginx plugin. Auto-renewal via cron.

5. **Indonesian connectivity reality:** 4G dominant in tier-2/3 cities; event venue WiFi unreliable → check-in PWA scan queue must be offline-resilient via IndexedDB.

6. **Multi-timezone:** WIB (UTC+7), WITA (UTC+8), WIT (UTC+9) — all timestamps stored UTC; displayed in event-local timezone.

7. **Phone as primary identity:** UNIQUE constraint on `contacts.phone`. ETL normalizes to `+62XXXXXXXXXX` format; conflict on phone = upsert, not duplicate.

8. **CUID2 primary keys throughout PostgreSQL:** All tables generate IDs via `@paralleldrive/cuid2` (`createId()`). CUID2 is collision-resistant, URL-safe, ~24 chars, no hyphens. Generated in the application layer (not DB-side) — no `gen_random_uuid()` dependency. Enables DB merge without ID conflicts.

---

### Cross-Cutting Concerns

1. **TypeScript strict mode** — `"strict": true` in both repos' `tsconfig.json`. No `any` types. All API request/response bodies typed via Zod schemas inferred types.

2. **Repository pattern** — All persistent-store access lives exclusively in `repositories/` files. Services call repositories only; route handlers call services only. Never query the database directly from a route handler.

3. **Write Path vs Read Path** — Enforced at routing level. Write endpoints only accept mutations (INSERT/UPDATE). Read endpoints only execute SELECT. Claude AI (YoriMind) never queries live DB — reads daily snapshot JSON from VPS filesystem only.

4. **Custom JWT + RBAC** — Product roles are `admin`, `viewer`, `staff`, and `participant`. Access token: 15 minutes, HS256, payload `{ sub, role, jti }`. Refresh token: 7 days, stored in httpOnly cookie. Role enforcement: middleware checks JWT role before handler. Event-scoped enforcement applies to `staff` and `viewer` via `user_events`; `admin` bypasses event-scope checks unless a narrower deployment policy is introduced. Public registration endpoints remain unauthenticated and rate-limited.

5. **BullMQ async processing** — Two workers: `etl.worker.ts` (processes ETL jobs) and `blast.worker.ts` (sends email/WA with rate limiting for Brevo/Everpro). All heavy async work goes through BullMQ. API endpoints return `202 Accepted` for queued work.

6. **Redis always available** — Redis runs in Docker Compose on both dev and production. `REDIS_URL=redis://redis:6379` in compose network. BullMQ connects directly — no QUEUE_DRIVER abstraction needed. AOF persistence (`appendonly yes`) required in production compose.

7. **ETL pipeline** — 7-step process: upload → app upload storage (`/app/uploads/` in Docker, `uploads/` locally) → BullMQ job → GPT-4o batch normalization (50 rows/batch) → Zod validation → upsert valid to PostgreSQL → flagged records to `flagged_records` table. Temp file deleted after ETL job completes. Admin reviews flagged records at `/app/contacts/flagged`.

8. **YoriMind snapshot pattern** — Cron job at 02:00 WIB queries Core DB, generates JSON snapshot `{ event, funnel_data, historical_comparison, attendee_segments }`, saves to VPS filesystem at `/data/snapshots/event_{id}_{date}.json` (Docker volume `snapshots_data`). YoriMind reads latest snapshot (never live DB), calls Claude API, caches result in Redis with TTL 7 days. Cache key: `yorimind:event:{id}`. Invalidated manually via "Refresh Insights" action only — never auto-invalidated (snapshot data doesn't change until next cron run; AI output is deterministic for the same snapshot input).

15. **Redis read cache** — High-load read endpoints and AI analysis results are cached in Redis to avoid redundant DB aggregations and AI API calls. Cache-aside pattern: check Redis → on miss, query DB/AI → write to Redis → return. All cache writes use `SET key value EX ttl`. `filterHash` = stable SHA-1 of sorted serialized query params. Cache layer lives in the service layer only — never in route handlers.

    | Endpoint | Cache key | TTL | Invalidation trigger |
    |---|---|---|---|
    | `GET /api/events/:id/analytics` | `analytics:event:{id}:{filterHash}` | 5 min | Any registration status change for this event |
    | `GET /api/events/:id/report` | `report:event:{id}` | 24h | `report.regenerate` job completes |
    | `GET /api/events/:id/overview` | `overview:event:{id}` | 2 min | Any registration or blast update for this event |
    | `POST /api/events/:id/audience-preview` | `audience-preview:event:{id}:{filterHash}` | 10 min | New contact upsert or bulk ETL job completes |
    | `GET /api/events/:id/yorimind` | `yorimind:event:{id}` | 7 days | Manual "Refresh Insights" only |
    | `GET /api/dashboard/stats` | `dashboard:stats` | 2 min | Any event created/updated or contact upsert |
    | `GET /api/contacts/companies` | `contacts:companies:{filterHash}` | 5 min | Any contact upsert or ETL job completes |

    **Epic 10 endpoints (Admin Intelligence Dashboard):**
    - `GET /api/dashboard/stats` → `{ vendorStats: [{ vendorId, vendorName, eventCount }], totalCompanies: number, pendingRegistrations: number }`
    - `GET /api/contacts/companies?page&pageSize&industry&city` → `{ data: [{ company, industry, contactCount, eventsAttended, primaryCity }], pagination: { page, pageSize, total, totalPages } }`
    - `GET /api/contacts/facets` (extended) — adds `company: [{ name: string, count: number }]` to existing facets response

9. **QR ticket JWT** — HS256, `JWT_SECRET` (min 32 chars). Payload: `{ sub: registrationId, eventId, type: 'ticket', iat, exp: eventDate+1day }`. Single-use enforced by checking `registrations.status !== 'attended'` on scan. Backend generates token only when status changes to `'approved'`.

10. **JSONB for document storage** — Survey schemas (`events.survey_schema JSONB`), survey responses (`registrations.survey_responses JSONB`), and blast templates body (`templates.body JSONB`) are stored as JSONB columns in PostgreSQL. Standard SQL queries with JSONB operators (`->`, `->>`); no separate document store needed.

11. **CUID2 serialization** — CUID2 IDs are plain strings (~24 chars) returned as-is in all API responses. No type casting needed — `node-postgres` returns text columns as strings natively.

16. **Phase 1 memory-first contract** — Phase 1 builds entirely against in-memory storage; no real DB or external service connection required:

    | Layer | Phase 1 implementation | Swap to (Phase 2) |
    |---|---|---|
    | `yorindo-api` repositories | In-memory arrays (`REPOSITORY_IMPL=memory`) — seeded with deterministic fixture data | PostgreSQL via `node-postgres` |
    | `yorindo-api` services | Mock implementations (`SERVICE_IMPL=mock`) — no Brevo, Everpro, or AI calls | Real adapters keyed by `*_AI_PROVIDER` env vars |
    | `yorindo-app` API layer | MSW (`NEXT_PUBLIC_ENABLE_MOCKS=true`) intercepts all `fetch` calls — no network requests leave the browser | Real API at `NEXT_PUBLIC_API_URL` |
    | `yorindo-app` state | Zustand in-memory store — state resets on hard refresh in Phase 1; no `localStorage` persistence | Session persistence added in Growth Phase |

    The in-memory repos and MSW handlers are the authoritative Phase 1 data contracts. They must stay in sync with the API types in `yorindo-api/src/types/`. Any story that adds a new endpoint must add a corresponding MSW handler before the FE story is considered `done`.

12. **Multi-timezone handling** — UTC storage, event-timezone display; affects blast scheduling, deadline jobs, snapshot cron timing.

13. **Offline scan resilience** — next-pwa with NetworkFirst for API calls, CacheFirst for static assets. Scan queue stored in IndexedDB when offline. Sync to server on reconnect.

14. **Smart Filter AI** — Frontend: when admin types in industry filter box, debounce 500ms then call `POST /api/smart-filter/industry` with raw text. Backend calls claude-haiku-4-5-20251001 for canonical industry slug mapping. Fallback: if confidence < 0.6, return all industries as regular dropdown.

---

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web — two separate repos coordinated via TypeScript type definitions:

| Repo | Stack |
|---|---|
| `yorindo-api` | Fastify 4.x + TypeScript + Node.js 20 LTS |
| `yorindo-app` | Next.js 16 (App Router) + TypeScript |

TypeScript type definitions for shared API contracts live in `yorindo-api/src/types/` and are manually synced to `yorindo-app/src/types/api.ts` (or extracted to a shared package in Growth Phase). **Both teams must agree on those types because they are derived from the approved OpenAPI contract at MVP - OpenAPI remains the contract gate.**

---

### Backend Scaffold — `yorindo-api`

**Init command:**
```bash
mkdir yorindo-api && cd yorindo-api
npm init -y
npm install fastify @fastify/cors @fastify/helmet @fastify/rate-limit @fastify/cookie @fastify/multipart
npm install pg @paralleldrive/cuid2 bullmq ioredis zod dotenv pino pino-http
npm install jsonwebtoken bcrypt xlsx node-cron qrcode
npm install openai @anthropic-ai/sdk
npm install -D typescript tsx vitest @vitest/coverage-v8
npm install -D @types/pg @types/node @types/jsonwebtoken @types/bcrypt @types/node-cron @types/qrcode
npx tsc --init
```

**Key `tsconfig.json` settings:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

**`src/` structure:**
```
src/
  server.ts           ← Fastify app instance, plugin registration
  main.ts             ← Entry point, listen
  routes/             ← Fastify route handlers; one file per resource group
  repositories/       ← All DB access; one file per domain
  services/           ← Business logic; one file per domain
  workers/            ← BullMQ worker definitions
  lib/
    postgres.ts       ← Singleton pg Pool, connection string from env
    postgres.ts       ← Shared PostgreSQL pool, URL from env
    redis.ts          ← Singleton IORedis client for BullMQ + cache
    queue.ts          ← BullMQ Queue factory using lib/redis.ts
    storage.ts        ← Local filesystem read/write for snapshots + uploads
  types/              ← TypeScript interfaces for API request/response
  config/             ← All process.env access centralized; throws on missing
  middleware/         ← Auth middleware, role checks
```

**Architectural decisions this scaffold establishes:**
- Language: TypeScript strict mode
- Framework: Fastify (not Express — no `express` package ever)
- SQL: `pg` Pool, direct SQL queries (no ORM, no Prisma, no Knex)
- Database access: direct `pg` Pool usage through repositories
- Auth: Custom JWT via `jsonwebtoken`; bcrypt for password hashing; refresh token in httpOnly cookie
- Queue: BullMQ with IORedis (always Redis, no memory fallback)
- AI: OpenAI SDK for ETL, Anthropic SDK for YoriMind + Smart Filter

**`lib/redis.ts` — singleton IORedis client:**
```typescript
import IORedis from 'ioredis'
import { config } from '@/config'

export const redis = new IORedis(config.redisUrl, { maxRetriesPerRequest: null })
```

**`lib/queue.ts` — BullMQ factory:**
```typescript
import { Queue } from 'bullmq'
import { redis } from '@/lib/redis'

export function createQueue(name: string) {
  return new Queue(name, { connection: redis })
}

export const etlQueue = createQueue('etl')
export const blastQueue = createQueue('blast')
```
Redis runs in Docker Compose (`redis://redis:6379`) on both dev and production. No memory fallback needed.

**`src/config/index.ts` — centralized env (required):**
```typescript
function required(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  databaseUrl: required('DATABASE_URL'),
  redisUrl: required('REDIS_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET'),
  snapshotDir: process.env.SNAPSHOT_DIR || '/data/snapshots',
  openaiApiKey: required('OPENAI_API_KEY'),
  anthropicApiKey: required('ANTHROPIC_API_KEY'),
  brevoApiKey: required('BREVO_API_KEY'),
  everproApiKey: required('EVERPRO_API_KEY'),
}
```
No `process.env` access outside this file. Missing required vars throw at startup.

---

### Frontend Scaffold — `yorindo-app`

**Init command:**
```bash
npx create-next-app@16 yorindo-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

**Post-init setup:**
```bash
# 1. shadcn/ui — TypeScript mode (auto-detected)
npx shadcn@latest init

# 2. Zustand (state management)
npm install zustand

# 3. React Query (server state)
npm install @tanstack/react-query

# 4. React Hook Form + Zod
npm install react-hook-form @hookform/resolvers zod

# 5. QR generate
npm install react-qr-code

# 6. QR scan (camera, cross-browser)
npm install html5-qrcode

# 7. Charts
npm install recharts

# 8. TanStack Table — headless data table (server-side pagination mode)
npm install @tanstack/react-table

# 9. MSW (Mock Service Worker — FE develops independently of BE)
npm install msw --save-dev

# 10. Faker (realistic seed data for MSW handlers — dev only)
npm install @faker-js/faker --save-dev

# 11. idb (IndexedDB wrapper for offline scan queue)
npm install idb

# 11. next-pwa or Serwist (offline resilience for scan surface)
npm install next-pwa

# 12. Testing
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/user-event jsdom
```

**`src/` structure:**
```
src/
  app/
    (app)/                ← Internal pages (auth-gated)
      layout.tsx
      page.tsx            ← /app — dashboard
      contacts/
        page.tsx          ← /app/contacts
        upload/
          page.tsx        ← /app/contacts/upload
        flagged/
          page.tsx        ← /app/contacts/flagged
      events/
        page.tsx          ← /app/events
        [id]/
          page.tsx        ← /app/events/[id]
          builder/
            page.tsx      ← /app/events/[id]/builder
          report/
            page.tsx      ← /app/events/[id]/report
    register/
      [eventSlug]/
        page.tsx          ← /register/[eventSlug] — public
    scan/
      page.tsx            ← /scan — staff PWA
      result/
        [token]/
          page.tsx        ← /scan/result/[token]
    api/
      smart-filter/
        industry/
          route.ts        ← Smart Filter AI proxy
      health/
        route.ts
    globals.css
    layout.tsx
  components/
    ui/                   ← shadcn wrappers
    forms/                ← Form components
    features/             ← Feature-specific composites
  hooks/                  ← Custom React hooks
  store/
    authStore.ts          ← { accessToken, user: {id, role}, setAccessToken, clearAuth }
    eventStore.ts         ← { selectedEventId, setSelectedEvent }
    filterStore.ts        ← { serviceType, city, page, setFilter, resetFilter }
  lib/
    auth/                 ← JWT decode, token storage (Zustand), role checks
    offline/
      scanQueue.ts        ← idb-backed IndexedDB scan queue; queueScan(), flushScanQueue()
  types/
    api.ts                ← FE-owned API contract types; BE adopts when ready
  mocks/                  ← MSW — dev only, excluded from production build
    handlers/
      contacts.ts         ← GET /api/contacts (paginated, filterable, realistic data)
      events.ts           ← CRUD events + status transitions
      registrations.ts    ← approval flow, all status states
      auth.ts             ← login, refresh, logout stubs
      scan.ts             ← verify: success / already-attended / invalid states
      yorimind.ts         ← full AI output shape with realistic content
    browser.ts            ← MSW browser worker setup
    server.ts             ← MSW Node setup (for Vitest)
  components/
    dev/
      DevToolbar.tsx      ← Role switcher; rendered only when NODE_ENV=development
  utils/                  ← Pure utility functions
```

**`next.config.js` — PWA configuration:**
```js
const withPWA = require('next-pwa')({
  dest: 'public',
  runtimeCaching: [
    {
      urlPattern: /^\/api\//,
      handler: 'NetworkFirst',
      options: { cacheName: 'api-cache', networkTimeoutSeconds: 10 }
    },
    {
      urlPattern: /\.(js|css|png|jpg|ico|svg)$/,
      handler: 'CacheFirst',
      options: { cacheName: 'static-cache' }
    }
  ]
})
module.exports = withPWA({ /* next config */ })
```

**Architectural decisions this scaffold establishes:**
- Language: TypeScript strict mode
- Framework: Next.js 16 App Router (no Pages Router)
- Component library: shadcn/ui (Radix primitives + Tailwind, TypeScript mode)
- Global state: Zustand (admin UI state — selected events, filter state, etc.)
- Server state: React Query (API data fetching + caching)
- Forms: React Hook Form + Zod resolvers (client + server validation aligned)
- Data tables: TanStack Table v8 in **manual (server-side) mode** — Table owns display; React Query owns fetching. Contacts, registrations, flagged records all use this pattern. Client-side pagination forbidden for any table with >1K potential rows.
- Server-side pagination API contract: `?page=1&pageSize=50&sortBy=name&sortDir=asc&industry=&city=`
- QR generate: `react-qr-code` (ticket display in admin + delivery)
- QR scan: `html5-qrcode` (camera access, cross-browser PWA)
- Offline: next-pwa + `idb` + IndexedDB (scan queue during offline events)
- Auth: Custom JWT — access token in memory (Zustand), refresh token in httpOnly cookie via Fastify API
- API mocking: MSW (Mock Service Worker) — FE develops independently; BE pending. Swap to real API via `NEXT_PUBLIC_API_URL` env var. MSW removed in production build.
- Type ownership: FE team owns `src/types/api.ts` while BE is deciding. Types reflect agreed data shapes; BE adopts them when ready.
- Dev toolbar: role switcher component (`DevToolbar`) rendered only in `NODE_ENV=development` — toggles active internal role between `admin`, `viewer`, and `staff` in Zustand `authStore` without real login flow.

---

### CI Pipeline (GitHub Actions)

**Pipeline: lint → typecheck → test → build → deploy (main branch only)**

| Step | Action | Trigger | Output |
|---|---|---|---|
| 1. Lint & Type check | `eslint + tsc --noEmit` | Push all branches | Fail on type error |
| 2. Unit test | `vitest run` | Push all branches | Fail if tests fail |
| 3. Build images | `docker build` (api + app) | Push main only | Verify build not broken |
| 4. Push to registry | `docker push` to GHCR | Push main only | Images tagged with commit SHA |
| 5. SSH deploy | `ssh vps "docker compose pull && docker compose up -d"` | Push main only | Rolling restart |
| 6. Health check | `curl https://domain/api/health` | After deploy | Alert on failure |

**GitHub Actions secrets required:** `VPS_SSH_KEY`, `VPS_HOST`, `VPS_USER`, `GHCR_TOKEN`

---

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (block implementation):**
- Database strategy: PostgreSQL (self-hosted) with JSONB for dynamic survey, raw upload, and event-configuration payloads — fixed, see Appendix Decision Log
- Auth provider: Custom JWT (jsonwebtoken + bcrypt) — do not replace with Supabase Auth or Auth0
- Repository pattern: mandatory — zero DB queries outside `repositories/` files
- Opaque app-generated IDs: CUID2-style string primary keys on all PostgreSQL tables — no auto-increment
- QR ticket: HS256 JWT, single-use, expiry = eventDate + 1 day
- AI model assignments: GPT-4o for ETL, claude-sonnet-4-6 for YoriMind, claude-haiku-4-5-20251001 for Smart Filter — do not swap models

**Important Decisions (shape architecture):**
- Write Path vs Read Path separation at routing level
- Queue abstraction: QUEUE_DRIVER env switch (memory → redis upgrade path)
- YoriMind snapshot pattern: cron → Storage → Claude → Redis cache
- Real-time Live Monitor: polling every 5 seconds (not WebSocket at MVP)
- Hosting: VPS + Docker Compose (production and dev — same compose, dev uses override file)
- Logging: Pino (fastify-pino + pino-pretty)

**Deferred Decisions (post-MVP):**
- VPS → container orchestration (Kubernetes / ECS) when Docker Compose can't handle load
- PostgreSQL → managed RDS when VPS can't scale further (app-generated string IDs keep this zero-friction — update `DATABASE_URL` only)
- Read replica for analytics queries
- PDF export: `pdfkit` selected for BE-side report generation (lightweight, streaming, no Chromium); chart-in-PDF deferred to Sprint 3 — MVP exports text + table only; FE offers chart PNG download separately

---

### Data Architecture

**PostgreSQL-First Strategy — Which Data Goes Where:**

| Data Type | Engine | Reason |
|---|---|---|
| contacts, events, registrations | PostgreSQL (self-hosted) | Stable structure, UNIQUE constraints, ACID transactions, foreign keys |
| survey_schemas | PostgreSQL JSONB | Dynamic per event while staying in the primary operational store |
| survey_responses | PostgreSQL JSONB | Flexible answers without a second operational database |
| raw_uploads | PostgreSQL JSONB | Immutable ETL metadata and flagged row payloads in one store |
| flagged_records | PostgreSQL | Needs admin review workflow, status transitions |

**PostgreSQL Schema (authoritative — do not deviate):**

```sql
-- contacts
id          TEXT PRIMARY KEY
name        VARCHAR(200) NOT NULL
phone       VARCHAR(20) UNIQUE NOT NULL  -- normalized: +62XXXXXXXXXX
email       VARCHAR(200) UNIQUE
service_type TEXT
job_title   TEXT
city        VARCHAR(100)
company     VARCHAR(200)
source      VARCHAR(50)   -- 'excel_upload', 'form', 'manual'
created_at  TIMESTAMPTZ DEFAULT NOW()
updated_at  TIMESTAMPTZ DEFAULT NOW()
-- INDEX: service_type, city

-- events
id          TEXT PRIMARY KEY
name        VARCHAR(300) NOT NULL
slug        VARCHAR(150) UNIQUE NOT NULL
date        TIMESTAMPTZ NOT NULL
city        VARCHAR(100)
vendor_id   TEXT REFERENCES vendors(id)
survey_schema_id TEXT NULL REFERENCES survey_schemas(id)
status      event_status NOT NULL DEFAULT 'draft'
-- ENUM: draft, published, active, completed, cancelled
created_at  TIMESTAMPTZ DEFAULT NOW()

-- registrations
id          TEXT PRIMARY KEY
contact_id  TEXT REFERENCES contacts(id) ON DELETE CASCADE
event_id    TEXT REFERENCES events(id) ON DELETE CASCADE
status      reg_status NOT NULL DEFAULT 'pending'
-- ENUM: pending, approved, rejected, waitlisted, attended, cancelled
ticket_token TEXT  -- JWT, null until approved
approved_at  TIMESTAMPTZ
attended_at  TIMESTAMPTZ
created_at   TIMESTAMPTZ DEFAULT NOW()
UNIQUE(contact_id, event_id)  -- one registration per contact per event

-- vendors (event organizer / venue partner — admin managed)
id         TEXT PRIMARY KEY
name       VARCHAR(200) NOT NULL
contact    VARCHAR(200)   -- PIC name
phone      VARCHAR(20)
email      VARCHAR(200)
created_at TIMESTAMPTZ DEFAULT NOW()

-- users (internal Yorindo team + assigned staff/viewer accounts)
id            TEXT PRIMARY KEY
email         VARCHAR(200) UNIQUE NOT NULL
password_hash VARCHAR(255) NOT NULL          -- bcrypt hash
role          VARCHAR(20) NOT NULL           -- 'admin' | 'staff' | 'viewer'
name          VARCHAR(200)
created_at    TIMESTAMPTZ DEFAULT NOW()
updated_at    TIMESTAMPTZ DEFAULT NOW()

-- audit_logs (INSERT only — never UPDATE or DELETE)
id          TEXT PRIMARY KEY
action      VARCHAR(100) NOT NULL   -- '{resource}.{verb}' e.g. 'registration.approved'
actor_id    TEXT REFERENCES users(id)
actor_role  VARCHAR(20) NOT NULL
target_id   TEXT                    -- opaque ID of the resource acted on
target_type VARCHAR(50) NOT NULL    -- 'registration', 'contact', 'event', etc.
event_id    TEXT REFERENCES events(id)  -- NULLABLE; not all actions are event-scoped
metadata    JSONB                   -- e.g. { previous_status: 'pending' }
created_at  TIMESTAMPTZ DEFAULT NOW()
-- INDEX on actor_id, event_id, target_id for audit queries

-- industries (lookup — admin managed, not auto-created by ETL)
id    TEXT PRIMARY KEY
name  VARCHAR(100) NOT NULL  -- 'Kesehatan', 'Manufaktur', 'Keuangan'
slug  VARCHAR(100) UNIQUE    -- 'kesehatan', 'manufaktur'

-- job_titles (lookup)
id    TEXT PRIMARY KEY
name  VARCHAR(150) NOT NULL
level VARCHAR(50)  -- 'C-Level', 'Director', 'Manager', 'Staff'
slug  VARCHAR(150) UNIQUE
```

**Dynamic-data tables (PostgreSQL JSONB shapes):**

```typescript
-- survey_schemas — one row per event version
{
  id: string,
  event_id: string,
  version: number,
  schema_json: {
    fields: Array<{
    key: string,
    label: string,
    type: 'dropdown' | 'text' | 'number' | 'radio',
    required: boolean,
    options?: string[]
    }>
  },
  created_at: timestamptz
}

-- survey_responses — one row per registration
{
  id: string,
  registration_id: string,
  event_id: string,
  answers_json: Record<string, unknown>,
  submitted_at: timestamptz
}

-- raw_uploads — immutable ETL metadata row
{
  id: string,
  filename: string,
  uploaded_by: string,
  uploaded_at: timestamptz,
  etl_job_id: string,
  row_count: number,
  status: 'processing' | 'completed' | 'failed',
  flagged_rows_json: Array<Record<string, unknown>>
}
```

**Cross-DB Join Rule:**
```typescript
// Correct — Application Layer join
const registrations = await registrationRepo.findByEvent(eventId)  // PostgreSQL
const surveyResponses = await surveyRepo.findByRegistrationIds(     // PostgreSQL JSONB
  registrations.map(r => r.id)
)

// Wrong — never attempt DB-level join across engines
```

**Indexes (PostgreSQL — required for NFR-SC1 ≤500ms):**
```sql
CREATE INDEX ON contacts(service_type);
CREATE INDEX ON contacts(city);
CREATE INDEX ON registrations(event_id, status);
CREATE INDEX ON registrations(contact_id);
```

**Indexes (dynamic-data tables — required):**
```javascript
db.survey_schemas.createIndex({ event_id: 1 })
db.survey_responses.createIndex({ registration_id: 1 })
db.survey_responses.createIndex({ event_id: 1 })
```

---

### Authentication & Security

**Custom JWT (HS256 — implemented in `yorindo-api`):**
- Access token: 15 minutes, HS256, payload `{ sub: userId, role, jti }`
- Refresh token: 7 days, stored in httpOnly cookie (`Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict`)
- User roles: `admin`, `staff`, `viewer` — stored in `users.role` PostgreSQL column; baked into JWT at login
- Token blacklist: Redis `SET jti:{jti} 1 EX {remaining_ttl}` — checked on every authenticated request
- Role check middleware: reads role from JWT claims; applied per-route, not globally

**Role Access Model:**

| Role | Who | Event Access | Surface Access |
|---|---|---|---|
| `admin` | Yorindo internal team | All events (no scope check) | All routes |
| `staff` | Check-in personnel | Assigned events only via `user_events` | `/scan` only |
| `viewer` | Vendor / client | Assigned events only via `user_events` | Read-only analytics + reports |
| _(public)_ | Participants | None | `/register/[slug]` only |

**`user_events` — event assignment table (PostgreSQL):**
```sql
user_events (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
  event_id    TEXT REFERENCES events(id) ON DELETE CASCADE,
  granted_by  TEXT REFERENCES users(id),
  granted_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
)
-- INDEX on user_id, event_id for fast middleware lookups
```
- `admin` assigns `staff` and `viewer` to events via this table
- One user can be assigned to multiple events (staff working multiple events over time)
- Revoking access = DELETE from `user_events`

**Event-scope middleware (`requireEventAccess`):**
```typescript
// middleware/requireEventAccess.ts
export async function requireEventAccess(req: FastifyRequest, reply: FastifyReply) {
  const { eventId } = req.params as { eventId: string }
  if (req.user.role === 'admin') return  // admin bypasses — sees all events

  const access = await userEventRepo.find(req.user.sub, eventId)
  if (!access) {
    reply.code(403).send({
      error: { code: 'EVENT_ACCESS_DENIED', message: 'No access to this event', details: [] }
    })
  }
}

// Usage on event-scoped routes:
fastify.get('/events/:eventId/yorimind',
  { preHandler: [requireAuth, requireRole('admin', 'viewer'), requireEventAccess] },
  handler
)

fastify.post('/scan/verify',
  { preHandler: [requireAuth, requireRole('admin', 'staff')] },
  // Note: scan/verify validates eventId from the JWT ticket payload — not route param
  // TicketService.verifyScan() checks staff's user_events assignment for that eventId
  handler
)
```

**Viewer-only routes (read-only, event-scoped):**
```
GET /api/events/:eventId/analytics      → requireRole('admin', 'viewer') + requireEventAccess
GET /api/events/:eventId/yorimind       → requireRole('admin', 'viewer') + requireEventAccess
GET /api/events/:eventId/registrations  → requireRole('admin', 'viewer') + requireEventAccess
```
Viewer cannot: POST, PATCH, DELETE anything. Cannot access `/app/contacts/upload`, `/app/contacts/flagged`, or `POST /api/blast`.

**Fastify auth middleware pattern:**
```typescript
// middleware/auth.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import jwt from 'jsonwebtoken'
import { redis } from '@/lib/redis'
import { config } from '@/config'

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) { reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Auth required', details: [] } }); return }
  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload
    const blacklisted = await redis.get(`jti:${payload.jti}`)
    if (blacklisted) { reply.code(401).send({ error: { code: 'TOKEN_REVOKED', message: 'Token revoked', details: [] } }); return }
    req.user = payload
  } catch {
    reply.code(401).send({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token', details: [] } })
  }
}

export function requireRole(...roles: string[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!roles.includes(req.user?.role)) {
      reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient role', details: [] } })
    }
  }
}
```

**QR Ticket Security:**
```typescript
// services/TicketService.ts
import jwt from 'jsonwebtoken'

export const TicketService = {
  generateToken(registrationId: string, eventId: string, eventDate: Date): string {
    const exp = new Date(eventDate)
    exp.setDate(exp.getDate() + 1)
    return jwt.sign(
      { sub: registrationId, eventId, type: 'ticket' },
      config.jwtSecret,
      { algorithm: 'HS256', expiresIn: Math.floor((exp.getTime() - Date.now()) / 1000) }
    )
  },

  async verifyScan(token: string, scannerId: string): Promise<ScanResult> {
    const payload = jwt.verify(token, config.jwtSecret) as TicketPayload
    if (payload.type !== 'ticket') throw new AppError('INVALID_TICKET', 400)
    const reg = await registrationRepo.findById(payload.sub)
    if (!reg) throw new AppError('REGISTRATION_NOT_FOUND', 404)
    if (reg.status === 'attended') return { alreadyAttended: true, attendedAt: reg.attended_at }
    if (reg.event_id !== payload.eventId) throw new AppError('EVENT_MISMATCH', 400)
    await registrationRepo.updateStatus(payload.sub, 'attended')
    return { alreadyAttended: false, registration: reg }
  }
}
```

**Public endpoint rate limiting:**
```typescript
// Registration form: 10 submit/IP/hour
fastify.post('/api/registrations', {
  config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
  handler: registrationHandler
})
```

**Secret Management (env vars — never commit):**

| Secret | Env Variable | Note |
|---|---|---|
| PostgreSQL | `DATABASE_URL` | `postgresql://user:pass@postgres:5432/yorindo` |
| Redis | `REDIS_URL` | `redis://redis:6379` (internal Docker network) |
| JWT signing | `JWT_SECRET` | Min 32 chars random, different dev/prod |
| JWT refresh secret | `JWT_REFRESH_SECRET` | Separate secret for refresh tokens |
| OpenAI | `OPENAI_API_KEY` | ETL pipeline GPT-4o |
| Anthropic | `ANTHROPIC_API_KEY` | YoriMind + Smart Filter |
| Brevo | `BREVO_API_KEY` | Email blast |
| Everpro | `EVERPRO_API_KEY` | WhatsApp blast |
| Snapshot path | `SNAPSHOT_DIR` | `/data/snapshots` (mapped to Docker volume) |

---

### API & Communication Patterns

**Write Path vs Read Path (enforced at routing level):**

| Path | Example Endpoint | Method | Caller |
|---|---|---|---|
| Write API | `POST /api/registrations` | INSERT | Public registration form |
| Write API | `PATCH /api/registrations/:id/status` | UPDATE | Admin approval |
| Write API | `POST /api/etl/upload` | Trigger ETL job | Admin upload Excel |
| Write API | `POST /api/blast` | Enqueue blast job | Admin send invitation |
| Read API | `GET /api/contacts?industry=&city=` | SELECT + filter | Admin dashboard |
| Read API | `GET /api/events/:id/analytics` | Aggregate query | Dashboard analytics |
| Read API | `GET /api/events/:id/yorimind` | Read snapshot | YoriMind dashboard |
| Scan API | `POST /api/scan/verify` | Verify JWT + update | Panitia PWA scan |

**Error response schema (all errors — never deviate):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": [{ "field": "phone", "message": "Required" }]
  }
}
```
Error codes: SCREAMING_SNAKE_CASE string constants in `src/errors/codes.ts`. `details` always present (empty array `[]` when not applicable — never omit).

**Fastify route handler pattern:**
```typescript
// routes/registrations.ts
export async function registrationRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: CreateRegistrationInput }>('/registrations', {
    schema: { body: CreateRegistrationSchema },
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
  }, async (req, reply) => {
    const registration = await registrationService.create(req.body)
    reply.code(201).send(registration)
  })

  fastify.patch<{ Params: { id: string }, Body: UpdateStatusInput }>(
    '/registrations/:id/status',
    { preHandler: [requireAuth, requireRole('admin')] },
    async (req, reply) => {
      const result = await registrationService.updateStatus(req.params.id, req.body.status, req.user)
      reply.send(result)
    }
  )
}
```

**Async processing pattern:**
All ETL, blast, and notification delivery are async via BullMQ. API endpoints return `202 Accepted`:
```json
{ "jobId": "etl:upload:1234", "status": "queued" }
```

**Real-time Live Monitor (Fase 3 — `/scan`):**
Polling every 5 seconds from client. Dashboard at `/app/events/[id]/check-in` polls `GET /api/events/:id/attendance-stats` every 5s during active event. SSE or WebSocket deferred to post-MVP.

---

### ETL Pipeline Detail

**7-step process (must be followed exactly):**

1. Admin uploads Excel/CSV at `/app/contacts/upload` → file saved to `/app/uploads/` in Docker (named volume `api_uploads`) via multipart upload
2. Upload triggers `POST /api/etl/upload` → BullMQ ETL job enqueued with `{ filePath, uploadedBy, uploadedAt }`
3. `etl.worker.ts` dequeues job, reads file from the `api_uploads` volume, parses to array of objects via `xlsx` library; deletes temp file after parsing
4. Send batch of 50 rows to GPT-4o with standard system prompt: normalize formats, map to lookup table slugs, output JSON array with `confidence` score per field
5. Validate GPT-4o response with Zod schema. If validation fails → retry batch (max 3 retries)
6. Records with confidence < 0.7 (any field) → insert to `flagged_records` table. Valid records → `ContactRepository.upsert()` to PostgreSQL (insert new or update existing by phone)
7. After all batches complete: generate ETL report, persist a `raw_uploads` row with JSONB metadata, notify admin

**ETL GPT-4o system prompt (do not change without architectural review):**
- Role: "Kamu adalah data cleaning agent untuk Yorindo Communication."
- Output: JSON array, each item `{ original_index, name, phone, email, service_type, job_title, city, confidence, flags[] }`
- Confidence: 0.0–1.0 per field; if < 0.7 anywhere, add to `flags[]`
- Phone: normalize to `+62XXXXXXXXXX`; if unable → flag `'invalid_phone'`
- Service type: normalize to a consistent label (e.g. "Teknologi", "Properti"); if unable to determine → `null`, confidence 0
- **Strict JSON output — no text outside JSON, no markdown code blocks**

---

### YoriMind — AI Analytics

**Cron + Snapshot + Cache pattern:**

1. Cron job 02:00 WIB: query Core DB (PostgreSQL + JSONB-backed dynamic tables), generate snapshot JSON per event
2. Snapshot structure: `{ event, funnel_data, historical_comparison, attendee_segments }`
3. Save snapshot to VPS filesystem: `$SNAPSHOT_DIR/event_{id}_{date}.json` (Docker `snapshots_data` volume)
4. Admin opens `/app/events/[id]/report` → frontend calls `GET /api/events/:id/yorimind`
5. Backend checks Redis cache for key `yorimind:event:{id}`. Cache hit → return cached JSON
6. Cache miss: read latest snapshot from VPS filesystem (`SNAPSHOT_DIR/event_{id}_{date}.json`) → call Claude API
7. Claude API call: system prompt defines YoriMind persona; input = snapshot JSON; model = `claude-sonnet-4-6`
8. Response format: `{ analysis: string, root_causes: string[], recommendations: [{ action, impact, priority }], summary: string, tracked_metrics: string[] }`
9. Cache result in Redis with TTL 24h (self-hosted `redis:6379`). Re-call Claude only if new snapshot generated.

**YoriMind system prompt identity (enforce in `services/YoriMindService.ts`):**
- UI name: "YoriMind — Yorindo Intelligence"
- Role: "Kamu adalah YoriMind, AI analitik milik Yorindo Communication. Tugasmu menganalisis data performa event B2B seminar teknologi dan memberikan rekomendasi konkret berbasis data."
- Tone: Profesional, singkat, actionable. Hindari jargon berlebihan. Rekomendasi harus spesifik (angka, segmen, waktu).

---

### Smart Filter AI (Frontend)

```typescript
// Triggered in admin contacts filter box — debounce 500ms
// app/api/smart-filter/industry/route.ts (Next.js API route)
export async function POST(req: Request) {
  const { query } = await req.json()
  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    messages: [{ role: 'user', content: `Map "${query}" to canonical industry slug. Return JSON: { matched_slug: string, confidence: number }` }]
  })
  const result = JSON.parse(response.content[0].text)
  if (result.confidence < 0.6) return Response.json({ fallback: true })
  return Response.json(result)
}
```

---

### Infrastructure & Deployment

**Docker Compose — Production (`docker-compose.yml`):**
```yaml
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro   # Let's Encrypt via Certbot
      - app_build:/usr/share/nginx/html:ro  # Next.js static export
    depends_on: [api, app]
    restart: unless-stopped

  api:
    build: ./yorindo-api
    expose: ["3000"]
    env_file: .env
    volumes:
      - snapshots_data:/data/snapshots
      - api_uploads:/app/uploads
    depends_on: [postgres, redis]
    restart: unless-stopped
    logging:
      driver: json-file
      options: { max-size: "50m", max-file: "5" }

  app:
    build: ./yorindo-app
    expose: ["3000"]
    env_file: .env
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    expose: ["5432"]
    environment:
      POSTGRES_DB: yorindo
      POSTGRES_USER: yorindo
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes: [postgres_data:/var/lib/postgresql/data]
    restart: unless-stopped
  redis:
    image: redis:7-alpine
    expose: ["6379"]
    command: redis-server --appendonly yes
    volumes: [redis_data:/data]
    restart: unless-stopped

volumes:
  postgres_data:
  mongo_data:
  redis_data:
  snapshots_data:
  api_uploads:
  app_build:
```

**Docker Compose — Development override (`docker-compose.dev.yml`):**
```yaml
services:
  api:
    volumes: [./yorindo-api:/app]   # hot reload
    environment:
      NODE_ENV: development

  app:
    volumes: [./yorindo-app:/app]   # hot reload
    environment:
      NODE_ENV: development

  postgres:
    ports: ["5432:5432"]   # expose to host for DB tools
  redis:
    ports: ["6379:6379"]
```
Dev: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`
Prod: `docker compose up -d`

**Dockerfile — Multi-Stage Production:**
```dockerfile
# Stage 1: deps
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --production

# Stage 2: builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci && npm run build

# Stage 3: runner (~120MB image)
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
USER yorindo
CMD ["node", "dist/main.js"]
```

**Production Deployment — VPS + Docker Compose:**
```
push to main → GitHub Actions lint+test+build+push → SSH to VPS → docker compose pull → docker compose up -d → health check
```
`.env` lives on VPS only. Never commit `.env`. `.env.example` committed with all keys, no values.

**WSL2 hot reload (required for dev):**
```json
// nodemon.json (yorindo-api)
{ "legacyWatch": true }
```
Without `legacyWatch: true`, file change detection silently fails on WSL2.

**Logging: Pino (Fastify built-in):**
```typescript
const fastify = Fastify({
  logger: {
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty' }
      : undefined  // JSON to stdout in prod → captured by Docker json-file logging driver
  }
})
```
Application audit logs stored in PostgreSQL `audit_logs` table — not in application logs.

**Migration Readiness (VPS → Larger Infrastructure Checklist):**

| Decision | V1 Implementation | Migration Effect |
|---|---|---|
| Opaque string primary keys | App-generated CUID2 IDs on all tables | No conflict merging DBs; RDS migration zero-friction |
| Env config total | All in `.env`, accessed via `config/index.ts` | Change `.env` only — code unchanged |
| Repository pattern | All queries in `repositories/` | Swap DB: update 3–5 files, no route changes |
| Local filesystem storage | Docker volume for snapshots + uploads | Swap to S3/MinIO: update `lib/storage.ts` only |
| Nginx from day 1 | Reverse proxy + SSL in compose | Add CDN in front: point CDN origin to Nginx IP, done |
| Redis with AOF | `appendonly yes` in compose | Scale Redis: update `REDIS_URL` env var only |

---

### Decision Impact Analysis

**Implementation Sequence (Sprint 1 → Sprint 2):**
1. `yorindo-api`: `docker-compose.yml` + PostgreSQL + Redis running locally
2. PostgreSQL: run schema migrations (contacts, events, registrations, users, lookup tables)
3. Auth: `users` table created, JWT middleware wired, login/refresh endpoints implemented
4. `yorindo-app`: scaffold + custom auth store (Zustand) + routing
5. Types: agree on API contract types in `types/` before any feature code
6. FE and BE develop against shared TypeScript types

**Cross-Component Dependencies:**
- ETL pipeline depends on: `api_uploads` Docker volume mounted at `/app/uploads`, BullMQ worker, GPT-4o API key, flagged_records table
- QR ticket generation depends on: JWT_SECRET, `registrations.status` → `'approved'` trigger
- YoriMind depends on: cron job, `snapshots_data` Docker volume, Anthropic API key, Redis cache
- Smart Filter depends on: Anthropic API key, industries lookup table populated
- Offline scan depends on: next-pwa config, html5-qrcode, IndexedDB scan queue implementation
- PWA scan depends on: `POST /api/scan/verify` returning attendee profile on success

---

## Implementation Patterns & Consistency Rules

**Critical conflict areas identified: 9 categories where AI agents will diverge without explicit rules.**

---

### Naming Patterns

**PostgreSQL Tables — snake_case plural:**
```sql
contacts        registrations       events
industries      job_titles          vendors
flagged_records audit_logs          raw_uploads_log
```

**PostgreSQL Column Names — snake_case:**
```sql
-- Correct
contact_id, event_id, created_at, updated_at, ticket_token, attended_at
-- Wrong
contactId, event_Id, createdAt
```

**Dynamic-data table names — snake_case:**
```
survey_schemas      survey_responses      raw_uploads
```

**JSON payload field names — snake_case (to match PostgreSQL convention):**
```typescript
// Correct — consistent with PostgreSQL
{ event_id, registration_id, submitted_at, created_at }
// Wrong
{ eventId, registrationId, submittedAt }
```

**API Endpoints — plural nouns, kebab-case multi-word, `/api/` prefix:**
```
GET    /api/contacts
GET    /api/contacts?industry=&city=
POST   /api/registrations
PATCH  /api/registrations/:id/status
POST   /api/etl/upload
POST   /api/blast
POST   /api/scan/verify
GET    /api/events/:id/analytics
GET    /api/events/:id/yorimind
POST   /api/smart-filter/industry
GET    /api/health
```
Route parameters: camelCase — `:eventId`, `:registrationId`
Query parameters: camelCase — `?industry=&city=&pageSize=20&page=1`

**JSON field names in API responses — camelCase:**
```json
{ "eventId": "...", "createdAt": "...", "ticketToken": "..." }
```
Note: PostgreSQL columns are snake_case but are mapped to camelCase in API responses by the repository layer transformation. Never return raw column names directly.

**Repository transformation pattern:**
```typescript
// repositories/ContactRepository.ts
function toContact(row: ContactRow): Contact {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    serviceType: row.service_type,  // snake → camel
    jobTitle: row.job_title,        // snake → camel
    createdAt: row.created_at,      // snake → camel
  }
}
```

**BE file naming — kebab-case `.ts`:**
```
src/routes/registration.routes.ts
src/services/registration.service.ts
src/repositories/RegistrationRepository.ts  ← PascalCase for class files
src/workers/etl.worker.ts
src/workers/blast.worker.ts
src/lib/queue.ts
src/lib/postgres.ts
src/lib/postgres.ts
src/middleware/auth.middleware.ts
```

**FE file naming:**
- React components: PascalCase — `RegistrationForm.tsx`, `QRScanner.tsx`
- Next.js route files: lowercase — `page.tsx`, `layout.tsx`, `route.ts`
- Hooks: camelCase with `use` prefix — `useAttendancePolling.ts`, `useYoriMind.ts`
- Stores: camelCase — `eventStore.ts`, `authStore.ts`
- Utilities: camelCase — `dateUtils.ts`, `phoneFormat.ts`

---

### Structure Patterns

**Backend Repository Pattern (mandatory):**
```typescript
// repositories/RegistrationRepository.ts
import { pool } from '@/lib/postgres'
import type { Registration } from '@/types'

export class RegistrationRepository {
  async findByEvent(eventId: string): Promise<Registration[]> {
    const { rows } = await pool.query<RegistrationRow>(
      'SELECT * FROM registrations WHERE event_id = $1 ORDER BY created_at DESC',
      [eventId]
    )
    return rows.map(toRegistration)
  }

  async findById(id: string): Promise<Registration | null> {
    const { rows } = await pool.query<RegistrationRow>(
      'SELECT * FROM registrations WHERE id = $1',
      [id]
    )
    return rows[0] ? toRegistration(rows[0]) : null
  }

  async updateStatus(id: string, status: RegStatus): Promise<Registration> {
    const { rows } = await pool.query<RegistrationRow>(
      'UPDATE registrations SET status = $1, attended_at = CASE WHEN $1 = \'attended\' THEN NOW() ELSE attended_at END WHERE id = $2 RETURNING *',
      [status, id]
    )
    return toRegistration(rows[0])
  }

  async upsert(data: UpsertContactData): Promise<Contact> {
    const { rows } = await pool.query<ContactRow>(
      `INSERT INTO contacts (name, phone, email, service_type, ...) VALUES ($1, $2, ...)
       ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name, ...
       RETURNING *`,
      [data.name, data.phone, ...]
    )
    return toContact(rows[0])
  }
}

export const registrationRepo = new RegistrationRepository()
```

**Service layer — calls repositories only:**
```typescript
// services/registration.service.ts
import { registrationRepo } from '@/repositories/RegistrationRepository'
import { surveyRepo } from '@/repositories/SurveyRepository'
import { TicketService } from '@/services/TicketService'
import { blastQueue } from '@/lib/queue'

export const registrationService = {
  async approve(id: string, actor: User) {
    const reg = await registrationRepo.findById(id)
    if (!reg) throw new AppError('REGISTRATION_NOT_FOUND', 404)
    if (reg.status !== 'pending') throw new AppError('INVALID_STATUS_TRANSITION', 400)

    const event = await eventRepo.findById(reg.event_id)
    const ticketToken = TicketService.generateToken(reg.id, reg.event_id, event.date)
    const updated = await registrationRepo.updateStatus(id, 'approved', ticketToken)

    await blastQueue.add('blast.send-ticket', {
      registration_id: reg.id,
      contact_id: reg.contact_id,
      ticket_token: ticketToken
    })
    await auditRepo.log({ action: 'registration.approved', actor_id: actor.id, target_id: id })
    return updated
  }
}
```

**Zustand stores — three stores, fixed shape (do not add more without review):**
```typescript
// store/authStore.ts
interface AuthStore {
  accessToken: string | null
  user: { id: string; role: 'admin' | 'staff' | 'viewer' } | null
  setAccessToken: (token: string, user: AuthStore['user']) => void
  clearAuth: () => void
}
export const useAuthStore = create<AuthStore>((set) => ({
  accessToken: null, user: null,
  setAccessToken: (accessToken, user) => set({ accessToken, user }),
  clearAuth: () => set({ accessToken: null, user: null }),
}))

// store/eventStore.ts
interface EventStore {
  selectedEventId: string | null
  setSelectedEvent: (id: string) => void
}
export const useEventStore = create<EventStore>((set) => ({
  selectedEventId: null,
  setSelectedEvent: (id) => set({ selectedEventId: id }),
}))

// store/filterStore.ts — contacts filter, persists across navigation
interface FilterStore {
  industry: string; city: string; companySize: string; page: number
  setFilter: (f: Partial<Omit<FilterStore, 'setFilter' | 'resetFilter'>>) => void
  resetFilter: () => void
}
export const useFilterStore = create<FilterStore>((set) => ({
  industry: '', city: '', companySize: '', page: 1,
  setFilter: (f) => set((s) => ({ ...s, ...f })),
  resetFilter: () => set({ industry: '', city: '', companySize: '', page: 1 }),
}))
```

**DevToolbar — role switcher (development only):**
```tsx
// components/dev/DevToolbar.tsx
'use client'
import { useAuthStore } from '@/store/authStore'

const MOCK_USERS = {
  admin:  { id: 'dev-admin',  role: 'admin'  as const },
  staff:  { id: 'dev-staff',  role: 'staff'  as const },
  viewer: { id: 'dev-viewer', role: 'viewer' as const },
}

export function DevToolbar() {
  if (process.env.NODE_ENV !== 'development') return null
  const { user, setAccessToken } = useAuthStore()
  return (
    <div className="fixed bottom-4 right-4 z-50 flex gap-2 rounded border bg-yellow-100 p-2 text-xs shadow">
      <span className="font-bold">DEV:</span>
      {(['admin', 'staff', 'viewer'] as const).map((role) => (
        <button key={role}
          className={`rounded px-2 py-1 ${user?.role === role ? 'bg-yellow-400 font-bold' : 'bg-white'}`}
          onClick={() => setAccessToken('dev-token', MOCK_USERS[role])}>
          {role}
        </button>
      ))}
    </div>
  )
}
```
Place `<DevToolbar />` in root `layout.tsx`. Automatically absent in production — no conditional needed beyond the `NODE_ENV` check inside the component.

**MSW setup pattern:**
```typescript
// mocks/browser.ts
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
export const worker = setupWorker(...handlers)

// app/layout.tsx (dev only)
if (process.env.NODE_ENV === 'development') {
  const { worker } = await import('@/mocks/browser')
  await worker.start({ onUnhandledRequest: 'warn' })
}
```
MSW intercepts all `fetch` calls transparently. FE code never changes when switching from mock to real API — only `NEXT_PUBLIC_API_URL` changes.

**Server state fetching — React Query:**
```typescript
// hooks/useRegistrations.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useRegistrations(eventId: string) {
  return useQuery({
    queryKey: ['registrations', eventId],
    queryFn: () => fetch(`/api/events/${eventId}/registrations`).then(r => r.json()),
    refetchInterval: 5000,  // Live monitor polling
  })
}

export function useApproveRegistration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fetch(`/api/registrations/${id}/status`, {
      method: 'PATCH', body: JSON.stringify({ status: 'approved' })
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['registrations'] })
  })
}
```

**Offline scan queue (IndexedDB):**
```typescript
// lib/offline/scanQueue.ts
const DB_NAME = 'yorindo-scan'
const STORE = 'pending_scans'

export async function queueScan(token: string) {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) { db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true }) }
  })
  await db.add(STORE, { token, queued_at: new Date().toISOString(), synced: false })
}

export async function flushScanQueue() {
  const db = await openDB(DB_NAME, 1)
  const pending = await db.getAll(STORE)
  for (const scan of pending.filter(s => !s.synced)) {
    try {
      await fetch('/api/scan/verify', { method: 'POST', body: JSON.stringify({ token: scan.token }) })
      await db.put(STORE, { ...scan, synced: true })
    } catch { /* network still down, retry next time */ }
  }
}
```

---

### Format Patterns

**API success responses:**

Single resource:
```json
{ "id": "550e8400-...", "name": "ERP Seminar Jakarta", "status": "published" }
```

Collection:
```json
{
  "data": [...],
  "pagination": { "page": 1, "pageSize": 20, "total": 847, "totalPages": 43 }
}
```

Async enqueued:
```json
{ "jobId": "etl:upload:1234", "status": "queued" }
```

**Date/time — ISO 8601 UTC strings in all API responses:**
```json
{ "createdAt": "2026-03-19T10:30:00.000Z", "eventDate": "2026-04-15T02:00:00.000Z" }
```
Frontend converts to event-local timezone using `Intl.DateTimeFormat` with `event.timezone` (`"Asia/Jakarta"`, `"Asia/Makassar"`, `"Asia/Jayapura"`).

**Opaque IDs in responses — plain string, no transformation needed:**
```json
{ "id": "550e8400-e29b-41d4-a716-446655440000" }
```

---

### Communication Patterns

**BullMQ queue definitions:**
```typescript
// lib/queue.ts — two queues only (do not add more without architectural review)
export const etlQueue = createQueue('etl')      // ETL pipeline jobs
export const blastQueue = createQueue('blast')  // Email/WA delivery jobs
```

**BullMQ job names — `{queue}.{verb}-{noun}`:**
```
etl.process-upload
blast.send-invitation
blast.send-ticket
blast.send-rejection
blast.send-reminder
```

**BullMQ job data — plain JSON only:**
```typescript
// Correct — plain serializable object, no class instances
await etlQueue.add('etl.process-upload', {
  file_url: 'https://storage.supabase.co/...',
  uploaded_by: userId,
  uploaded_at: new Date().toISOString()
})

// Wrong — no objects with methods, no pg results, no class instances
await etlQueue.add('etl.process-upload', { file, pgRow }) // ✗
```

**Audit log entry — required fields on every write:**
```typescript
// repositories/AuditRepository.ts
await auditRepo.log({
  action: 'registration.approved',   // '{resource}.{verb}'
  actor_id: user.id,
  actor_role: user.user_metadata.role,
  target_id: registrationId,
  target_type: 'registration',
  event_id: eventId,
  metadata: { previous_status: 'pending' },
  created_at: new Date().toISOString()
})
```
`audit_logs` table: INSERT only. Never UPDATE or DELETE.

---

### Process Patterns

**Fastify route handler — schema-validated, preHandler for auth:**
```typescript
fastify.post<{ Body: CreateRegistrationBody }>(
  '/registrations',
  {
    schema: { body: CreateRegistrationBodySchema },
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
  },
  async (req, reply) => {
    const registration = await registrationService.create(req.body)
    reply.code(201).send(registration)
  }
)
```

**Zod schema for request validation:**
```typescript
// types/registration.ts
import { z } from 'zod'

export const CreateRegistrationBodySchema = z.object({
  contact_id: z.string(),
  event_id: z.string(),
  survey_answers: z.record(z.unknown()).optional()
})
export type CreateRegistrationBody = z.infer<typeof CreateRegistrationBodySchema>
```

**Token refresh pattern (custom JWT):**
```typescript
// Frontend: on 401 response, attempt token refresh once
async function refreshAccessToken(): Promise<string | null> {
  const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
  if (!res.ok) return null
  const { accessToken } = await res.json()
  useAuthStore.getState().setAccessToken(accessToken)
  return accessToken
}

// On any 401: attempt refresh once → retry original request → if refresh fails, redirect to /login
// Never retry more than once. Never show raw 401 errors to users.
```

**`POST /api/auth/refresh` — Fastify endpoint:**
```typescript
fastify.post('/auth/refresh', async (req, reply) => {
  const refreshToken = req.cookies.refresh_token
  if (!refreshToken) return reply.code(401).send({ error: { code: 'NO_REFRESH_TOKEN', message: 'No refresh token', details: [] } })
  try {
    const payload = jwt.verify(refreshToken, config.jwtRefreshSecret) as RefreshPayload
    const user = await userRepo.findById(payload.sub)
    const accessToken = jwt.sign({ sub: user.id, role: user.role, jti: crypto.randomUUID() }, config.jwtSecret, { expiresIn: '15m' })
    reply.send({ accessToken })
  } catch {
    reply.code(401).send({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token invalid or expired', details: [] } })
  }
})

**AppError class:**
```typescript
// errors/AppError.ts
export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number = 500,
    public details: Array<{ field: string; message: string }> = []
  ) {
    super(code)
  }
}

// Fastify error handler
fastify.setErrorHandler((err, req, reply) => {
  if (err instanceof AppError) {
    reply.code(err.statusCode).send({
      error: { code: err.code, message: err.message, details: err.details }
    })
  } else {
    reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Internal error', details: [] } })
  }
})
```

---

### Test Patterns

**Service test with repository mock:**
```typescript
// __tests__/services/registration.service.test.ts
import { vi, describe, it, expect } from 'vitest'
import { registrationRepo } from '@/repositories/RegistrationRepository'
import { registrationService } from '@/services/registration.service'

vi.mock('@/repositories/RegistrationRepository')

describe('registrationService.approve', () => {
  it('generates ticket token and enqueues blast', async () => {
    vi.mocked(registrationRepo.findById).mockResolvedValue(mockRegistration)
    vi.mocked(registrationRepo.updateStatus).mockResolvedValue(mockApproved)
    const result = await registrationService.approve('reg-id', mockAdmin)
    expect(result.status).toBe('approved')
    expect(result.ticket_token).toBeTruthy()
  })
})
```

**Audit log assertion — always assert count increase:**
```typescript
const before = await pool.query('SELECT COUNT(*) FROM audit_logs')
await registrationService.approve(regId, actor)
const after = await pool.query('SELECT COUNT(*) FROM audit_logs')
expect(parseInt(after.rows[0].count)).toBe(parseInt(before.rows[0].count) + 1)
```

---

### Enforcement Guidelines

**All AI agents MUST:**
- Use TypeScript strict mode — no `any` types, no type assertions without justification
- Place ALL PostgreSQL queries in `repositories/` files — never in services or routes
- Use camelCase for JSON API response fields (even though DB columns are snake_case)
- Use snake_case for all PostgreSQL column names and JSON payload keys where persisted
- Return errors using `{ error: { code, message, details[] } }` — no exceptions
- Write all dates as ISO 8601 UTC strings in API responses
- Use `registrationRepo`, `contactRepo`, etc. (singleton instances) — never `new Repository()` in routes
- Use `lib/queue.ts` `createQueue()` — never `new Queue()` directly (always uses lib/redis.ts connection)
- Generate QR ticket JWT only on status → `'approved'` transition, in `TicketService.generateToken()`
- Call `YoriMindService.analyzeEvent()` only from the `/api/events/:id/yorimind` handler — never inline
- Call Claude Haiku for Smart Filter only from `app/api/smart-filter/industry/route.ts` — not from any other place
- Add every significant admin action to `audit_logs` — INSERT only, never UPDATE/DELETE
- Check Redis cache before calling Claude API in YoriMind flow
- Store access token in Zustand memory only (never localStorage); refresh token in httpOnly cookie only
- Access env vars only via `src/config/index.ts` — never `process.env` directly elsewhere

**All AI agents MUST NOT:**
- Create new BullMQ queues beyond the 2 defined (`etl`, `blast`)
- Add Redis caching outside YoriMind flow without explicit architectural approval
- Store access tokens in localStorage — memory (`authStore`) only; refresh tokens in httpOnly cookie only
- Create Zustand stores beyond the 3 defined (`authStore`, `eventStore`, `filterStore`) without architectural review
- Hand-write API fetch calls — use React Query hooks; mock responses live in `src/mocks/handlers/`
- Render `DevToolbar` in production — the `NODE_ENV` check inside the component handles this; do not add extra conditionals
- Edit files in `src/mocks/` for production logic — mocks are dev/test only
- Use Prisma, Knex, or any ORM — direct `pg` Pool for PostgreSQL
- Use Express — Fastify only for backend
- Use Pages Router in Next.js — App Router only
- Make direct HTTP calls to any AI provider from route handlers — always go through `IEtlNormalizationService` / `IYoriMindService` / `ISmartFilterService` adapters
- Write to `audit_logs` via UPDATE/DELETE — INSERT only
- Scatter persistence logic outside repositories or introduce a second operational database without an explicit architecture decision
- Use auto-increment integer primary keys in PostgreSQL — opaque app-generated IDs only
- Import `@supabase/ssr`, `@supabase/supabase-js`, or any Supabase package — not used in this stack
- Upload files to VPS disk directly without Docker volume — always use the `/app/uploads` mounted volume path

---

## Appendix — Decision Log

Decisions that must not be changed without careful consideration (large migration impact):

| Decision | Choice Made | Rejected Alternative | Reason |
|---|---|---|---|
| Primary key type | CUID2 / opaque string IDs | Auto-increment integer | Integer cannot merge DBs without ID conflicts |
| DB for contacts | PostgreSQL (relational) | Full NoSQL | Contacts need UNIQUE constraint + JOIN |
| DB for surveys | PostgreSQL JSONB | Separate document database | Keeps dynamic form data in the primary operational store while preserving schema flexibility |
| Queue for blast | BullMQ (Redis-backed) | Direct synchronous API call | Sync call timeout at 1000+ emails, unrecoverable on failure |
| Auth provider | Custom JWT (jsonwebtoken + bcrypt) | Supabase Auth, Auth0 | Zero external dependency; full control over token lifecycle and RBAC |
| File storage | VPS filesystem (Docker volume) | Supabase Storage, S3 | No external dependency; Docker volume survives restarts; MinIO S3 upgrade path |
| Queue / Redis | Self-hosted Docker (redis:7-alpine) | Upstash Redis | No rate/quota limits; AOF persistence; zero external dependency |
| AI for ETL | GPT-4o | Manual regex rules | 30K data with unlimited variation — regex not scalable |
| AI for analytics | Claude claude-sonnet-4-6 (YoriMind) | GPT-4o | Claude superior in long-form reasoning and structured output |
| App hosting | VPS + Docker Compose | Railway, Vercel | Predictable cost, no per-request pricing, full control over compose config |
| Reverse proxy / SSL | Nginx in Docker Compose | Caddy, Traefik | Familiar config, Let's Encrypt via Certbot, static file serving included |

---

## Project Structure & Boundaries

### Complete Project Directory Structure

**`yorindo-api/` — Fastify Backend**

```
yorindo-api/
├── .env.example
├── .env                            ← local dev (gitignored)
├── .gitignore
├── README.md
├── package.json
├── tsconfig.json
├── nodemon.json                    ← legacyWatch: true (WSL2 hot reload)
├── Dockerfile
├── .github/
│   └── workflows/
│       └── ci.yml                  ← lint → typecheck → test → build → push → deploy
├── db/
│   └── migrations/
│       ├── 001_initial_schema.sql  ← contacts, events, registrations, industries, job_titles
│       ├── 002_auth.sql            ← users, user_events tables
│       ├── 003_etl.sql             ← flagged_records, audit_logs tables
│       └── 004_indexes.sql         ← all required indexes (contacts, registrations)
├── scripts/
│   ├── migrate.ts                  ← reads db/migrations/*.sql in order; runs via tsx
│   └── seed.ts                     ← dev data seeding; never runs in production
├── src/
│   ├── main.ts                     ← entry point; listen on PORT; starts workers + cron (same process)
│   ├── server.ts                   ← Fastify instance; register all plugins + routes
│   ├── config/
│   │   └── index.ts                ← All process.env access; throws on missing required
│   ├── lib/
│   │   ├── postgres.ts             ← Singleton pg.Pool; exported as `db`
│   │   ├── postgres.ts             ← Shared PostgreSQL helpers for JSONB-heavy repositories
│   │   ├── redis.ts                ← Singleton IORedis; exported as `redis`
│   │   ├── queue.ts                ← BullMQ Queue factory using lib/redis; etlQueue, blastQueue
│   │   └── storage.ts              ← VPS filesystem read/write (snapshots, uploads)
│   ├── middleware/
│   │   ├── auth.ts                 ← requireAuth (JWT verify + Redis blacklist check)
│   │   ├── roles.ts                ← requireRole(...roles) factory
│   │   └── eventAccess.ts          ← requireEventAccess (user_events check; admin bypasses)
│   ├── repositories/               ← ALL DB queries live here — no exceptions
│   │   ├── contact.repo.ts         ← F1: contacts CRUD, paginated search, upsert
│   │   ├── event.repo.ts           ← F2: events CRUD, slug lookup, status transitions
│   │   ├── registration.repo.ts    ← F2/F3: registrations, status workflow
│   │   ├── user.repo.ts            ← auth: users table, password lookup
│   │   ├── userEvent.repo.ts       ← RBAC: user_events assignment queries
│   │   ├── flagged.repo.ts         ← F1: flagged_records review workflow
│   │   ├── industry.repo.ts        ← F1: industries lookup table
│   │   ├── jobTitle.repo.ts        ← F1: job_titles lookup table
│   │   ├── surveySchema.repo.ts    ← F2: PostgreSQL survey_schemas (JSONB)
│   │   ├── surveyResponse.repo.ts  ← F2/F3: PostgreSQL survey_responses (JSONB)
│   │   ├── rawUpload.repo.ts       ← F1: PostgreSQL raw_uploads (immutable JSONB log)
│   │   └── audit.repo.ts           ← INSERT-only audit_logs; never UPDATE/DELETE
│   ├── services/
│   │   ├── auth.service.ts         ← login, refresh, logout; token generation
│   │   ├── contact.service.ts      ← F1: contact list, filter, import orchestration
│   │   ├── etl.service.ts          ← F1: Excel parse → GPT-4o batch → upsert → flag
│   │   ├── event.service.ts        ← F2: event CRUD, survey builder, slug generation
│   │   ├── registration.service.ts ← F2: registration approval, QR ticket generation
│   │   ├── blast.service.ts        ← F2: email (Brevo) + WA (Everpro) dispatch
│   │   ├── scan.service.ts         ← F3: ticket JWT verify, attendance mark, conflict detect
│   │   ├── snapshot.service.ts     ← F4: query Core DB → build JSON snapshot → write to VPS
│   │   ├── yorimind.service.ts     ← F4: read snapshot → Claude API → Redis cache
│   │   └── smartFilter.service.ts  ← F4: claude-haiku industry slug resolution
│   ├── routes/
│   │   ├── auth.routes.ts          ← POST /api/auth/login, /refresh, /logout
│   │   ├── contact.routes.ts       ← GET /api/contacts, POST /api/contacts/import
│   │   ├── flagged.routes.ts       ← GET/PATCH /api/contacts/flagged
│   │   ├── event.routes.ts         ← GET/POST /api/events, GET/PATCH /api/events/:id
│   │   ├── survey.routes.ts        ← GET/PUT /api/events/:id/survey
│   │   ├── registration.routes.ts  ← GET/POST /api/registrations, PATCH .../status
│   │   ├── scan.routes.ts          ← POST /api/scan/verify
│   │   ├── blast.routes.ts         ← POST /api/events/:id/blast
│   │   ├── yorimind.routes.ts      ← GET /api/events/:id/yorimind
│   │   ├── user.routes.ts          ← admin: GET/POST /api/users, /api/users/:id/events
│   │   └── health.routes.ts        ← GET /api/health
│   ├── workers/
│   │   ├── etl.worker.ts           ← BullMQ consumer for 'etl' queue; started from main.ts
│   │   └── blast.worker.ts         ← BullMQ consumer for 'blast' queue; started from main.ts
│   ├── cron/
│   │   └── snapshot.cron.ts        ← node-cron daily 02:00 WIB → snapshot.service; started from main.ts
│   │                               ← NOTE: runs in same Node.js process as API server (MVP); not a separate container
│   ├── errors/
│   │   ├── AppError.ts             ← AppError class; statusCode + details[]
│   │   └── codes.ts                ← SCREAMING_SNAKE_CASE error code constants
│   └── types/
│       ├── api.ts                  ← Shared request/response TS interfaces (source of truth for BE)
│       ├── db.ts                   ← Row type interfaces for PostgreSQL tables
│       └── queue.ts                ← BullMQ job payload type definitions
└── tests/
    ├── unit/
    │   ├── services/
    │   └── repositories/
    └── integration/
        └── routes/
```

**Process boundary note:** `etl.worker.ts`, `blast.worker.ts`, and `snapshot.cron.ts` are all started from `main.ts` in the same Node.js process as the Fastify API server. This is correct for MVP Docker Compose on a single VPS. If processing volume grows, move workers to a separate container using the same codebase (`CMD ["node", "dist/workers/etl.worker.js"]`).

---

**`yorindo-app/` — Next.js Frontend**

```
yorindo-app/
├── .env.example
├── .env.local                      ← local dev (gitignored)
├── .env.development                ← MSW active; NEXT_PUBLIC_API_URL=http://localhost:3000
├── .env.production                 ← real API; NEXT_PUBLIC_API_URL=https://api.yorindo.app
├── .gitignore
├── README.md
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js                  ← next-pwa configuration (NetworkFirst API, CacheFirst static)
├── vitest.config.ts                ← resolve.alias: { '@': './src' } — required for MSW import in tests
├── vitest.setup.ts                 ← server.listen / resetHandlers / server.close
├── public/
│   ├── icons/                      ← PWA manifest icons (192x192, 512x512)
│   ├── manifest.json               ← PWA manifest (next-pwa auto-generates)
│   └── sw.js                       ← Service worker (next-pwa auto-generates; do not edit)
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx              ← Root layout; QueryClientProvider; MSW worker.start(); DevToolbar
│   │   ├── (admin)/                ← Route group: auth-gated, admin layout
│   │   │   ├── layout.tsx          ← Auth guard; redirects to /login if no valid accessToken
│   │   │   ├── page.tsx            ← /admin → dashboard overview
│   │   │   ├── contacts/
│   │   │   │   ├── page.tsx        ← F1: contacts list — TanStack Table, server-side pagination
│   │   │   │   ├── upload/
│   │   │   │   │   └── page.tsx    ← F1: Excel/CSV upload + ETL trigger
│   │   │   │   └── flagged/
│   │   │   │       └── page.tsx    ← F1: flagged records review + approve/reject
│   │   │   └── events/
│   │   │       ├── page.tsx        ← F2: events list
│   │   │       └── [id]/
│   │   │           ├── page.tsx    ← F2: event detail + registrations TanStack Table
│   │   │           ├── builder/
│   │   │           │   └── page.tsx ← F2: survey template builder (drag-drop)
│   │   │           └── yorimind/
│   │   │               └── page.tsx ← F4: YoriMind panel + Recharts analytics
│   │   ├── register/
│   │   │   └── [eventSlug]/
│   │   │       └── page.tsx        ← F2: public registration form (no auth, rate-limited)
│   │   ├── scan/
│   │   │   ├── page.tsx            ← F3: check-in PWA; staff-only route guard
│   │   │   └── result/
│   │   │       └── [token]/
│   │   │           └── page.tsx    ← F3: scan result display (success/already/invalid)
│   │   └── api/
│   │       ├── smart-filter/
│   │       │   └── industry/
│   │       │       └── route.ts    ← Next.js API route; proxies to claude-haiku; confidence < 0.6 → fallback
│   │       └── health/
│   │           └── route.ts
│   ├── components/
│   │   ├── ui/                     ← shadcn/ui base components (generated by CLI; do not hand-edit)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── table.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── card.tsx
│   │   │   ├── select.tsx
│   │   │   ├── skeleton.tsx
│   │   │   └── toast.tsx
│   │   ├── forms/
│   │   │   ├── RegistrationForm.tsx    ← F2: public registration (RHF + Zod)
│   │   │   ├── EventForm.tsx           ← F2: create/edit event
│   │   │   ├── SurveyBuilder.tsx       ← F2: drag-drop survey template
│   │   │   └── UploadForm.tsx          ← F1: Excel/CSV upload trigger
│   │   ├── features/
│   │   │   ├── contacts/
│   │   │   │   ├── ContactsTable.tsx   ← F1: TanStack Table v8, manual (server-side) mode
│   │   │   │   ├── ContactFilters.tsx  ← F1: industry/city/company filter bar
│   │   │   │   ├── SmartFilter.tsx     ← F1: AI-powered industry autocomplete (debounce 500ms)
│   │   │   │   └── FlaggedTable.tsx    ← F1: flagged records review
│   │   │   ├── events/
│   │   │   │   ├── EventCard.tsx
│   │   │   │   ├── EventStatusBadge.tsx
│   │   │   │   └── RegistrationsTable.tsx ← F2: TanStack Table, approval actions
│   │   │   ├── scan/
│   │   │   │   ├── QRScanner.tsx       ← F3: html5-qrcode camera wrapper
│   │   │   │   ├── ScanResult.tsx      ← F3: success / already-attended / invalid UI
│   │   │   │   └── OfflineBanner.tsx   ← F3: shows pending queue count when offline
│   │   │   └── analytics/
│   │   │       ├── FunnelChart.tsx     ← F4: Recharts funnel visualization
│   │   │       ├── AttendeeMap.tsx     ← F4: city distribution
│   │   │       ├── IndustryBreakdown.tsx ← F4: Recharts pie/bar
│   │   │       └── YoriMindPanel.tsx   ← F4: AI insight display + manual refresh
│   │   └── dev/
│   │       └── DevToolbar.tsx          ← Role switcher; NODE_ENV=development guard inside component
│   ├── hooks/
│   │   ├── useContacts.ts          ← React Query + TanStack Table integration for contacts
│   │   ├── useEvents.ts            ← React Query for events list + detail
│   │   ├── useRegistrations.ts     ← React Query; refetchInterval: 5000 for live monitor
│   │   ├── useYoriMind.ts          ← React Query for YoriMind data
│   │   └── useOfflineSync.ts       ← flushScanQueue() triggered on navigator.onLine change
│   ├── store/
│   │   ├── authStore.ts            ← { accessToken, user: {id, role}, setAccessToken, clearAuth }
│   │   ├── eventStore.ts           ← { selectedEventId, setSelectedEvent }
│   │   └── filterStore.ts          ← { industry, city, companySize, page, setFilter, resetFilter }
│   ├── lib/
│   │   ├── utils.ts                ← shadcn className utility (clsx + twMerge); auto-generated by shadcn CLI
│   │   ├── auth/
│   │   │   ├── decode.ts           ← JWT payload decode (UI-side only; no verify — BE verifies)
│   │   │   ├── guards.ts           ← hasRole(), hasEventAccess() — UI-level checks only
│   │   │   └── refresh.ts          ← Silent token refresh on 401; retries original request once
│   │   └── offline/
│   │       └── scanQueue.ts        ← idb-backed queue; queueScan(), flushScanQueue()
│   ├── types/
│   │   └── api.ts                  ← FE-owned API contract types; BE adopts when ready
│   ├── mocks/                      ← MSW — dev/test only; never imported in production build
│   │   ├── handlers/
│   │   │   ├── contacts.ts         ← GET /api/contacts (247 @faker-js/faker seeded contacts, paginated)
│   │   │   ├── events.ts           ← GET/POST /api/events, GET /api/events/:id
│   │   │   ├── registrations.ts    ← GET/POST /api/registrations, PATCH .../status (all statuses)
│   │   │   ├── auth.ts             ← POST /api/auth/login, /refresh, /logout (always succeeds)
│   │   │   ├── scan.ts             ← POST /api/scan/verify (MOCK_INVALID / MOCK_ALREADY / success)
│   │   │   └── yorimind.ts         ← GET /api/events/:id/yorimind (full AI output shape)
│   │   ├── browser.ts              ← MSW browser worker setup; imported dynamically in root layout
│   │   └── server.ts               ← MSW Node setup for Vitest; imported in vitest.setup.ts
│   └── utils/
│       ├── format.ts               ← date formatting, phone normalization display
│       └── pagination.ts           ← TanStack Table ↔ server pagination param builders
└── tests/
    ├── components/
    │   ├── forms/
    │   └── features/
    └── hooks/
```

**Vitest alias note:** `vitest.config.ts` must define `resolve.alias: { '@': path.resolve(__dirname, './src') }` for `@/mocks/server` imports in `vitest.setup.ts` to resolve correctly. Without this, all tests fail with `Cannot find module '@/mocks/server'`.

---

### Requirements to Structure Mapping

**F1 — Contact Database:**

| Concern | `yorindo-api` location | `yorindo-app` location |
|---|---|---|
| ETL upload | `routes/contact.routes.ts` + `services/etl.service.ts` + `workers/etl.worker.ts` | `app/(admin)/contacts/upload/page.tsx` + `components/forms/UploadForm.tsx` |
| Contact list | `routes/contact.routes.ts` + `repositories/contact.repo.ts` | `app/(admin)/contacts/page.tsx` + `components/features/contacts/ContactsTable.tsx` |
| Smart Filter | `routes/` (proxied via Next.js) + `services/smartFilter.service.ts` | `app/api/smart-filter/industry/route.ts` + `components/features/contacts/SmartFilter.tsx` |
| Flagged review | `routes/flagged.routes.ts` + `repositories/flagged.repo.ts` | `app/(admin)/contacts/flagged/page.tsx` + `components/features/contacts/FlaggedTable.tsx` |
| Lookup tables | `db/migrations/001_initial_schema.sql` | `types/api.ts` (Industry, JobTitle types) |

**F2 — Event Registration:**

| Concern | `yorindo-api` location | `yorindo-app` location |
|---|---|---|
| Event CRUD | `routes/event.routes.ts` + `services/event.service.ts` | `app/(admin)/events/` |
| Survey builder | `routes/survey.routes.ts` + `repositories/surveySchema.repo.ts` | `app/(admin)/events/[id]/builder/` + `components/forms/SurveyBuilder.tsx` |
| Public registration | `routes/registration.routes.ts` (unprotected, rate-limited) | `app/register/[eventSlug]/page.tsx` + `components/forms/RegistrationForm.tsx` |
| Approval workflow | `routes/registration.routes.ts` + `services/registration.service.ts` | `components/features/events/RegistrationsTable.tsx` + `hooks/useRegistrations.ts` |
| QR ticket | `services/registration.service.ts` → `TicketService.generateToken()` | `components/ui/` (QR display in email/WA) |
| Blast | `routes/blast.routes.ts` + `workers/blast.worker.ts` + `services/blast.service.ts` | Admin trigger button in event detail page |

**F3 — Check-in PWA:**

| Concern | `yorindo-api` location | `yorindo-app` location |
|---|---|---|
| QR scan verify | `routes/scan.routes.ts` + `services/scan.service.ts` | `app/scan/page.tsx` + `components/features/scan/QRScanner.tsx` |
| Offline queue | — (backend receives on reconnect) | `lib/offline/scanQueue.ts` + `hooks/useOfflineSync.ts` |
| Attendance counter | `GET /api/events/:id/attendance-stats` (polled every 5s) | `hooks/useRegistrations.ts` (refetchInterval: 5000) |
| PWA config | — | `next.config.js` (next-pwa) + `public/manifest.json` |

**F4 — Analytics & YoriMind:**

| Concern | `yorindo-api` location | `yorindo-app` location |
|---|---|---|
| Daily snapshot cron | `cron/snapshot.cron.ts` + `services/snapshot.service.ts` | — |
| YoriMind analysis | `routes/yorimind.routes.ts` + `services/yorimind.service.ts` | `app/(admin)/events/[id]/yorimind/page.tsx` + `components/features/analytics/YoriMindPanel.tsx` |
| Charts | `GET /api/events/:id/analytics` | `components/features/analytics/FunnelChart.tsx`, `IndustryBreakdown.tsx`, `AttendeeMap.tsx` |
| Snapshot storage | `lib/storage.ts` → Docker `snapshots_data` volume | — |

---

### Architectural Boundaries

**API Boundary:**
- All client ↔ server communication through `NEXT_PUBLIC_API_URL/api/*`
- In development: MSW intercepts before network — no actual HTTP to BE
- In production: `NEXT_PUBLIC_API_URL=https://api.yorindo.app` — all requests hit Fastify
- Next.js API routes (`/api/smart-filter/*`, `/api/health`) run on the Next.js server — they are not Fastify routes

**Component Boundaries:**
- `components/ui/` — shadcn primitives; never contain business logic
- `components/forms/` — RHF + Zod forms; never call fetch directly; receive callbacks from parent
- `components/features/` — business UI; call React Query hooks; never call fetch directly
- `components/dev/` — development tooling only; zero production impact
- `store/` — Zustand global UI state only; no API calls; no business logic
- `hooks/` — React Query data fetching; only source of truth for server state

**Data Boundaries:**
- PostgreSQL owns: contacts, events, registrations, users, user_events, flagged_records, audit_logs, industries, job_titles
- PostgreSQL owns: survey_schemas, survey_responses, raw_uploads
- Redis owns: JWT blacklist (`jti:{jti}`), YoriMind cache (`yorimind:event:{id}`), BullMQ queue state
- VPS filesystem (`snapshots_data` volume): YoriMind JSON snapshots only
- VPS filesystem (`api_uploads` volume): temporary ETL files only (deleted after worker processes)
- IndexedDB (browser): offline scan queue only (`yorindo-scan` database)

**Service Boundaries:**
- Everpro (external): only called from `blast.worker.ts` via `blast.service.ts`
- Brevo (external): only called from `blast.worker.ts` via `blast.service.ts`
- AI ETL provider (external): only called from `etl.service.ts` via `IEtlNormalizationService` adapter — provider selected by `ETL_AI_PROVIDER` env var; concrete adapter in `services/adapters/real/`
- AI YoriMind provider (external): called from `yorimind.service.ts` via `IYoriMindService` adapter — provider selected by `YORIMIND_AI_PROVIDER` env var
- AI Smart Filter provider (external): called from `smartFilter.service.ts` via `ISmartFilterService` adapter — provider selected by `SMART_FILTER_AI_PROVIDER` env var

---

### Integration Points

**Internal Communication:**
```
Next.js (app) → fetch → Fastify (api)     [via /api/* proxy through Nginx]
Fastify routes → services → repositories → pg Pool / MongoClient
Fastify routes → etlQueue.add() / blastQueue.add() → BullMQ → Redis
etl.worker → snapshot.service → lib/storage.ts → VPS filesystem
yorimind.service → redis.get() → cache hit / miss → Anthropic SDK
snapshot.cron (node-cron) → snapshot.service → starts at main.ts startup
```

**External Integrations:**
```
etl.service.ts      → OpenAI API         (GPT-4o, 50 rows/batch)
yorimind.service.ts → Anthropic API      (claude-sonnet-4-6, on cache miss)
smart-filter/route  → Anthropic API      (claude-haiku-4-5-20251001, debounced)
blast.worker.ts     → Brevo REST API     (email delivery)
blast.worker.ts     → Everpro API        (WhatsApp Business delivery)
```

**Data Flow (Registration → Check-in):**
```
1. Participant: GET /register/[slug]       → public page (no auth)
2. Participant: POST /api/registrations    → creates pending registration
3. Admin: PATCH /api/registrations/:id/status { status: 'approved' }
4. Fastify: TicketService.generateToken() → JWT ticket
5. Fastify: blastQueue.add('blast.send-ticket', { ... })
6. blast.worker: Brevo email + Everpro WA → participant receives QR
7. Staff: POST /api/scan/verify { token }  → scan at venue
8. scan.service: verify JWT → check status !== 'attended' → UPDATE status = 'attended'
9. Admin dashboard: polls GET /api/events/:id/attendance-stats every 5s → live counter
```

---

### File Organization Patterns

**Configuration Files:**
- All environment config: `.env` / `.env.local` / `.env.development` / `.env.production` (gitignored)
- `.env.example` committed with all keys, no values
- BE env accessed only through `src/config/index.ts` — never `process.env` elsewhere
- FE env accessed only through `NEXT_PUBLIC_*` prefix (Next.js convention)

**Migration Files:**
- Location: `yorindo-api/db/migrations/` — numbered SQL files (`001_`, `002_`, etc.)
- Execution: `scripts/migrate.ts` — reads files in numeric order via `tsx`
- No ORM, no migration framework — plain SQL + Node runner
- Never modify existing migration files; always add a new numbered file

**Test Organization:**
- BE: `tests/unit/services/` + `tests/unit/repositories/` + `tests/integration/routes/`
- FE: `tests/components/forms/` + `tests/components/features/` + `tests/hooks/`
- MSW handlers shared between browser (dev) and Node (Vitest) — single source of mock truth
- Vitest setup: `server.listen()` before all, `server.resetHandlers()` after each, `server.close()` after all

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:** All technology choices are version-compatible and interoperate without conflicts. Next.js 16 + TanStack Query v5 + Zustand 4.x — no known conflicts. Fastify 4.x TypeScript support is first-class. pg + PostgreSQL 16, BullMQ 3.x + IORedis + redis:7-alpine — all confirmed compatible. MSW 2.x + Vitest + @faker-js/faker confirmed working in dual browser/Node mode.

**Pattern Consistency:** Repository pattern enforced across all domains. snake_case DB → camelCase API transformation defined via `toContact()` / `toRegistration()` helpers. Error schema `{ error: { code, message, details[] } }` applied consistently across all routes. BullMQ always uses shared `lib/redis.ts` connection — no duplicate clients.

**Structure Alignment:** F1–F4 map cleanly to specific directories in both repos. Three-layer separation (route → service → repository) enforced and documented in Enforcement Guidelines. Component boundary rules (ui / forms / features / dev) are cleanly separable. Integration points fully specified.

---

### Requirements Coverage Validation ✅

| Feature | Status | Key Coverage |
|---|---|---|
| F1 — Contact Database | ✅ | ETL → BullMQ → GPT-4o → upsert/flag; paginated search with indexes; smart filter; flagged review |
| F2 — Event Registration | ✅ | Event CRUD; JSONB-backed survey builder; public form (rate-limited); approval workflow; QR JWT; blast queue |
| F3 — Check-in PWA | ✅ | html5-qrcode camera; IndexedDB offline queue; flush on reconnect; live attendance poll (5s) |
| F4 — Analytics/YoriMind | ✅ | node-cron snapshot at 02:00 WIB; VPS filesystem; Claude Sonnet; Redis TTL 24h; Recharts |

| NFR | Addressed By |
|---|---|
| FCP ≤ 3s | Next.js SSR + Nginx static cache + skeleton loaders |
| QR scan ≤ 2s | Offline-capable — IndexedDB instant write; no network required |
| 99.5% uptime | `restart: unless-stopped` all containers + CI/CD health check |
| 0 offline scan records lost | IndexedDB queue + `flushScanQueue()` on reconnect; conflicts surfaced after sync |
| 500K contacts | PostgreSQL + 5 defined indexes on contacts + registrations |
| ACID registration | `UNIQUE(contact_id, event_id)` PostgreSQL constraint |
| Security | JWT blacklist (Redis); rate limit 10/IP/hour; httpOnly refresh cookie; opaque string PKs |
| UTC timestamps | UTC storage confirmed; `Intl.DateTimeFormat` conversion on FE |

---

### Gaps Resolved

| Gap | Resolution Applied |
|---|---|
| `vendors` table undefined | Added `vendors` SQL schema (id, name, contact, phone, email); `vendor_id` FK in events preserved |
| `users` table missing | Added full `users` SQL schema (id, email, password_hash, role, name, timestamps) |
| `audit_logs` table missing | Added full `audit_logs` SQL schema (INSERT-only; action, actor_id, actor_role, target_id, metadata JSONB) |
| Missing scaffold packages | Added `@fastify/multipart`, `xlsx`, `node-cron`, `qrcode` + `@types/jsonwebtoken`, `@types/bcrypt`, `@types/node-cron`, `@types/qrcode` |
| PDF export unspecified | `pdfkit` selected; chart-in-PDF deferred to Sprint 3; marked in Deferred Decisions |
| BE QR rendering | `qrcode` npm — PNG Buffer → base64 inline image in Brevo HTML email |
| Legacy document-store references | Corrected to "self-hosted" throughout (deployment was simplified to Docker Compose only) |

---

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed (4 feature areas, 3 UX surfaces)
- [x] Scale and complexity assessed (500K contacts, hybrid DB, 3 AI integrations)
- [x] Technical constraints identified (Indonesian 4G, offline resilience, multi-timezone)
- [x] Cross-cutting concerns mapped (9 categories with explicit rules)

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions (see Decision Log + Tech Stack table)
- [x] Technology stack fully specified — both repos with exact packages and versions
- [x] Integration patterns defined — Write/Read path, async BullMQ, polling (no WebSocket MVP)
- [x] Performance considerations addressed — indexes, Redis cache, pagination, offline

**✅ Implementation Patterns**
- [x] Naming conventions established — snake_case DB, camelCase API, PascalCase components
- [x] Structure patterns defined — repository, service, route handler with code examples
- [x] Communication patterns specified — BullMQ job naming, error schema, audit log format
- [x] Process patterns documented — token refresh, rate limiting, AI fallback (confidence < threshold)

**✅ Project Structure**
- [x] Complete directory structure defined for both repos (all files named)
- [x] Component boundaries established (API, data, service, component boundaries)
- [x] Integration points mapped (internal flow + external services)
- [x] Requirements-to-structure mapping complete (F1–F4 + cross-cutting concerns)

---

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level: High**

**Key Strengths:**
- Two-repo separation with TypeScript type contract as coordination mechanism — teams stay unblocked
- MSW + DevToolbar enables full FE development with zero BE dependency
- Repository pattern strictly enforced — infrastructure can evolve (pg on VPS → managed Postgres) with limited file changes
- All infrastructure self-hosted via Docker Compose — zero external dependency except Everpro + Brevo
- Opaque string primary keys throughout — RDS migration is a single env var change
- Clear enforcement rules for AI agents — both MUST and MUST NOT lists cover 25+ conflict points
- Offline scan resilience is fully specified — IndexedDB queue + flush + conflict surfacing

**Areas for Future Enhancement:**
- PDF export with embedded charts (Sprint 3)
- WebSocket / SSE for live attendance counter (post-MVP, currently polling 5s)
- Separate worker container for ETL/blast (when VPS load warrants it — no code changes required)
- Read replica for analytics queries (when reporting queries impact write performance)
- Optional document-store extraction only if PostgreSQL JSONB becomes a proven bottleneck under real production load

---

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented — refer to Decision Log for rationale
- Use implementation patterns consistently — copy the code examples as templates
- Respect project structure and naming boundaries — do not create files outside defined directories
- Refer to Enforcement Guidelines (MUST / MUST NOT) for all ambiguous decisions

**First Implementation Priority:**
```bash
# Step 1 — yorindo-api
mkdir yorindo-api && cd yorindo-api
# Run full scaffold command (see Backend Scaffold section)
# Run: npx tsx scripts/migrate.ts  (after creating db/migrations/*.sql)

# Step 2 — yorindo-app
npx create-next-app@16 yorindo-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
# Run post-init setup (see Frontend Scaffold section)
```

---

## Repository Pattern (Expanded)

> Revised 2026-03-21 — per Sprint Change Proposal v2. Enables concurrent FE+BE development with in-memory implementations before persistent storage is integrated.

Cross-cutting concern #2 in this document establishes the Repository Pattern. This section provides implementation detail.

### Interface Location

All repository interfaces live in `src/interfaces/repositories/`. Each interface is the **only** thing that services import — never a concrete implementation directly.

```
src/
  interfaces/
    repositories/
      IContactRepository.ts
      IEventRepository.ts
      IRegistrationRepository.ts
      IUserRepository.ts
      ISurveyRepository.ts
      IFlaggedRecordsRepository.ts
      ISuppressionRepository.ts
    services/           ← See Service Adapter Pattern section below
  repositories/
    postgres/           ← Phase 2: real PostgreSQL implementations
      ContactRepository.ts
      EventRepository.ts
      RegistrationRepository.ts
      UserRepository.ts
      FlaggedRecordsRepository.ts
      SuppressionRepository.ts
    postgres/           ← Phase 2: real PostgreSQL implementations
      SurveyRepository.ts
    memory/             ← Phase 1: in-memory implementations (test + dev without DB)
      InMemoryContactRepository.ts
      InMemoryEventRepository.ts
      InMemoryRegistrationRepository.ts
      InMemoryUserRepository.ts
      InMemorySurveyRepository.ts
      InMemoryFlaggedRecordsRepository.ts
      InMemorySuppressionRepository.ts
```

### Example Interface

```typescript
// src/interfaces/repositories/IContactRepository.ts
export interface IContactRepository {
  findAll(filters: ContactFilters): Promise<PaginatedResult<Contact>>
  findById(id: string): Promise<Contact | null>
  upsertByPhone(contact: UpsertContactInput): Promise<Contact>
  updateFlag(id: string, flagCategory: FlagCategory | null): Promise<Contact>
  count(filters: ContactFilters): Promise<number>
}
```

### DI Binding

Dependency injection is done in `src/container.ts`. Phase is controlled by `REPOSITORY_IMPL=memory|postgres` env var (defaults to `memory` in development).

```typescript
// src/container.ts
const impl = process.env.REPOSITORY_IMPL ?? 'memory'

export const contactRepo: IContactRepository =
  impl === 'postgres'
    ? new PostgresContactRepository(pgPool)
    : new InMemoryContactRepository()
```

Services receive the interface via constructor injection. Route handlers call services only — never repositories directly.

### Phase Transition

To promote a repository from in-memory to PostgreSQL:
1. Implement `PostgresXRepository` (pass all existing unit tests)
2. Change `REPOSITORY_IMPL=postgres` in `.env`
3. Run `npx tsx scripts/migrate.ts`
4. Run integration tests

No service or route handler code changes required.

---

## Service Adapter Pattern

> Added 2026-03-21 — per Sprint Change Proposal v2. Enables all external service dependencies (Brevo, Everpro, GPT-4o, Claude) to be mocked during Phase 1, swapped in Phase 2.

### Interface Location

All service interfaces live in `src/interfaces/services/`.

```
src/
  interfaces/
    services/
      IEmailService.ts
      IWhatsAppService.ts
      IEtlNormalizationService.ts
      IYoriMindService.ts
      IQueueService.ts
      IOtpService.ts
  services/
    adapters/
      mock/             ← Phase 1: returns deterministic fixture data
        MockEmailService.ts
        MockWhatsAppService.ts
        MockEtlNormalizationService.ts
        MockYoriMindService.ts
        MockQueueService.ts
        MockOtpService.ts
      real/             ← Phase 2: real external API calls
        BrevoEmailService.ts
        EverproWhatsAppService.ts
        GptEtlNormalizationService.ts
        ClaudeYoriMindService.ts
        BullMQQueueService.ts
        TwilioOtpService.ts  ← or SMS gateway of choice
```

### Interface Contracts

```typescript
// IEmailService.ts
export interface IEmailService {
  sendTransactional(to: string, templateId: string, params: Record<string, unknown>): Promise<void>
  sendBlast(recipients: BlastRecipient[], templateId: string): Promise<BlastResult>
}

// IWhatsAppService.ts
export interface IWhatsAppService {
  sendMessage(to: string, templateName: string, params: Record<string, unknown>): Promise<void>
  sendBlast(recipients: BlastRecipient[], templateName: string): Promise<BlastResult>
}

// IEtlNormalizationService.ts
export interface IEtlNormalizationService {
  normalizeRows(rows: RawContactRow[]): Promise<NormalizedContactRow[]>
}

// IYoriMindService.ts
export interface IYoriMindService {
  analyzeEvent(snapshot: EventSnapshot): Promise<YoriMindResult>
}

// IQueueService.ts
export interface IQueueService {
  enqueue(queueName: string, job: JobPayload): Promise<string>
  getStatus(jobId: string): Promise<JobStatus>
}
```

### Mock Implementations

Mock implementations return deterministic, seeded fixture data — no network calls. They implement the same interface as the real adapters.

```typescript
// MockEmailService.ts — Phase 1
export class MockEmailService implements IEmailService {
  private sentEmails: Array<{ to: string; templateId: string; params: unknown }> = []

  async sendTransactional(to: string, templateId: string, params: Record<string, unknown>) {
    this.sentEmails.push({ to, templateId, params })
    // No network call — records for test assertions
  }

  async sendBlast(recipients: BlastRecipient[], _templateId: string): Promise<BlastResult> {
    return { sent: recipients.length, failed: 0, jobId: `mock-blast-${Date.now()}` }
  }

  // Test helper — not in interface
  getSentEmails() { return this.sentEmails }
}
```

### DI Binding

Same pattern as repositories. Controlled by `SERVICE_IMPL=mock|real` env var (defaults to `mock`).

```typescript
// src/container.ts (extended)
const svcImpl = process.env.SERVICE_IMPL ?? 'mock'

export const emailService: IEmailService =
  svcImpl === 'real'
    ? new BrevoEmailService(config.brevoApiKey)
    : new MockEmailService()
```

### Phase Transition

To promote a service adapter from mock to real:
1. Implement the real adapter class (implement interface, add integration test) — e.g. `OpenAIEtlAdapter`, `AnthropicYoriMindAdapter`, `GeminiSmartFilterAdapter`
2. Change `SERVICE_IMPL=real` in `.env`
3. Set AI provider env vars: `ETL_AI_PROVIDER`, `YORIMIND_AI_PROVIDER`, `SMART_FILTER_AI_PROVIDER` — accepted values: `openai`, `anthropic`, `google`, or any custom adapter registered in container.ts
4. Configure provider API keys in `.env` — named by provider (e.g. `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`)
4. Run integration tests

No worker or service business logic changes required.

Before writing any feature code: agree on `src/types/api.ts` contract between FE and BE teams.
