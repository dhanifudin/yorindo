# Epic 6: Participant Registration & Approval Workflow

Participants can discover events and complete registration via mobile-first forms; admins can manage the full approval-to-ticket pipeline with automated notifications, waitlist management, and calendar link delivery.

> **Phase 1 (FE):** Public event landing page (`/register/[eventSlug]`); registration form (phone pre-fill, dynamic survey fields, consent checkbox, Google Calendar link on success); double opt-in confirmation page; approval queue table (TanStack Table, approve/reject/waitlist actions, score display); waitlist view; ticket display page (QR code via `react-qr-code`); self-cancellation page — all wired to MSW registrations handler
> **Phase 2 (BE):** `GET /api/events/:slug/public`, `POST /api/registrations`, `GET /api/contacts/lookup`, approval scoring service, `PATCH /api/registrations/:id/status`, double opt-in delivery + expiry cron, waitlist promotion logic, `qrcode` ticket JWT generation, notification dispatch, `POST /api/registrations/:id/cancel`, bot detection (NFR-S7), all registration repositories

## Story 6.1: Public Event Landing Page

As a participant,
I want to view event details and availability on a public landing page before registering,
So that I can make an informed decision about whether to register.

**Acceptance Criteria:**

**Given** an event with `status: 'published'`,
**When** `GET /register/{eventSlug}` is accessed (no authentication required),
**Then** the event name, start date, end date, venue, description, and remaining capacity are displayed

**Given** the event has reached full capacity (approved registrations = capacity),
**When** the landing page is accessed,
**Then** "Registrasi Penuh — Daftarkan ke Waiting List" is shown instead of the registration CTA

**Given** an event with `status: 'draft'` or `'cancelled'`,
**When** the landing page is accessed,
**Then** HTTP 404 is returned — draft/cancelled events are not publicly accessible

**Given** a first-time visitor on mobile (Android Chrome),
**When** the page loads,
**Then** First Contentful Paint is ≤ 3 seconds on simulated 4G (NFR-P1)

---

## Story 6.2: Participant Registration Form (Mobile-First)

As a participant,
I want to complete a registration form on my phone with pre-filled data if I've registered before,
So that I can register quickly without re-entering information I've already provided.

**Acceptance Criteria:**

**Given** the registration form renders,
**Then** it always displays these fixed fields in this order, all required unless noted:
`phone`, `name`, `email`, `company_email`, `company_name`, `company_location`, `position` (jabatan), `industry_type`

**Given** a participant enters their phone number,
**When** the field loses focus and `GET /api/contacts/lookup?phone={phone}` is called,
**Then** if a matching contact exists, the following fields are pre-filled from the contact record: `name`, `email`, `company_name`, `position`; remaining fixed fields (`company_email`, `company_location`, `industry_type`) are pre-filled if available in the contact record (FR24)

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

As an admin,
I want to review pending registrations, see their rule-based approval score, and approve, reject, or waitlist them,
So that I control who attends the event based on qualification criteria.

**Acceptance Criteria:**

**Given** I am authenticated as `admin` or `viewer`,
**When** `GET /api/events/:id/registrations?status=pending` is called,
**Then** a paginated list of pending registrations is returned with contact details and rule-based score + confidence indicators (FR27)

**Given** I approve a registration,
**When** `PATCH /api/registrations/:id/status` is called with `{ status: 'approved' }`,
**Then** the registration status updates, a QR ticket JWT is generated and stored in `ticket_token`, a blast job is enqueued to notify the participant, and a `registration.approved` audit entry is written

**Given** I reject a registration,
**When** `PATCH /api/registrations/:id/status` is called with `{ status: 'rejected' }`,
**Then** the registration status updates and a rejection notification blast job is enqueued; a `registration.rejected` audit entry is written

**Given** I manually requeue a rejected registration,
**When** `PATCH /api/registrations/:id/status` is called with `{ status: 'pending' }` from `rejected`,
**Then** the registration re-enters the approval queue and a `registration.requeued` audit entry is written (FR63)

**Given** the registrations table in the FE,
**When** it renders,
**Then** TanStack Table v8 server-side mode shows data with status filter tabs and approval action buttons per row

---

## Story 6.5: Waitlist Management & Auto-Promotion

As a participant,
I want to be added to a waitlist when an event is full and automatically promoted when a slot opens,
So that I have a fair chance to attend even if I registered late.

**Acceptance Criteria:**

**Given** an event at full capacity (approved = capacity),
**When** a new registration is submitted and approved by admin,
**Then** the registration is created with `status: 'waitlisted'` instead of `approved`

**Given** a waitlisted registration and an approved participant cancels,
**When** the cancellation is processed,
**Then** the next waitlisted registration is automatically promoted to `approved`, their ticket is generated, and a notification is sent

**Given** an auto-promoted participant does not confirm within the configurable deadline,
**When** the deadline passes,
**Then** their slot is returned to the waitlist and the next participant is promoted (FR32); after 2 failed auto-promotion attempts for the same slot, it returns to admin review

**Given** the waitlist queue,
**When** viewed by admin,
**Then** participants are listed in FIFO order with their queue position displayed

**Given** `ENABLE_EXPERIMENTAL` is `false` or unset,
**When** a registration is submitted for a full-capacity event,
**Then** the registration is rejected with HTTP 409 `{ error: { code: 'EVENT_FULL', message: 'Pendaftaran sudah penuh' } }` — no waitlist slot is created and no `waitlisted` status is assigned; the public registration page shows "Registrasi Penuh" with no waitlist CTA

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

## Story 6.7: Participant Self-Cancellation

As an approved participant,
I want to cancel my registration via a link in my ticket before the event's cancellation deadline,
So that I can release my slot for other participants if I can no longer attend.

**Acceptance Criteria:**

**Given** an approved participant clicks the cancellation link in their ticket,
**When** `POST /api/registrations/:id/cancel` is called with the cancellation token,
**Then** the registration status is updated to `cancelled`, the slot is released (capacity count decremented), and the waitlist auto-promotion is triggered

**Given** the event's cancellation deadline has passed,
**When** the self-cancellation link is clicked,
**Then** the endpoint returns HTTP 403 with a message "Cancellation deadline has passed" and the link in the ticket is shown as deactivated (FR30)

**Given** a self-cancellation is processed,
**Then** a `registration.self-cancelled` audit entry is written with `actor_id = registrationId` and `cancellation_type = 'self'`

---
