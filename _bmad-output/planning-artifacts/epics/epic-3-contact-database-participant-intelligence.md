# Epic 3: Contact Database & Participant Intelligence

Admin can build and maintain a clean, qualified participant database by importing Excel/CSV data, reviewing AI-normalized records, resolving duplicate profiles, and searching/filtering contacts with AI-assisted smart industry classification.

> **Phase 1 (FE):** Contacts table (TanStack Table, pagination, filter bar, smart filter input + debounce); upload form + file picker + job status poller; ETL job status page; flagged records review UI (side-by-side diff + approve/discard); duplicate merge UI (field selector); — all wired to MSW contacts/etl handlers
> **Phase 2 (BE):** `GET /api/contacts`, `POST /api/etl/upload`, BullMQ ETL worker + AI normalization via `IEtlNormalizationService` adapter (provider set by `ETL_AI_PROVIDER` env var) + Zod validation, `GET /api/etl/jobs/:id`, `GET/PATCH /api/contacts/flagged`, `POST /api/contacts/:id/merge`, `POST /api/smart-filter/industry` via `ISmartFilterService` adapter (provider set by `SMART_FILTER_AI_PROVIDER` env var), MongoDB raw_uploads document write, all repositories
>
> **Contacts Intelligence Hub Revamp (Stories 3.7–3.12 — FE phase, wired to new MSW handlers):** HealthBar component + `/api/contacts/health` handler; FilterBar facet counts + `ActiveFilterPills` + URL state + `/api/contacts/facets` handler; `ActionToolbar` sticky blast entry; `TriagePanel` inline collapsible with optimistic updates + `/api/contacts/duplicates` handler; `EventBanner` pre-event shortcut + `/api/events/upcoming-uncontacted` handler; Contact event history tab in Sheet + `/api/contacts/:id/history` handler

## Story 3.1: Contact List with Server-Side Pagination & Filtering

As an admin,
I want to browse the contact database with pagination, sorting, and filtering by industry, city, and company size,
So that I can find and review specific participant segments efficiently.

**Acceptance Criteria:**

**Given** I am authenticated as `admin`,
**When** `GET /api/contacts?page=1&pageSize=50` is called,
**Then** it returns `{ data: Contact[], pagination: { page, pageSize, total, totalPages } }` with HTTP 200, results within 500ms

**Given** a filter param `?industry=kesehatan&city=Jakarta`,
**When** the contacts endpoint is called,
**Then** only contacts matching both filters are returned

**Given** the contacts page in the admin dashboard,
**When** it renders,
**Then** TanStack Table v8 in manual (server-side) mode displays the paginated data with sortable columns (name, industry, city, company, created_at)

**Given** the page or sort params change,
**When** React Query re-fetches,
**Then** the table updates without a full page reload and shows a skeleton loader during fetch

**Given** a `viewer` user accesses the contacts list,
**Then** it returns HTTP 403 — viewers cannot access the contact database

---

## Story 3.2: Excel/CSV Upload & ETL Job Trigger

As an admin,
I want to upload an Excel or CSV file of participant records and trigger the ETL normalization pipeline,
So that I can import bulk data into the contact database without manual entry.

**Acceptance Criteria:**

**Given** I am authenticated as `admin`,
**When** `POST /api/etl/upload` is called with a multipart file upload (`.xlsx` or `.csv`),
**Then** the file is saved to the `uploads_tmp` Docker volume and a BullMQ ETL job is enqueued; the endpoint returns HTTP 202 `{ jobId, status: 'queued' }`

**Given** a file larger than the configured max size,
**When** the upload is attempted,
**Then** it returns HTTP 400 `{ error: { code: 'FILE_TOO_LARGE', ... } }`

**Given** a file with an unsupported extension,
**When** the upload is attempted,
**Then** it returns HTTP 400 `{ error: { code: 'INVALID_FILE_TYPE', ... } }`

**Given** the ETL job is enqueued,
**When** `GET /api/etl/jobs/:jobId` is called,
**Then** it returns the current job status: `queued`, `processing`, `completed`, or `failed`

**Given** the upload form on the FE (`/admin/contacts/upload`),
**When** a file is selected and submitted,
**Then** the form shows an upload progress indicator and on success shows the job ID with a link to monitor status

---

## Story 3.3: ETL Processing — AI Normalization & Database Upsert

As a system,
I want the ETL worker to parse uploaded files, normalize records via the configured AI normalization service in batches of 50, and upsert valid contacts into PostgreSQL,
So that raw imported data becomes clean, standardized participant records automatically.

**Acceptance Criteria:**

**Given** an ETL job is dequeued by `etl.worker.ts`,
**When** the file is read from `uploads_tmp`,
**Then** `xlsx` parses it into an array of row objects and the temp file is deleted after parsing

**Given** 50 rows are sent to the AI normalization service (`IEtlNormalizationService`) with the standard system prompt,
**When** the response is received,
**Then** each row has `{ name, phone, email, industry_slug, job_title_slug, city, company_size, confidence, flags[] }` and passes Zod schema validation

**Given** a row with all field confidence ≥ 0.7,
**When** the upsert runs,
**Then** `ContactRepository.upsert()` inserts a new contact or updates an existing one matched by phone (`ON CONFLICT (phone) DO UPDATE`)

**Given** a row with any field confidence < 0.7,
**When** the ETL processes it,
**Then** the row is inserted into `flagged_records` with the raw data and flags; it is NOT upserted into `contacts`

**Given** the AI normalization service returns invalid JSON or a Zod validation failure,
**When** the batch is processed,
**Then** the batch is retried up to 3 times with exponential backoff before being marked as failed

**Testing Strategy (Quinn):** Real AI provider calls are never made in CI tests. The `etl.worker.ts` must accept a configurable `IEtlNormalizationService` implementation (default: resolved from `container.ts` via `ETL_AI_PROVIDER` env var; test override: `MockEtlNormalizationService` — deterministic stub returning pre-defined normalized rows). Vitest tests cover: valid batch upsert path, low-confidence flagging path, retry logic with simulated JSON parse failure. No real AI API calls in test suite.

**Given** the ETL upsert runs for a contact row,
**Then** `contacts.completeness_score` is computed as the integer percentage of non-null profile fields (`name`, `phone`, `email`, `company`, `industry_id`, `job_title_id`, `city`, `company_size`) and persisted alongside the upsert (FR12)

**Given** the ETL job completes,
**Then** a `raw_uploads` document is created in MongoDB with `{ filename, uploaded_by, row_count, status: 'completed', flagged_rows }` and a `contact.imported` audit entry is written

---

## Story 3.4: Flagged Records Review & Resolution

As an admin,
I want to review AI-flagged contact records, correct errors, and either approve or discard them,
So that uncertain data is human-reviewed before entering the clean contact database.

**Acceptance Criteria:**

**Given** I am authenticated as `admin`,
**When** `GET /api/contacts/flagged?page=1&pageSize=50` is called,
**Then** it returns paginated flagged records with `{ raw_data, flags[], status: 'pending' }`

**Given** a flagged record is displayed in the FE (`/admin/contacts/flagged`),
**Then** the original raw field values and the AI flags are both shown side by side for comparison

**Given** I correct a flagged record's fields and submit,
**When** `PATCH /api/contacts/flagged/:id` is called with `{ resolved_data, action: 'approve' }`,
**Then** the corrected contact is upserted into `contacts` and the flagged record `status` is updated to `resolved`; a `flagged.reviewed` audit entry is written

**Given** I choose to discard a flagged record,
**When** `PATCH /api/contacts/flagged/:id` is called with `{ action: 'discard' }`,
**Then** the flagged record `status` is updated to `discarded` and no contact is created

**Given** the flagged records list,
**When** it renders,
**Then** TanStack Table v8 server-side mode shows the data with status filter (pending / resolved / discarded)

---

## Story 3.5: Duplicate Profile Detection & Merge

As an admin,
I want to review automatically flagged duplicate participant profiles and merge them into a single canonical record,
So that the contact database maintains one accurate profile per real participant.

**Acceptance Criteria:**

**Given** a new registration or ETL import occurs,
**When** the system checks composite identity signals (phone, email, name + company),
**Then** potential duplicates are flagged and surfaced in the admin dashboard for review (FR10)

**Given** I am on the duplicate review page,
**When** two profiles are shown side by side,
**Then** I can see all fields from both records and select which value to keep per field

**Given** I confirm the merge,
**When** `POST /api/contacts/:id/merge` is called with `{ mergeIntoId, fieldSelections }`,
**Then** the surviving record is updated with selected fields, the duplicate is soft-deleted, all registrations referencing the duplicate are re-linked to the surviving record, and a `contact.merged` audit entry is written

**Given** a merge is performed,
**When** the duplicate contact's ID is used in any subsequent API call,
**Then** it returns the surviving contact's data (redirect via ID mapping)

---

## Story 3.6: Smart Filter — AI Industry Autocomplete

As an admin,
I want to type a free-form industry term in the contact filter and have it automatically mapped to a canonical industry slug,
So that I don't need to know exact industry taxonomy values to filter contacts accurately.

**Acceptance Criteria:**

**Given** I type "rumah sakit" in the industry filter input,
**When** 500ms elapses (debounce),
**Then** `POST /api/smart-filter/industry` is called with `{ query: 'rumah sakit' }`

**Given** the AI smart filter service (`ISmartFilterService`) returns a match with confidence ≥ 0.6,
**When** the response is received,
**Then** the filter applies the matched slug (e.g., `kesehatan`) and the contact list updates

**Given** the AI smart filter service returns confidence < 0.6,
**When** the response is received,
**Then** `{ fallback: true }` is returned and the filter displays a standard dropdown of all industry options

**Given** the smart filter API call fails or times out,
**When** the error occurs,
**Then** the filter silently falls back to the standard dropdown — no error shown to the user

---

## Story 3.7: HealthBar — Database Quality Pulse

As an admin,
I want to see a persistent health bar at the top of the contacts page showing flagged count, duplicate count, and contacts-missing-email count,
So that I immediately know what data quality tasks need attention when I arrive on the page.

**Acceptance Criteria:**

**Given** I am authenticated as `admin`,
**When** the `/app/contacts` page loads,
**Then** the `HealthBar` component renders above the filter bar with three stat columns: flagged records count, duplicate pairs count, and contacts-missing-email count — each rendered as a `Button` with descriptive `aria-label`

**Given** the health data is loading,
**When** the page first renders,
**Then** `Skeleton` placeholders replace each stat value until `GET /api/contacts/health` resolves

**Given** the flagged count is > 0,
**When** the HealthBar renders,
**Then** the flagged stat value uses `text-destructive`; when count = 0 it uses `text-muted-foreground` and the label shows "Semua bersih ✓"

**Given** I click the "flagged" stat in the HealthBar,
**When** the TriagePanel is collapsed,
**Then** the TriagePanel opens in "flagged" mode (see Story 3.10)

**Given** I click the "duplicates" stat in the HealthBar,
**When** the TriagePanel is collapsed,
**Then** the TriagePanel opens in "duplicates" mode (see Story 3.10)

**Given** I click the "missing email" stat in the HealthBar,
**When** the stat is clicked,
**Then** a `missingEmail=true` query param is added to the URL and the contact table re-fetches with that filter applied

**Given** `GET /api/contacts/health` is called,
**When** the MSW handler responds,
**Then** it returns `{ flagged: 34, duplicates: 12, missingEmail: 58 }` with HTTP 200

**Given** the HealthBar container element,
**Then** it has `role="status"` and `aria-live="polite"` so screen readers announce count changes without interrupting the user

---

## Story 3.8: FilterBar Enhancements — Facet Counts, URL State & ActiveFilterPills

As an admin,
I want filter dropdowns to show contact counts per option, all applied filters to persist in the URL, and active filters to appear as dismissible pills below the filter bar,
So that I know segment size before applying a filter, can share or restore filter state via URL, and have a clear view of what's currently active.

**Acceptance Criteria:**

**Given** the FilterBar renders,
**When** `GET /api/contacts/facets` has resolved,
**Then** each `SelectItem` in Industry, City, Company Size, and Company Name dropdowns shows a count suffix — e.g., "Teknologi (47)" or "PT Infomedia (12)"

**Given** `GET /api/contacts/facets` is called,
**When** the MSW handler responds,
**Then** it returns `{ industry: [{ slug, label, count }], city: [{ slug, label, count }], companySize: [{ slug, label, count }], company: [{ name, count }] }` with HTTP 200; `company` returns top 20 companies by contact count; counts reflect the total contacts matching each facet value

**Given** I select a company from the Company Name dropdown,
**When** the Select onChange fires,
**Then** `?company={name}` is added to the URL; the contacts table re-fetches showing only contacts from that company; the `ActiveFilterPills` component renders a pill "Perusahaan: PT Infomedia [×]"

**Given** the page loads with `?company=PT+Infomedia` in the URL,
**When** the FilterBar mounts,
**Then** the Company Name dropdown is pre-selected to "PT Infomedia" using `useSearchParams`

**Given** I select a filter value from a dropdown,
**When** the Select onChange fires,
**Then** the URL is updated via `router.push` (Next.js `useRouter`) adding the corresponding query param (e.g., `?industry=teknologi`) without a full page reload; React Query re-fetches contacts with the updated params

**Given** the page loads with query params in the URL (e.g., `?industry=teknologi&city=jakarta`),
**When** the FilterBar mounts,
**Then** the dropdowns are pre-selected to match the URL state using `useSearchParams`

**Given** one or more filters are active,
**When** the `ActiveFilterPills` component renders,
**Then** it shows a `ScrollArea orientation="horizontal"` containing one `Badge variant="secondary"` per active filter, each with a ghost icon-only `Button` (×) to remove it; when ≥2 filters are active a "Hapus semua" link appears; below the pills the contact count shows "N kontak ditemukan"

**Given** I click × on an active filter pill,
**When** the button is clicked,
**Then** that filter's query param is removed from the URL and the contact table re-fetches

**Given** no filters are active,
**When** the `ActiveFilterPills` component renders,
**Then** it renders null (no DOM output)

**Given** the AI search Input renders in the FilterBar,
**When** it renders,
**Then** it shows a violet `Badge` labelled "AI ✦" inside the input's trailing slot; while `isSearching=true` a `Loader2` spinner is shown and `aria-busy={isSearching}` is set on the results container

**Given** AI search is active and I clear the AI search input,
**When** the input value is cleared,
**Then** only the `q` URL query param is removed; all instant filter params (industry, city, companySize, company) remain unchanged

**Given** filters are active and I click "Simpan Segmen" in the FilterBar,
**When** the `Popover` opens,
**Then** a `PopoverContent` with an autofocused `Input` and a "Simpan" `Button` is shown; on submit the segment name + current filter params are stored in `localStorage` and a Sonner toast confirms "Segmen '[name]' disimpan"

**Given** the "Simpan Segmen" button,
**When** no filters are active,
**Then** it is not rendered

---

## Story 3.9: ActionToolbar — Segment Blast Entry Point

As an admin,
I want a sticky action toolbar to appear at the bottom of the contacts page when filters are active or rows are selected,
So that I can blast the current filtered segment to the blast composer in one click.

**Acceptance Criteria:**

**Given** no filters are active and no table rows are selected,
**When** the contacts page renders,
**Then** the `ActionToolbar` is not rendered (renders null) and has `aria-hidden="true"` when hidden

**Given** one or more filters are active,
**When** the `ActionToolbar` renders,
**Then** it appears as a `Card` with `className="sticky bottom-0 z-10 rounded-none border-t border-x-0 border-b-0"` containing: a segment contact count on the left ("18 kontak di segmen ini"), an "Export CSV" `Button variant="outline"` on the right, and a primary "Blast Segmen · 18 kontak →" `Button` on the far right

**Given** the live contact count from the current React Query result,
**When** filters change and the query re-fetches,
**Then** the count in the ActionToolbar updates to match `pagination.total` from the contacts response

**Given** I click "Blast Segmen · N kontak →",
**When** the button is clicked,
**Then** the app navigates to `/app/blasts/new?segment=teknologi,jakarta&count=18` with all active instant filter slugs comma-separated in the `segment` param and the live count in `count`

**Given** the `ActionToolbar` root element,
**Then** it has `role="toolbar"` and `aria-label="Aksi segmen"`

---

## Story 3.10: TriagePanel — Inline Flagged & Duplicate Records

As an admin,
I want to review and resolve flagged records and duplicate contact pairs inline on the contacts page without navigating to a sub-page,
So that I can triage data quality issues within my current workflow context and see health counts update in real time.

**Acceptance Criteria:**

**Given** I click the "flagged" stat in the HealthBar,
**When** the `TriagePanel` is collapsed,
**Then** it expands using shadcn `Collapsible` + `CollapsibleContent` with `motion-safe:data-[state=open]:animate-collapsible-down` animation; focus moves to the first interactive element within the panel

**Given** the TriagePanel is open in "flagged" mode,
**When** it renders,
**Then** it shows a compact flagged records table (fetching from `GET /api/contacts/flagged?status=pending&pageSize=20`) with "Setujui" and "Buang" action buttons per row; reuses the data-fetching and mutation logic from `/app/contacts/flagged`

**Given** I click "Setujui" on a flagged record in the TriagePanel,
**When** the mutation fires,
**Then** an optimistic update immediately decrements the flagged count in the HealthBar (e.g., 34 → 33); if the API call succeeds the Sonner toast reads "Catatan disetujui · 33 tersisa"; if the API call fails the count rolls back and toast reads "Perubahan dibatalkan — terjadi kesalahan"

**Given** I click "Buang" on a flagged record in the TriagePanel,
**When** the mutation fires,
**Then** the same optimistic decrement and rollback behavior applies as for "Setujui"

**Given** the last pending flagged record is resolved,
**When** the flagged count reaches 0,
**Then** the TriagePanel collapses automatically; focus returns to the HealthBar flagged stat; the stat label updates to "Semua bersih ✓"; a Sonner toast reads "Semua catatan bermasalah diselesaikan"

**Given** I click the "duplicates" stat in the HealthBar,
**When** the TriagePanel opens in "duplicates" mode,
**Then** it fetches `GET /api/contacts/duplicates` and shows duplicate pairs with a "Lihat Perbedaan" button per pair; clicking opens a `Sheet` with a side-by-side field diff and "Gabung" / "Bukan Duplikat" actions; optimistic count decrement applies on either action

**Given** `GET /api/contacts/duplicates` is called,
**When** the MSW handler responds,
**Then** it returns `{ data: [{ id, contact1: Contact, contact2: Contact }], pagination: { total } }` with HTTP 200; deterministically seeded from the contacts pool

**Given** one TriagePanel mode is already open and I click a different HealthBar stat,
**When** the new stat is clicked,
**Then** the panel switches to the new mode without close/reopen animation — the `Collapsible` stays open and content swaps

**Given** I click the collapse toggle button in the TriagePanel header,
**When** the button is clicked,
**Then** the panel collapses and focus returns to the HealthBar stat that originally triggered it

---

## Story 3.11: EventBanner — Pre-event Blast Shortcut

As an admin,
I want a contextual banner to appear at the top of the contacts page when an event is within 14 days showing uncontacted contacts,
So that I can blast the relevant audience in one click without manually configuring filters.

**Acceptance Criteria:**

**Given** an upcoming event is ≤14 days away and has uncontacted contacts > 0,
**When** the contacts page loads and `GET /api/events/upcoming-uncontacted` resolves,
**Then** the `EventBanner` renders below the `HealthBar` as a shadcn `Alert` with `className="bg-amber-50 border-amber-200 text-amber-900"` showing: a calendar icon, event name, days remaining ("8 hari lagi"), uncontacted count ("45 kontak belum diundang"), and "Blast Sekarang →" `Button`

**Given** no upcoming event within 14 days exists,
**When** the contacts page renders,
**Then** the `EventBanner` renders null

**Given** `GET /api/events/upcoming-uncontacted` is called,
**When** the MSW handler responds,
**Then** it returns `{ event: { id: 'event-001', name: 'Konferensi Teknologi 2026', eventDate: '...' }, daysUntil: 8, uncontactedCount: 45 }` with HTTP 200; or `{ event: null }` when no qualifying event is within 14 days; the mock deterministically returns a qualifying event so the banner is visible and testable in development

**Given** I click "Blast Sekarang →" in the EventBanner,
**When** the button is clicked,
**Then** the app navigates to `/app/blasts/new?eventId=event-001&segment=teknologi&count=45` pre-filling the blast composer with the event's primary industry segment and uncontacted count

**Given** the `EventBanner` element,
**Then** it has `role="alert"` and `aria-live="polite"` on the `Alert` component

---

## Story 3.12: Contact Event History Tab in Sheet

As an admin,
I want to see a contact's event registration history in the contact detail sheet,
So that I can understand their event engagement before deciding to invite them to a new event.

**Acceptance Criteria:**

**Given** I click a contact row in the contacts table,
**When** the contact detail `Sheet` opens,
**Then** it renders three shadcn `Tabs`: "Info" (existing personal/company fields), "Riwayat" (event history), and "Segmen" (industry/city/size/flagCategory)

**Given** the "Riwayat" tab is selected,
**When** the data loads from `GET /api/contacts/:id/history`,
**Then** a chronological list of registrations is shown with: event name, formatted event date, and a status `Badge` per registration (approved → green, attended → primary, cancelled → destructive, pending → muted); most recent registration appears first

**Given** `GET /api/contacts/:id/history` is called,
**When** the MSW handler responds,
**Then** it returns `{ registrations: [{ eventId, eventName, eventDate, status }] }` with HTTP 200; the registration list is deterministically generated from the contact ID using the djb2 hash pattern (consistent with existing mock conventions — same result for same contact ID across requests)

**Given** the contact has no registration history,
**When** the "Riwayat" tab renders,
**Then** it shows "Belum ada riwayat event" empty state text

**Given** the contact detail Sheet,
**Then** it uses `SheetContent side="right" className="sm:max-w-lg w-full"` — no SSR-unsafe `isMobile` or `window.innerWidth` checks in any Sheet variant

---
