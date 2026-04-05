# Story 13.6: VPS Frontend Preview Deployment

Status: done

## Story

As a developer deploying the Yorindo frontend,
I want `yorindo-app` deployed to VPS at `yorindo.dhanifudin.com` via Docker Compose with a CD workflow,
so that the FE preview is hosted consistently alongside the API and demo endpoints on the same VPS, replacing the GitHub Pages static export.

## Acceptance Criteria

**AC1:** Given `docker-compose.app.yml` exists, when `docker compose -f docker-compose.app.yml up -d` is run, then the `yorindo-app` service starts and serves the Next.js app on `127.0.0.1:5173`.

**AC2:** Given the app container is running, when VPS nginx proxies `yorindo.dhanifudin.com` to `localhost:5173`, then the app is accessible via HTTPS (SSL managed by VPS nginx, not the compose stack).

**AC3:** Given the app is running in preview mode, when MSW mocks are enabled (`NEXT_PUBLIC_ENABLE_MOCKS=true`), then the app functions without a real API backend — same behavior as the current GitHub Pages deployment.

**AC4:** Given `.github/workflows/cd-app.yml` exists, when code is pushed to `main` with changes in `yorindo-app/**`, then the workflow builds the Docker image, pushes to Docker Hub, and deploys to VPS via SSH.

**AC5:** Given the CD workflow deploys successfully, when a health check is performed, then the app responds with HTTP 200.

**AC6:** Given all three VPS endpoints are running (`yorindo.dhanifudin.com`, `api.dhanifudin.com`, `demo.dhanifudin.com`), when each is accessed, then none interfere with each other — independent compose stacks with independent volumes.

**AC7:** Given the VPS deployment is verified, when `deploy.yml` (GitHub Pages) is removed, then the app is no longer deployed to GitHub Pages and `yorindo.dhanifudin.com` is the sole FE preview endpoint.

## Tasks / Subtasks

- [x] Task 1: Create `docker-compose.app.yml` (AC: 1, 6)
  - [x] 1.1 Define `app` service using `dhanifudin/yorindo-app:${IMAGE_TAG:-preview}`
  - [x] 1.2 Map port `127.0.0.1:5173:3000` (host 5173 → container 3000, Next.js standalone)
  - [x] 1.3 Use `env_file: .env` for runtime env vars
  - [x] 1.4 Add restart policy and logging config
- [x] Task 2: Create `yorindo-app/.env.preview` (AC: 3)
  - [x] 2.1 Set `NEXT_PUBLIC_ENABLE_MOCKS=true` (MSW mocks, same as GH Pages)
  - [x] 2.2 Set `NEXT_PUBLIC_BASE_PATH=` (root hosting, no subdirectory)
  - [x] 2.3 Document all variables with comments
- [x] Task 3: Create `.github/workflows/cd-app.yml` (AC: 4, 5)
  - [x] 3.1 Trigger on push to `main` with path filter `yorindo-app/**` + `workflow_dispatch`
  - [x] 3.2 Build job: build `dhanifudin/yorindo-app` image, tag with `preview-${GITHUB_SHA::8}` + `preview`, push to Docker Hub
  - [x] 3.3 Deploy job: SCP compose + env files to `/var/www/yorindo-app`, SSH deploy with `docker compose pull && up -d`
  - [x] 3.4 Add health check: `curl -s -o /dev/null -w "%{http_code}" https://yorindo.dhanifudin.com` must return 200
  - [x] 3.5 Add rollback on failure (restore previous `.env`, restart)
- [x] Task 4: Add Makefile targets (AC: 1)
  - [x] 4.1 Add `deploy-app`, `stop-app`, `logs-app` targets
  - [x] 4.2 Use `APP_COMPOSE = docker compose -f docker-compose.app.yml` variable
- [x] Task 5: Update `.gitignore` (AC: 3)
  - [x] 5.1 Add `!.env.preview` whitelist alongside existing `!.env.demo` and `!.env.example`
- [x] Task 6: Remove `.github/workflows/deploy.yml` (AC: 7)
  - [x] 6.1 Delete the GitHub Pages deployment workflow

### Review Findings

- [x] [Review][Decision] Port 5173 collision — resolved: demo stack uses nginx container on port 8888, app-preview keeps 5173. No conflict.
- [x] [Review][Patch] NEXT_PUBLIC_ENABLE_MOCKS build arg ignored — fixed: added ARG + ENV to yorindo-app/Dockerfile builder stage.
- [x] [Review][Defer] Rollback doesn't re-pull previous image — deferred, matches existing cd-api.yml pattern
- [x] [Review][Defer] Health check 15s sleep is fragile — deferred, matches existing cd-api.yml pattern
- [x] [Review][Defer] Nginx port grep is brittle — deferred, matches existing cd-api.yml pattern
- [x] [Review][Defer] cd-app + cd-api concurrent trigger race — deferred, low risk
- [x] [Review][Defer] Rollback doesn't restore previous compose file — deferred, matches existing pattern
- [x] [Review][Defer] MIGRATE_RUN requires node_modules on VPS — deferred, documentation issue

## Dev Notes

### Architecture

```
yorindo.dhanifudin.com (HTTPS via VPS nginx + Let's Encrypt)
         |
         v
   VPS nginx (SSL termination)
         |
         v
   127.0.0.1:5173
   docker-compose.app.yml
   ┌──────────────┐
   | yorindo-app  |  ← dhanifudin/yorindo-app:latest
   | :3000 (int)  |  ← Next.js standalone, MSW mocks enabled
   └──────────────┘
```

All three VPS endpoints are independent compose stacks:

| Endpoint | Compose File | VPS Path | Host Port | CD Trigger |
|----------|-------------|----------|-----------|------------|
| `yorindo.dhanifudin.com` | `docker-compose.app.yml` | `/var/www/yorindo-app` | 5173 | main push (`yorindo-app/**`) |
| `api.dhanifudin.com` | `docker-compose.api.yml` | `/var/www/yorindo-api` | 6666 | main push (`yorindo-api/**`) |
| `demo.dhanifudin.com` | `docker-compose.demo.yml` | `/var/www/yorindo-demo` | 3000+5173 | tag (`v*.*.*`) |

### Reference Files — Follow These Patterns Exactly

**docker-compose.api.yml** — proven compose pattern:
- Port binding: `127.0.0.1:PORT:3000` (localhost-only)
- `env_file: .env`
- `restart: unless-stopped`
- Logging: `json-file` driver, max-size 50m, max-file 5

**cd-api.yml** — proven CD workflow pattern:
- Build: `docker/build-push-action@v5` with `cache-from: type=gha`
- Tag: `${GITHUB_SHA::8}` + `latest`
- Deploy: `appleboy/ssh-action@v1` + `appleboy/scp-action@v0.1.7`
- Secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`
- Env file: `VPS_ENV_FILE` secret → `.deploy.env` → `.env` on VPS
- Rollback: save `.env.previous`, restore on failure
- Health check: `curl -s -o /dev/null -w "%{http_code}" https://URL` must return 200

**deploy.yml** (to be retired) — current GH Pages workflow:
- Builds with `NEXT_EXPORT=true` + `NEXT_PUBLIC_ENABLE_MOCKS=true`
- Uploads static `out/` to GitHub Pages
- The VPS container replaces this: same MSW mocks, but as a running Next.js server (not static export)

### Critical Technical Details

- **App Dockerfile** exposes port 3000 (Next.js standalone `server.js`), NOT 5173. The host port 5173 maps to container port 3000.
- **MSW mocks** are enabled at build time via `NEXT_PUBLIC_ENABLE_MOCKS=true`. This must be a Docker build arg (baked into the bundle), not just a runtime env var. However, the current `cd.yml` already builds the app image without this flag — the preview needs its own build with mocks enabled.
- **Important:** The existing `cd.yml` builds `dhanifudin/yorindo-app:latest` WITHOUT mocks. The preview CD (`cd-app.yml`) must either:
  - (a) Use a different image tag like `dhanifudin/yorindo-app:preview`, OR
  - (b) Build with `NEXT_PUBLIC_ENABLE_MOCKS=true` as a build arg and use a separate tag
  - Recommended: Use `dhanifudin/yorindo-app:preview-${GITHUB_SHA::8}` + `dhanifudin/yorindo-app:preview` tags to avoid collision with production `latest` tag.
- **VPS nginx** for `yorindo.dhanifudin.com` is managed on the VPS directly (Story 13.4 scope) — the compose file only exposes the port.
- **No API proxy needed** — MSW mocks handle all API calls client-side. No `/api` location block in nginx.

### Existing Files to Reference

| File | Purpose |
|------|---------|
| `docker-compose.api.yml` | Proven compose pattern (single service + deps) |
| `.github/workflows/cd-api.yml` | Proven CD workflow (build + deploy + health check) |
| `.github/workflows/cd.yml` | Full-stack CD (references image build with build-args) |
| `.github/workflows/deploy.yml` | GH Pages workflow to retire |
| `yorindo-app/Dockerfile` | App image build (standalone output, port 3000) |
| `yorindo-app/.env.demo` | Demo env reference (created in Story 13.1) |
| `Makefile` | Demo targets to extend (created in Story 13.1) |

### Previous Story (13.1) Learnings

- `.gitignore` has `.env.*` glob — must whitelist `.env.preview` with `!.env.preview`
- App Dockerfile `EXPOSE 3000` — always map host port to container 3000
- Makefile uses `$(CURDIR)` for absolute paths
- Compose file validated with `docker compose -f FILE config --quiet`

### Project Structure Notes

- Compose files live at repo root: `docker-compose.*.yml`
- CD workflows live at `.github/workflows/cd-*.yml`
- Env files live in their respective service dirs: `yorindo-app/.env.preview`
- VPS deployment paths: `/var/www/yorindo-app/` (matches existing `/var/www/yorindo-api/` pattern)

### References

- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-04-03.md] — approved SCP with full deployment topology
- [Source: _bmad-output/planning-artifacts/epics/epic-11-demo-environment-deployment.md] — epic context
- [Source: _bmad-output/planning-artifacts/architecture.md#Infrastructure] — "all infrastructure self-hosted via Docker Compose on VPS"
- [Source: .github/workflows/cd-api.yml] — proven CD pattern to replicate
- [Source: docker-compose.api.yml] — proven compose pattern to replicate

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Task 1: Created `docker-compose.app.yml` — single app service, default tag `preview` (not `latest` to avoid collision with production cd.yml), localhost-bound port 5173→3000
- Task 2: Created `yorindo-app/.env.preview` — MSW mocks enabled, root hosting
- Task 3: Created `cd-app.yml` — follows `cd-api.yml` pattern exactly; uses `preview-SHA` + `preview` tags; builds with `NEXT_PUBLIC_ENABLE_MOCKS=true` as build arg; uses `VPS_APP_ENV_FILE` secret (separate from `VPS_ENV_FILE`); nginx port check for 5173; health check against `https://yorindo.dhanifudin.com`
- Task 4: Extended Makefile with `deploy-app`, `stop-app`, `logs-app` targets using `APP_COMPOSE` variable
- Task 5: Added `!.env.preview` to `.gitignore` whitelist
- Task 6: Deleted `.github/workflows/deploy.yml` (GitHub Pages)

### File List

- `docker-compose.app.yml` (new)
- `yorindo-app/.env.preview` (new)
- `.github/workflows/cd-app.yml` (new)
- `.github/workflows/deploy.yml` (deleted)
- `Makefile` (modified — added app preview targets)
- `.gitignore` (modified — added `!.env.preview`)
- `_bmad-output/implementation-artifacts/13-6-vps-frontend-preview-deployment.md` (modified)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)

### Change Log

- 2026-04-03: Implemented all 6 tasks — docker-compose.app.yml, .env.preview, cd-app.yml, Makefile targets, .gitignore update, deploy.yml removal
