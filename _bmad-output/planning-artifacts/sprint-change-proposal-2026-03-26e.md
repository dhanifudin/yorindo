# Sprint Change Proposal — 2026-03-26 (E)

**Trigger:** Product request to revamp admin dashboard with participant intelligence, vendor-event breakdown, and company aggregation view
**Scope:** New epic (Epic 12 / planning ref: Epic 10) — FE Phase 1 + BE Phase 2; also extends Story 3.8 (FilterBar)
**Status:** Approved (Incremental review completed 2026-03-26)

---

## Section 1: Issue Summary

The current admin dashboard at `/app` shows basic stat cards only. Product wants a full intelligence command center with:

1. **Participant composition quick-filter** — Filter contacts by event, job title, industry, and city directly from the dashboard; show matching count and link to pre-filtered contacts list.

2. **Vendor-event breakdown widget** — Show each vendor alongside their event count, sourced from `events.vendor_id → vendors` (no new schema needed).

3. **Company intelligence view** — New route `/app/contacts/companies` grouping contacts by company with contact count, events attended, and primary city; sortable and filterable.

4. **Company filter on contacts list** — Story 3.8 FilterBar extended with a company name filter, backed by `company: [{ name, count }]` added to `GET /api/contacts/facets` response.

---

## Section 2: Impact Analysis

### New Planning Artifacts

| Artifact | Type | Change |
|---|---|---|
| `epics/epic-10-admin-intelligence-dashboard.md` | NEW | Full epic spec with Story 10.1 and Story 10.2 |
| `epics/epic-list.md` | UPDATED | Added Epic 10: Admin Intelligence Dashboard |
| `prd.md` | UPDATED | Added FR-D1 (Admin Intelligence Dashboard), FR-D2 (Company Intelligence View), FR-D3 (Company Filter on Contact List) |
| `architecture.md` | UPDATED | Extended Redis cache table (cross-cutting concern #15) with `dashboard:stats` and `contacts:companies` entries; documented new Epic 10 endpoints |

### Story Status Changes

| Story | Was | Now | Change |
|-------|-----|-----|--------|
| `3-8-filterbar-enhancements-facet-counts-url-state-activefilter-pills` | `review` | `ready-for-dev` | Add company filter dimension: `GET /api/contacts/facets` extended with `company: [{ name, count }]`; company Name dropdown + `?company=` URL param + ActiveFilterPill |
| `12-1-admin-intelligence-dashboard-page` | — | `backlog` | New story (Epic 12) |
| `12-2-company-intelligence-view` | — | `backlog` | New story (Epic 12) |

### Architecture Changes

**No schema changes required** — vendor grouping uses existing `events.vendor_id FK → vendors`. Company grouping is a query-time aggregation on `contacts.company`.

**New API endpoints:**
- `GET /api/dashboard/stats` → `{ vendorStats: [{ vendorId, vendorName, eventCount }], totalCompanies: number, pendingRegistrations: number }`
- `GET /api/contacts/companies?page&pageSize&industry&city` → `{ data: [{ company, industry, contactCount, eventsAttended, primaryCity }], pagination }`
- `GET /api/contacts/facets` (extended) — adds `company: [{ name, count }]`

**New Redis cache entries:**
- `dashboard:stats` — 2 min TTL, invalidated on event create/update or contact upsert
- `contacts:companies:{filterHash}` — 5 min TTL, invalidated on contact upsert or ETL job completion

---

## Section 3: New Epic 12 Stories

### Story 12.1: Admin Intelligence Dashboard page
Planning reference: Epic 10, Story 10.1 (`epics/epic-10-admin-intelligence-dashboard.md`)

**Phase 1 (FE):**
- `/app` redirects to `/app/dashboard`
- Four metric cards: Total Kontak, Total Event, Total Perusahaan, Registrasi Pending
- Participant Quick Filter panel (event_id, job_title, industry, city) with live count
- Vendor-Event breakdown widget (top 5 vendors by event count)
- Recent Events table with Vendor/Sponsor column
- Quick Actions: Buat Event, Upload Kontak, Lihat Laporan, Lihat Perusahaan
- MSW handler for `GET /api/dashboard/stats` with seeded vendor data
- Viewer role: read-only `ViewerDashboard` component

**Phase 2 (BE):**
- `GET /api/dashboard/stats` Fastify route + service + Redis cache
- Aggregates vendor event counts from `events.vendor_id`

### Story 12.2: Company Intelligence View
Planning reference: Epic 10, Story 10.2 (`epics/epic-10-admin-intelligence-dashboard.md`)

**Phase 1 (FE):**
- Route `/app/contacts/companies`
- TanStack Table (manual/server-side): company, industry, contactCount, eventsAttended, primaryCity
- Filter bar: industry + city dropdowns (reuse shadcn `Select` pattern from contacts page)
- Click row → navigate to `/app/contacts?company={companyName}`
- Sortable by contactCount (default desc) and eventsAttended
- MSW handler for `GET /api/contacts/companies` with ≥20 seeded rows

**Phase 2 (BE):**
- `GET /api/contacts/companies` Fastify route + service + Redis cache
- SQL: `GROUP BY contacts.company` with JOINs for event attendance count

---

## Section 4: Story 3.8 Extension

Story 3.8 (`3-8-filterbar-enhancements-facet-counts-url-state-activefilter-pills`) is extended with a company name filter dimension to support click-through navigation from Story 12.2 (`/app/contacts?company=X`).

**Changes to story 3.8:**
- `GET /api/contacts/facets` response extended: `company: [{ name: string, count: number }]`
- New Company Name dropdown in FilterBar
- URL param `?company=` added to instant filter params
- ActiveFilterPill: `"Perusahaan: {name} [×]"` clears `company` param on dismiss
- MSW handler for facets updated to include company facet data

**Why 3.8 is reset (not a new story):** The company filter is a natural extension of the existing FilterBar pattern. It reuses the same `Select` + `ActiveFilterPill` + URL-state machinery already specified in 3.8. Adding a new story for a single dropdown would create unnecessary overhead.
