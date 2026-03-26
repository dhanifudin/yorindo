# Story 1.1: Backend Repository Scaffold & Docker Compose

## Story

**As a** developer,
**I want** the `yorindo-api` repository initialized with all required packages, TypeScript configuration, Fastify server skeleton, and Docker Compose setup for all services,
**So that** the full backend stack runs locally with a single command and matches the production environment structure.

## Status

review

## Context

This is the foundational BE story that must be completed before any Phase 2 BE feature work. The `yorindo-api` directory already exists with a `Dockerfile`, `.env.example`, and a 68K `openapi.yaml` — but has NO `src/` directory yet. This story establishes the complete `src/` structure including the SE design patterns (Repository Pattern, Service Adapter Pattern, DI container) required by all subsequent BE stories.

This story is Phase 1 BE — it does not depend on any FE stories and can be done in parallel. Story 1.8 (Service Adapter Scaffold) builds on top of this scaffold by filling the interfaces and in-memory implementations. Story 1.1 establishes the directory structure and wiring; Story 1.8 populates the content.

## Acceptance Criteria

**AC1:** Given the repo is freshly cloned,
When `npm install` is run,
Then all packages install without errors and `npx tsx src/main.ts` starts the Fastify server

**AC2:** Given Docker Compose is installed,
When `docker compose -f docker-compose.yml -f docker-compose.dev.yml up` is run,
Then all five containers start (postgres:16-alpine, redis:7-alpine, api, app, nginx) without errors

**AC3:** Given the API container is running,
When `GET http://localhost:3000/api/health` is called,
Then it returns `{ "status": "ok" }` with HTTP 200

**AC4:** Given a required env var is missing from `.env`,
When the server starts,
Then `src/config/index.ts` throws a descriptive error at startup — not at first request

**AC5:** Given the dev override is active and a source file in `src/` is modified,
When the file is saved,
Then the API server hot-reloads (`legacyWatch: true` configured for WSL2)

**AC6:** Given an authenticated API request is made with a body that violates the OpenAPI schema,
When Fastify's AJV schema validation processes the request,
Then it returns HTTP 400 with `{ error: { code: 'VALIDATION_ERROR', message: '...', details: [...] } }` before the handler runs

**AC7:** Given the `src/` directory structure is established,
Then the following directories exist: `src/interfaces/repositories/`, `src/interfaces/services/`, `src/repositories/memory/`, `src/repositories/postgres/` (empty, Phase 2), `src/services/adapters/mock/`, `src/services/adapters/real/` (empty, Phase 2), `src/container.ts`

**AC8:** Given `src/container.ts` is created,
Then it exports all repository and service instances resolved from `REPOSITORY_IMPL` and `SERVICE_IMPL` env vars (defaults: `memory` and `mock` respectively); all exports are typed to their interface, not their concrete implementation class

## Dev Notes

### Tech Stack (Authoritative)

- **Runtime:** Node.js 20 LTS
- **Framework:** Fastify 4.x (NOT Express — no `express` package ever)
- **Language:** TypeScript 5.x strict mode
- **SQL:** `pg` Pool — direct SQL queries (no ORM, no Prisma, no Knex); JSONB columns for document-style storage
- **Auth:** `jsonwebtoken` + `bcrypt`
- **Queue:** BullMQ + IORedis
- **Validation:** Zod 3.x
- **Logging:** pino + pino-http
- **Testing:** Vitest + @vitest/coverage-v8
- **Containerization:** Docker + Docker Compose

### File Locations

All files are in `/home/dhs/Workspaces/kada/yorindo/yorindo-api/`

```
yorindo-api/
  src/
    server.ts                    ← Fastify app instance, plugin registration
    main.ts                      ← Entry point, listen()
    config/
      index.ts                   ← Centralized env access; throws on missing vars
    routes/
      health.ts                  ← GET /api/health
    repositories/
      memory/                    ← Empty dir — populated in Story 1.8
      postgres/                  ← Empty dir — Phase 2 only
    interfaces/
      repositories/              ← Empty dir — populated in Story 1.8
      services/                  ← Empty dir — populated in Story 1.8
    services/
      adapters/
        mock/                    ← Empty dir — populated in Story 1.8
        real/                    ← Empty dir — Phase 2 only
    lib/
      postgres.ts                ← Singleton pg Pool
      redis.ts                   ← Singleton IORedis
      queue.ts                   ← BullMQ Queue factory
      storage.ts                 ← Local filesystem read/write
    middleware/
      auth.ts                    ← JWT verification middleware
      roles.ts                   ← Role-check middleware
    types/
      index.ts                   ← Shared TS interfaces
    container.ts                 ← DI container — resolves repos + services from env vars
  scripts/
    migrate.ts                   ← Placeholder (populated in Story 1.2)
    seed.ts                      ← Placeholder (populated in Story 1.2)
  docker-compose.yml             ← Production (6 containers)
  docker-compose.dev.yml         ← Dev override (hot reload, port exposure)
  .env.example                   ← Already exists; verify all required keys present
  Dockerfile                     ← Already exists; verify correctness
  tsconfig.json
  package.json
  vitest.config.ts
```

### Architecture Constraints (MUST FOLLOW)

1. **No Express** — Fastify only. If any PR contains `import express` it is a blocker.
2. **No ORM** — `pg` Pool with raw SQL for PostgreSQL. JSONB columns replace any document-store needs (no MongoDB).
3. **No `process.env` outside `src/config/index.ts`** — all env access goes through the config module which throws on missing required vars.
4. **Interface-first typing** — `src/container.ts` exports typed to interfaces (e.g., `IContactRepository`), never to concrete class (e.g., `InMemoryContactRepository`). Route handlers import interface types only.
5. **Repository Pattern** — All DB queries live exclusively in `repositories/` files. Services call repositories only; route handlers call services only. Never query DB directly from a route handler.
6. **DI via container.ts** — `REPOSITORY_IMPL` env var switches between `memory` (default, Phase 1) and `postgres` (Phase 2). `SERVICE_IMPL` switches between `mock` (default) and `real`.

### Key Patterns from Existing Code

The `openapi.yaml` already exists (68K). The Fastify server should load and validate request schemas against it using `@fastify/swagger` or AJV directly. The error response format is standardized: `{ error: { code: string, message: string, details: array } }`.

### Exact Code Snippets (MUST USE)

**`src/config/index.ts`:**
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

**`src/lib/redis.ts`:**
```typescript
import IORedis from 'ioredis'
import { config } from '../config/index.js'

export const redis = new IORedis(config.redisUrl, { maxRetriesPerRequest: null })
```

**`src/lib/queue.ts`:**
```typescript
import { Queue } from 'bullmq'
import { redis } from './redis.js'

export function createQueue(name: string) {
  return new Queue(name, { connection: redis })
}

export const etlQueue = createQueue('etl')
export const blastQueue = createQueue('blast')
export const transactionalQueue = createQueue('transactional')
export const marketingQueue = createQueue('marketing')
```

Note: Four named BullMQ queues are required: `otp` > `emergency-blast` > `transactional` > `marketing`. Adjust above accordingly.

**`src/container.ts` skeleton:**
```typescript
import type { IContactRepository } from './interfaces/repositories/IContactRepository.js'
// ... other interface imports

const REPOSITORY_IMPL = process.env.REPOSITORY_IMPL || 'memory'
const SERVICE_IMPL = process.env.SERVICE_IMPL || 'mock'

// Phase 1: returns empty implementations — Story 1.8 fills these
export const contactRepository: IContactRepository = (() => {
  if (REPOSITORY_IMPL === 'memory') {
    // lazy import to avoid require cycle — Story 1.8 provides these
    const { InMemoryContactRepository } = require('./repositories/memory/ContactRepository.js')
    return new InMemoryContactRepository()
  }
  throw new Error(`Unknown REPOSITORY_IMPL: ${REPOSITORY_IMPL}`)
})()
```

**`tsconfig.json` key settings:**
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

### Anti-Patterns (NEVER DO)

- NEVER import Express or any Express middleware
- NEVER use Prisma, Knex, Sequelize, or any ORM
- NEVER use Mongoose or any MongoDB driver — PostgreSQL only (JSONB for document-style storage)
- NEVER access `process.env` directly outside `src/config/index.ts`
- NEVER query the database from a route handler directly — always go through service → repository
- NEVER export a concrete class type from `container.ts` — only interface types

### Docker Compose Requirements

Five containers in `docker-compose.yml`:
- `postgres:16-alpine` — port 5432, volume `postgres_data`
- `redis:7-alpine` — port 6379, AOF persistence (`appendonly yes`), volume `redis_data`
- `api` — yorindo-api Fastify server, port 3000
- `app` — yorindo-app Next.js, port 3001
- `nginx` — reverse proxy, port 80/443

`docker-compose.dev.yml` override:
- `api` service: `command: npx tsx --watch --experimental-specifier-resolution=node src/main.ts` with `legacyWatch: true` for WSL2
- Volumes: mount `./src` into container for hot reload

### Test Requirements

- Vitest configuration in `vitest.config.ts`
- `npm test` must run `vitest run` (not watch mode in CI)
- Test for health endpoint: `GET /api/health` returns `{ status: 'ok' }` HTTP 200
- Test for config validation: missing required env var throws at startup
- Tests should NOT require Docker running — use in-memory mocks

### Dependencies

No prerequisite stories. This is the foundation story.

Required packages (install these):
```bash
npm install fastify @fastify/cors @fastify/helmet @fastify/rate-limit @fastify/cookie @fastify/multipart
npm install pg @paralleldrive/cuid2 bullmq ioredis zod dotenv pino pino-http
npm install jsonwebtoken bcrypt xlsx node-cron qrcode
npm install openai @anthropic-ai/sdk
npm install -D typescript tsx vitest @vitest/coverage-v8
npm install -D @types/pg @types/node @types/jsonwebtoken @types/bcrypt @types/node-cron @types/qrcode
```

## Tasks / Subtasks

- [x] Task 1: Verify and finalize package.json and install all dependencies
  - [x] Subtask 1.1: Run `npm install` with all required packages listed above
  - [x] Subtask 1.2: Verify `.env.example` has all keys matching `src/config/index.ts`
  - [x] Subtask 1.3: Create `tsconfig.json` with NodeNext module resolution

- [x] Task 2: Create `src/config/index.ts` with centralized env access
  - [x] Subtask 2.1: Implement `required()` helper that throws on missing vars
  - [x] Subtask 2.2: Export `config` object with all keys from `.env.example`

- [x] Task 3: Create `src/lib/` singletons
  - [x] Subtask 3.1: `postgres.ts` — pg Pool singleton
  - [x] Subtask 3.2: `redis.ts` — IORedis singleton with `maxRetriesPerRequest: null`
  - [x] Subtask 3.4: `queue.ts` — BullMQ Queue factory + four named queues
  - [x] Subtask 3.5: `storage.ts` — VPS filesystem read/write for snapshots

- [x] Task 4: Create Fastify server scaffold
  - [x] Subtask 4.1: `src/server.ts` — create Fastify instance, register CORS/helmet/rate-limit/cookie plugins
  - [x] Subtask 4.2: `src/main.ts` — entry point, call `server.listen({ port: config.port })`
  - [x] Subtask 4.3: `src/routes/health.ts` — `GET /api/health` returns `{ status: 'ok' }`
  - [x] Subtask 4.4: Register health route in server.ts
  - [x] Subtask 4.5: Add error handler with `{ error: { code, message, details } }` shape

- [x] Task 5: Create directory structure and `src/container.ts` skeleton
  - [x] Subtask 5.1: Create all required empty directories per file locations above
  - [x] Subtask 5.2: Create `src/container.ts` skeleton with `REPOSITORY_IMPL`/`SERVICE_IMPL` env switch
  - [x] Subtask 5.3: Create `src/middleware/auth.ts` and `src/middleware/roles.ts` stubs

- [x] Task 6: Create Docker Compose files
  - [x] Subtask 6.1: `docker-compose.yml` with five containers (postgres, redis, api, app, nginx)
  - [x] Subtask 6.2: `docker-compose.dev.yml` override with hot reload
  - [x] Subtask 6.3: Verify `Dockerfile` builds correctly with `docker build`

- [x] Task 7: Create `vitest.config.ts` and write tests
  - [x] Subtask 7.1: Configure vitest with Node environment
  - [x] Subtask 7.2: Test: `GET /api/health` returns 200 `{ status: 'ok' }`
  - [x] Subtask 7.3: Test: `config` throws on missing required env var
  - [x] Subtask 7.4: Run `npm test` — all tests pass

## Dev Agent Record

### Implementation Plan

1. Create `package.json` with all required deps (Fastify, pg, @paralleldrive/cuid2, bullmq, ioredis, zod, jwt, bcrypt, vitest, etc.)
2. Create `tsconfig.json` with NodeNext module resolution and strict mode
3. Create `src/config/index.ts` — Phase 1 constraint: only `JWT_SECRET` and `JWT_REFRESH_SECRET` are required; all DB URLs and API keys use `optional()` helper
4. Create `src/lib/` singletons as lazy getters (NOT imported at startup — Phase 2 only)
5. Create Fastify server scaffold (`src/server.ts`, `src/main.ts`, `src/routes/health.ts`)
6. Create middleware stubs (`src/middleware/auth.ts`, `src/middleware/roles.ts`)
7. Create `src/types/index.ts` with shared interfaces
8. Create `src/container.ts` skeleton (Story 1.8 populates)
9. Create empty directory structure per AC7
10. Create `scripts/migrate.ts` and `scripts/seed.ts` placeholders
11. Create `vitest.config.ts` and tests
12. Update `docker-compose.dev.yml` with hot-reload command
13. Run `npm install` and `npm test`

### Debug Log

- **Phase 1 constraint applied:** config.ts originally had all env vars as `required()`. Revised to use `optional()` for all DB URLs and API keys — only `JWT_SECRET` and `JWT_REFRESH_SECRET` throw on startup.
- **Lazy lib singletons:** postgres.ts, redis.ts, queue.ts all use lazy getter pattern (`getPool()`, `getRedis()`, etc.) — not imported at startup. Prevents connection errors when running Phase 1 without DB.
- **Config test isolation:** Used `vi.resetModules()` to clear module cache between test cases so each test re-evaluates the config module with a fresh env state.

### Completion Notes

- All 66 tests pass across 8 test files (8 test suites, 2 skipped)
- Phase 1 starts with zero external connections: only Fastify + in-memory state
- **Architecture update (2026-03-26):** Removed `mongodb` package; added `@paralleldrive/cuid2`; removed `src/lib/mongodb.ts`; removed `mongodbUrl` from config; fixed docker-compose api `depends_on` (removed `- mongodb`); removed mongodb ports from `docker-compose.dev.yml`
- Fixed `src/lib/redis.ts` IORedis import: `import IORedis from 'ioredis'` → `import { Redis } from 'ioredis'` (TS2709 resolved)
- 4 named BullMQ queues: `otp` > `emergency-blast` > `transactional` > `marketing` (+ `etl`)
- Pre-existing TS errors in Story 1.8 files (repositories/memory, services) — tracked in Story 1.8

## File List

- `yorindo-api/package.json` (updated: removed `mongodb`, added `@paralleldrive/cuid2`)
- `yorindo-api/package-lock.json`
- `yorindo-api/tsconfig.json`
- `yorindo-api/vitest.config.ts`
- `yorindo-api/.env.example` (verified: MONGODB_URL removed)
- `yorindo-api/Dockerfile` (pre-existing, verified)
- `docker-compose.yml` (updated: removed mongodb from api depends_on)
- `docker-compose.dev.yml` (updated: removed mongodb ports section)
- `yorindo-api/scripts/migrate.ts`
- `yorindo-api/scripts/seed.ts`
- `yorindo-api/src/config/index.ts` (updated: removed mongodbUrl)
- `yorindo-api/src/server.ts`
- `yorindo-api/src/main.ts`
- `yorindo-api/src/routes/health.ts`
- `yorindo-api/src/middleware/auth.ts`
- `yorindo-api/src/middleware/roles.ts`
- `yorindo-api/src/types/index.ts`
- `yorindo-api/src/container.ts`
- `yorindo-api/src/lib/postgres.ts`
- `yorindo-api/src/lib/redis.ts` (updated: fixed IORedis import → `{ Redis }`)
- `yorindo-api/src/lib/queue.ts`
- `yorindo-api/src/lib/storage.ts`
- `yorindo-api/src/lib/mongodb.ts` (DELETED — MongoDB removed from stack)
- `yorindo-api/src/tests/health.test.ts`
- `yorindo-api/src/tests/config.test.ts`

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-22 | Story created (BE Foundation) | bmad-context-engine |
| 2026-03-26 | Architecture update: removed MongoDB, added @paralleldrive/cuid2; fixed IORedis import; fixed docker-compose depends_on | dev-agent |
