# Yorindo API

Fastify backend for the **Yorindo** event-management platform.

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Fastify v4 |
| Language | TypeScript (ESM) |
| Auth | JWT (access + refresh cookie) |
| Queue | BullMQ |
| Database | PostgreSQL 16 + ioredis (Phase 2) |
| AI | OpenAI / Anthropic SDK (Phase 2) |
| Tests | Vitest |
| Runtime | Node.js 20 |

---

## Local Development (Standalone — In-Memory)

No Docker required. The API runs entirely in memory — no Postgres or Redis needed.

```bash
cd yorindo-api

# 1. Install dependencies
npm install

# 2. Create env file (Phase 1 defaults work out of the box)
cp .env.example .env
# Edit .env — change JWT_SECRET and JWT_REFRESH_SECRET to any 32+ char strings

# 3. Start with hot reload
npm run dev
```

API is available at [http://localhost:3000](http://localhost:3000).

Health check: `curl http://localhost:3000/api/health`

> **Phase 1 defaults:** `REPOSITORY_IMPL=memory` and `SERVICE_IMPL=mock` are set in `.env.example`. The server starts without any database connection.

---

## Local Development (Full Stack — Docker Compose)

Runs the API alongside the frontend, Postgres, and Redis with hot reload.

```bash
# From monorepo root
cp yorindo-api/.env.example yorindo-api/.env
# Edit yorindo-api/.env — set JWT_SECRET and JWT_REFRESH_SECRET

docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

The `docker-compose.dev.yml` override:
- Mounts `./yorindo-api:/app` for hot reload via `tsx --watch`
- Exposes Postgres on `localhost:5432` and Redis on `localhost:6379`

---

## Environment Variables

See [`yorindo-api/.env.example`](.env.example) for the full reference. Key variables:

| Variable | Phase 1 default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP listen port |
| `JWT_SECRET` | *(required)* | Access token signing secret (32+ chars) |
| `JWT_REFRESH_SECRET` | *(required)* | Refresh token signing secret (32+ chars, different from above) |
| `REPOSITORY_IMPL` | `memory` | `memory` = in-memory repos; `postgres` = real DB |
| `SERVICE_IMPL` | `mock` | `mock` = stub services; `real` = live integrations |
| `DATABASE_URL` | *(Phase 2)* | PostgreSQL connection string |
| `REDIS_URL` | *(Phase 2)* | Redis connection string |

### Minimum `.env` for Phase 1

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=any_string_at_least_32_characters_long
JWT_REFRESH_SECRET=different_string_at_least_32_characters
REPOSITORY_IMPL=memory
SERVICE_IMPL=mock
```

---

## Scripts

```bash
npm run dev           # start with tsx --watch (hot reload)
npm run build         # compile TypeScript → dist/
npm start             # run compiled output (production)
npm test              # run all tests once
npm run test:watch    # watch mode
npm run test:coverage # coverage report
npm run migrate       # run database migrations (Phase 2)
npm run seed          # seed database with sample data (Phase 2)
```

---

## API Reference

The full OpenAPI 3.0 specification is at [`openapi.yaml`](openapi.yaml).

Quick reference:

| Group | Base path |
|---|---|
| Health | `GET /api/health` |
| Auth | `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout` |
| Contacts | `GET/POST /api/contacts`, `GET /api/contacts/flagged`, … |
| Events | `GET/POST /api/events`, `GET/PUT/DELETE /api/events/:id`, … |
| Registrations | `GET/POST /api/registrations`, … |
| Scan | `POST /api/scan/verify` |
| Blast | `POST /api/events/:id/blast` |
| Users | `GET/POST /api/users`, … |
| ETL | `POST /api/etl/upload` |
| Vendors | `GET/POST /api/vendors`, `GET/PATCH/DELETE /api/vendors/:id`, `GET/POST /api/events/:id/sponsors`, `PATCH/DELETE /api/events/:id/sponsors/:vendorId` |
| Templates | `GET/POST /api/templates`, `PUT/DELETE /api/templates/:id` |

---

## Project Structure

```
src/
  main.ts             # Fastify server bootstrap
  plugins/            # Fastify plugins (auth, cors, rate-limit, …)
  routes/             # Route handlers (one file per domain)
  services/           # Business logic / service layer
  repositories/
    memory/           # Phase 1 in-memory implementations
    postgres/         # Phase 2 real DB implementations
  adapters/           # External service adapters (AI, email, SMS)
  schemas/            # Zod validation schemas
  types/              # Shared TypeScript types
scripts/
  migrate.ts          # Database migration runner
  seed.ts             # Sample data seeder
migrations/           # SQL migration files
```

---

## Switching to Real Database (Phase 2)

Update `.env`:

```env
REPOSITORY_IMPL=postgres
SERVICE_IMPL=real
DATABASE_URL=postgresql://yorindo:yourpassword@localhost:5432/yorindo
REDIS_URL=redis://localhost:6379
```

Run migrations:

```bash
npm run migrate
```
