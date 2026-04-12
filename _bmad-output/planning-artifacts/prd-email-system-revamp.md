---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-success', 'step-04-functional', 'step-05-technical', 'step-06-polish']
workflowStatus: 'complete'
completedAt: '2026-04-11'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - 'yorindo-api/src/services/adapters/real/MailtrapEmailService.ts'
  - 'yorindo-api/src/services/adapters/real/BrevoEmailService.ts'
  - 'yorindo-api/src/services/blast.service.ts'
  - 'yorindo-api/src/routes/settings.routes.ts'
  - 'yorindo-app/src/app/app/settings/page.tsx'
workflowType: 'prd-feature'
briefCount: 0
researchCount: 0
brainstormingCount: 0
projectDocsCount: 1
classification:
  projectType: 'Infrastructure Enhancement - Email Delivery System'
  domain: 'Event Technology (B2B, Indonesia)'
  complexity: 'Medium-High'
  projectContext: 'brownfield'
  userTypes:
    - 'Admin/Operator (needs beginner-friendly email config)'
    - 'System (needs reliable delivery with rate-limit recovery)'
  coreValue: 'Reliable, configurable email delivery that works out of the box'
  compliance: 'UU PDP - delivery logging for audit trail'
---

# PRD: Email System Revamp — SMTP Support, Rate-Limit Aware Retry, Beginner-Friendly Settings

**Author:** Dian (facilitated by AI PM)
**Date:** 2026-04-11

---

## Executive Summary

The EM . U platform currently supports two email providers (Brevo HTTP API and Mailtrap SMTP), but with significant limitations:

1. **Provider selection is environment-variable driven** — changes in the Settings UI are persisted to the database but never consumed at runtime. A server restart is required for any provider change to take effect.
2. **No rate-limit awareness** — when an email provider returns HTTP 429 (Too Many Requests), the system retries on fixed delays (0, 2s, 4s, 8s), wasting retries and potentially getting further rate-limited.
3. **No queue-level recovery** — if the blast worker fails entirely (e.g., provider outage), the job is lost. There is no requeue or resume mechanism.
4. **Settings UI is unfriendly** — raw environment variable names, no dropdown selectors, no guidance on what each field means, and both Mailtrap and Brevo fields are always visible regardless of which provider is active.
5. **No generic SMTP option** — Mailtrap's implementation uses nodemailer SMTP transport, but the UI labels it "Mailtrap-only," preventing admins from using Gmail, SendGrid, AWS SES, or any other SMTP server.

### What This Revamp Delivers

| Capability | Current State | Target State |
|---|---|---|
| **Provider selection** | Env vars only — UI changes ignored | DB-driven — changes take effect immediately without restart |
| **SMTP support** | Mailtrap-labeled only | Generic SMTP (Gmail, SendGrid, SES, Mailtrap, custom) with presets |
| **Rate-limit handling** | Fixed delays (0, 2s, 4s, 8s) | Adaptive retry with `Retry-After` header detection + exponential backoff |
| **Queue recovery** | Lost on worker failure | BullMQ retry attempts + job state persistence + resume from failure point |
| **Settings UI** | Raw env vars, always-visible sections | Provider dropdown, conditional fields, helper text, test-send button |

**Strategic value:** Reliable email delivery is the backbone of the entire event cycle — invitations, confirmations, rejections, waitlist promotions, and reports all flow through it. A single delivery failure cascades into missed registrations, frustrated participants, and lost vendor revenue. This revamp makes email delivery **resilient, observable, and configurable by non-technical admins**.

---

## Success Criteria

### User Success

| User | Success Moment | Metric |
|---|---|---|
| Admin | Configures email provider in < 3 minutes | Dropdown → fill 4 fields → test send → save |
| Admin | Confirms delivery is working immediately | "Test Send" button delivers to admin's email within 30 seconds |
| Admin | Understands what each field does | Zero support tickets about email config in first 30 days |
| Participant | Receives invitation email reliably | **≥ 98%** delivery success rate per blast campaign |
| Participant | Never misses a notification due to rate limits | **0** notifications silently dropped during provider rate-limit windows |

### Business Success

| Horizon | Target |
|---|---|
| **Launch** | Email provider changes in Settings UI take effect immediately (no restart) |
| **Month 1** | Email delivery failure rate drops from current baseline to **< 2%** per campaign |
| **Month 3** | Admin team can configure custom SMTP (Gmail, SES, etc.) without developer assistance |
| **Ongoing** | Rate-limit events auto-resume — zero manual intervention required |

### Technical Success

| Requirement | Target |
|---|---|
| Rate-limit detection | HTTP 429 responses detected, `Retry-After` header parsed, backoff applied |
| Retry budget | **3 adaptive retries** with exponential backoff + jitter, max window 15 minutes |
| Queue resilience | BullMQ job retry attempts = 3, failed jobs preserved for manual resume |
| Config hot-reload | Email provider resolved from DB on each send — no restart required |
| Delivery logging | Every attempt logged with `provider`, `status`, `error`, `retryCount`, `nextRetryAt` |

---

## Current State Analysis

### Architecture (Current)

```
Settings UI → DB (settings table)  ──❌ NOT CONSUMED ──→ Email Service
                                                              ↑
Environment vars (.env) ──✅ CONSUMED ──→ container.resolveEmailService()
```

**The disconnect:** Settings UI saves to DB. `resolveEmailService()` in `container.ts` reads `config.emailProvider` from env vars at startup. The two are disconnected.

### Providers (Current)

| Provider | Transport | Configuration | Limitation |
|---|---|---|---|
| **Brevo** | HTTP REST API | `BREVO_API_KEY` (env) | Hardcoded sender, no bulk API |
| **Mailtrap** | nodemailer SMTP | `MAILTRAP_HOST/PORT/USER/PASS` (env) | Labeled "Mailtrap-only" but generic SMTP underneath |
| **Mock** | In-memory array | None | Dev/test only |

### Retry Logic (Current)

```
sendWithRetry():
  attempts = 4 (immediate + 2s + 4s + 8s)
  on failure: continue to next contact
  on final failure: audit log + failedCount++
  no rate-limit detection
  no Retry-After parsing
```

### Settings UI (Current)

- Free-text input for `EMAIL_PROVIDER`
- Always-visible sections for both Mailtrap and Brevo
- No helper text, no validation feedback, no test-send capability
- Raw environment variable names as labels

---

## Functional Requirements

### F1: DB-Driven Email Provider Resolution

**Requirement:** Email service resolution reads provider and credentials from the `settings` database table, not from environment variables.

**Behavior:**
1. On each email send, resolve provider config from DB: `EMAIL_PROVIDER`, plus provider-specific keys
2. Cache config with 5-second TTL (matching AIInsightsService pattern)
3. `clearSettingsCache()` called after settings save → immediate effect

**Acceptance Criteria:**
- Given an admin changes `EMAIL_PROVIDER` in Settings UI, when they save, then the next email send uses the new provider without server restart
- Given the settings cache has a valid entry, when an email is sent, then the cached config is used (≤ 5 seconds stale)

---

### F2: Generic SMTP Provider Selection

**Requirement:** Support any SMTP server through a unified SMTP provider configuration with preset templates for common providers.

**Behavior:**
1. Settings UI shows a dropdown: `Brevo (API)` | `Mailtrap (SMTP)` | `Gmail (SMTP)` | `AWS SES (SMTP)` | `Custom SMTP`
2. Selecting a preset auto-fills host/port/connection defaults
3. Admin fills in credentials (username/password or API key)
4. "Test Send" button sends a verification email to the admin's email on file

**Presets:**

| Preset | Host | Port | TLS | Auth Type |
|---|---|---|---|---|
| Gmail | `smtp.gmail.com` | 587 | STARTTLS | App Password |
| Mailtrap | `live.smtp.mailtrap.io` | 587 | STARTTLS | Username + Password |
| AWS SES | `email-smtp.<region>.amazonaws.com` | 587 | STARTTLS | SMTP Credentials |
| SendGrid | `smtp.sendgrid.net` | 587 | STARTTLS | API Key (username: `apikey`, password: key) |
| Custom | (blank) | (blank) | (select) | (blank) |

**Acceptance Criteria:**
- Given an admin selects "Gmail (SMTP)" from the dropdown, when the form loads, then host, port, and TLS are pre-filled correctly
- Given credentials are entered, when "Test Send" is clicked, then a test email is delivered to the admin's inbox within 30 seconds

---

### F3: Rate-Limit Aware Retry

**Requirement:** Detect HTTP 429 responses and adapt retry timing based on `Retry-After` header or provider-specific rate-limit signals.

**Behavior:**
1. On HTTP 429: parse `Retry-After` header (seconds or date), schedule next attempt accordingly
2. If no `Retry-After`: exponential backoff with jitter (1s, 4s, 16s, 64s)
3. Maximum 3 adaptive retries per email (4 total attempts including initial)
4. Max retry window: 15 minutes — if not resolved by then, mark as failed and continue
5. SMTP errors (connection refused, auth failed): immediate fail (no retry — these are config errors, not rate limits)

**Acceptance Criteria:**
- Given a provider returns 429 with `Retry-After: 30`, when the retry logic runs, then the next attempt is scheduled exactly 30 seconds later
- Given a provider returns 429 without `Retry-After`, when the retry logic runs, then exponential backoff with jitter is applied
- Given an SMTP auth failure, when the send attempt fails, then no retries are attempted (immediate failure logged)

---

### F4: Queue-Level Job Recovery

**Requirement:** BullMQ jobs for blast delivery include retry attempts and failure state preservation.

**Behavior:**
1. BullMQ job config: `{ attempts: 3, backoff: { type: 'exponential', delay: 5000 } }`
2. On complete job failure: job state preserved in Redis for 24 hours (not auto-removed)
3. Admin can manually resume failed blast jobs from the UI
4. Blast progress store persisted to Redis (not in-memory Map)

**Acceptance Criteria:**
- Given a blast job fails due to provider outage, when the provider recovers, then the job can be manually resumed from the last sent contact
- Given a blast job completes successfully, when 24 hours pass, then the job is cleaned up per BullMQ `removeOnComplete` config

---

### F5: Beginner-Friendly Settings UI

**Requirement:** Email Settings tab redesigned for non-technical admins with clear guidance, validation, and testing capability.

**Behavior:**
1. **Provider Dropdown** — replaces free-text input
2. **Conditional Sections** — only show config fields for the selected provider
3. **Helper Text** — each field has a tooltip/inline explanation
4. **Validation** — real-time format validation (API key patterns, email format, port ranges)
5. **Test Send** — button that sends a test email to the logged-in admin's email
6. **Status Indicator** — shows current active provider and last successful send time

**Acceptance Criteria:**
- Given an admin with no technical background, when they open Email Settings, then they can configure a provider in < 3 minutes with zero documentation
- Given invalid credentials are entered, when "Test Send" is clicked, then a clear error message explains what's wrong (e.g., "Authentication failed — check your App Password")
- Given settings are saved, when the admin sends an invitation, then the new provider is used immediately

---

## Technical Architecture

### Provider Resolution Flow (New)

```
Email Send Request
  │
  ├─ SettingsService.getProviderConfig()  ← DB with 5s cache
  │   ├─ EMAIL_PROVIDER: 'smtp' | 'brevo'
  │   ├─ SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS
  │   └─ BREVO_API_KEY, BREVO_SENDER_EMAIL
  │
  ├─ EmailServiceFactory.resolve(config)
  │   ├─ BrevoEmailService (HTTP REST)
  │   ├─ SmtpEmailService (nodemailer — generic)
  │   └─ MockEmailService (dev/test)
  │
  └─ RateLimitAwareRetry.send(payload)
       ├─ HTTP 429 → parse Retry-After → schedule retry
       ├─ SMTP error → immediate fail
       └─ Max retries exceeded → log + continue
```

### SMTP Service (New)

Replace `MailtrapEmailService` with `SmtpEmailService`:
```typescript
export class SmtpEmailService implements IEmailService {
  private transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,  // true for port 465, false for 587
    auth: { user: config.smtpUser, pass: config.smtpPass },
  })
  // send() and sendBatch() use transporter.sendMail()
}
```

### Database Schema (No Changes)

Existing `settings` table supports all required keys:
- `EMAIL_PROVIDER` → `'brevo' | 'smtp' | 'mock'`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`
- `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`

### Blast Service Changes

```diff
  sendWithRetry(payload, attempts = 4) {
-   const delays = [0, 2000, 4000, 8000]
+   const delays = this.buildRetryDelays(response)
    // ... retry logic
  }

+ buildRetryDelays(response) {
+   if (response?.status === 429) {
+     const retryAfter = response.headers.get('Retry-After')
+     if (retryAfter) return [parseInt(retryAfter) * 1000]
+     return [1000, 4000, 16000, 64000]  // exponential with jitter
+   }
+   return [0]  // immediate fail for non-retryable errors
+ }
```

---

## User Journey: Admin Configures Email Provider

**Persona: Yolanda**, Event Operations Lead. She's not technical — she knows how to run events, not configure SMTP servers.

**Opening Scene:** EM . U's marketing team wants to switch from Brevo to Gmail for sending invitations because their Brevo quota is exhausted. Yolanda has never configured an email server before.

**Rising Action:** She opens Settings → Email Service tab. She sees a dropdown with presets. She selects "Gmail (SMTP)." The form auto-fills: `smtp.gmail.com`, port `587`, TLS `STARTTLS`. She needs to fill in her Google App Password — a link to Google's instructions is inline. She pastes it, clicks "Test Send."

**Climax:** A test email arrives in her inbox in 8 seconds. A green checkmark appears: "Configuration verified — last successful send: just now." She saves. The provider switches immediately — no server restart needed.

**Resolution:** The next invitation blast uses Gmail. Yolanda never touches the server config again.

---

## User Journey: System Handles Provider Rate Limit

**Scenario:** Brevo returns HTTP 429 during a blast of 500 contacts.

**System behavior:**
1. First 429 response: parse `Retry-After: 60` → pause blast for 60 seconds
2. Resume after 60s → send next batch at reduced rate (halved throttle)
3. If 429 again: double wait time, reduce rate further
4. Max 3 pause cycles → if still rate-limited, mark remaining contacts as "pending retry" and alert admin
5. Admin receives notification: "Blast paused — provider rate limit exceeded. 127 contacts pending retry. [Resume Now]"

---

## Non-Functional Requirements

| Requirement | Target |
|---|---|
| **Provider switch latency** | < 1 second (cache invalidation + DB read) |
| **Test send latency** | < 30 seconds from click to delivery |
| **Retry max window** | 15 minutes total per email |
| **Retry attempts** | 3 adaptive + 1 initial = 4 total max |
| **SMTP connection timeout** | 10 seconds |
| **HTTP request timeout** | 30 seconds |
| **Settings cache TTL** | 5 seconds |
| **Failed job retention** | 24 hours in Redis for manual resume |
| **Security** | SMTP passwords and API keys stored with `is_secret: true` in DB, masked in API responses |

---

## Migration Plan

### Phase 1: DB-Driven Config (Week 1)
1. Add `clearSettingsCache()` call to `container.resolveEmailService()` 
2. Create `SettingsService.getProviderConfig()` with 5-second cache
3. Update `container.ts` to read email config from DB instead of env vars
4. Add SMTP env var fallback for backward compatibility

### Phase 2: Generic SMTP Service (Week 1-2)
1. Create `SmtpEmailService` from `MailtrapEmailService` (generic, not Mailtrap-specific)
2. Add SMTP configuration fields to settings UI with presets
3. Implement "Test Send" functionality
4. Update `BlastBodySchema` and settings validation

### Phase 3: Rate-Limit Aware Retry (Week 2-3)
1. Implement `RateLimitRetry` logic with `Retry-After` parsing
2. Update `sendWithRetry()` in `blast.service.ts`
3. Add adaptive throttle reduction on 429
4. Implement admin alerting for sustained rate limits

### Phase 4: Queue Recovery (Week 3-4)
1. Migrate `blastProgressStore` from in-memory Map to Redis
2. Configure BullMQ job retry attempts and backoff
3. Build resume-from-failure UI for blast jobs
4. Add job state persistence and cleanup

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Gmail App Password complexity** | High — non-technical admins struggle | Inline step-by-step guide with screenshots, link to Google's official instructions |
| **SMTP server blocking** | Medium — Gmail limits send volume | Warn about daily limits, recommend Brevo/SES for high-volume blasts |
| **Cache staleness** | Low — 5-second TTL is short enough | Manual `clearSettingsCache()` on settings save, admin can force-refresh |
| **BullMQ Redis dependency** | Medium — if Redis goes down, blast jobs fail | Fallback to in-memory progress store with warning, alert admin |
| **Rate-limit infinite loop** | High — retry never ends | Max 3 retries + 15-minute window hard cap, then fail and alert |

---

## Open Questions

1. **Should we support multiple email providers simultaneously?** (e.g., primary = Brevo, fallback = SMTP) — Would require provider failover logic in `sendWithRetry()`.
2. **What is the maximum blast volume expected per day?** — Determines whether Gmail (500/day limit) is viable or if we should discourage it for large blasts.
3. **Should test-send use a specific template?** — Or a simple "Your email configuration is working" message?
4. **Do we need per-provider rate-limit profiles?** — Each provider has different limits (Brevo: varies by plan, Gmail: 500/day, SES: depends on sandbox status).
