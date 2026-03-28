# Story 5.3: Blast Scheduling & Delivery via Brevo & Everpro

## Story

**As an** admin,
**I want** to schedule blast delivery for a future date/time and have messages delivered via the configured channel,
**So that** invitations reach participants at the optimal time without manual intervention.

## Status

review

## Context

This is a Phase 2 BE story — it implements real external service delivery (Brevo for email, Everpro for WhatsApp) via BullMQ worker. It requires Stories 1.1 (Fastify scaffold), 1.2 (DB schema), 1.8 (service interfaces), 5.1 (templates), and 5.2 (blast config form + BullMQ job enqueue).

Story 5.2 already enqueues the blast job into BullMQ with `POST /api/blast`. This story implements the BullMQ `blast.worker.ts` that actually processes those jobs: calls Brevo REST API for email channel, calls Everpro API for WhatsApp channel, handles retries, and logs audit entries.

**Key architecture constraint:** Blast worker calls Brevo/Everpro through `IEmailService` and `IWhatsAppService` adapters (not directly). In Phase 1, `MockEmailService` and `MockWhatsAppService` were used. This story creates the real `BrevoEmailService` and `EverproWhatsAppService` adapters.

**Four BullMQ queues:** `otp` > `emergency-blast` > `transactional` > `marketing`. Blast jobs go into `marketing` queue (lowest priority). Emergency blast (Story 5.4) goes into `emergency-blast`. Priorities are enforced by BullMQ queue priority configuration.

## Acceptance Criteria

**AC1:** Given `POST /api/events/:id/blast` is called with `{ scheduledAt: '2026-04-01T09:00:00Z' }`,
When the job is enqueued into BullMQ `marketing` queue,
Then BullMQ delays the job until the scheduled time; the blast does NOT send immediately

**AC2:** Given the blast job executes with channel `email`,
When `blast.worker.ts` processes the job,
Then `IEmailService.sendBulk()` is called with personalized messages for each eligible (non-suppressed) contact

**AC3:** Given the blast job executes with channel `whatsapp`,
When `blast.worker.ts` processes the job,
Then `IWhatsAppService.sendBulk()` is called with personalized messages for each eligible contact

**AC4:** Given a message delivery fails (Brevo/Everpro returns non-2xx),
When the error is caught,
Then BullMQ retries the individual message up to 3 times with exponential backoff (2s, 4s, 8s); after 3 failures the job moves to a dead-letter queue and a `blast.delivery-failed` audit entry is written with the failed contact ID and error reason

**AC5:** Given more than 5% of a blast's recipients fail after all retries,
When the blast job finishes,
Then a `blast.high-failure-rate` event is logged to `audit_logs` flagged for admin review

**AC6:** Given the blast job completes (success or partial failure),
Then a `blast.initiated` audit entry is written with `event_id`, `recipient_count`, `suppressed_count`, `channel`

**AC7:** Given a contact with `consent_status = 'suppressed'` is in the recipient list,
When the blast worker processes,
Then that contact is excluded from delivery — zero messages sent to them; they are counted in `suppressed_count` in the job result

## Dev Notes

### Tech Stack

- **Worker:** BullMQ 3.x Worker on `marketing` queue
- **Email:** Brevo REST API (no official Node.js SDK — use `node-fetch` or `axios` for HTTP calls)
- **WhatsApp:** Everpro API (custom HTTP client)
- **Retry:** BullMQ exponential backoff (2s, 4s, 8s) — 3 attempts
- **Templates:** Variable substitution `{{name}}`, `{{event_title}}`, `{{date}}`, `{{venue}}`

### File Locations (in `yorindo-api/`)

```
src/
  workers/
    blast.worker.ts                     ← BullMQ Worker definition
  services/
    blast.service.ts                    ← Orchestration (suppress check, template sub, dispatch)
  services/adapters/
    real/
      BrevoEmailService.ts              ← Real Brevo REST API implementation
      EverproWhatsAppService.ts         ← Real Everpro API implementation
    mock/
      EmailService.ts                   ← Already exists from Story 1.8
      WhatsAppService.ts                ← Already exists from Story 1.8
  interfaces/services/
    IEmailService.ts                    ← Already defined in Story 1.8
    IWhatsAppService.ts                 ← Already defined in Story 1.8
```

### Architecture Constraints (MUST FOLLOW)

1. **Service Adapter Pattern** — Real API calls ONLY inside `src/services/adapters/real/`. Never call Brevo/Everpro directly from `blast.worker.ts` or `blast.service.ts`.
2. **Repository Pattern** — Suppression check via `ISuppressionRepository.isSuppressed(phone)`. Never query DB directly.
3. **DI via container.ts** — `blast.worker.ts` imports `emailService`, `whatsappService`, `suppressionRepository`, `blastRepository` from `container.ts`.
4. **Audit trail** — Write audit entries for `blast.initiated`, `blast.delivery-failed`, `blast.high-failure-rate` via `IAuditRepository`.

### BullMQ Queue Priority

```typescript
// src/lib/queue.ts — update with priority
export const otpQueue = createQueue('otp')          // highest priority (implicit)
export const emergencyBlastQueue = createQueue('emergency-blast')
export const transactionalQueue = createQueue('transactional')
export const marketingQueue = createQueue('marketing')  // lowest priority

// Worker processes marketing queue at concurrency 2 to respect Brevo rate limits
export const blastWorker = new Worker('marketing', processBlastJob, {
  connection: redis,
  concurrency: 2,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  }
})
```

### Template Variable Substitution

```typescript
import qrcode from 'qrcode'

async function buildVariables(
  contact: Contact,
  event: Event,
  registration: Registration,
  template: Template,
): Promise<Record<string, string>> {
  const vars: Record<string, string> = {
    name: contact.name,
    event_title: event.name,
    date: format(event.date, 'dd MMMM yyyy', { locale: id }),
    venue: event.venue,
  }

  // QR code: only for confirmation/ticket_delivery email templates (SCP-2026-03-28-F)
  if (
    (template.type === 'confirmation' || template.type === 'ticket_delivery') &&
    template.channel === 'email' &&
    registration.ticket_token
  ) {
    const ticketUrl = `${config.baseUrl}/tickets/${registration.ticket_token}`
    const qrDataUrl = await qrcode.toDataURL(ticketUrl, { width: 200, margin: 1 })
    vars.qr_code = `<img src="${qrDataUrl}" alt="QR Tiket" width="200" style="display:block;" />`
  } else {
    vars.qr_code = ''  // removes {{qr_code}} placeholder if conditions not met
  }

  return vars
}

function substituteVariables(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `{{${key}}}`)
}
```

**WhatsApp QR delivery:** When `template.channel === 'whatsapp'` and `template.type === 'confirmation'|'ticket_delivery'` and `ticket_token` is set:
1. Send the text message first (without QR — WhatsApp cannot inline images in text)
2. Then send a separate Everpro image message: `IWhatsAppService.sendImage(to, ticketUrl, caption: 'QR Tiket Anda')`
3. `IWhatsAppService` interface gains `sendImage(to: string, imageUrl: string, caption?: string): Promise<void>`
```

### Brevo REST API Integration

```typescript
// src/services/adapters/real/BrevoEmailService.ts
export class BrevoEmailService implements IEmailService {
  private readonly BASE_URL = 'https://api.brevo.com/v3'

  async send(to: string, subject: string, body: string): Promise<void> {
    const response = await fetch(`${this.BASE_URL}/smtp/email`, {
      method: 'POST',
      headers: {
        'api-key': config.brevoApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: config.brevoSenderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: body,
      }),
    })
    if (!response.ok) {
      throw new Error(`Brevo API error: ${response.status} ${await response.text()}`)
    }
  }
}
```

### Blast Job Data Shape

```typescript
// Job enqueued by POST /api/blast (Story 5.2)
interface BlastJobData {
  eventId: string
  channel: 'email' | 'whatsapp'
  templateId: string
  filters: {
    industry?: string
    city?: string
    jobTitle?: string
    neverAttended?: boolean
  }
  scheduledAt?: string  // ISO datetime; undefined = immediate
  enqueuedBy: string    // user ID
}
```

### Failure Rate Monitoring

```typescript
// After blast job completes:
const failureRate = failedCount / totalRecipients
if (failureRate > 0.05) {
  await auditRepository.create({
    action: 'blast.high-failure-rate',
    metadata: {
      eventId: job.data.eventId,
      failureRate: Math.round(failureRate * 100),
      failedCount,
      totalRecipients,
    },
    level: 'warning',
  })
}
```

### Anti-Patterns (NEVER DO)

- NEVER call Brevo or Everpro REST API from `blast.service.ts` — only from real adapter
- NEVER skip suppression check — suppressed contacts must NEVER receive blasts
- NEVER process more than Brevo's 300/day limit in single-instance Phase 1 test (use batching)
- NEVER hardcode Brevo/Everpro API keys — use `config.*ApiKey` from `src/config/index.ts`

### Test Requirements

Tests use `MockEmailService` and `MockWhatsAppService` (from Story 1.8). Never call real Brevo/Everpro in CI.

1. **Email channel:** blast job with channel='email' → `emailService.send()` called for each non-suppressed contact
2. **Suppression enforcement:** contact with `consent_status='suppressed'` → excluded from delivery; `suppressed_count` incremented
3. **Retry:** mock email service throws on first call, succeeds on second → job completes successfully
4. **Failure rate:** 10 of 100 recipients fail after all retries → `blast.high-failure-rate` audit entry written
5. **Scheduled delay:** job with `scheduledAt` in future → `job.opts.delay` set correctly in BullMQ
6. **QR code — email (SCP-2026-03-28-F):** confirmation template with `{{qr_code}}` + registration with `ticket_token` set → sent email body contains `<img src="data:image/png;base64,` string
7. **QR code — no token:** confirmation template with `{{qr_code}}` + registration without `ticket_token` → `{{qr_code}}` replaced with empty string; no `<img>` tag in body
8. **WhatsApp QR:** confirmation template + `channel=whatsapp` + `ticket_token` set → `whatsappService.send()` called for text AND `whatsappService.sendImage()` called with ticket URL

### Dependencies

- Prerequisite: Story 1.1 (Fastify scaffold, queue.ts)
- Prerequisite: Story 1.8 (IEmailService, IWhatsAppService, MockEmailService, MockWhatsAppService)
- Prerequisite: Story 5.2 (blast enqueue endpoint — puts jobs in marketingQueue that this worker processes)
- External: Brevo API key (Phase 2 only; not needed in Phase 1 tests)
- External: Everpro API key (Phase 2 only; not needed in Phase 1 tests)

## Tasks / Subtasks

- [ ] Task 1: Create `src/workers/blast.worker.ts`
  - [ ] Subtask 1.1: BullMQ Worker on 'marketing' queue with concurrency 2
  - [ ] Subtask 1.2: Import emailService, whatsappService, suppressionRepository, blastRepository, auditRepository from container.ts
  - [ ] Subtask 1.3: Instantiate BlastService and call processJob()
  - [ ] Subtask 1.4: Worker error/completion event logging

- [ ] Task 2: Create `src/services/blast.service.ts`
  - [ ] Subtask 2.1: Constructor: IEmailService, IWhatsAppService, ISuppressionRepository, IBlastRepository, IAuditRepository
  - [ ] Subtask 2.2: Load event + template data from repositories
  - [ ] Subtask 2.3: Filter recipient contacts; exclude suppressed
  - [ ] Subtask 2.4: Template variable substitution per contact
  - [ ] Subtask 2.5: Call correct service adapter (email or whatsapp) per channel
  - [ ] Subtask 2.6: Track failed deliveries; compute failure rate
  - [ ] Subtask 2.7: Write blast.initiated audit entry
  - [ ] Subtask 2.8: Write blast.high-failure-rate audit if >5% fail

- [ ] Task 3: Create `src/services/adapters/real/BrevoEmailService.ts`
  - [ ] Subtask 3.1: Implement IEmailService.send() via Brevo REST API
  - [ ] Subtask 3.2: Error: non-2xx → throw (BullMQ handles retry)

- [ ] Task 4: Create `src/services/adapters/real/EverproWhatsAppService.ts`
  - [ ] Subtask 4.1: Implement IWhatsAppService.send() via Everpro API
  - [ ] Subtask 4.2: Error handling identical to Brevo

- [ ] Task 5: Update `src/container.ts`
  - [ ] Subtask 5.1: Wire `BrevoEmailService` when `EMAIL_PROVIDER=brevo`; set `EMAIL_PROVIDER=brevo` + `BREVO_API_KEY` in `.env`
  - [ ] Subtask 5.2: Wire `EverproWhatsAppService` when `WHATSAPP_PROVIDER=everpro`; set `WHATSAPP_PROVIDER=everpro` + `EVERPRO_API_KEY` in `.env`

- [ ] Task 6: Write vitest tests (using mocks — NO real API calls)
  - [ ] Subtask 6.1: Email channel — send() called for non-suppressed contacts
  - [ ] Subtask 6.2: Suppression check — suppressed contact excluded
  - [ ] Subtask 6.3: Retry — service throws once, succeeds on retry
  - [ ] Subtask 6.4: Failure rate monitoring — >5% failures → audit entry
  - [ ] Subtask 6.5: Scheduled job — delay set correctly

## Dev Agent Record

### Implementation Plan

1. Create `BrevoEmailService.ts` — implements IEmailService via Brevo REST API
2. Create `EverproWhatsAppService.ts` — implements IWhatsAppService via Everpro API
3. Create `blast.service.ts` — suppression check, template substitution, dispatch, audit logging
4. Create `blast.worker.ts` — BullMQ Worker on 'marketing' queue, lazy (not auto-started)
5. Update `container.ts` — wire BrevoEmailService + EverproWhatsAppService when SERVICE_IMPL=real
6. Write tests using MockEmailService + MockWhatsAppService

### Debug Log

- Pre-existing TS errors in `redis.ts` (IORedis namespace type issues) and `ContactRepository.ts` (undefined vs null) are not from this story
- `blast.worker.ts` uses type assertion on Worker options to handle BullMQ's ConstructorParameters typing

### Completion Notes

- 61 API tests pass (59 + 2 skipped DB integration tests)
- 0 TypeScript errors in new files; 16 pre-existing errors in ContactRepository.ts + redis.ts
- `IAuditLogger` defined as simple interface in blast.service.ts; real audit repo integration is Phase 2 Story 1.2

## File List

- `src/services/adapters/real/BrevoEmailService.ts`
- `src/services/adapters/real/EverproWhatsAppService.ts`
- `src/services/blast.service.ts`
- `src/workers/blast.worker.ts`
- `src/container.ts` (added real service wiring)
- `src/tests/blast.service.test.ts`

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-22 | Story created from epic-5 BE blast delivery | bmad-context-engine |
| 2026-03-28 | QR code generation added: `buildVariables()` resolves `{{qr_code}}` → base64 `<img>` for email; WhatsApp sends separate image message via `sendImage()`; 3 new test cases; `IWhatsAppService.sendImage()` method added | SCP-2026-03-28-F |
