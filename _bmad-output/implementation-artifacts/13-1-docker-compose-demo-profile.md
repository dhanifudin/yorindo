---
title: 'Docker Compose Demo Profile'
slug: '13-1-docker-compose-demo-profile'
created: '2026-04-02'
status: 'done'
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
**Status:** done

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

## Tasks/Subtasks

- [x] **Task 1:** Create `docker-compose.demo.yml` — 3 services (postgres, api, app), named volumes, healthcheck, ports bound to 127.0.0.1
- [x] **Task 2:** Create `.env.demo` files — `yorindo-api/.env.demo` and `yorindo-app/.env.demo` with demo-appropriate values
- [x] **Task 3:** Create Makefile demo targets — deploy-demo, reset-demo, stop-demo, logs-demo, migrate-demo, seed-demo
- [x] **Task 4:** Create `DEMO.md` — deployment docs, credentials, reset procedure, nginx example, seed data overview

---

## Dependencies

- Epic 4 Story 4.4 (Survey Builder) must be implemented — seed data includes survey schemas
- PostgreSQL migrations 001-006 must exist and be runnable
- Docker Hub images must be published for both `yorindo-api` and `yorindo-app`
- VPS nginx must be configured to reverse proxy to ports 5173 and 3000

---

## Dev Agent Record

### Implementation Plan

- Used existing `docker-compose.yml` and `docker-compose.dev.yml` as reference for service definitions
- App Dockerfile exposes port 3000 (Next.js standalone), so `docker-compose.demo.yml` maps host 5173 → container 3000
- API Dockerfile only includes `dist/` (no scripts/), so Makefile runs migrations/seeds via one-off container that mounts source and uses `npx tsx`
- Seed script guards against `NODE_ENV=production`, so migration container sets `NODE_ENV=development`
- Ports bound to `127.0.0.1` only — VPS nginx handles external traffic
- Postgres healthcheck ensures API doesn't start before DB is ready
- Updated `.gitignore` to whitelist `.env.demo` files (no secrets, safe to commit)

### Completion Notes

All 4 tasks completed:
1. `docker-compose.demo.yml` — 3 services with healthcheck, named volumes, localhost-bound ports
2. `.env.demo` files — API uses postgres repos + mock services; App disables MSW, points to real API
3. `Makefile` — 6 targets (deploy, reset, stop, logs, migrate, seed) using one-off containers for DB operations
4. `DEMO.md` — full deployment guide with credentials, architecture diagram, nginx config example, seed data overview

Date: 2026-04-03

---

## File List

- `docker-compose.demo.yml` (new)
- `yorindo-api/.env.demo` (new)
- `yorindo-app/.env.demo` (new)
- `Makefile` (new)
- `DEMO.md` (new)
- `.gitignore` (modified — added `!.env.demo` whitelist)
- `_bmad-output/implementation-artifacts/13-1-docker-compose-demo-profile.md` (modified)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)

---

## Change Log

- 2026-04-03: Implemented all 4 tasks — docker-compose.demo.yml, .env.demo files, Makefile targets, DEMO.md documentation
