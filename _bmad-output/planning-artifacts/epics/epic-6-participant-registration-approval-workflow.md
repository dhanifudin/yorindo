# Epic 6: Participant Registration & Approval Workflow

Participants can discover events and complete registration via mobile-first forms; admins can manage the approval-to-ticket pipeline with the current runtime status model and ticket delivery flow.

> **Current implementation note (2026-03-30):** The runtime still uses a legacy single-status model in active code: `pending`, `confirmed`, `approved`, `rejected`, `waitlisted`, `attended`, `cancelled`. The story details below are aligned to the currently implemented behavior to avoid implementation drift.

> **Phase 1 (FE):** Public event landing page (`/register/[eventSlug]`); registration form (manual-first, current 3-step flow); confirmation page; approval queue table; ticket display page (`react-qr-code`) — all wired to MSW registrations handlers.
> **Phase 2 (BE):** `POST /api/registrations`, `GET /api/registrations`, `GET /api/registrations/:id`, `POST /api/registrations/:id/status`, `POST /api/registrations/:id/cancel`, `PUT /api/registrations/bulk-approve`, ticket token generation on approval, notification integration follow-up, all registration repositories.

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

> **Current implementation note (2026-03-30):** The active FE still uses the current simplified registration form and does not yet implement the full later SSO/profile-prefill specification.

As a participant,
I want to complete a registration form on my phone using the current multi-step registration flow,
So that I can register quickly with the fields currently supported by the implementation.

**Acceptance Criteria:**

**Given** the registration form renders,
**When** the page loads,
**Then** the current FE shows the implemented contact-info-first flow and does not require SSO to proceed

**Given** the current registration form renders,
**When** the participant progresses through it,
**Then** the implemented FE uses the current simplified multi-step flow and submits through `POST /api/registrations`

**Given** the registration form is submitted,
**When** `POST /api/registrations` is called (unprotected, rate-limited 10/IP/hour),
**Then** the registration is created with `status: 'pending'` and HTTP 201 is returned within 3 seconds normal load / 5 seconds burst (NFR-P11)

**Given** the same participant submits again,
**When** `POST /api/registrations` is called,
**Then** the current implementation still creates/returns the current runtime registration flow and duplicate-handling remains a follow-up concern

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

> **Current implementation note (2026-03-30):** The active FE/BE still include `waitlisted`, `confirmed`, and `cancelled` in the runtime registration model. This story is aligned to the current implemented queue behavior.

As an admin,
I want to review pending registrations, see their AI-scored qualification, and approve or reject them,
So that I control who attends the event based on qualification criteria.

**Acceptance Criteria:**

**Given** I am authenticated as `admin` or `viewer`,
**When** `GET /api/events/:id/registrations?status=pending` is called,
**Then** a paginated list of pending registrations is returned with contact details and rule-based score + confidence indicators (FR27)

**Given** I approve a registration,
**When** `PUT` or `POST /api/registrations/:id/status` is called with `{ status: 'approved' }`,
**Then** the registration status updates and a ticket token is generated in the current runtime model

**Given** I reject a registration,
**When** `PUT` or `POST /api/registrations/:id/status` is called with `{ status: 'rejected' }`,
**Then** the registration status updates in the current runtime model

**Given** I manually requeue a rejected registration,
**When** `PUT` or `POST /api/registrations/:id/status` is called with `{ status: 'pending' }` from `rejected`,
**Then** the registration re-enters the approval queue in the current runtime model

**Given** the registrations table in the FE,
**When** it renders,
**Then** TanStack Table v8 server-side mode shows the currently implemented status actions and filters, including the legacy waitlist/cancel paths still present in code

---

## Story 6.5: Waitlist Management & Auto-Promotion *(Legacy runtime path)*

> **Current implementation note (2026-03-30):** Waitlist handling still exists in the active FE/MSW/runtime model. Keep this story as the implementation reference until the codebase is migrated off waitlist behavior.


---

## Story 6.6: QR Ticket Generation & Delivery

As an approved participant,
I want to receive a QR code ticket via WhatsApp or email after my registration is approved,
So that I have a scannable ticket to present at event check-in.

**Acceptance Criteria:**

**Given** a registration transitions to `status: 'approved'`,
**When** the current runtime ticket flow runs,
**Then** a ticket token is generated and stored in `registrations.ticket_token`

**Given** the blast worker processes the ticket delivery job,
**When** the channel is `email`,
**Then** Brevo sends an HTML email with the QR code embedded as a base64 inline PNG (generated by `qrcode` npm package on the BE)

**Given** the blast worker processes the ticket delivery job,
**When** the channel is `whatsapp`,
**Then** Everpro sends a WhatsApp message with the QR code image attachment

**Given** the ticket token,
**When** it is loaded by the participant ticket page or scan service,
**Then** it resolves through the current runtime ticket flow used by the implementation

---

## Story 6.7: Participant Self-Cancellation *(Legacy runtime path)*

> **Current implementation note (2026-03-30):** Self-cancellation still exists in the active FE/MSW/runtime model. Keep this story as the implementation reference until the codebase is migrated off cancellation behavior.

---
