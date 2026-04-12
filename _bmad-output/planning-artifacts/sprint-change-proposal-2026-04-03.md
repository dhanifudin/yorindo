# Sprint Change Proposal — SCP-2026-04-03

**Date:** 2026-04-03
**Triggered by:** Story 13.1 (Docker Compose Demo Profile) implementation
**Scope:** Minor — direct implementation by dev team
**Status:** Approved (2026-04-03)

---

## 1. Issue Summary

During Story 13.1 implementation, the deployment topology gap became visible: the FE app at `yorindo.dhanifudin.com` is deployed as a static export on GitHub Pages (`deploy.yml`), while the API (`api.dhanifudin.com`) and demo (`demo.dhanifudin.com`) are already on VPS via Docker Compose. This creates inconsistent deployment patterns and prevents the FE preview from consuming the real API.

The architecture document states "all infrastructure self-hosted via Docker Compose on VPS" — the GH Pages deployment is the outlier.

**Goal:** Consolidate all 3 endpoints on VPS with consistent Docker Compose + CD workflow patterns:

| Endpoint | Service | Current | Target |
|----------|---------|---------|--------|
| `yorindo.dhanifudin.com` | yorindo-app (MSW mocks) | GitHub Pages static export | VPS Docker container |
| `api.dhanifudin.com` | yorindo-api (memory repos) | VPS Docker (already live) | No change |
| `demo.dhanifudin.com` | app + api + postgres | VPS Docker (cd.yml) | Migrate to docker-compose.demo.yml |

---

## 2. Impact Analysis

### Epic Impact

**Epic 13 (Demo Environment Deployment)** — scope expanded to cover all 3 VPS endpoints, not just the demo. Epic statement updated:

> "A unified VPS deployment topology with three endpoints: yorindo.dhanifudin.com (FE preview), api.dhanifudin.com (standalone API), and demo.dhanifudin.com (full-stack demo with postgres and seed data)."

No other epics affected.

### Story Impact

- **New Story 13.6:** VPS Frontend Preview Deployment (replace GitHub Pages)
- **Story 13.4 (existing):** HTTPS & Domain Configuration — will need to account for `yorindo.dhanifudin.com` nginx server block and `cd.yml` migration to `docker-compose.demo.yml`

### Artifact Conflicts

| Artifact | Action |
|----------|--------|
| Epic 11 file (`epic-11-demo-environment-deployment.md`) | Update epic statement + add Story 13.6 |
| Architecture doc | Add 3-endpoint deployment topology table |
| `deploy.yml` (GH Pages workflow) | Retire after `cd-app.yml` is verified |
| `nginx/vps.conf` | Expand with `yorindo.dhanifudin.com` server block |
| `cd.yml` | Future: migrate to `docker-compose.demo.yml` (Story 13.4 scope) |

### Technical Impact

None — follows proven patterns from `cd-api.yml` + `docker-compose.api.yml`.

---

## 3. Recommended Approach

**Direct Adjustment** — add Story 13.6 to Epic 13 and update affected artifacts.

**Rationale:**
- Lowest effort, lowest risk
- Proven pattern already exists (`cd-api.yml` + `docker-compose.api.yml`)
- No rollback, no scope reduction, no MVP impact
- GH Pages retirement is clean — delete `deploy.yml` after new CD is verified

**Effort:** Low
**Risk:** Low
**Timeline impact:** None — Story 13.6 can be implemented independently

---

## 4. Detailed Change Proposals

### 4.1 Epic 13 Statement Update

**File:** `_bmad-output/planning-artifacts/epics/epic-11-demo-environment-deployment.md`

**OLD (Epic Statement):**
> As a team showcasing the EM . U platform, we want a self-contained demo environment at `demo.dhanifudin.com` with realistic seed data that resets on every deployment, so that prospects and team members can experience the full product lifecycle without affecting production data.

**NEW (Epic Statement):**
> As a team deploying and showcasing the EM . U platform, we want a unified VPS deployment topology with three endpoints — `yorindo.dhanifudin.com` (FE preview with MSW mocks, replacing GitHub Pages), `api.dhanifudin.com` (standalone API, already deployed), and `demo.dhanifudin.com` (full-stack demo with postgres and seed data) — so that all environments are consistently managed via Docker Compose on VPS.

### 4.2 New Story 13.6

**File:** `_bmad-output/implementation-artifacts/13-6-vps-frontend-preview-deployment.md` (to be created by `create-story`)

**Summary:**
- Create `docker-compose.app.yml` — app-only container with MSW mocks
- Create `yorindo-app/.env.preview` — preview env vars
- Create `cd-app.yml` — CD workflow triggered on main push to `yorindo-app/**`
- Add Makefile targets: `deploy-app`, `stop-app`, `logs-app`
- Retire `deploy.yml` (GitHub Pages)

### 4.3 Architecture Doc Update

**File:** `_bmad-output/planning-artifacts/architecture.md`

**Addition to Infrastructure Topology section:**

```markdown
### VPS Deployment Topology

| Endpoint | Compose File | Services | VPS Path | CD Trigger |
|----------|-------------|----------|----------|------------|
| yorindo.dhanifudin.com | docker-compose.app.yml | app (MSW mocks) | /var/www/yorindo-app | main push (yorindo-app/**) |
| api.dhanifudin.com | docker-compose.api.yml | api + postgres + redis | /var/www/yorindo-api | main push (yorindo-api/**) |
| demo.dhanifudin.com | docker-compose.demo.yml | app + api + postgres | /var/www/yorindo-demo | tag (v*.*.*) |
```

### 4.4 Sprint Status Update

**File:** `_bmad-output/implementation-artifacts/sprint-status.yaml`

**Addition under Epic 13:**
```yaml
  13-6-vps-frontend-preview-deployment: backlog
```

---

## 5. Implementation Handoff

**Scope:** Minor — direct implementation by dev team

| Step | Action | Owner |
|------|--------|-------|
| 1 | Apply sprint-status.yaml update (add 13.6) | This SCP |
| 2 | Update epic file with expanded statement + Story 13.6 row | This SCP |
| 3 | Run `create-story` for Story 13.6 with full context | Dev |
| 4 | Run `dev-story` for Story 13.6 | Dev |
| 5 | Verify `yorindo.dhanifudin.com` serves app on VPS | Dev |
| 6 | Delete `deploy.yml` after verification | Dev |

**Success criteria:**
- `yorindo.dhanifudin.com` serves the yorindo-app container from VPS
- `api.dhanifudin.com` continues working (no regression)
- `demo.dhanifudin.com` continues working (no regression)
- `deploy.yml` (GH Pages) is retired
- All 3 endpoints follow Docker Compose + CD workflow pattern
