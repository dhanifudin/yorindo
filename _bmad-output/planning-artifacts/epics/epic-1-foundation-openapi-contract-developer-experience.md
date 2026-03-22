# Epic 1: Foundation, OpenAPI Contract & Developer Experience

Both development teams have fully operational environments with a shared OpenAPI contract gating all feature work. The FE team has complete MSW mocking for all planned API endpoints — enabling full parallel FE development with zero dependency on BE.

## Story 1.1: Backend Repository Scaffold & Docker Compose

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

**Given** the `src/` directory structure is established,
**Then** the following directories exist: `src/interfaces/repositories/`, `src/interfaces/services/`, `src/repositories/memory/`, `src/repositories/postgres/` (empty, Phase 2), `src/services/adapters/mock/`, `src/services/adapters/real/` (empty, Phase 2), `src/container.ts`

**Given** `src/container.ts` is created,
**Then** it exports all repository and service instances resolved from `REPOSITORY_IMPL` and `SERVICE_IMPL` env vars (defaults: `memory` and `mock` respectively); all exports are typed to their interface, not their concrete implementation class

> **Note:** Full interface definitions and in-memory implementations are done in Story 1.8.

---

## Story 1.2: Database Schema Migrations

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

## Story 1.3: Frontend Repository Scaffold

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

## Story 1.4: OpenAPI 3.0 Specification

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

## Story 1.5: FE Type Definitions, MSW Foundation & DevToolbar

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

## Story 1.6: MSW Mock Handlers for All API Domains

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

## Story 1.7: CI/CD Pipeline

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

## Story 1.8: Service Adapter Scaffold & In-Memory Repository Scaffold

> **Added 2026-03-21** — Sprint Change Proposal v2: Concurrent FE+BE mock-first strategy
> **Phase:** Foundation — required before any Phase 1 BE feature work begins

As a BE developer,
I want all repository interfaces, in-memory implementations, service adapter interfaces, and mock service implementations scaffolded,
So that all BE feature stories can be implemented in Phase 1 without any dependency on PostgreSQL, MongoDB, Redis, Brevo, Everpro, GPT-4o, or Claude.

**Acceptance Criteria:**

**Given** the repo is scaffolded,
**When** `src/interfaces/repositories/` is inspected,
**Then** TypeScript interfaces exist for: `IContactRepository`, `IEventRepository`, `IRegistrationRepository`, `IUserRepository`, `ISurveyRepository`, `IFlaggedRecordsRepository`, `ISuppressionRepository` — each with method signatures matching the OpenAPI spec (Story 1.4)

**Given** `src/interfaces/services/` is inspected,
**Then** TypeScript interfaces exist for: `IEmailService`, `IWhatsAppService`, `IEtlNormalizationService`, `IYoriMindService`, `IQueueService`, `IOtpService`

**Given** `src/repositories/memory/` is inspected,
**Then** in-memory implementations exist for all seven repository interfaces; each stores data in a local `Map` or array; all CRUD operations function correctly without a database connection

**Given** `src/services/adapters/mock/` is inspected,
**Then** mock implementations exist for all six service interfaces; each implementation:
- Makes no network calls
- Returns deterministic fixture data (seeded with `faker.seed(42)` or hardcoded fixtures)
- Records calls for test assertion (e.g., `MockEmailService.getSentEmails()`)

**Given** `src/container.ts` exists,
**When** `REPOSITORY_IMPL=memory` (default),
**Then** all DI bindings resolve to in-memory implementations

**Given** `src/container.ts` exists,
**When** `SERVICE_IMPL=mock` (default),
**Then** all DI bindings resolve to mock service adapters

**Given** the scaffold is complete,
**When** `npm test` is run,
**Then** unit tests for all in-memory repositories pass (CRUD operations verified); unit tests for all mock service adapters pass (call recording verified)

**Given** any BE feature story in Epics 2–9 is implemented in Phase 1,
**Then** its route handlers, services, and workers import only the interface types — never concrete repository or adapter class names — and receive implementations via `src/container.ts`

---
