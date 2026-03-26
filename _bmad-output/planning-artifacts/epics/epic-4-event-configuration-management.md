# Epic 4: Event Configuration & Management

Admin can create, configure, clone, publish, and manage events through their full lifecycle — with capacity management, survey template builder, segmentation criteria preview, state machine controls, soft delete with recovery, and event cancellation.

> **Phase 1 (FE):** Event creation form (RHF + Zod, all fields); event list with status badges + lifecycle action buttons; clone modal; survey builder (JSON Schema editor — adds/reorders fields with rjsf widget type selection: text, textarea, radio, select, checkboxes, range, date, time); audience count preview (debounced preview call); soft delete + restore UI with recovery countdown; event cancellation confirmation dialog — all wired to MSW events handler
> **Phase 2 (BE):** `POST/PATCH/GET/DELETE /api/events`, state machine service (Draft→Published→Live→Completed→Archived), `POST /api/events/:id/clone`, survey schema JSONB storage, capacity preview endpoint, soft delete cron (purge after 30d), state-override endpoint (super admin), all event repositories, audit trail writes

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

**Given** the event creation form in the FE (`/admin/events` → new event),
**When** I select approval mode `hybrid` and set a score threshold,
**Then** both fields are included in the `POST /api/events` body and saved correctly

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

**Given** a super admin uses the state override endpoint (`POST /api/events/:id/state-override`),
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

## Story 4.4: Survey Template Builder

As an admin,
I want to build a custom survey template for each event using a JSON Schema field editor,
So that I can capture event-specific participant intent signals beyond the standard registration fields.

**Acceptance Criteria:**

**Given** I am on the survey builder page (`/admin/events/:id/builder`),
**When** I add a custom field with a label, widget type, and optional choices,
**Then** the field is appended to the `properties` map in the JSON Schema and the `ui:order` array in the UISchema; supported widget types mirror Google Forms (excluding file upload):
- `text` — short answer (single-line free text)
- `textarea` — paragraph (multi-line free text)
- `radio` — multiple choice (select one via radio buttons)
- `select` — dropdown (select one via dropdown)
- `checkboxes` — checkboxes (multi-select)
- `range` — linear scale (numeric min/max configurable, e.g. 1–5 or 1–10)
- `date` — date picker
- `time` — time picker

**Given** I save the survey schema,
**When** `PUT /api/events/:id/survey` is called,
**Then** the payload `{ schema: JSONSchema7, uiSchema: UISchema }` is stored in MongoDB `survey_schemas` collection; `GET /api/events/:id/survey` returns the same structure

**Given** I reorder custom fields in the builder,
**When** I save,
**Then** the `uiSchema["ui:order"]` array reflects the displayed order; the rendered participant form respects this order

**Given** a field of type `radio`, `select`, or `checkboxes`,
**When** I add it,
**Then** I can define the list of options (label + value pairs); the schema stores them as `enum` (radio/select) or `items.enum` (checkboxes) respectively

**Given** a field of type `range`,
**When** I add it,
**Then** I can configure `minimum` and `maximum` (default 1–5); the schema stores them as `{ type: 'integer', minimum, maximum }`

**Given** the event's survey schema,
**When** a participant visits `/register/{slug}`,
**Then** rjsf renders the custom fields after the fixed registration fields; only schema-defined fields appear — no hardcoded custom fields outside the schema

**Given** I am on the survey builder page and have added or modified fields,
**When** I click "Preview Formulir",
**Then** a modal or side panel opens rendering the complete registration form via rjsf — fixed fields first (phone, name, email, company_email, company_name, company_location, position, industry_type), followed by the current custom survey fields in their defined order; the preview is read-only and updates live as fields are added/reordered

---

## Story 4.5: Event Capacity & Target Criteria with Audience Preview

As an admin,
I want to set event capacity with a waitlist buffer and configure target segment criteria with a live audience count preview,
So that I know exactly how many matched participants are in the database before committing to a blast or publish.

**Acceptance Criteria:**

**Given** I configure event capacity with `total: 200` and `buffer: 20`,
**When** the event is saved,
**Then** `events.capacity` stores `200` and `events.waitlist_buffer` stores `20`; the registration system accepts up to 200 approved + 20 waitlisted

**Given** I configure target criteria (`industry: 'manufaktur', city: 'Surabaya'`),
**When** I click "Preview Audience",
**Then** `POST /api/events/:id/audience-preview` returns the count of contacts in the database matching those filters (FR61), displayed immediately in the UI before saving

**Given** the audience preview count is 0,
**When** displayed in the FE,
**Then** a warning is shown: "No contacts match these criteria — review filters before publishing"

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

**Given** I navigate to the deleted items view (`/admin/events?deleted=true`),
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

**Given** I am on the Registrasi tab (`/app/events/:id/registrations`),
**When** the tab loads,
**Then** it shows a filterable table of registrations with columns: Name, Company, Phone, AI Score, Status (pending/approved/rejected/waitlisted), Flag Badge (if contact has flagCategory `spam` or `not-potential`)

**Given** the table header,
**When** I click "Terima Semua Rekomendasi AI",
**Then** a confirmation dialog shows "Menyetujui N pendaftar dengan skor ≥ X" and on confirm, `PATCH /api/registrations/bulk-approve` is called with all AI-recommended IDs

**Given** an individual registration row,
**When** I click "Setujui" or "Tolak",
**Then** `PATCH /api/registrations/:id/status` is called and the row updates optimistically

**Given** a registration where the contact has `flagCategory: 'spam'` or `'not-potential'`,
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

As an admin,
I want the Konfirmasi tab to show double opt-in and ticket delivery status,
So that I know which approved registrants have confirmed their attendance and received their QR ticket.

**Acceptance Criteria:**

**Given** I am on the Konfirmasi tab (`/app/events/:id/confirmation`),
**When** the tab loads,
**Then** it shows three stat cards: Tiket Terkirim (count with email/WA icon), Menunggu Konfirmasi (pending double opt-in), Daftar Tunggu (waitlisted count)

**Given** the registration list below the stats,
**When** rendered,
**Then** it shows Name, channel (email/WA), ticket sent timestamp, confirmation status; rows with unconfirmed opt-in are visually highlighted

**Given** an unconfirmed registration row,
**When** I click "Kirim Ulang Tiket",
**Then** `POST /api/registrations/:id/resend-ticket` is called and a success toast confirms the action

**Given** a waitlisted registration,
**When** I click "Promosi ke Approved",
**Then** `PATCH /api/registrations/:id/status` with `{ status: 'approved' }` is called; the registration moves to approved and a ticket is enqueued for delivery

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
