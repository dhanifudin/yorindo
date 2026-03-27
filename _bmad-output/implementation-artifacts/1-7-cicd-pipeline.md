# Story 1.7: CI/CD Pipeline

**Story ID:** 1.7
**Story Key:** 1-7-cicd-pipeline
**Epic:** Epic 1 — Foundation, OpenAPI Contract & Developer Experience
**Phase:** Foundation — can run as a parallel track alongside Stories 1.2–1.5
**Status:** review
**Created:** 2026-03-19

---

## Story

As a developer,
I want a GitHub Actions pipeline that lints, typechecks, tests, builds Docker images, pushes to GHCR, and deploys to VPS on pushes to main,
So that every merge to main automatically reaches production without manual steps.

---

## Acceptance Criteria

**AC1:** Given a push to any branch,
When the CI pipeline runs,
Then `eslint` and `tsc --noEmit` run for both repos; the pipeline fails on any type or lint error

**AC2:** Given a push to any branch,
When the test step runs,
Then `vitest run` executes for both repos; pipeline fails if any test fails

**AC3:** Given a push to `main` with passing lint + tests,
When the build step runs,
Then multi-stage Docker images are built for `yorindo-api` and `yorindo-app`

**AC4:** Given a successful build on `main`,
When the push step runs,
Then images tagged with the commit SHA are pushed to GHCR

**AC5:** Given a successful GHCR push,
When the deploy step runs,
Then the VPS is accessed via SSH and `docker compose pull && docker compose up -d` executes

**AC6:** Given the deploy completes,
When the health check step runs,
Then `curl https://api.yorindo.app/api/health` returns HTTP 200; the pipeline fails and alerts if it does not

**AC7:** Given pipeline secrets,
Then `VPS_SSH_KEY`, `VPS_HOST`, `VPS_USER`, `GHCR_TOKEN` are sourced exclusively from GitHub Actions secrets — never hardcoded

---

## Tasks / Subtasks

- [x] **Task 1: Create GitHub Actions CI workflow (all branches)**
  - [x] Create `.github/workflows/ci.yml` at the monorepo root (or within each repo)
  - [x] Add `on: push` trigger for all branches
  - [x] Add `lint-and-typecheck` job: runs `eslint` + `tsc --noEmit` for both `yorindo-api` and `yorindo-app`
  - [x] Add `test` job (depends on lint): runs `vitest run` for both repos
  - [x] Fail the job on any lint, type, or test error

- [x] **Task 2: Create GitHub Actions CD workflow (main branch only)**
  - [x] Create `.github/workflows/cd.yml` (or add `build-and-deploy` jobs to ci.yml with `if: github.ref == 'refs/heads/main'`)
  - [x] Add `build` job: build multi-stage Docker images for both repos
  - [x] Add `push` job: tag images with `${{ github.sha }}` and push to GHCR
  - [x] Add `deploy` job: SSH to VPS, run `docker compose pull && docker compose up -d`
  - [x] Add `healthcheck` job: `curl https://api.yorindo.app/api/health` → fail if not HTTP 200

- [x] **Task 3: Write Dockerfile for yorindo-api**
  - [x] Create `yorindo-api/Dockerfile` with 3-stage build: `deps` → `builder` → `runner`
  - [x] Stage 1 (`deps`): `node:20-alpine`, copy `package*.json`, run `npm ci --production`
  - [x] Stage 2 (`builder`): `node:20-alpine`, copy all source, run `npm ci && npm run build`
  - [x] Stage 3 (`runner`): `node:20-alpine`, copy from deps + builder, non-root user, `CMD ["node", "dist/main.js"]`
  - [x] Add `.dockerignore` to exclude `node_modules`, `.git`, `.env`, `**/*.test.ts`

- [x] **Task 4: Write Dockerfile for yorindo-app**
  - [x] Create `yorindo-app/Dockerfile` with 3-stage build: `deps` → `builder` → `runner`
  - [x] Stage 1 (`deps`): `node:20-alpine`, copy `package*.json`, run `npm ci`
  - [x] Stage 2 (`builder`): `node:20-alpine`, copy all source + deps, run `npm run build`
  - [x] Stage 3 (`runner`): `node:20-alpine`, copy Next.js build output, `CMD ["node", "server.js"]`
  - [x] Set `output: 'standalone'` in `next.config.js` for minimal production image
  - [x] Add `.dockerignore` excluding `node_modules`, `.env*`, `**/*.test.tsx`, `.next/cache`

- [x] **Task 5: Create docker-compose.yml (production)**
  - [x] Create `docker-compose.yml` at monorepo root
  - [x] Define services: `nginx`, `api`, `app`, `postgres`, `redis`
  - [x] All services: `restart: unless-stopped`
  - [x] `api` and `app`: `expose` internal port only (not `ports`); `env_file: .env`
  - [x] `nginx`: `ports: ["80:80", "443:443"]`; SSL certs volume
  - [x] `postgres`: `image: postgres:16-alpine`; `volumes: [postgres_data:/var/lib/postgresql/data]`
  - [x] `redis`: `image: redis:7-alpine`; `command: redis-server --appendonly yes`
  - [x] Define all named volumes: `postgres_data`, `redis_data`, `snapshots_data`, `api_uploads`
  - [x] Add JSON logging for `api`: `max-size: "50m", max-file: "5"`

- [x] **Task 6: Create docker-compose.dev.yml (development override)**
  - [x] Create `docker-compose.dev.yml` at monorepo root
  - [x] Override `api` service: bind mount `./yorindo-api:/app` for hot reload
  - [x] Override `app` service: bind mount `./yorindo-app:/app`
  - [x] Expose `postgres:5432`, `redis:6379` to host (for dev tools)
  - [x] Set `NODE_ENV: development` for api and app

- [x] **Task 7: Create nginx configuration**
  - [x] Create `nginx/nginx.conf` for reverse proxy
  - [x] Route `/api/*` → Fastify API service internally
  - [x] Serve Next.js standalone output for all other routes
  - [x] SSL termination config (Let's Encrypt certs from `./nginx/certs`)
  - [x] Add `nginx/` and `nginx/certs/` to `.gitignore` (certs never committed)

- [x] **Task 8: Verify and document secrets setup**
  - [x] Document required GitHub Actions secrets in repo README or docs/
  - [x] Confirm none of: `VPS_SSH_KEY`, `VPS_HOST`, `VPS_USER`, `GHCR_TOKEN` are hardcoded
  - [x] Create `.env.example` at `yorindo-api/` with all required keys, no values

---

## Dev Notes

### Sprint Planning Note
Story 1.7 can be started as a parallel track alongside Stories 1.2–1.5. CI/CD does not depend on MSW or OpenAPI being complete. Recommend assigning a separate developer to 1.7 from day one of Epic 1.

### Repository Structure
This is a **monorepo** with two separate sub-repos:
```
yorindo/                   ← monorepo root (this workspace)
├── yorindo-api/           ← Fastify backend
├── yorindo-app/           ← Next.js frontend (created in Story 1.3)
├── docker-compose.yml     ← Production compose
├── docker-compose.dev.yml ← Dev override
├── nginx/
│   ├── nginx.conf
│   └── certs/            ← gitignored; Let's Encrypt
└── .github/
    └── workflows/
        ├── ci.yml
        └── cd.yml
```

### GitHub Actions Workflow — ci.yml (All Branches)

```yaml
name: CI

on:
  push:
    branches: ['**']

jobs:
  lint-typecheck:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        repo: [yorindo-api, yorindo-app]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: '${{ matrix.repo }}/package-lock.json'
      - run: npm ci
        working-directory: ${{ matrix.repo }}
      - run: npm run lint
        working-directory: ${{ matrix.repo }}
      - run: npx tsc --noEmit
        working-directory: ${{ matrix.repo }}

  test:
    needs: lint-typecheck
    runs-on: ubuntu-latest
    strategy:
      matrix:
        repo: [yorindo-api, yorindo-app]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: '${{ matrix.repo }}/package-lock.json'
      - run: npm ci
        working-directory: ${{ matrix.repo }}
      - run: npm run test
        working-directory: ${{ matrix.repo }}
```

### GitHub Actions Workflow — cd.yml (main only)

```yaml
name: CD

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_API: ghcr.io/${{ github.repository_owner }}/yorindo-api
  IMAGE_APP: ghcr.io/${{ github.repository_owner }}/yorindo-app

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GHCR_TOKEN }}
      - name: Build and push API image
        uses: docker/build-push-action@v5
        with:
          context: ./yorindo-api
          push: true
          tags: ${{ env.IMAGE_API }}:${{ github.sha }},${{ env.IMAGE_API }}:latest
      - name: Build and push App image
        uses: docker/build-push-action@v5
        with:
          context: ./yorindo-app
          push: true
          tags: ${{ env.IMAGE_APP }}:${{ github.sha }},${{ env.IMAGE_APP }}:latest

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to VPS via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/yorindo
            docker compose pull
            docker compose up -d

      - name: Health check
        run: |
          sleep 15
          response=$(curl -s -o /dev/null -w "%{http_code}" https://api.yorindo.app/api/health)
          if [ "$response" != "200" ]; then
            echo "Health check failed: HTTP $response"
            exit 1
          fi
          echo "Health check passed: HTTP $response"
```

### Dockerfile for yorindo-api

```dockerfile
# yorindo-api/Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --production

FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S yorindo -u 1001
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
USER yorindo
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Dockerfile for yorindo-app (Next.js Standalone)

```dockerfile
# yorindo-app/Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

**CRITICAL:** `next.config.js` must set `output: 'standalone'` for the standalone Dockerfile to work:
```javascript
module.exports = withPWA({
  reactStrictMode: true,
  output: 'standalone',   // ← add this
})
```

### Production docker-compose.yml

```yaml
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
    depends_on: [api, app]
    restart: unless-stopped

  api:
    image: ghcr.io/YOUR_ORG/yorindo-api:latest
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
    image: ghcr.io/YOUR_ORG/yorindo-app:latest
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
  redis_data:
  snapshots_data:
  api_uploads:
```

### Development docker-compose.dev.yml

```yaml
services:
  api:
    build: ./yorindo-api
    volumes: [./yorindo-api:/app]
    environment:
      NODE_ENV: development

  app:
    build: ./yorindo-app
    volumes: [./yorindo-app:/app]
    environment:
      NODE_ENV: development

  postgres:
    ports: ["5432:5432"]

  redis:
    ports: ["6379:6379"]
```

**Dev command:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`

### nginx/nginx.conf (minimal)

```nginx
events {}

http {
  upstream api {
    server api:3000;
  }

  upstream app {
    server app:3000;
  }

  server {
    listen 80;
    server_name api.yorindo.app;
    return 301 https://$host$request_uri;
  }

  server {
    listen 443 ssl;
    server_name api.yorindo.app;

    ssl_certificate     /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    location /api/ {
      proxy_pass http://api;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
      proxy_pass http://app;
      proxy_set_header Host $host;
    }
  }
}
```

### .env.example for yorindo-api

```env
# Database
DATABASE_URL=postgresql://yorindo:CHANGE_ME@postgres:5432/yorindo
REDIS_URL=redis://redis:6379

# Auth
JWT_SECRET=CHANGE_ME_min_32_chars
JWT_REFRESH_SECRET=CHANGE_ME_min_32_chars_different

# Server
PORT=3000
NODE_ENV=production
SNAPSHOT_DIR=/data/snapshots

# Third-party APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
BREVO_API_KEY=xsecpow...
EVERPRO_API_KEY=...

# Postgres
POSTGRES_PASSWORD=CHANGE_ME_min_16_chars
```

### GitHub Actions Secrets to Configure

| Secret | Purpose |
|--------|---------|
| `VPS_SSH_KEY` | SSH private key (PEM format) for VPS access |
| `VPS_HOST` | VPS IP or hostname |
| `VPS_USER` | SSH username on VPS |
| `GHCR_TOKEN` | GitHub PAT with `write:packages` scope |

**These 4 are all that are needed in GitHub Actions.** All other secrets (DB passwords, API keys) live in `.env` on the VPS — never in GitHub.

### GHCR Image Naming
- API: `ghcr.io/{github_org}/yorindo-api:{sha}` and `:latest`
- App: `ghcr.io/{github_org}/yorindo-app:{sha}` and `:latest`

Replace `{github_org}` with the actual GitHub organization or username when setting up.

### Key Anti-Patterns to Avoid
- **DO NOT** use `ports` for api/app in production compose — use `expose` only; Nginx is the ingress
- **DO NOT** commit `.env` — only `.env.example` is committed
- **DO NOT** commit SSL certs to git — `nginx/certs/` must be in `.gitignore`
- **DO NOT** use `--no-verify` to skip hooks in CI
- **DO NOT** use `npm install` in Dockerfiles — use `npm ci` for deterministic builds
- **DO NOT** run containers as root in production — create non-root user in runner stage
- **DO NOT** hardcode any secrets in workflow files — all from `secrets.*`

### VPS Prerequisites (Manual Setup, One-Time)
Before CI/CD can deploy:
1. Docker + Docker Compose installed on VPS
2. `/opt/yorindo/` directory created with `docker-compose.yml` and `.env`
3. SSH key added to VPS `~/.ssh/authorized_keys`
4. GHCR pull access configured (VPS must `docker login ghcr.io` or use GHCR_TOKEN)
5. SSL certs in `/opt/yorindo/nginx/certs/` (via Certbot/Let's Encrypt)

### What This Story Does NOT Cover
- yorindo-api server code (Story 1.1)
- Database migrations (Story 1.2)
- MSW or FE feature work (Stories 1.3–1.6)

---

## Dev Agent Record

### Implementation Plan

1. **CI workflow** — matrix `[yorindo-api, yorindo-app]` with a `pkg-check` step that skips lint/test if `package.json` is absent. This allows the same workflow to work today (API is a stub) and automatically activate for the API once Story 1.1 adds its scaffold.
2. **CD workflow** — separate `cd.yml` triggered only on `main`. Separated from CI to keep concerns clean; uses `docker/setup-buildx-action` + build cache for faster image builds.
3. **API Dockerfile** — 3-stage: deps (prod-only deps), builder (full build), runner (non-root `yorindo` user, port 3000).
4. **App Dockerfile** — 3-stage with Next.js standalone output. Added `output: 'standalone'` to `next.config.js` (CJS); verified no regressions (23/23 tests pass).
5. **docker-compose.yml** — 6 services, all `restart: unless-stopped`, api/app use `expose` not `ports`, all secrets via `env_file: .env`, JSON logging on api.
6. **docker-compose.dev.yml** — bind-mount overrides for hot reload; databases exposed to host; anonymous volumes for `node_modules` and `.next` to prevent host/container conflicts.
7. **nginx.conf** — separate server blocks for api subdomain and app domain, HTTP→HTTPS redirect, SSL termination with Let's Encrypt certs.
8. **Secrets docs** — `docs/secrets-setup.md` covers 4 GitHub secrets, VPS one-time setup steps, GHCR auth, and security rules. `yorindo-api/.env.example` lists all required env vars with placeholder values.

### Debug Log

- `yorindo-api` stub only has `openapi.yaml` (no `package.json`). Added `pkg-check` step in CI matrix to skip lint/test for repos without a package.json. Steps are not skipped via `continue-on-error`; they simply don't run — the job still passes green, correctly signaling "nothing to check yet".
- `next.config.js` already CJS (from Story 1.3 fix); `output: 'standalone'` added cleanly. Node confirmed the require() loads without error.
- dev docker-compose adds anonymous volumes for `node_modules` (`/app/node_modules`) and `.next` (`/app/.next`) to prevent host override of container-installed packages — standard Docker best practice for bind-mounted Node projects.

### Completion Notes

All 8 tasks complete. 23/23 existing tests pass (no regressions). All YAML files validated clean. Key deliverables:
- `.github/workflows/ci.yml` — lint + typecheck + test on every push, matrix for both repos
- `.github/workflows/cd.yml` — build → GHCR push → VPS deploy → health check on main merges
- `yorindo-api/Dockerfile` + `.dockerignore` — 3-stage, non-root runner
- `yorindo-app/Dockerfile` + `.dockerignore` — 3-stage standalone, non-root runner
- `next.config.js` updated with `output: 'standalone'`
- `docker-compose.yml` — 6 services, production-ready
- `docker-compose.dev.yml` — dev override with bind mounts + host-exposed DB ports
- `nginx/nginx.conf` — dual-domain reverse proxy with SSL termination
- `.gitignore` (monorepo root) — excludes `nginx/certs/` and `.env`
- `docs/secrets-setup.md` — full VPS onboarding guide
- `yorindo-api/.env.example` — all required env vars documented

---

## File List

**New files:**
- `.github/workflows/ci.yml`
- `.github/workflows/cd.yml`
- `yorindo-api/Dockerfile`
- `yorindo-api/.dockerignore`
- `yorindo-api/.env.example`
- `yorindo-app/Dockerfile`
- `yorindo-app/.dockerignore`
- `docker-compose.yml`
- `docker-compose.dev.yml`
- `nginx/nginx.conf`
- `.gitignore`
- `docs/secrets-setup.md`

**Modified files:**
- `yorindo-app/next.config.js` — added `output: 'standalone'`

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-19 | Story created | bmad-create-story |
| 2026-03-20 | All 8 tasks implemented: CI/CD GitHub Actions workflows, Dockerfiles (API + App), docker-compose (prod + dev), nginx config, secrets docs, .env.example | bmad-dev-story |
