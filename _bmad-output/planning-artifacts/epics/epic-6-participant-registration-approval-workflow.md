# Epic 6: Participant Registration & Approval Workflow

Participants can discover events and complete registration via mobile-first forms (SSO or manual); admins can manage the full approval-to-ticket pipeline with automated notifications and calendar link delivery.

> **Updated 2026-03-28** — Meeting: participant status simplified into two independent dimensions — **registration status** (`provisional` → `pending` → `approved` / `rejected`) and **attendance status** (`attended` / `no_show`, set at check-in). Waitlist status removed. Cancellation status removed — Story 6.7 (self-cancellation) retired.

> **Phase 1 (FE):** Public event landing page (`/register/[eventSlug]`); registration form (SSO login or manual, dynamic survey fields, consent checkbox, Google Calendar link on success); double opt-in confirmation page; approval queue table (TanStack Table, approve/reject actions, score display); ticket display page (QR code via `react-qr-code`) — all wired to MSW registrations handler
> **Phase 2 (BE):** `GET /api/events/:slug/public`, `POST /api/registrations` (for manual-path registrations: flags potential duplicate contacts for admin review via Story 3-5 merge workflow; SSO registrations skip duplicate detection; no auto-merge), `GET /api/auth/sso/callback`, approval scoring service, `PATCH /api/registrations/:id/status`, double opt-in delivery + expiry cron, `qrcode` ticket JWT generation, notification dispatch, bot detection (NFR-S7), all registration repositories. `GET /api/contacts/lookup` removed — no client-side pre-fill.

## Story 6.1: Public Event Landing Page

As a participant,
I want to view event details and availability on a public landing page before registering,
So that I can make an informed decision about whether to register.

**Acceptance Criteria:**

**Given** an event with `status: 'published'`,
**When** `GET /register/{eventSlug}` is accessed (no authentication required),
**Then** the event name, start date, end date, venue, description, and remaining capacity are displayed

**Given** the count of `approved` registrations reaches `events.capacity`,
**When** this threshold is crossed (on any approval action),
**Then** the event's registration is automatically closed: `events.registration_closed` is set to `true`, `POST /api/registrations` returns HTTP 409 `{ error: { code: 'REGISTRATION_CLOSED', message: 'Kuota telah terpenuhi' } }`, and the public landing page shows "Pendaftaran Ditutup — Kuota Telah Terpenuhi" with the registration form hidden

**Given** an event with `status: 'draft'` or `'cancelled'`,
**When** the landing page is accessed,
**Then** HTTP 404 is returned — draft/cancelled events are not publicly accessible

**Given** a first-time visitor on mobile (Android Chrome),
**When** the page loads,
**Then** First Contentful Paint is ≤ 3 seconds on simulated 4G (NFR-P1)

---

## Story 6.2: Participant Registration Form (Mobile-First)

> **Updated 2026-03-28** — Meeting: participant can now choose between SSO login (auto-fills profile data) or manual form fill. SSO is offered as an option, not forced — manual path remains fully functional.
> **Updated 2026-03-28 (field order + no lookup):** Fixed field order changed to email-first. Phone lookup removed — duplicate contact merging is handled by the backend at registration time.

As a participant,
I want to complete a registration form on my phone, either by logging in via SSO for auto-filled data or by filling it manually,
So that I can register quickly regardless of whether I have an SSO account.

**Acceptance Criteria:**

**Given** the registration form renders (step 0 — contact info),
**When** the page loads,
**Then** a "Lanjutkan dengan Google" button is shown above the manual form fields; the manual form is the default path — the SSO button is optional, not required

**Given** I click "Lanjutkan dengan Google",
**When** the OAuth flow completes (Phase 1: mock Google auth dialog; Phase 2: real Google OAuth),
**Then** the system looks up the participant's contact record by verified email (`contacts.google_sub` linked or email match); if a contact profile exists, ALL fixed fields are pre-filled and shown with a "✓ Terisi dari profil" badge (locked read-only); `phone` is pre-filled but always remains editable; if no contact exists, only `name` and `email` are pre-filled and participant completes remaining fields manually

**Given** I do not click the SSO button,
**When** the form renders,
**Then** it displays these fixed fields in this order, all required unless noted:
`email`, `name`, `phone`, `company_email`, `company_name`, `company_location`, `position` (jabatan), `industry_type`

> **Note (2026-03-28):** AC aligned with Story 6-8 implementation (already in review). Story 6-8 implements the SSO button pattern correctly — the "Lanjutkan dengan Google" button pre-fills name+email only; phone always manual. Story 6-8 is the authoritative implementation reference.

> **Note (field order 2026-03-28):** No phone-based contact lookup on the FE. The FE submits all fixed fields as-is. For **manual registrations only**: the backend detects potential duplicate contacts at registration time and flags them for admin review — merging is manual, performed by admin via Story 3-5 (Duplicate Profile Detection & Merge). SSO registrations skip duplicate detection entirely (identity verified via Google OAuth).

**Given** the registration form is submitted,
**When** `POST /api/registrations` is called (unprotected, rate-limited 10/IP/hour),
**Then** the registration is created with `status: 'pending'` and HTTP 201 is returned within 3 seconds normal load / 5 seconds burst (NFR-P11)

**Given** the same participant + event combination already exists,
**When** `POST /api/registrations` is called again,
**Then** it returns HTTP 200 with the existing registration status and a message "Your registration is already pending" — no duplicate created (FR62)

**Given** the event has a custom survey schema,
**When** the form renders,
**Then** rjsf renders the custom survey fields after the fixed fields in the order defined by `uiSchema["ui:order"]`; no custom field appears that wasn't defined in the schema (NFR-S14)

**Given** the complete form (fixed fields + custom survey fields),
**When** rendered on mobile (375px width),
**Then** all fields are legible, tappable, and laid out in a single column without horizontal scroll

**Given** the form is submitted,
**Then** participant consent is captured: `{ consent_status: 'confirmed', event_id, purpose: '...', captured_at }` linked to the registration (FR54)

**Given** the form is submitted,
**When** the registration succeeds,
**Then** a Google Calendar deep link is included in the confirmation page (FR60)

---

## Story 6.3: Double Opt-In Confirmation Flow

> **Sprint Planning Note (Bob):** This story spans email delivery, token generation, expiry handling, and resend logic — flag as potentially oversized during sprint planning. If velocity requires, the expiry cron and resend flow can be deferred to a follow-up story.

As a participant,
I want to receive a confirmation request after submitting my registration when double opt-in is enabled,
So that my slot is only reserved after I explicitly confirm my intent.

**Acceptance Criteria:**

**Given** an event with `double_opt_in: true`,
**When** `POST /api/registrations` is submitted,
**Then** the registration is created with `status: 'provisional'` and a confirmation request is sent via the event-configured channel (WhatsApp or email)

**Given** a provisional registration,
**When** the participant clicks the confirmation link,
**Then** the registration status transitions to `pending` and enters the approval queue; a `registration.confirmed` audit entry is written

**Given** a provisional registration not confirmed within the admin-configured window (default: 24 hours),
**When** the expiry cron runs,
**Then** the registration status transitions to `expired`; the slot is NOT reserved and no queue position is assigned

**Given** a provisional registration,
**When** the slot count is displayed to admin,
**Then** provisional registrations are NOT counted in the approved capacity total

---

## Story 6.4: Registration Approval Queue & Admin Review

> **Updated 2026-03-28** — Meeting: waitlist status removed. Approval actions simplified to approve / reject only. Attendance status (`attended` / `no_show`) is a separate dimension set at check-in (Epic 7) — not managed here.

As an admin,
I want to review pending registrations, see their AI-scored qualification, and approve or reject them,
So that I control who attends the event based on qualification criteria.

**Acceptance Criteria:**

**Given** I am authenticated as `admin` or `viewer`,
**When** `GET /api/events/:id/registrations?status=pending` is called,
**Then** a paginated list of pending registrations is returned with contact details and rule-based score + confidence indicators (FR27)

**Given** I approve a registration,
**When** `PATCH /api/registrations/:id/status` is called with `{ status: 'approved' }`,
**Then** the registration status updates, a QR ticket JWT is generated and stored in `ticket_token`, a blast job is enqueued to notify the participant, a `registration.approved` audit entry is written, and if approving this registration fills the event quota the registration form is automatically closed (see Story 6.1)

**Given** I reject a registration,
**When** `PATCH /api/registrations/:id/status` is called with `{ status: 'rejected' }`,
**Then** the registration status updates and a rejection notification blast job is enqueued; a `registration.rejected` audit entry is written

**Given** I manually requeue a rejected registration,
**When** `PATCH /api/registrations/:id/status` is called with `{ status: 'pending' }` from `rejected`,
**Then** the registration re-enters the approval queue and a `registration.requeued` audit entry is written (FR63)

**Given** the registrations table in the FE,
**When** it renders,
**Then** TanStack Table v8 server-side mode shows data with status filter tabs (pending / approved / rejected) and approve/reject action buttons per row; there is no waitlist action or tab

---

## ~~Story 6.5: Waitlist Management & Auto-Promotion~~ *(Retired 2026-03-28)*

> **Retired 2026-03-28** — Meeting: waitlist status removed from the participant status model. Registration is automatically closed when the quota is reached (Story 6.1 / Story 6.4). No waitlist, no auto-promotion logic. This story is intentionally kept for history — do not implement.


---

## Story 6.6: QR Ticket Generation & Delivery

As an approved participant,
I want to receive a QR code ticket via WhatsApp or email after my registration is approved,
So that I have a scannable ticket to present at event check-in.

**Acceptance Criteria:**

**Given** a registration transitions to `status: 'approved'`,
**When** `TicketService.generateToken()` is called,
**Then** a HS256 JWT ticket is generated with `{ sub: registrationId, eventId, type: 'ticket', exp: eventDate+1day }` and stored in `registrations.ticket_token`

**Given** the blast worker processes the ticket delivery job,
**When** the channel is `email`,
**Then** Brevo sends an HTML email with the QR code embedded as a base64 inline PNG (generated by `qrcode` npm package on the BE)

**Given** the blast worker processes the ticket delivery job,
**When** the channel is `whatsapp`,
**Then** Everpro sends a WhatsApp message with the QR code image attachment

**Given** the QR ticket JWT,
**When** it is decoded by the scan service,
**Then** `payload.type === 'ticket'` is verified and the `registrationId` matches an approved registration

---

## ~~Story 6.7: Participant Self-Cancellation~~ *(Retired 2026-03-28)*

> **Retired 2026-03-28** — Meeting: cancellation status removed from the participant status model. No self-cancellation flow. This story is intentionally kept for history — do not implement.

---
