# Yorindo App

Frontend for the **Yorindo** event-management platform — Next.js App Router with MSW mock API.

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand |
| Data fetching | TanStack React Query v5 |
| Tables | TanStack Table v8 |
| Forms | React Hook Form v7 + Zod |
| Charts | Recharts v3 |
| Survey builder | react-jsonschema-form (RJSF) v6 |
| API mocking | MSW v2 |
| PWA | @serwist/next |
| IndexedDB | idb v8 |
| Tests | Vitest + Testing Library |

---

## Local Development (Frontend Only — MSW Mocks)

No backend required. All API calls are intercepted by MSW.

```bash
cd yorindo-app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login`.

### Test Credentials

| Role | Email | Password | Redirects to |
|---|---|---|---|
| **Admin** | `admin@yorindo.app` | `password123` | `/app` — full access |
| **Staff** | `budi@yorindo.app` | `password123` | `/app/scan` — check-in only |
| **Viewer** | `sari@yorindo.app` | `password123` | `/app` — read-only |
| **Participant** | `user@example.com` | `password123` | `/app/dashboard` — self-service |

---

## Local Development (Full Stack — Docker Compose)

Runs the frontend, backend, Postgres, and Redis together. The API uses in-memory repositories by default (no migrations needed).

### Prerequisites

- Docker Desktop or Docker Engine + Compose plugin
- Node.js 20+ (for local FE development outside Docker)

### Steps

```bash
# 1. Clone and move to monorepo root
cd yorindo

# 2. Copy env file and fill in JWT secrets (minimum required for Phase 1)
cp yorindo-api/.env.example yorindo-api/.env
# Edit yorindo-api/.env — change JWT_SECRET and JWT_REFRESH_SECRET

# 3. Start all services with hot reload
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Services started:

| Service | URL |
|---|---|
| Next.js app | http://localhost:3000 |
| Fastify API | http://localhost:3001 (via docker-compose.dev.yml port override) |
| Postgres | localhost:5432 |
| Redis | localhost:6379 |

> **Tip:** The `docker-compose.dev.yml` override mounts source directories for hot reload on both FE and BE. Node modules and `.next` cache are preserved in anonymous volumes — the host `node_modules` is never used inside the container.

### Switching to a Real Database (Phase 2)

When the BE is ready for real Postgres, update `yorindo-api/.env`:

```env
REPOSITORY_IMPL=postgres    # was: memory
SERVICE_IMPL=real           # was: mock
DATABASE_URL=postgresql://yorindo:yourpassword@postgres:5432/yorindo
REDIS_URL=redis://redis:6379
POSTGRES_PASSWORD=yourpassword
```

Then run migrations:

```bash
docker compose exec api npm run migrate
```

---

## Running Tests

```bash
npm test              # run all tests once
npm run test:watch    # watch mode
npm run test:coverage # coverage report
```

---

## Project Structure

```
src/
  app/
    app/              # Role-guarded admin shell (admin, staff, viewer)
      contacts/
      events/[id]/
      scan/
      dashboard/
    register/[eventSlug]/   # Public event landing + registration form
    data-rights/            # UU PDP data request / erasure pages
    login/
  components/
    features/         # Feature-specific components (per domain)
    layout/           # AdminShell, ParticipantShell
    ui/               # shadcn/ui primitives
  mocks/
    handlers/         # MSW request handlers (auth, contacts, events, …)
  store/              # Zustand stores (authStore, …)
  lib/
    offline/          # IndexedDB helpers for offline scan queue
  types/
    api.ts            # Shared TypeScript types matching OpenAPI contract
```

---

## Role Permissions

| Area | Admin | Staff | Viewer | Participant |
|---|---|---|---|---|
| Dashboard `/app` | ✅ | ❌ | ✅ | ✅ (own) |
| Contacts `/app/contacts` | ✅ | ❌ | ❌ | ❌ |
| Events `/app/events` | ✅ | ❌ | ✅ | ❌ |
| Templates `/app/templates` | ✅ | ❌ | ❌ | ❌ |
| Users `/app/users` | ✅ | ❌ | ❌ | ❌ |
| Check-in `/app/scan` | ❌ | ✅ | ❌ | ❌ |
| Public registration `/register/:slug` | 🌐 | 🌐 | 🌐 | 🌐 |
| Data rights `/data-rights/*` | 🌐 | 🌐 | 🌐 | 🌐 |
