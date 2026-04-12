# Epic 5: Invitation Blast & Notifications

Admin can proactively invite targeted participants to events via WhatsApp (Everpro) and email (Brevo) — with consent enforcement, suppression list protection, message template management, scheduled delivery, and emergency blast capability in the current runtime flow.

> **Current implementation note (2026-03-30):** The active FE/BE still uses the current template and blast flow. The richer AI-targeting/template-delivery model described in later addenda is not fully implemented yet.
> **Phase 1 (FE):** Template editor, blast config form, blast history list, emergency blast modal, suppression list view — all wired to current MSW blast/template handlers
> **Phase 2 (BE):** Current runtime includes `POST /api/events/:id/blast`, worker/service adapters, and suppression filtering foundations. Template APIs, emergency blast backend route, and richer AI-targeting flow remain follow-up work.

## Story 5.1: Notification Message Template Management

As an admin,
I want to create and edit notification message templates with named variable substitution,
So that all outbound communications use consistent, personalized messaging.

**Acceptance Criteria:**

**Given** I am authenticated as `admin`,
**When** `POST /api/templates` is called with `{ type: 'invitation', channel: 'whatsapp', body: 'Halo {{name}}, ...' }`,
**Then** the template is saved and returned with HTTP 201

**Given** a template with variables `{{name}}`, `{{event_title}}`, `{{date}}`, `{{venue}}`,
**When** a blast is sent,
**Then** each message is personalized by substituting the participant's actual values before delivery

**Given** I edit a template,
**When** `PATCH /api/templates/:id` is called,
**Then** the template is updated and a `template.updated` audit entry is written

**Given** a template preview action in the FE,
**When** I click "Preview",
**Then** the template renders with sample data substituted into all `{{variable}}` placeholders; for templates of type `invitation`, `confirmation`, or `rejection`, the preview uses a representative sample participant so the rendered output reflects realistic content

**Given** a template of type `ticket_delivery` or `confirmation`,
**When** I insert the `{{qr_code}}` variable in the template body,
**Then** on preview, a sample QR code image is rendered inline; when the blast worker sends the message, the participant's actual ticket QR code image is embedded at that position (base64 inline for email; image attachment for WhatsApp)

---

## Story 5.2: Segmented Blast Configuration & Audience Targeting

> **Current implementation note (2026-03-30):** The current blast configuration is still centered on the implemented segment filter flow. Manual-vs-AI targeting tabs remain a later target-state follow-up.

As an admin,
I want to configure a segmented invitation blast using the current implemented filter-driven targeting flow,
So that I can send invitations to a selected audience segment from the event workspace.

**Acceptance Criteria:**

**Given** I open the blast configuration for an event,
**When** the blast config form renders,
**Then** the implemented filter-driven targeting form is shown with current audience controls and preview behavior

**Given** I am authenticated as `admin`,
**When** `POST /api/events/:id/blast` is called with the currently implemented blast payload,
**Then** the blast job is enqueued in BullMQ with `202 Accepted` and `{ jobId, status: 'queued' }`

**Given** the blast configuration form,
**When** I adjust filters,
**Then** the audience count updates live using the current preview mechanism

**Given** the blast is configured,
**When** `requireAuth` and `requireRole('admin')` middleware run,
**Then** staff receives HTTP 403 and vendor magic-link users never see this surface — blast is admin-only

**Given** a contact with `consent_status = 'suppressed'` matches the filters,
**When** the blast worker processes the job,
**Then** that contact is excluded from delivery and counted in `suppressed_count` in the job result (FR18, FR59)

---

## Story 5.3: Blast Scheduling & Delivery via Brevo & Everpro

As an admin,
I want to schedule blast delivery for a future date/time and have messages delivered via the configured channel,
So that invitations reach participants at the optimal time without manual intervention.

**Acceptance Criteria:**

**Given** `POST /api/events/:id/blast` is called with `{ scheduledAt: '2026-04-01T09:00:00Z' }`,
**When** the job is enqueued,
**Then** BullMQ delays the job until the scheduled time; the blast does not send immediately

**Given** the blast job executes,
**When** the configured channel is `email`,
**Then** `blast.service.ts` calls Brevo REST API with the personalized message for each eligible contact

**Given** the blast job executes,
**When** the configured channel is `whatsapp`,
**Then** `blast.service.ts` calls Everpro API with the personalized message for each eligible contact

**Given** a message delivery fails (Brevo/Everpro returns non-2xx),
**When** the error is caught,
**Then** BullMQ retries the individual message up to 3 times with exponential backoff (2s, 4s, 8s); after 3 failures the job moves to a `blast-failed` dead-letter queue and a `blast.delivery-failed` audit entry is written with the failed contact ID and error reason

**Given** more than 5% of a blast's recipients fail after all retries,
**When** the blast job finishes,
**Then** a `blast.high-failure-rate` event is logged to `audit_logs` flagged for admin review (supports NFR-R3 ≥95% delivery rate monitoring)

**Given** the blast job completes,
**Then** a `blast.initiated` audit entry is written with `event_id`, `recipient_count`, `suppressed_count`, `channel`

---

## Story 5.4: Emergency Blast

As an admin,
I want to trigger the current emergency blast flow from the event blast UI,
So that urgent communication can be initiated from the implemented FE path while the backend route remains follow-up work.

**Acceptance Criteria:**

**Given** I am authenticated as `admin`,
**When** I use the emergency blast flow in the current FE/MSW implementation,
**Then** an immediate emergency blast request is simulated through the current mocked path

**Given** the emergency blast job executes,
**When** transmission is initiated,
**Then** it starts within 30 seconds of the API call (NFR-P10)

**Given** the emergency blast form in the FE,
**When** I click "Send Emergency Blast",
**Then** a confirmation dialog appears showing the recipient count and the message text before submission

---

## Story 5.5: Suppression List & Consent Enforcement

As an admin,
I want the system to exclude suppressed contacts from outbound communications and expose the current suppression-list management flow,
So that EM . U remains compliant with participant consent preferences and the implemented suppression model.

**Acceptance Criteria:**

**Given** a participant clicks the unsubscribe link in any notification message,
**When** the unsubscribe endpoint is called (no login required),
**Then** the contact's `consent_status` is updated to `suppressed` within ≤ 2 taps/clicks (NFR-S15)

**Given** a contact with `consent_status = 'legacy_unverified'` or `'suppressed'`,
**When** any blast job runs,
**Then** that contact is excluded from the recipient list — zero exceptions (FR59)

**Given** a contact is added to the suppression list,
**Then** a `suppression.added` audit entry is written

**Given** the blast worker completes processing,
**When** the job result is logged,
**Then** `suppressed_count` accurately reflects the number of contacts excluded due to consent status

---
