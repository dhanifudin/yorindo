# Epic 10: Admin Intelligence Dashboard

Admin gets a personalized intelligence command center at `/app/dashboard` — showing live participant composition (filterable by event, job title, industry/manufacture sector, and location), events-by-vendor/sponsor breakdown, company-level contact aggregation, and contextual quick-filter entry points — replacing the current basic stat-card overview at `/app`.

> **Phase 1 (FE):** New `/app/dashboard` route with enhanced stat cards, participant quick-filter panel, vendor-event breakdown widget, recent events table (with vendor column), quick actions; company intelligence view at `/app/contacts/companies`; MSW handlers for `GET /api/dashboard/stats` and `GET /api/contacts/companies`; `/app` redirects to `/app/dashboard`
> **Phase 2 (BE):** `GET /api/dashboard/stats` (aggregate vendor-event counts + totalCompanies), `GET /api/contacts/companies` (contacts grouped by company with stats)

---

## Story 10.1: Admin Intelligence Dashboard page

As an admin,
I want a personalized intelligence dashboard at `/app/dashboard`,
So that I can instantly see participant composition, event-vendor breakdown, and company overview without navigating between pages.

**Acceptance Criteria:**

**Given** I navigate to `/app`,
**When** the route loads,
**Then** the browser is redirected to `/app/dashboard` (using Next.js `redirect()` or `router.replace`)

**Given** I am authenticated as `admin` and navigate to `/app/dashboard`,
**When** the page renders,
**Then** four top metric cards appear: "Total Kontak", "Total Event", "Total Perusahaan", "Registrasi Pending" — each showing live data; skeleton placeholders show during loading

**Given** the Participant Quick Filter panel renders,
**When** I select values from the Event, Job Title, Industry, or City dropdowns,
**Then** `GET /api/contacts?event_id=&job_title=&industry=&city=&pageSize=1` is called with the selected values; a counter below the filters shows "N kontak cocok" updating on each filter change; an "Lihat Kontak →" link navigates to `/app/contacts` pre-filled with the same filter params

**Given** the Vendor-Event breakdown widget renders,
**When** `GET /api/dashboard/stats` resolves,
**Then** a compact list shows each vendor name alongside an event count badge (e.g., "PT Infomedia · 5 event"); list is sorted by event count descending; maximum 5 vendors shown with "Lihat semua" link if more exist

**Given** the Recent Events table renders,
**When** event data loads,
**Then** the table includes a "Vendor/Sponsor" column showing `event.vendorName` (or "—" if none assigned); the table shows the 5 most recent events sorted by `createdAt` descending

**Given** `GET /api/dashboard/stats` is called by the MSW handler,
**When** the handler responds,
**Then** it returns `{ vendorStats: [{ vendorId, vendorName, eventCount }], totalCompanies: 284, pendingRegistrations: 42 }` with HTTP 200; `vendorStats` array is deterministically seeded with at least 3 vendor entries for visible testing

**Given** the Quick Actions section,
**When** it renders,
**Then** it includes: "Buat Event" → `/app/events`, "Upload Kontak" → `/app/contacts/upload`, "Lihat Laporan" → `/app/events`, **and "Lihat Perusahaan" → `/app/contacts/companies`** (new)


**Given** I am a `viewer` role and navigate to `/app/dashboard`,
**When** the page renders,
**Then** the Participant Quick Filter panel and Vendor-Event widget are read-only (no navigation to blast or destructive actions); the viewer-specific `ViewerDashboard` component is shown instead

---

## Story 10.2: Company Intelligence View

As an admin,
I want to see all contacts grouped and summarized by their company at `/app/contacts/companies`,
So that I can identify which organizations have the most engaged participants and plan targeting by company.

**Acceptance Criteria:**

**Given** I am authenticated as `admin` and navigate to `/app/contacts/companies`,
**When** the page renders,
**Then** a TanStack Table v8 (manual/server-side mode) shows companies with columns: Company Name, Industry, Contact Count, Events Attended (distinct events where ≥1 contact from the company registered), City (most common city among contacts)

**Given** `GET /api/contacts/companies?page=1&pageSize=50` is called,
**When** the MSW handler responds,
**Then** it returns `{ data: [{ company, industry, contactCount, eventsAttended, primaryCity }], pagination: { page, pageSize, total, totalPages } }` with HTTP 200; at least 20 deterministic company rows seeded for visible testing

**Given** a filter is applied (industry or city),
**When** the table re-fetches with `?industry=teknologi&city=Jakarta`,
**Then** only companies matching the filter are shown; the filter bar above the table uses the same `industry` and `city` dropdowns as the contacts page (reuse existing shadcn `Select` pattern)

**Given** I click a company row,
**When** the row is clicked,
**Then** the app navigates to `/app/contacts?company={companyName}` — showing all contacts from that company in the standard contacts list


**Given** the page is accessed by a `viewer` role,
**Then** read-only access is permitted (HTTP 200, no edit actions shown)

**Given** the companies table,
**Then** it is sortable by Contact Count (default: descending) and Events Attended

---
