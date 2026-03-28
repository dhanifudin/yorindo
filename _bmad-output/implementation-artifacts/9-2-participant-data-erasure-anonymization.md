# Story 9.2: Participant Data Erasure & Anonymization

## Story

**As a** participant,
**I want** to request erasure of my personal data, resulting in anonymization of my records and permanent opt-out from future communications,
**So that** I can exercise my right to erasure under UU PDP Art. 35.

## Status

review

## Context

This is a Phase 2 BE story implementing the UU PDP data erasure right. It requires Stories 1.1 (Fastify scaffold), 1.2 (DB schema), 1.8 (repository interfaces). Story 9.1 (data request) covers read access; this story covers the destructive erasure path.

**Critical compliance requirement:** The erasure is ANONYMIZATION, not hard deletion. Record structure is preserved in all tables for historical integrity. PII is replaced with `'ANONYMIZED'` or hashed. This is correct per UU PDP Art. 35 and the architecture's data integrity requirement (NFR-DI4).

**Permanent suppression enforcement:** After erasure, the contact's phone hash is stored. Future ETL imports that hash-match will detect the suppressed contact and NOT recreate the profile. This enforces permanent opt-out even after data erasure removes the original phone number.

**FE context (Phase 1 already done):** Story 9.1/9.3 FE already provides the erasure request form with two-step confirmation UI wired to MSW stub. This story implements the real BE endpoint + job processor.

## Acceptance Criteria

**AC1:** Given a participant submits an erasure request with phone and email verification,
When `POST /api/participants/erasure-request` is called,
Then the request is validated (phone matches email in contacts table) and an erasure job is queued; HTTP 202 with `{ jobId, status: 'queued', message: 'Permintaan penghapusan diterima' }` is returned

**AC2:** Given the erasure job runs,
When processing completes,
Then anonymization is applied per table:
- `contacts`: `name = 'ANONYMIZED'`, `phone = sha256(original_phone)`, `email = null`, `company = null`, `job_title_id = null` — row retained
- `registrations`: all registration rows for this contact remain; `contact_id` FK preserved (points to anonymized contact); no data removed
- `audit_logs`: immutable — NOT modified; `actor_id`/`target_id` remain for structural integrity
- `consent_records`: `consent_status` set to `'suppressed'`; purpose field nulled

**AC3:** Given the erasure is complete,
When the contact's phone (as sha256 hash) is used in any future ETL import or registration,
Then the system detects the hash match, does NOT re-create the contact profile, and enforces the permanent suppression flag

**AC4:** Given the erasure completes,
Then the contact's `consent_status` is permanently set to `'suppressed'`; a `data-erasure.completed` audit entry is written with `target_id` = original contact ID, no PII in the audit metadata

**AC5:** Given an erasure request for a phone that doesn't match the provided email,
When `POST /api/participants/erasure-request` is called,
Then HTTP 422 is returned: `{ error: { code: 'IDENTITY_MISMATCH', message: 'Nomor telepon dan email tidak cocok' } }`

**AC6:** Given an erasure request for a contact that is already anonymized (`name = 'ANONYMIZED'`),
When `POST /api/participants/erasure-request` is called,
Then HTTP 409 is returned: `{ error: { code: 'ALREADY_ERASED', message: 'Data sudah dihapus sebelumnya' } }`

## Dev Notes

### Tech Stack

- **Framework:** Fastify 4.x
- **Queue:** BullMQ `transactional` queue (higher priority than marketing — erasure is user-facing)
- **Hashing:** Node.js built-in `crypto.createHash('sha256')` — no external package needed
- **DB:** PostgreSQL via `IContactRepository`, `IConsentRepository`, `IAuditRepository`; MongoDB not required for erasure

### File Locations (in `yorindo-api/`)

```
src/
  routes/
    participants.routes.ts            ← POST /api/participants/erasure-request handler (existing file — add endpoint)
  workers/
    erasure.worker.ts                 ← BullMQ Worker for erasure jobs
  services/
    erasure.service.ts                ← Anonymization logic per-table
  interfaces/repositories/
    IContactRepository.ts             ← Add anonymize() method signature
```

### Architecture Constraints (MUST FOLLOW)

1. **Repository Pattern** — All DB mutations go through repository methods. Never write raw SQL in the route handler or service.
2. **No PII in audit logs** — `data-erasure.completed` audit entry must NOT include the original phone or email. Log only `contactId` (opaque string ID).
3. **Transactional anonymization** — The 3 mutations (contacts update, consent_records update, audit log insert) should run in a PostgreSQL transaction. Use `pg` client directly for the transaction block.
4. **BullMQ `transactional` queue** — Not the `marketing` queue. Erasure is higher priority.

### API Endpoint

```typescript
// POST /api/participants/erasure-request
// Route: participants.routes.ts — no authentication required (public endpoint per Story 9.3)
// Rate limit: 3 requests/IP/hour (add @fastify/rate-limit config)

fastify.post('/api/participants/erasure-request', {
  schema: {
    body: {
      type: 'object',
      required: ['phone', 'email'],
      properties: {
        phone: { type: 'string' },
        email: { type: 'string', format: 'email' },
      },
    },
  },
}, async (request, reply) => {
  const { phone, email } = request.body as { phone: string; email: string }
  const contact = await contactRepository.findByPhone(normalizePhone(phone))

  if (!contact) return reply.status(422).send({ error: { code: 'IDENTITY_MISMATCH', message: 'Nomor telepon dan email tidak cocok' } })
  if (contact.email !== email) return reply.status(422).send({ ... })
  if (contact.name === 'ANONYMIZED') return reply.status(409).send({ error: { code: 'ALREADY_ERASED', ... } })

  const job = await transactionalQueue.add('erasure', { contactId: contact.id })
  return reply.status(202).send({ jobId: job.id, status: 'queued', message: 'Permintaan penghapusan diterima' })
})
```

### ErasureService Anonymization Logic

```typescript
// src/services/erasure.service.ts
import { createHash } from 'crypto'

export class ErasureService {
  constructor(
    private contactRepo: IContactRepository,
    private consentRepo: IConsentRepository,
    private auditRepo: IAuditRepository,
  ) {}

  async anonymizeContact(contactId: string): Promise<void> {
    const contact = await this.contactRepo.findById(contactId)
    if (!contact || contact.name === 'ANONYMIZED') throw new Error('Contact not found or already erased')

    const phoneHash = createHash('sha256').update(contact.phone).digest('hex')

    // All three mutations in a PostgreSQL transaction
    await this.contactRepo.anonymize(contactId, {
      name: 'ANONYMIZED',
      phone: phoneHash,
      email: null,
      company: null,
      jobTitleId: null,
    })

    await this.consentRepo.suppress(contactId)

    await this.auditRepo.create({
      action: 'data-erasure.completed',
      actorId: 'system',
      targetId: contactId,  // opaque ID only — no PII
      metadata: {},         // Deliberately empty — no PII in audit
    })
  }
}
```

### SHA-256 Phone Hash (Suppression Detection)

```typescript
// Future ETL check in EtlService (Story 3.3 — add this after erasure feature lands):
const phoneHash = createHash('sha256').update(normalizedPhone).digest('hex')
const isSuppressed = await contactRepo.existsByPhoneHash(phoneHash)
if (isSuppressed) {
  // Do not create/update contact; log as suppressed import attempt
  continue
}
```

### IContactRepository New Methods Required

Add to `src/interfaces/repositories/IContactRepository.ts`:
```typescript
anonymize(id: string, anonymizedData: AnonymizedContact): Promise<void>
existsByPhoneHash(phoneHash: string): Promise<boolean>
```

Add implementations to:
- `src/repositories/memory/ContactRepository.ts` (InMemoryContactRepository)
- `src/repositories/postgres/ContactRepository.ts` (Phase 2 — add stub or implement)

### Test Requirements

1. **Happy path:** POST /api/participants/erasure-request with valid phone/email → 202 + jobId returned; erasure job enqueued
2. **Identity mismatch:** phone exists but email doesn't match → 422 IDENTITY_MISMATCH
3. **Already erased:** contact.name is 'ANONYMIZED' → 409 ALREADY_ERASED
4. **Anonymization:** ErasureService.anonymizeContact() → contact.name = 'ANONYMIZED', phone = sha256 hash, email = null; consent_status = 'suppressed'; audit entry written
5. **No PII in audit:** audit entry metadata is empty `{}`; only contactId (opaque ID) stored
6. **Suppression detection:** existsByPhoneHash() returns true after erasure → ETL skips re-creation

### Dependencies

- Prerequisite: Story 1.1 (Fastify scaffold)
- Prerequisite: Story 1.2 (DB schema: contacts, consent_records, audit_logs tables)
- Prerequisite: Story 1.8 (IContactRepository, IConsentRepository, IAuditRepository interfaces)
- Prerequisite: Story 9.1 (data request — participants.routes.ts file exists; add erasure endpoint to same file)

## Tasks / Subtasks

- [ ] Task 1: Add new repository methods to interfaces + in-memory implementations
  - [ ] Subtask 1.1: `IContactRepository.anonymize()` and `existsByPhoneHash()` signatures
  - [ ] Subtask 1.2: `InMemoryContactRepository.anonymize()` — updates in-memory store
  - [ ] Subtask 1.3: `InMemoryContactRepository.existsByPhoneHash()` — checks hash against stored hashes

- [ ] Task 2: Create `src/services/erasure.service.ts`
  - [ ] Subtask 2.1: Constructor with IContactRepository, IConsentRepository, IAuditRepository
  - [ ] Subtask 2.2: `anonymizeContact(contactId)` — runs all 3 mutations
  - [ ] Subtask 2.3: SHA-256 phone hashing
  - [ ] Subtask 2.4: Guard: contact already anonymized → throw

- [ ] Task 3: Create `src/workers/erasure.worker.ts`
  - [ ] Subtask 3.1: BullMQ Worker on 'transactional' queue
  - [ ] Subtask 3.2: Import ErasureService + dependencies from container.ts
  - [ ] Subtask 3.3: Call `erasureService.anonymizeContact(job.data.contactId)`

- [ ] Task 4: Add `POST /api/participants/erasure-request` endpoint
  - [ ] Subtask 4.1: In `participants.routes.ts` — add endpoint to existing file
  - [ ] Subtask 4.2: Input validation: phone + email required
  - [ ] Subtask 4.3: Identity match check (phone → find contact → compare email)
  - [ ] Subtask 4.4: Already erased check (contact.name === 'ANONYMIZED')
  - [ ] Subtask 4.5: Enqueue to transactionalQueue, return 202

- [ ] Task 5: Update `src/container.ts`
  - [ ] Subtask 5.1: Add `erasureService: IErasureService` binding (or inject directly in worker)

- [ ] Task 6: Write vitest tests
  - [ ] Subtask 6.1: POST /api/participants/erasure-request happy path → 202 + jobId
  - [ ] Subtask 6.2: Identity mismatch → 422
  - [ ] Subtask 6.3: Already erased → 409
  - [ ] Subtask 6.4: ErasureService.anonymizeContact() applies all anonymization rules
  - [ ] Subtask 6.5: No PII in audit log metadata
  - [ ] Subtask 6.6: existsByPhoneHash() works after anonymization

## Dev Agent Record

### Implementation Plan
_To be filled by dev agent_

### Debug Log
_To be filled by dev agent_

### Completion Notes
_To be filled by dev agent_

## File List
_To be filled by dev agent_

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-22 | Story created from epic-9 UU PDP compliance | bmad-context-engine |
