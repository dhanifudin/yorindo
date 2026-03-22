# Epic 8: Analytics, Reporting & YoriMind

Admin can access AI-powered event performance insights via the YoriMind panel with funnel charts and demographic breakdowns; vendors can securely download post-event reports via time-limited magic links with mandatory DPA acceptance.

> **Phase 1 (FE):** Post-event report page (attendance funnel chart via Recharts, demographic breakdowns, metric cards); vendor magic link landing page + DPA acceptance gate; analytics dashboard (filters, date range, export buttons); YoriMind panel (analysis text, root causes, recommendations table, "Refresh Insights" button, skeleton during 1200ms load); PDF + Excel download buttons — all wired to MSW yorimind/report handlers
> **Phase 2 (BE):** Report generation BullMQ job (triggered on event completion), `GET /api/events/:id/report`, vendor magic link generation + 7-day expiry + download-force header (NFR-S12), DPA acceptance endpoint, `GET /api/events/:id/yorimind` (node-cron + Redis TTL + `IYoriMindService` adapter — provider set by `YORIMIND_AI_PROVIDER` env var), `GET /api/events/:id/report/download?format=xlsx|pdf` (xlsx + pdfkit), access logging (NFR-S13, NFR-S16)

## Story 8.1: Post-Event Attendance Report Generation

As an admin,
I want a comprehensive attendance report automatically generated when an event completes,
So that I have an accurate record of event performance without manual data compilation.

**Acceptance Criteria:**

**Given** an event transitions to `status: 'completed'`,
**When** the state change is processed,
**Then** a BullMQ job is enqueued to generate the attendance report asynchronously

**Given** the report generation job runs,
**When** complete,
**Then** the report includes: total invited, registered, approved, attended, attendance rate, no-show rate, and demographic breakdowns by industry, job title, and city (FR43)

**Given** the report is generated,
**When** `GET /api/events/:id/report` is called by admin,
**Then** it returns the report data within 10 minutes of event completion (NFR-P7)

**Given** a super admin calls `POST /api/events/:id/report/regenerate`,
**When** the request is processed,
**Then** a new report generation job is enqueued and the existing report is replaced when complete (FR46)

---

## Story 8.2: Vendor Report Access via Magic Link & DPA

As a vendor/client,
I want to access the event report via a time-limited link without creating an account, after accepting the data processing agreement,
So that I receive the participant insights I was promised without the friction of platform registration.

**Acceptance Criteria:**

**Given** a super admin configures the vendor contact and report tier for an event,
**When** `POST /api/events/:id/vendor-link` is called,
**Then** a time-limited signed URL is generated (max 7-day expiry) and delivered to the configured vendor email (FR41, NFR-S12)

**Given** the vendor opens the magic link,
**When** they access the report page,
**Then** they are shown the current DPA version and must click "Accept" before the report content is visible (FR44)

**Given** the vendor accepts the DPA and downloads the report,
**When** the download is triggered,
**Then** the request is logged: IP address, timestamp, user agent stored in `audit_logs` for UU PDP compliance (NFR-S13)

**Given** the magic link has expired (> 7 days),
**When** it is accessed,
**Then** HTTP 403 is returned with a message to contact Yorindo for a new link

**Given** the DPA version changes after the vendor's acceptance,
**When** the vendor accesses the report again,
**Then** they must re-accept the new DPA version before viewing (FR44)

---

## Story 8.3: Analytics Dashboard — Funnel & Demographics

As an admin,
I want to view a visual analytics dashboard with registration funnel and participant demographic breakdowns,
So that I can understand event performance and participant composition at a glance.

**Acceptance Criteria:**

**Given** I am on the event detail page (`/admin/events/:id`),
**When** the analytics section renders,
**Then** a Recharts funnel chart shows: Invited → Registered → Approved → Attended with conversion rates between each stage

**Given** the analytics dashboard,
**When** the demographic section renders,
**Then** a Recharts pie/bar chart shows participant breakdown by industry, a city distribution map, and job title level breakdown

**Given** the analytics data,
**When** `GET /api/events/:id/analytics` is called,
**Then** the response is returned within 2 seconds (NFR-P3) and includes all funnel + demographic data in a single payload

**Given** multiple events are active simultaneously (≥ 5),
**When** admin loads any event's analytics dashboard,
**Then** load time remains ≤ 2 seconds (NFR-SC2)

---

## Story 8.4: YoriMind AI Analysis Panel

As an admin,
I want to view AI-generated insights about event performance with specific root causes and actionable recommendations,
So that I can improve future events based on data-driven intelligence rather than intuition.

**Acceptance Criteria:**

**Given** the daily cron runs at 02:00 WIB,
**When** `snapshot.service.ts` executes,
**Then** a JSON snapshot is generated for each event with `{ event, funnel_data, historical_comparison, attendee_segments }` and saved to `$SNAPSHOT_DIR/event_{id}_{date}.json`

**Given** I open `/admin/events/:id/yorimind`,
**When** `GET /api/events/:id/yorimind` is called,
**Then** Redis is checked for key `yorimind:event:{id}`; on cache hit the cached response is returned immediately

**Given** a cache miss,
**When** the latest snapshot file is read,
**Then** `IYoriMindService.analyzeEvent(snapshot)` is called with the snapshot JSON as context; the response is cached in Redis with TTL 24h; the concrete AI provider is resolved from `YORIMIND_AI_PROVIDER` env var via `container.ts` — code never references a specific AI vendor directly

**Given** the YoriMind response,
**When** it is displayed in the FE,
**Then** it shows: `analysis` (narrative), `root_causes` (bullet list), `recommendations` (action/impact/priority table), `summary`, and `tracked_metrics`

**Given** I click "Refresh Insights",
**When** the refresh is triggered,
**Then** the Redis cache key is invalidated and a fresh `IYoriMindService.analyzeEvent()` call is made; a loading state shows during the AI response time (typically 1000–2000ms)

---

## Story 8.5: Report Download (PDF & Excel)

As a vendor or admin,
I want to download the event report in PDF and Excel formats,
So that I can share the data in standard business formats.

**Acceptance Criteria:**

**Given** the report page is accessed (vendor via magic link, admin via dashboard),
**When** "Download Excel" is clicked,
**Then** `GET /api/events/:id/report/download?format=xlsx` returns an `.xlsx` file with attendance data, demographics, and funnel metrics as separate sheets

**Given** "Download PDF" is clicked,
**When** the download is triggered,
**Then** `pdfkit` generates a PDF report with formatted text sections and tabular data; the file downloads without browser rendering (triggers file download, not page navigation) (NFR-S12)

**Given** the report download,
**When** the file is generated,
**Then** the download triggers a `report.downloaded` audit entry with `{ actor_type: 'vendor'|'admin', event_id, format, ip_address }`

---
