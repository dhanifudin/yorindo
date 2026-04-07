# Epic 4: Event Configuration & Management

Admin can create, configure, clone, publish, and manage events through their full lifecycle — with capacity management, survey template builder, segmentation criteria preview, state machine controls, soft delete with recovery, and event cancellation.

> **Phase 1 (FE):** Event creation form (RHF + Zod, all fields); event list with status badges + lifecycle action buttons; clone modal; survey builder (JSON Schema editor — adds/reorders fields with rjsf widget type selection: text, textarea, radio, select, checkboxes, range, date, time); audience count preview (debounced preview call); soft delete + restore UI with recovery countdown; event cancellation confirmation dialog — all wired to MSW events handler
> **Phase 2 (BE):** `POST/PATCH/GET/DELETE /api/events`, state machine service (Draft→Published→Live→Completed→Archived), `POST /api/events/:id/clone`, survey schema JSONB storage, capacity preview endpoint, soft delete cron (purge after 30d), state-override endpoint (admin, safeguarded), `GET/POST/PATCH/DELETE /api/vendors`, `GET/POST /api/events/:id/sponsors`, `PATCH/DELETE /api/events/:id/sponsors/:vendorId`, all event repositories, audit trail writes

## Story 4.1: Event Creation with Full Configuration

As an admin,
I want to create a new event with complete configuration including name, start date, end date, venue, capacity, approval mode, notification channel, and scan format,
So that the event is fully set up before I publish it for registrations.

**Acceptance Criteria:**

**Given** I am authenticated as `admin`,
**When** `POST /api/events` is called with a valid event body,
**Then** the event is created with `status: 'draft'`, a unique slug generated from the name, and HTTP 201 is returned with the full event object

**Given** an event with an existing slug,
**When** `POST /api/events` is called with the same name,
**Then** a suffix is appended to make the slug unique (e.g., `erp-seminar-jakarta-2`)

**Given** an event is in `draft` status and I am on the event edit form,
**When** I manually edit the slug field,
**Then** on blur, `GET /api/events/check-slug?slug={value}&excludeId={eventId}` is called; if the slug is taken, an inline error "Slug sudah digunakan" is shown and the form cannot be saved; if the slug is available, a green checkmark is shown

**Given** a valid edited slug,
**When** `PATCH /api/events/:id` is called with the new slug,
**Then** the slug updates and the public registration URL at `/register/{newSlug}` becomes active; the old slug no longer resolves

**Given** a missing required field (e.g., no `start_date`),
**When** `POST /api/events` is called,
**Then** it returns HTTP 400 `{ error: { code: 'VALIDATION_ERROR', details: [{ field: 'start_date', message: 'Required' }] } }`

**Given** the event creation form,
**When** I fill in `start_date` and `start_time`,
**Then** an "Event satu hari" checkbox is shown; if checked, `end_date` is locked to the same date as `start_date` and only `end_time` is required; if unchecked, both `end_date` and `end_time` fields are shown and required

**Given** `end_date` is before `start_date`,
**When** `POST /api/events` is called,
**Then** it returns HTTP 400 `{ error: { code: 'VALIDATION_ERROR', details: [{ field: 'end_date', message: 'Must be after start_date' }] } }`

**Given** `end_date` equals `start_date` (single-day event) and `end_time` is before or equal to `start_time`,
**When** `POST /api/events` is called,
**Then** it returns HTTP 400 `{ error: { code: 'VALIDATION_ERROR', details: [{ field: 'end_time', message: 'Must be after start_time' }] } }`

**Given** the event is created,
**Then** an `event.created` audit entry is written with `actor_id`, `event_id`, and `created_at`

**Given** the event creation form in the FE (`/app/events` → new event),
**When** I select approval mode `hybrid` and set a score threshold,
**Then** both fields are included in the `POST /api/events` body and saved correctly

> **Updated 2026-03-28** — Meeting: paid/free event support added

**Given** the event creation form,
**When** I toggle "Event Berbayar",
**Then** a price field and payment method selector appear and are required before publishing; if the toggle is off the event is free and no payment fields are shown

**Given** an event with `is_paid: true` and a configured price,
**When** `POST /api/events` is called,
**Then** `events.is_paid`, `events.price`, and `events.payment_method` are saved; the public registration page shows the ticket price prominently before the registration CTA

**Given** an event with `is_paid: false`,
**When** the public registration page renders,
**Then** "Gratis" is displayed as the ticket type — no payment step in the registration flow

**Given** the event creation or edit form,
**When** I click "Preview Formulir",
**Then** the unified survey preview modal opens (see Story 4.4 Builder & Event Form — Preview) showing both the registration form and post-event survey in separate tabs

---

## Story 4.2: Event Lifecycle Management (State Machine)

As an admin,
I want to transition events through their lifecycle (Draft → Published → Live → Completed → Archived) with proper guards,
So that events move predictably through states and invalid transitions are prevented.

**Acceptance Criteria:**

**Given** an event in `draft` status,
**When** `PATCH /api/events/:id` is called with `{ status: 'published' }`,
**Then** the status updates and the public registration page at `/register/{slug}` becomes accessible

**Given** an event in `published` status,
**When** `PATCH /api/events/:id` is called with `{ status: 'draft' }`,
**Then** it returns HTTP 400 `{ error: { code: 'INVALID_STATUS_TRANSITION', ... } }` — cannot revert to draft

**Given** an event in `published` or `live` status,
**When** `PATCH /api/events/:id` is called with `{ status: 'cancelled' }`,
**Then** the event is cancelled, all `approved` registrations are updated to `cancelled`, and a blast notification job is enqueued to notify participants; `event.cancelled` audit entry is written

**Given** an admin uses the state override endpoint (`POST /api/events/:id/state-override`),
**When** a safeguarded override is requested with justification,
**Then** the state transitions even if it would normally be blocked; an `event.state-override` audit entry is written with the justification

**Given** the event detail page in the FE,
**When** I view an event's status,
**Then** only valid next-state transitions are shown as available action buttons

---

## Story 4.3: Event Clone

As an admin,
I want to clone an existing event and inherit all its configuration with editable overrides,
So that I can quickly set up a new event that is similar to a previous one without re-entering all configuration from scratch.

**Acceptance Criteria:**

**Given** I am authenticated as `admin`,
**When** `POST /api/events/:id/clone` is called,
**Then** a new event is created in `draft` status with all configuration copied from the source event, a new unique slug (`{original-slug}-copy`), and the original event's registrations and attendees are NOT copied

**Given** the cloned event,
**Then** the following fields are copied from the source: `name`, `venue`, `description`, `capacity`, `waitlist_buffer`, `approval_mode`, `notification_channel`, `scan_format`, `target_criteria`, `survey_schema_id`, `banner_url`, `start_date`, `start_time`, `end_date`, `end_time`

**Given** the cloned event's edit form,
**When** it opens after cloning,
**Then** `start_date`, `start_time`, `end_date`, and `end_time` are pre-filled from the source event and highlighted for the admin to update before publishing; all other copied fields are editable as normal

**Given** the cloned event,
**When** I update any field (e.g. `name`, `start_date`),
**Then** only those fields change — all other copied config is preserved from the source

**Given** the clone action in the FE (event list → kebab menu → Clone),
**When** I click Clone,
**Then** I am navigated to the cloned event's edit form with a success toast notification: "Event berhasil diduplikasi — perbarui tanggal sebelum mempublikasikan"

---

## Story 4.4: Survey Template Builder & Response Dashboard

> **Updated 2026-03-28** — Meeting: (1) Events now have two distinct, independently-structured surveys — "Survei Registrasi" (shown on the sign-up form, always enabled) and "Survei Post-Event" (distributed during/after the event, toggle per event). Previously a single survey schema was stored. (2) Full Google Forms field compatibility required (except file upload), adding section headers, multiple-choice grid, and checkbox grid. (3) A survey response dashboard per event added so admin and viewer can capture and analyse answers from both surveys.

As an admin,
I want to build two independently-structured survey templates per event (registration and post-event) using a Google Forms-equivalent field editor, and view all participant responses in a dedicated survey dashboard,
So that I capture intent signals at registration and post-event feedback, and can act on the aggregated answers.

**Acceptance Criteria:**

### Builder — Dual Survey Structure

**Given** I am on the survey builder page (`/app/events/:id/builder`),
**When** the page loads,
**Then** two tabs are shown: "Survei Registrasi" (always active) and "Survei Post-Event" (with an enable/disable toggle); each tab maintains its own independent JSON Schema + UISchema — changing fields in one does not affect the other

**Given** the "Survei Post-Event" tab,
**When** I toggle "Aktifkan Survei Post-Event",
**Then** `events.post_survey_enabled` is saved as `true`; the post-event survey becomes distributable during or after the event; toggling off preserves the schema but stops distribution

**Given** I save either survey,
**When** `PUT /api/events/:id/survey/registration` or `PUT /api/events/:id/survey/post-event` is called,
**Then** the payload `{ schema: JSONSchema7, uiSchema: UISchema }` is stored in the corresponding JSONB column (`registration_survey_schema`, `post_survey_schema`); `GET /api/events/:id/survey/:type` returns the same structure

### Builder — Field Types (Google Forms parity, no file upload)

**Given** I add a field to either survey,
**Then** all of the following widget types are supported:
- `text` — short answer (single-line free text)
- `textarea` — paragraph (multi-line free text)
- `radio` — multiple choice (select one via radio buttons)
- `select` — dropdown (select one via dropdown)
- `checkboxes` — checkboxes (multi-select)
- `range` — linear scale (numeric min/max configurable, e.g. 1–5 or 1–10)
- `grid_radio` — multiple-choice grid (rows × columns, select one per row)
- `grid_checkbox` — checkbox grid (rows × columns, multi-select per row)
- `date` — date picker
- `time` — time picker
- `section` — section header/divider (label + optional description, no response captured)

**Given** a field of type `radio`, `select`, or `checkboxes`,
**When** I add it,
**Then** I can define the list of options (label + value pairs); stored as `enum` (radio/select) or `items.enum` (checkboxes)

**Given** a field of type `range`,
**When** I add it,
**Then** I can configure `minimum` and `maximum` (default 1–5); stored as `{ type: 'integer', minimum, maximum }`

**Given** a field of type `grid_radio` or `grid_checkbox`,
**When** I add it,
**Then** I can define row labels and column labels; stored as a nested schema object with `rows` and `columns` arrays

**Given** I reorder fields in the builder,
**When** I save,
**Then** `uiSchema["ui:order"]` reflects the display order and the rendered form respects it

### Builder & Event Form — Preview

> **Updated 2026-03-28** — Preview is now a unified tabbed modal accessible from both the survey builder page and the event creation/edit form. It shows both surveys together so admin can experience the full participant journey in one place.

**Given** I click "Preview Formulir" from either the survey builder page (`/app/events/:id/builder`) or the event creation/edit form,
**When** the preview modal opens,
**Then** it shows two tabs: "Formulir Registrasi" and "Survei Post-Event"; the modal is read-only and reflects the latest saved schema for each survey

**Given** the "Formulir Registrasi" tab in the preview modal,
**When** it renders,
**Then** it shows the complete registration form via rjsf — fixed fields first (phone, name, email, company_email, company_name, company_location, position, industry_type), followed by the current registration survey fields in their defined order

**Given** the "Survei Post-Event" tab in the preview modal,
**When** it renders,
**Then** it shows the post-event survey fields via rjsf in their defined order; if post-event survey is disabled (`post_survey_enabled: false`), the tab is visible but shows an empty state: "Survei Post-Event belum diaktifkan"

**Given** I am on the survey builder and have unsaved changes,
**When** I click "Preview Formulir",
**Then** the preview reflects the current unsaved state (live preview) — no save required to preview

### Registration Form Integration

**Given** the event's registration survey schema,
**When** a participant visits `/register/{slug}`,
**Then** rjsf renders the registration survey fields after the fixed fields; only schema-defined fields appear — no hardcoded custom fields outside the schema

### Survey Response Dashboard

**Given** I navigate to `/app/events/:id/survey-responses`,
**When** the page loads,
**Then** two tabs are shown: "Survei Registrasi" and "Survei Post-Event"; each tab shows the total response count and is accessible to `admin` and `viewer` roles

**Given** I am on either survey response tab,
**When** the tab loads,
**Then** `GET /api/events/:id/survey/responses?type=registration|post-event` returns all responses; an aggregate summary section shows per-question breakdowns (bar/pie chart for choice fields, response count + sample text for free-text, average + distribution for range/scale fields)

**Given** the aggregate summary for a `radio`, `select`, or `checkboxes` field,
**When** rendered,
**Then** a bar or pie chart shows the count and percentage for each option

**Given** the aggregate summary for a `range` or `grid_radio`/`grid_checkbox` field,
**When** rendered,
**Then** the average score and response distribution across the scale/grid are displayed

**Given** the response tab,
**When** I scroll below the aggregate summary,
**Then** an individual responses table lists each participant (name, phone, submission timestamp) with a row-expand or side-drawer showing their complete answers question-by-question

**Given** I search or filter in the response table,
**When** I type a name/phone or apply a status filter,
**Then** `GET /api/events/:id/survey/responses?type=...&search=...` is called and the table updates without full page reload

**Given** I click "Export Responses",
**When** `GET /api/events/:id/survey/responses/download?type=...&format=xlsx` is called,
**Then** an `.xlsx` file downloads with one row per respondent and one column per question

---

## Story 4.5: Event Capacity & Target Criteria with Audience Preview

> **Updated 2026-03-28** — Meeting: target criteria now supports multiple criteria stacked together (e.g., most active industry + low past attendance), and admin can either configure criteria manually or request AI-generated recommendations based on historical event data. Previously only a simple industry+city filter was supported.

As an admin,
I want to set event capacity, configure multiple target segment criteria (manually or via AI recommendation), and preview the matching audience count,
So that I know exactly how many qualified participants are in the database before committing to a blast or publish.

**Acceptance Criteria:**

**Given** I configure event capacity with `total: 200`,
**When** the event is saved,
**Then** `events.capacity` stores `200`; the registration system accepts up to 200 approved registrations

**Given** the target criteria section on the event form,
**When** I add criteria,
**Then** I can stack multiple criteria simultaneously — supported criteria types:
- `serviceType` — filter by one or more service type categories (matches `contacts.service_type`)
- `city` / `location` — filter by city or region
- `job_title` — filter by position/jabatan keywords
- `most_active` — contacts with the highest past event attendance count
- `low_attendance` — contacts who have attended few or no past events (configurable threshold)
- `never_attended` — contacts who have never attended any event
- `last_attended_before` — contacts whose last attendance was before a given date

**Given** multiple criteria are configured,
**When** `POST /api/events/:id/audience-preview` is called,
**Then** contacts must match ALL active criteria (AND logic); the response returns the matching count and a breakdown per criterion so admin can see which filter is most restrictive

**Given** I click "Rekomendasi AI",
**When** `POST /api/events/:id/audience-recommend` is called,
**Then** `ITargetRecommendationService.recommend(eventSnapshot)` analyses historical attendance patterns for similar events and returns a ranked list of suggested criteria combinations with expected audience sizes; the admin can accept all, accept individual suggestions, or dismiss

**Given** AI recommendations are returned,
**When** I click "Terapkan Rekomendasi",
**Then** the suggested criteria are pre-filled in the criteria builder for review and editing before saving — AI does not auto-save without admin confirmation

**Given** I click "Preview Audience" (manual or after applying AI criteria),
**Then** `POST /api/events/:id/audience-preview` returns the matching count (FR61), displayed immediately in the UI before saving

**Given** the audience preview count is 0,
**When** displayed in the FE,
**Then** a warning is shown: "Tidak ada kontak yang cocok — tinjau filter sebelum mempublikasikan"

---

## Story 4.6: Soft Delete & Recovery for Events and Records

As an admin,
I want to soft-delete events and records with a 30-day recovery window,
So that accidental deletions can be reversed without permanent data loss.

**Acceptance Criteria:**

**Given** I am authenticated as `admin`,
**When** `DELETE /api/events/:id` is called,
**Then** the event's `deleted_at` timestamp is set (not hard deleted), it disappears from the active events list, and an `event.deleted` audit entry is written

**Given** a soft-deleted event,
**When** `GET /api/events` is called,
**Then** the deleted event does not appear in the list (filtered by `deleted_at IS NULL`)

**Given** I navigate to the deleted items view (`/app/events?deleted=true`),
**When** I click "Restore" on a deleted event,
**Then** `PATCH /api/events/:id/restore` sets `deleted_at = NULL` and the event reappears in the active list; an `event.restored` audit entry is written

**Given** a system cron runs,
**When** a soft-deleted event's `deleted_at` is older than 30 days,
**Then** it is permanently hard-deleted from the database

**Given** a destructive action (delete) is triggered in the FE,
**When** the user clicks Delete,
**Then** a confirmation dialog appears with the event name and a warning about the 30-day recovery window before the DELETE request is sent

---

## Story 4.7: Event Pipeline Hub — Shell & Navigation

> **Added 2026-03-21** — Sprint Change Proposal v2: Event-centric pipeline UX
> **Phase 1 (FE + BE concurrent):** 6-tab shell at `/app/events/:id` wired to MSW and in-memory BE

As an admin,
I want a unified 6-tab workspace at `/app/events/:id`,
So that I can manage the complete event lifecycle (blast → registration → approval → check-in → analytics) without context-switching between pages.

**Acceptance Criteria:**

**Given** I navigate to `/app/events/:id`,
**When** the page loads,
**Then** a tab bar renders with six tabs in order: Overview · Undangan · Registrasi · Konfirmasi · Check-in · Laporan

**Given** the tab bar,
**When** I click any tab,
**Then** the URL updates to the corresponding sub-route and the active tab is visually indicated; browser Back/Forward navigate between tabs

**Given** I am on any sub-route (e.g., `/app/events/:id/blast`),
**When** I refresh the page,
**Then** the correct tab is active and content loads without redirect

**Given** the event has `status: 'draft'`,
**When** the tab bar renders,
**Then** the Undangan, Konfirmasi, and Check-in tabs are visible but disabled with a tooltip: "Tersedia setelah event dipublikasikan"

**Given** the event header area (above tabs),
**Then** it always shows: event name, status badge, event date, capacity utilization (registered/capacity), and a quick-action button appropriate to the current status (e.g., "Publikasikan" for draft, "Mulai Live" for published)

---

## Story 4.8: Event Pipeline Hub — Overview Tab

> **Added 2026-03-21** — Sprint Change Proposal v2

As an admin,
I want the Overview tab to show a real-time funnel summary for the event,
So that I can see the blast → registration → approval → attendance pipeline health at a glance.

**Acceptance Criteria:**

**Given** I am on the Overview tab (`/app/events/:id`),
**When** the tab loads,
**Then** it shows four funnel metrics: Diundang (blast recipients count) → Mendaftar (total registrations) → Disetujui (approved count) → Hadir (attended count), each with a value and percentage of the previous stage

**Given** the funnel metrics,
**When** any metric is zero,
**Then** it shows `—` instead of `0%` and a contextual call-to-action: "Belum ada blast — kirim undangan sekarang" (for Diundang = 0) linking to the Undangan tab

**Given** the Overview tab,
**Then** it also shows: pending approvals count (with link to Registrasi tab), last blast sent date/time, days until event, seats remaining (capacity − approved)

**Given** `GET /api/events/:id/overview` returns pipeline metrics,
**Then** the MSW handler (and BE in-memory implementation) returns deterministic seeded data for all four funnel metrics

---

## Story 4.9: Event Pipeline Hub — Undangan Tab (Blast)

> **Added 2026-03-21** — Sprint Change Proposal v2

As an admin,
I want the Undangan tab to be a dedicated blast workspace for this event,
So that I can send invitations, schedule re-blasts, and see the blast history — all scoped to this event.

**Acceptance Criteria:**

**Given** I am on the Undangan tab (`/app/events/:id/blast`),
**When** the tab loads,
**Then** it shows: audience segment preview (count from event's target criteria), blast history list (date, channel, recipients, open rate), and a "Kirim Undangan" primary action button

**Given** the "Kirim Undangan" button,
**When** I click it,
**Then** a blast config form appears (channel: WA/email, template selector, scheduled send time) pre-populated with the event's target segment

**Given** the blast config form is submitted,
**When** `POST /api/blast` is called with `{ eventId, channel, templateId, scheduledAt? }`,
**Then** a blast job is enqueued (or `MockQueueService.enqueue` in Phase 1) and the response returns `202 Accepted` with a `jobId`

**Given** a blast is in progress,
**When** the Undangan tab is viewed,
**Then** a progress bar shows sent/total recipients with a live-polling status (5s interval via React Query `refetchInterval`)

---

## Story 4.10: Event Pipeline Hub — Registrasi Tab (Approval Queue)

> **Added 2026-03-21** — Sprint Change Proposal v2

As an admin,
I want the Registrasi tab to show the AI-graded approval queue for this event,
So that I can bulk-accept the AI recommendation list or review and act on individual registrations efficiently.

**Acceptance Criteria:**

> **Updated 2026-03-28** — Meeting: waitlist status removed; Status column now shows pending/approved/rejected only. Attendance status (attended/no_show) is set at check-in (Epic 7) and shown as a separate column for completed events.

**Given** I am on the Registrasi tab (`/app/events/:id/registrations`),
**When** the tab loads,
**Then** it shows a filterable table of registrations with columns: Name, Company, Phone, AI Score, Registration Status (pending/approved/rejected), Attendance Status (attended/no_show — visible for completed/live events only), Flag Badge (if contact has flagCategory `invalid-data` or `duplicate`)

**Given** the table header,
**When** I click "Terima Semua Rekomendasi AI",
**Then** a confirmation dialog shows "Menyetujui N pendaftar dengan skor ≥ X" and on confirm, `PATCH /api/registrations/bulk-approve` is called with all AI-recommended IDs

**Given** an individual registration row,
**When** I click "Setujui" or "Tolak",
**Then** `PATCH /api/registrations/:id/status` is called and the row updates optimistically

**Given** a registration where the contact has `flagCategory: 'invalid-data'` or `'duplicate'`,
**When** the row renders,
**Then** a flag badge (red/orange) is shown automatically — no extra API call needed (flag data is part of the registration response)

**Given** an admin clears the inherited flag for a registration (per-registration override),
**When** the clear action is taken,
**Then** `PATCH /api/registrations/:id/clear-flag` is called; the badge disappears for this registration only; the contact's `flagCategory` is NOT modified

**Given** I click on a registration row in the Registrasi tab,
**When** the row expands or a side drawer opens,
**Then** the participant's full registration details are shown including: all fixed registration fields (name, company_name, company_location, position, email, company_email, industry_type) and all custom survey responses rendered as question → answer pairs in the order defined by the event's survey schema; if no survey was configured for the event, the survey section is hidden

---

## Story 4.11: Event Pipeline Hub — Konfirmasi Tab

> **Added 2026-03-21** — Sprint Change Proposal v2
> **Updated 2026-03-28** — Meeting: waitlist stat card and "Promosi ke Approved" action removed (waitlist status retired). Two stat cards remain: Tiket Terkirim and Menunggu Konfirmasi.

As an admin,
I want the Konfirmasi tab to show double opt-in and ticket delivery status,
So that I know which approved registrants have confirmed their attendance and received their QR ticket.

**Acceptance Criteria:**

**Given** I am on the Konfirmasi tab (`/app/events/:id/confirmation`),
**When** the tab loads,
**Then** it shows two stat cards: Tiket Terkirim (count with email/WA icon) and Menunggu Konfirmasi (pending double opt-in count)

**Given** the registration list below the stats,
**When** rendered,
**Then** it shows Name, channel (email/WA), ticket sent timestamp, confirmation status; rows with unconfirmed opt-in are visually highlighted

**Given** an unconfirmed registration row,
**When** I click "Kirim Ulang Tiket",
**Then** `POST /api/registrations/:id/resend-ticket` is called and a success toast confirms the action

---

## Story 4.12: Event Pipeline Hub — Laporan Tab

> **Added 2026-03-21** — Sprint Change Proposal v2
> **Updated 2026-03-26** — Sprint Change Proposal 2026-03-26c: promoted from stub to full tab hosting analytics dashboard (Story 8.3) + YoriMind panel (Story 8.4)

As an admin,
I want the Laporan tab to host the full analytics dashboard and YoriMind insights panel within the Event Pipeline Hub,
So that I can access event performance data and AI-generated recommendations without leaving the event workspace.

**Acceptance Criteria:**

**Given** I am on the Laporan tab (`/app/events/:id/report`) and the event has `status: 'completed'` or `'live'`,
**When** the tab loads,
**Then** it renders two stacked sections:
  1. **Analytics section** — three metric cards (Total Undangan, Total Mendaftar, Total Peserta) + Recharts funnel chart + demographic charts with position/industry/location filter pills (Story 8.3 content)
  2. **YoriMind section** — AI insights panel with analysis narrative, root causes, recommendations table, and "Refresh Insights" button (Story 8.4 content)

**Given** the event has any status other than `'completed'` or `'live'`,
**When** the Laporan tab is viewed,
**Then** it shows an empty state: "Laporan tersedia setelah event berlangsung" with the event's start date

**Given** the YoriMind section loads,
**When** the Redis cache key `yorimind:event:{id}` has a valid entry (TTL 7 days),
**Then** the cached AI insights are displayed immediately without a new API call; the last-refreshed timestamp is shown below the panel

**Given** no cached YoriMind data exists (cache miss or first load),
**When** the section mounts,
**Then** a skeleton loader shows for up to 2000ms while `GET /api/events/:id/yorimind` is called; if the snapshot is not yet available, the section shows "Analisis tersedia setelah snapshot harian dibuat (02:00 WIB)"

---

## Story 4.13: Event Banner / Poster Upload

> **Added 2026-03-26** — Sprint Change Proposal 2026-03-26

As an admin,
I want to upload a banner or poster image for an event, or reuse one from a previous event,
So that the public registration page and blast templates have consistent event branding.

**Acceptance Criteria:**

**Given** I am on the event creation or edit form,
**When** I click "Upload Banner",
**Then** a file picker opens accepting JPEG, PNG, and WebP up to 5MB; on selection the image is uploaded via `POST /api/media/upload` and a preview thumbnail is shown in the form

**Given** a previously uploaded banner exists (from any event),
**When** I click "Pilih dari Galeri",
**Then** a modal shows a paginated grid of previously uploaded banners; selecting one sets that image's URL as the event banner without re-uploading

**Given** a banner is set on the event,
**When** `GET /api/events/:slug/public` is called,
**Then** the response includes `banner_url` pointing to the VPS-served image path; the public registration landing page renders it as the event hero image

**Given** no banner is uploaded,
**When** the public registration page renders,
**Then** a default placeholder banner is shown — the page does not break

**Given** an uploaded image,
**When** stored on the VPS filesystem,
**Then** it is placed in `UPLOADS_DIR/banners/{eventId}/` with the original filename sanitized; the stored path is saved to `events.banner_url`

---

## Story 4.14: Vendor Roster & Event Sponsor Attachment

As an admin,
I want to manage vendors in a central roster and attach them to events as sponsors,
So that report delivery, sponsor display, and vendor analytics all resolve from the same vendor records.

**Acceptance Criteria:**

**Given** I am on `/app/vendors`,
**When** the page loads,
**Then** it shows a paginated vendor table sourced from `GET /api/vendors` with columns: Name, Contact Email, Industry, Linked Events, and Last Updated

**Given** I submit the vendor form,
**When** `POST /api/vendors` is called with `{ name, contact_email, industry, logo_url?, website?, notes? }`,
**Then** a new vendor is created and appears in the roster with `linked_event_count: 0`

**Given** I edit an existing vendor,
**When** `PATCH /api/vendors/:id` is called,
**Then** the changed fields persist and are reflected anywhere that vendor is referenced

**Given** a vendor has `linked_event_count > 0`,
**When** `DELETE /api/vendors/:id` is called,
**Then** HTTP 409 is returned and the vendor is not deleted until event sponsor links are removed

**Given** I am on an event workspace and open sponsor management,
**When** `GET /api/events/:id/sponsors` is called,
**Then** the response lists attached vendors ordered by `display_order` with `vendor_name`, `tier`, and `display_order`

**Given** I attach a vendor to an event,
**When** `POST /api/events/:id/sponsors` is called with `{ vendorId, tier, displayOrder }`,
**Then** the vendor becomes an event sponsor and can be used for vendor-facing report delivery and sponsor display on the public event page

**Given** I update sponsorship metadata,
**When** `PATCH /api/events/:id/sponsors/:vendorId` is called,
**Then** the sponsor `tier` and `display_order` are updated without changing the base vendor record

**Given** I remove a sponsor from an event,
**When** `DELETE /api/events/:id/sponsors/:vendorId` is called,
**Then** the vendor is detached from that event while remaining available in the vendor roster

---
