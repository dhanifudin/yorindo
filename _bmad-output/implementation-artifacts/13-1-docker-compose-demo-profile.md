---
title: 'Docker Compose Demo Profile'
slug: '13-1-docker-compose-demo-profile'
created: '2026-04-02'
status: 'ready-for-dev'
epic: 13
story: 1
tech_stack: ['docker-compose', 'dockerhub']
files_to_create:
  - 'docker-compose.demo.yml'
  - 'yorindo-api/.env.demo'
  - 'yorindo-app/.env.demo'
  - 'Makefile' (demo targets)
  - 'DEMO.md'
---

# Story 13.1: Docker Compose Demo Profile

**Story ID:** 13.1
**Story Key:** 13-1-docker-compose-demo-profile
**Epic:** Epic 13 — Demo Environment Deployment
**Status:** ready-for-dev

---

## Story

As a developer deploying the demo environment,
I want a `docker-compose.demo.yml` that provisions `yorindo-app`, `yorindo-api`, and `postgres` using images from Docker Hub,
so that I can deploy the demo stack and have it accessible via the existing VPS nginx reverse proxy at `https://demo.dhanifudin.com`.

---

## Acceptance Criteria

**AC1:** Given `docker-compose.demo.yml` exists, when `docker compose -f docker-compose.demo.yml up -d` is run, then all 3 services start: `yorindo-app`, `yorindo-api`, `postgres`.

**AC2:** Given the services are running, when the VPS nginx reverse proxy forwards requests to the container ports, then `https://demo.dhanifudin.com` serves the Yorindo app with valid HTTPS (managed by VPS nginx, not the compose stack).

**AC3:** Given the demo environment is running, when `yorindo-api` connects to PostgreSQL, then `REPOSITORY_IMPL=postgres` is set and the connection succeeds.

**AC4:** Given the demo environment is running, when external service calls would be made (email, WhatsApp, AI), then mock adapters are used — no real Brevo/Everpro/OpenAI calls unless keys are explicitly provided.

**AC5:** Given `.env.demo` files exist for both `yorindo-api` and `yorindo-app`, then all required environment variables are documented with demo-appropriate values (known demo user passwords, mock service flags, database URL).

**AC6:** Given images are pulled from Docker Hub, then the compose file references `dhanifudin/yorindo-api` and `dhanifudin/yorindo-app` (not GHCR).

---

## Context for Development

### Architecture

```
demo.dhanifudin.com (HTTPS via VPS nginx)
         │
         ▼  (reverse proxy)
   ┌──────────────────┐
   │  VPS nginx       │  ← Already configured on host, manages SSL certs
   └────┬─────────┬───┘
        │         │
        ▼         ▼
   :5173       :3000
   (app)       (api)
   ┌──────────────┐
   │ docker-compose │
   │ ┌──────────┐  │
   │ │postgres  │  │
   │ │:5432     │  │
   │ └──────────┘  │
   └──────────────┘
```

### Services

| Service | Image | Port (host) | Env Vars |
|---------|-------|-------------|----------|
| `postgres` | `postgres:16-alpine` | none (internal) | `POSTGRES_DB=yorindo`, `POSTGRES_USER=yorindo`, `POSTGRES_PASSWORD=demo123` |
| `yorindo-api` | `dhanifudin/yorindo-api:latest` | `3000` | `DATABASE_URL=postgresql://yorindo:demo123@postgres:5432/yorindo`, `REPOSITORY_IMPL=postgres`, `SERVICE_IMPL=mock`, `JWT_SECRET=demo-secret`, `PORT=3000` |
| `yorindo-app` | `dhanifudin/yorindo-app:latest` | `5173` | `NEXT_PUBLIC_API_URL=https://demo.dhanifudin.com/api`, `PORT=5173` |

### VPS Nginx Reverse Proxy

The VPS already runs nginx with HTTPS. It needs to proxy:
- `demo.dhanifudin.com` → `localhost:5173` (yorindo-app)
- `demo.dhanifudin.com/api/*` → `localhost:3000` (yorindo-api)

The nginx config is **outside** this compose file — it's managed on the VPS directly. The compose file only needs to expose ports `5173` and `3000` on the host.

### Existing Files to Reference

- `docker-compose.yml` — base compose file (reference for service definitions)
- `docker-compose.dev.yml` — dev override pattern (reference for env var structure)
- `yorindo-api/.env.example` — reference for required API env vars
- `yorindo-app/.env.example` — reference for required app env vars

### Technical Decisions

- **Volume reset:** `docker compose down -v` deletes the PostgreSQL volume — full data wipe on each deploy
- **Mock services:** `SERVICE_IMPL=mock` ensures no real external service calls during demo
- **Known passwords:** All demo users use `demo123` as password — documented in `DEMO.md`
- **No Redis/BullMQ:** Demo doesn't need background workers — ETL and blast run synchronously in mock mode
- **No nginx in compose:** HTTPS termination is handled by the existing VPS nginx, not a container
- **Docker Hub images:** Images are `dhanifudin/yorindo-api` and `dhanifudin/yorindo-app` — not GHCR

---

## Implementation Plan

### Task 1: Create `docker-compose.demo.yml`

Define 3 services: `postgres`, `yorindo-api`, `yorindo-app`. Use named volume for postgres data. Expose ports `3000` and `5173` on host for VPS nginx to proxy to. Configure health checks.

### Task 2: Create `.env.demo` files

Create `yorindo-api/.env.demo` and `yorindo-app/.env.demo` with all required variables for demo mode.

### Task 3: Create Makefile demo targets

Add targets:
- `make deploy-demo` — down -v, pull, up, migrate, seed
- `make reset-demo` — down -v, up, migrate, seed (re-seed without full rebuild)
- `make stop-demo` — down (preserve data)
- `make logs-demo` — follow logs

### Task 4: Create `DEMO.md`

Document:
- Deployment process
- Demo credentials (admin@demo.com, viewer@demo.com, staff@demo.com — all password: `demo123`)
- Reset procedure
- VPS nginx reverse proxy configuration example
- Seed data overview (what events, contacts, etc. are included)

---

## Dependencies

- Epic 4 Story 4.4 (Survey Builder) must be implemented — seed data includes survey schemas
- PostgreSQL migrations 001-006 must exist and be runnable
- Docker Hub images must be published for both `yorindo-api` and `yorindo-app`
- VPS nginx must be configured to reverse proxy to ports 5173 and 3000
