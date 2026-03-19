# Epic 9: Participant Data Rights & UU PDP Compliance

Participants can exercise their UU PDP data rights — requesting a copy of their stored data, requesting erasure with full anonymization and permanent suppression, and understanding the clear distinction between registration cancellation and data erasure.

> **Phase 1 (FE):** Data request form (phone + email input, confirmation screen, "your request has been submitted" state); erasure request form with two-step confirmation ("I understand this permanently removes my identity"); erasure vs. cancellation explanation page (clear UX copy in Indonesian) — all wired to MSW with stub 202 responses
> **Phase 2 (BE):** `POST /api/participants/data-request` (lookup + export job), `POST /api/participants/erasure-request` (queue anonymization job), anonymization service (per-table rules from Story 9.2 ACs), permanent suppression enforcement, audit trail writes (NFR-S16)

## Story 9.1: Participant Data Request (Copy of Stored Data)

As a participant,
I want to request a copy of all personal data Yorindo holds about me,
So that I can exercise my right to data portability under UU PDP Art. 28.

**Acceptance Criteria:**

**Given** a participant submits a data request with their phone number and email,
**When** `POST /api/participants/data-request` is called (no login required),
**Then** the system looks up all data linked to that phone/email and queues a data export job; a confirmation message is shown

**Given** the data export job completes,
**When** the participant receives a link,
**Then** the link delivers a JSON/PDF export containing: contact record, all registration records, all survey responses linked to their registrations, consent records, and audit trail entries where they are the subject

**Given** the data request,
**Then** a `data-request.submitted` audit entry is written and the request is logged for UU PDP accountability (NFR-S16)

---

## Story 9.2: Participant Data Erasure & Anonymization

As a participant,
I want to request erasure of my personal data, resulting in anonymization of my records and permanent opt-out from future communications,
So that I can exercise my right to erasure under UU PDP Art. 35.

**Acceptance Criteria:**

**Given** a participant submits an erasure request with phone and email verification,
**When** `POST /api/participants/erasure-request` is called,
**Then** the request is validated and an erasure job is queued; a confirmation of the pending erasure is returned

**Given** the erasure job runs,
**When** processing completes,
**Then** anonymization is applied per table as follows:
- **`contacts`:** `name = 'ANONYMIZED'`, `phone = sha256(original_phone)`, `email = null`, `company = null`, `job_title_id = null` — row retained
- **`registrations`:** all registration rows for this contact remain; `contact_id` FK is preserved (points to anonymized contact); no data removed
- **`audit_logs`:** immutable — not modified; `actor_id`/`target_id` remain for structural integrity
- **`consent_records`:** `consent_status` set to `'suppressed'`; purpose field nulled
The record structure is preserved in all tables for historical integrity (FR57, NFR-DI4)

**Given** the erasure is complete,
**When** the contact's phone is used in any future ETL import or registration,
**Then** the system detects the hash match, does NOT re-create the contact profile, and enforces the permanent suppression flag

**Given** the erasure completes,
**Then** the contact's `consent_status` is set to `'suppressed'` permanently; a `data-erasure.completed` audit entry is written

---

## Story 9.3: Erasure vs. Cancellation Distinction & Suppression Clarity

As an admin,
I want clear system-level distinction between registration cancellation (status change only) and data erasure (anonymization + suppression),
So that historical event data remains structurally intact while fully respecting participant erasure requests.

**Acceptance Criteria:**

**Given** a registration is cancelled (self-cancel or admin action),
**When** the cancellation is processed,
**Then** `registrations.status` changes to `'cancelled'` but all registration history, contact record, and audit trail entries remain fully intact and queryable (FR58)

**Given** a data erasure is completed for a participant,
**When** `GET /api/events/:id/registrations` is called by admin,
**Then** the registration record still appears in historical reports but all PII fields show as `'ANONYMIZED'` — attendance stats are not retroactively altered (NFR-DI4)

**Given** the distinction is presented to a participant requesting erasure via the unsubscribe/erasure flow,
**When** they choose "Erase my data" (vs. "Cancel registration"),
**Then** a clear explanation is shown: erasure removes your identity from our records permanently; cancellation only cancels your spot for this event

**Given** a suppressed contact's email or phone appears in any blast recipient query,
**When** the blast worker processes,
**Then** zero messages are sent to that contact — suppression is enforced at the worker level, not just the query level

