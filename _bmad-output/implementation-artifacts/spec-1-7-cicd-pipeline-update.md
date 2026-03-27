---
title: 'CI/CD Pipeline Update — Docker Hub, Tag Triggers, PR Gate, Demo Environment'
type: 'chore'
created: '2026-03-26'
status: 'done'
baseline_commit: '7c4e0a5b610f4ebc47f6e5d6dc774f0312c304ad'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The current CI/CD is postponed (manual `workflow_dispatch` only), uses GHCR with no tag-based releases, has no PR merge gate, and targets a production domain that doesn't exist yet — blocking any real deployment.

**Approach:** Activate all three pipelines: PR test gate on `ci.yml`, tag-triggered Docker Hub build + VPS deploy on `cd.yml`, tag-triggered GitHub Pages deploy on `deploy.yml`. Simplify the demo VPS stack to FE + in-memory BE only (no Postgres/Redis). Retarget all domain references to `demo.dhanifudin.com`.

## Boundaries & Constraints

**Always:**
- `deploy.yml` (GitHub Pages / `yorindo.dhanifudin.com`) must remain FE-only with `NEXT_PUBLIC_ENABLE_MOCKS=true` — never include BE or DB services.
- `docker-compose.yml` demo stack must run without Postgres or Redis (in-memory BE, Phase 1).
- All secrets stay in `secrets.*` — never hardcoded in any workflow file.
- Image tag format: `{username}/yorindo-api:{tag}` and `{username}/yorindo-app:{tag}` where `{tag}` is the git tag (e.g. `v1.0.0`); also push `:latest`.
- Lint passes and `npx tsc --noEmit` must not error before any release tag is created.

**Ask First:**
- Docker Hub username (spec assumes `dhanifudin` — confirm or correct before writing image refs).
- VPS deploy path: `/var/www/yorindo` (confirmed).
- N/A — all three workflows confirmed tag-triggered.

**Never:**
- Do not add Postgres, Redis, or any stateful services to `docker-compose.yml` for the demo environment.
- Do not remove or alter `deploy.yml`'s `NEXT_PUBLIC_ENABLE_MOCKS: 'true'` flag.
- Do not change `yorindo-app/Dockerfile` or `yorindo-api/Dockerfile` — they are not in scope.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| PR opened/updated | PR against any branch | CI runs lint + typecheck + test; merge blocked until all pass | PR stays unmergeable; checks shown in GitHub UI |
| Tag pushed `v*.*.*` | `git push origin v1.2.3` | Docker Hub images built + pushed as `:{tag}` and `:latest`; VPS pulls and restarts; health check passes | Workflow fails at build/deploy/health step; VPS retains previous image |
| Tag pushed (GitHub Pages) | same tag push | `deploy.yml` builds static export + deploys to `yorindo.dhanifudin.com` | Build failure stops deploy; previous deployment untouched |
| Health check fails | VPS returns non-200 | Workflow step exits 1; CD job marked failed | No rollback automated — operator must SSH and inspect |

</frozen-after-approval>

## Code Map

- `.github/workflows/ci.yml` — PR test gate; needs trigger change and `pull_request` event
- `.github/workflows/cd.yml` — Docker Hub CD; needs tag trigger, registry swap, domain update
- `.github/workflows/deploy.yml` — GitHub Pages deploy; needs tag trigger (if confirmed)
- `docker-compose.yml` — demo stack; needs image name update, postgres/redis removal, in-memory env var
- `nginx/nginx.conf` — reverse proxy; needs domain update to `demo.dhanifudin.com`
- `docs/secrets-setup.md` — secrets reference; needs GHCR → Docker Hub update

## Tasks & Acceptance

**Execution:**
- [x] `.github/workflows/ci.yml` — change `on:` from `workflow_dispatch` to `pull_request: branches: ['**']` + `push: branches: ['**']`; remove the `# Postponed` comment
- [x] `.github/workflows/cd.yml` — change `on:` to `push: tags: ['v*.*.*']`; replace GHCR login + `GHCR_TOKEN` with Docker Hub login (`DOCKERHUB_USERNAME` + `DOCKERHUB_TOKEN`); update `env` image refs to `${{ secrets.DOCKERHUB_USERNAME }}/yorindo-api` and `${{ secrets.DOCKERHUB_USERNAME }}/yorindo-app`; update health check URL to `https://demo.dhanifudin.com/api/health`; remove `# Postponed` comment
- [x] `.github/workflows/deploy.yml` — change `on:` from `push: branches: [main]` to `push: tags: ['v*.*.*']`; keep `workflow_dispatch`; keep all other steps unchanged
- [x] `docker-compose.yml` — update API image to `dhanifudin/yorindo-api:latest`; update app image to `dhanifudin/yorindo-app:latest`; remove `postgres` and `redis` services and their named volumes; remove `depends_on: [postgres, redis]` from api; add `REPOSITORY_MODE: memory` to api `environment`; remove `snapshots_data` and `uploads_tmp` volumes
- [x] `nginx/nginx.conf` — replace all occurrences of `api.yorindo.app` and `yorindo.app`/`www.yorindo.app` with `demo.dhanifudin.com`; consolidated to single server block routing `/api/` to api upstream and `/` to app upstream
- [x] `docs/secrets-setup.md` — replaced `GHCR_TOKEN` with `DOCKERHUB_USERNAME` + `DOCKERHUB_TOKEN`; updated VPS path to `/var/www/yorindo`; added branch protection setup instructions; added release tag instructions

**Acceptance Criteria:**
- Given a PR is opened against any branch, when the CI workflow runs, then lint + typecheck + test jobs must all pass before GitHub allows the merge button to be enabled (requires branch protection rule — document in `docs/secrets-setup.md`).
- Given `git push origin v1.0.0` is run, when the CD workflow triggers, then Docker Hub shows `dhanifudin/yorindo-api:v1.0.0`, `dhanifudin/yorindo-api:latest`, and app equivalents.
- Given the VPS receives the new images, when `docker compose up -d` completes, then `curl https://demo.dhanifudin.com/api/health` returns HTTP 200.
- Given the same tag push, when `deploy.yml` runs, then `yorindo.dhanifudin.com` serves the updated static FE with MSW mocks enabled.
- Given `docker compose up` is run on the VPS with the new `docker-compose.yml`, then no Postgres or Redis containers start; the API starts without DB connection errors (in-memory mode).

## Design Notes

**Single-domain nginx for demo:** Both FE and BE live at `demo.dhanifudin.com`. Nginx routes `location /api/` to Fastify and `location /` to Next.js. This avoids managing two subdomains and two SSL certs.

**`REPOSITORY_MODE=memory`:** The API reads this env var to select in-memory repositories instead of a real DB. This matches the Phase 1 development approach described in sprint-status.yaml and avoids needing a database for the public demo.

**Docker Hub image refs in compose:** Use literal `dhanifudin/yorindo-api:latest` in `docker-compose.yml` (not `$DOCKERHUB_USERNAME`) — shell variable expansion doesn't work in Docker Compose image fields without `.env` file. The CD workflow writes the correct tag; the compose just always pulls `:latest`.

## Verification

**Commands:**
- `yamllint .github/workflows/ci.yml .github/workflows/cd.yml .github/workflows/deploy.yml` -- expected: no errors (or install `yamllint` first)
- `docker compose -f docker-compose.yml config` -- expected: valid compose config, no postgres/redis services listed
- `grep -r "ghcr.io\|YOUR_ORG\|api.yorindo.app\|yorindo.app" .github/ docker-compose.yml nginx/` -- expected: no matches (all old refs replaced)

**Manual checks:**
- Open each updated workflow YAML and verify the `on:` trigger block is correct before pushing.
- Confirm `docs/secrets-setup.md` lists the 5 required secrets: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `VPS_SSH_KEY`, `VPS_HOST`, `VPS_USER`.

## Suggested Review Order

**Deployment trigger & release flow**

- Entry point: tag-triggered `on:` block — the design contract for all three workflows
  [`cd.yml:4`](../../.github/workflows/cd.yml#L4)

- Tag guard: fails fast on `workflow_dispatch` without a tag ref, preventing `:latest` corruption
  [`cd.yml:22`](../../.github/workflows/cd.yml#L22)

- GitHub Pages now tag-triggered alongside CD — unified release moment
  [`deploy.yml:4`](../../.github/workflows/deploy.yml#L4)

**Container registry & VPS target**

- Docker Hub image refs replace GHCR — `secrets.DOCKERHUB_USERNAME` as org prefix
  [`cd.yml:8`](../../.github/workflows/cd.yml#L8)

- VPS deploy path corrected to `/var/www/yorindo`
  [`cd.yml:68`](../../.github/workflows/cd.yml#L68)

- Health check targets `demo.dhanifudin.com` — confirms full stack is live
  [`cd.yml:75`](../../.github/workflows/cd.yml#L75)

**In-memory demo stack**

- No postgres/redis; `REPOSITORY_MODE: memory` — Phase 1 demo runs without a database
  [`docker-compose.yml:1`](../../docker-compose.yml#L1)

- Single-domain nginx: `/api/` → Fastify, `/` → Next.js — one cert, one domain
  [`nginx/nginx.conf:20`](../../nginx/nginx.conf#L20)

**PR merge gate**

- `pull_request` trigger + concurrency group — prevents double-fire on PR branch pushes
  [`ci.yml:4`](../../.github/workflows/ci.yml#L4)

- Branch protection setup instructions — manual step required to lock `main`
  [`secrets-setup.md:14`](../../docs/secrets-setup.md#L14)
