---
title: 'Deploy Reset Script and Makefile'
slug: '13-3-deploy-reset-script-and-makefile'
created: '2026-04-02'
status: 'ready-for-dev'
epic: 13
story: 3
tech_stack: ['make', 'bash', 'docker-compose']
files_to_create:
  - 'Makefile' (demo targets)
  - 'scripts/deploy-demo.sh'
---

# Story 13.3: Deploy Reset Script and Makefile

**Story ID:** 13.3
**Story Key:** 13-3-deploy-reset-script-and-makefile
**Epic:** Epic 13 — Demo Environment Deployment
**Status:** ready-for-dev

---

## Story

As a developer managing the demo environment,
I want simple Makefile targets and a deploy script that handle the full deploy-reset-seed lifecycle,
so that I can refresh the demo environment with one command.

---

## Acceptance Criteria

**AC1:** Given `make deploy-demo` is run, then the full pipeline executes: stop existing containers → delete volumes → pull latest images → start services → wait for postgres → run migrations → run seed → verify health.

**AC2:** Given `make reset-demo` is run, then data is wiped and re-seeded without rebuilding containers (faster than full deploy).

**AC3:** Given `make stop-demo` is run, then all containers stop but data is preserved (volumes intact).

**AC4:** Given `make logs-demo` is run, then logs from all 3 services are followed in the terminal.

**AC5:** Given the deploy script runs, when any step fails, then the script exits with a non-zero code and prints a clear error message indicating which step failed.

**AC6:** Given the deploy script completes, then it prints a summary: event count, contact count, user credentials, and demo URL.

---

## Context for Development

### Deploy Pipeline Steps

```bash
# 1. Stop and delete everything (including data)
docker compose -f docker-compose.demo.yml down -v

# 2. Pull latest images from Docker Hub
docker compose -f docker-compose.demo.yml pull

# 3. Start all services
docker compose -f docker-compose.demo.yml up -d

# 4. Wait for postgres to be ready
docker compose -f docker-compose.demo.yml exec postgres pg_isready --timeout=30

# 5. Run migrations
docker compose -f docker-compose.demo.yml exec yorindo-api npx tsx scripts/migrate.ts

# 6. Run seed
docker compose -f docker-compose.demo.yml exec yorindo-api npx tsx scripts/seed.ts --demo

# 7. Verify health
curl -f https://demo.dhanifudin.com/api/health
```

### Makefile Targets

```makefile
.PHONY: deploy-demo reset-demo stop-demo logs-demo

deploy-demo:    # Full deploy: down -v, pull, up, migrate, seed
reset-demo:     # Reset data only: down -v, up, migrate, seed (no pull)
stop-demo:      # Stop containers, preserve data
logs-demo:      # Follow logs from all services
```

### Existing Files to Reference

- `docker-compose.demo.yml` — created in Story 13.1
- `yorindo-api/scripts/migrate.ts` — migration runner
- `yorindo-api/scripts/seed.ts` — seed script with `--demo` flag

### Technical Decisions

- **Makefile over bash script:** Makefile is simpler and more discoverable (`make` tab-completion)
- **`down -v` is the reset:** Docker volume deletion is the nuclear option — no need for TRUNCATE logic
- **Health check wait:** Use `pg_isready` with timeout rather than `sleep` — faster and more reliable
- **Error handling:** `set -e` in any bash scripts — fail fast on any error

---

## Implementation Plan

### Task 1: Create Makefile with demo targets

Add `deploy-demo`, `reset-demo`, `stop-demo`, `logs-demo` targets. Each target should be idempotent and provide clear output at each step.

### Task 2: Create `scripts/deploy-demo.sh` (optional)

If the Makefile logic is complex, extract to a bash script that the Makefile calls. Otherwise, keep it inline in the Makefile.

### Task 3: Add health verification

After deploy completes, verify:
- `GET /api/health` returns 200
- Database has expected event count (≥ 10)
- Demo users exist (≥ 3)

---

## Dependencies

- Story 13.1 (Docker Compose Demo Profile) — `docker-compose.demo.yml` must exist
- Story 13.2 (Demo Seed Script) — `scripts/seed.ts --demo` must work
