# Sprint Change Proposal — 2026-03-26 (C)

**Trigger:** YoriMind navigation merge, event report redesign, Redis caching layer
**Scope:** Moderate
**Status:** Approved (Incremental review completed 2026-03-26)

---

## Section 1: Issue Summary

Three related changes to the analytics and reporting area:

1. **YoriMind navigation merge** — Story 8.4 had an implied standalone route `/admin/events/:id/yorimind`. User requirement: no separate menu entry. YoriMind panel is embedded as a section within the Laporan tab alongside the analytics dashboard.

2. **Event report redesign** — Story 8.3 lacked explicit metric summary cards and filter controls. New requirements: three metric cards (Total Undangan, Total Mendaftar, Total Peserta) + interactive filters by position, industry, and location/area with filter pills.

3. **Redis caching layer** — High-load read endpoints and AI analysis results must be cached. Architecture already uses Redis for BullMQ and YoriMind (24h TTL). Extended to cover analytics, overview, audience preview, and report endpoints. YoriMind TTL extended to **7 days** (AI output is deterministic for unchanged snapshot input).

---

## Section 2: Impact Analysis

### Story Status Changes

| Story | Was | Now | Change |
|-------|-----|-----|--------|
| 4-12-event-pipeline-hub-laporan-tab | `review` | `ready-for-dev` | Promoted from stub → full tab (analytics + YoriMind sections); key renamed (removed `-stub`) |
| 8-3-analytics-dashboard-funnel-demographics | `review` | `ready-for-dev` | Metric cards + filter controls + Redis cache AC |
| 8-4-yorimind-ai-analysis-panel | `review` | `ready-for-dev` | Standalone route removed; embedded in Laporan tab |

### Artifacts Updated

| Artifact | Change |
|----------|--------|
| `architecture.md` | Cross-cutting concern #8 updated (YoriMind TTL 24h → 7 days); new item #15 (Redis read cache table with 5 endpoints, TTLs, invalidation triggers) |
| `epics/epic-8-analytics-reporting-yorimind.md` | Story 8.3: metric cards + filter ACs + Redis cache AC; Story 8.4: standalone route removed, Laporan tab context |
| `epics/epic-4-event-configuration-management.md` | Story 4.12: promoted from stub to full tab spec with two-section layout |
| `sprint-status.yaml` | 3 stories reset to `ready-for-dev`; Story 4.12 key renamed |

### Technical Impact

- **No new dependencies** — Redis already in stack; ioredis already in scaffold
- **New Redis keys added:** `analytics:event:{id}:{filterHash}`, `overview:event:{id}`, `audience-preview:event:{id}:{filterHash}`, `report:event:{id}` — all consistent with existing `yorimind:event:{id}` pattern
- **filterHash pattern:** SHA-1 of `JSON.stringify(Object.entries(params).sort())` — deterministic, collision-resistant for small param sets
- **API change:** `GET /api/events/:id/analytics` now accepts `?position=&industry=&location=` query params
- **Navigation change:** No route added for YoriMind — removed from sidebar/menu considerations entirely

---

## Section 3: Recommended Approach

**Option 1 — Direct Adjustment** (selected). All three stories were in `review`, not `done`. No rollback required. Changes are additive ACs and a navigation simplification.

**Effort:** Medium
- Story 4.12: replace stub placeholders with real section layout
- Story 8.3: add metric cards, filter bar, wire filter params to API call
- Story 8.4: remove route reference, update mount context

**Risk:** Low — Redis caching is additive infrastructure; filter params are backwards-compatible (unfiltered = all data)

---

## Section 4: Detailed Change Proposals (all applied)

### Architecture — Redis Read Cache (new cross-cutting concern #15)

| Endpoint | TTL | Invalidation |
|---|---|---|
| `GET /api/events/:id/analytics` | 5 min | Any registration status change |
| `GET /api/events/:id/report` | 24h | `report.regenerate` job |
| `GET /api/events/:id/overview` | 2 min | Any registration or blast update |
| `POST /api/events/:id/audience-preview` | 10 min | Contact upsert or ETL job |
| `GET /api/events/:id/yorimind` | **7 days** | Manual "Refresh Insights" only |

Pattern: cache-aside, service layer only, `SET key value EX ttl`.

### Story 4.12 — Laporan Tab (full)
- Two stacked sections: Analytics (8.3 content) + YoriMind (8.4 content)
- Empty state for non-live/completed events shows event `start_date`
- YoriMind: cache hit → immediate display + last-refreshed timestamp; cache miss → skeleton + API call; no snapshot yet → informational message

### Story 8.3 — Analytics Dashboard
- Three metric cards: Total Undangan / Total Mendaftar / Total Peserta with conversion rates
- Filter pills: position, industry, location — trigger `GET /api/events/:id/analytics?position=&industry=&location=`
- Redis cache AC: same filter combo within 5 min returns from cache

### Story 8.4 — YoriMind Panel
- User story updated: "directly within the event report tab, without navigating to a separate page"
- Mount context: Laporan tab section, not a standalone route
- Cache TTL: 7 days (was 24h)

---

## Section 5: Implementation Handoff

**Scope: Moderate** — 3 story reworks, 1 architecture pattern addition

### Dev Team Tasks

1. **Story 8.3** (`ready-for-dev`) — metric cards + filter bar + `?position&industry&location` param support + Redis cache-aside in `analytics.service.ts`
2. **Story 8.4** (`ready-for-dev`) — remove any standalone route wiring; update YoriMind TTL to 7 days in service
3. **Story 4.12** (`ready-for-dev`) — replace stub with two-section Laporan tab layout; import analytics + YoriMind components

### Success Criteria
- [ ] Laporan tab shows Analytics section + YoriMind section (no separate menu item for YoriMind)
- [ ] Three metric cards visible: Total Undangan, Total Mendaftar, Total Peserta
- [ ] Filters by position / industry / location update all charts
- [ ] Analytics endpoint accepts filter query params
- [ ] Redis cache used for all 5 endpoints per architecture table
- [ ] YoriMind cache TTL = 7 days; "Refresh Insights" invalidates correctly
- [ ] All stories pass `bmad-code-review`
