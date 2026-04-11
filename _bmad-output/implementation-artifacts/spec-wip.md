---
title: 'Email system revamp — DB-driven config, SMTP presets, rate-limit retry, settings UI'
type: 'feature'
created: '2026-04-11'
status: 'done'
context:
  - '_bmad-output/planning-artifacts/prd-email-system-revamp.md'
baseline_commit: 4eae289a963d4b76e39aed9e3c67ef0db95626ea
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Email provider selection is env-var only (UI changes ignored at runtime), no rate-limit awareness (429 responses waste fixed-delay retries), no queue recovery on blast failure, and settings UI is unfriendly for non-technical admins.

**Approach:** Make email config DB-driven with immediate effect, add generic SMTP service with presets, implement rate-limit aware retry with Retry-After parsing, and redesign the email settings tab with dropdown, conditional fields, helper text, and test-send.

## Boundaries & Constraints

**Always:**
- Email provider resolved from DB settings table on each send (not env vars)
- Settings cache invalidated immediately on save (5s TTL max)
- SMTP errors (auth failed, connection refused) fail immediately — no retry
- Rate-limit retries only on HTTP 429 with Retry-After detection
- Secrets stored with is_secret: true, masked in API responses

**Ask First:**
- If implementing multi-provider failover (primary + fallback) — out of scope unless explicitly requested
- If BlastBodySchema needs breaking changes to existing blast API consumers

**Never:**
- Do not break existing blast API contract (BlastBodySchema fields are additive only)
- Do not remove MockEmailService (needed for dev/test)
- Do not persist blast progress to in-memory Map — must be Redis or DB

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Admin changes provider in UI | EMAIL_PROVIDER changed from brevo to smtp | Next email send uses SMTP immediately (no restart) | N/A |
| Provider returns 429 with Retry-After: 60 | Blast in progress | Pauses 60s, resumes at reduced rate | Max 3 retries, then fail + alert admin |
| Provider returns 429 without Retry-After | Blast in progress | Exponential backoff: 1s, 4s, 16s, 64s | Max 15-min window, then fail + alert |
| SMTP auth failure | send() called with bad credentials | Immediate failure logged, no retries | Clear error message in UI |
| Admin clicks Test Send | Valid config, admin has email on file | Test email delivered within 30s, green checkmark | Error message with specific cause |
| Blast worker crashes mid-send | 500 contacts, 200 sent | Job preserved in Redis, admin can resume from contact #201 | Alert admin, preserve progress |

</frozen-after-approval>

## Code Map

- `yorindo-api/src/container.ts` — Change resolveEmailService() to read from DB settings, not env vars
- `yorindo-api/src/services/adapters/real/SmtpEmailService.ts` (new) — Generic SMTP service from MailtrapEmailService
- `yorindo-api/src/services/blast.service.ts` — Update sendWithRetry() with rate-limit aware retry
- `yorindo-api/src/routes/settings.routes.ts` — Add SMTP fields to SECRET_KEYS, clear cache on save
- `yorindo-app/src/app/app/settings/page.tsx` — Redesigned email tab with dropdown, conditional fields, test-send
- `yorindo-api/src/interfaces/services/IEmailService.ts` — No changes needed (interface unchanged)
- `yorindo-api/src/workers/blast.worker.ts` — Add BullMQ retry attempts config

## Tasks & Acceptance

**Execution:**
- [x] `yorindo-api/src/container.ts` — Change resolveEmailService() to use SettingsService.getProviderConfig() with cache -- DB-driven config
- [x] `yorindo-api/src/services/adapters/real/SmtpEmailService.ts` (new) — Create generic SMTP service using nodemailer, replace MailtrapEmailService usage -- Support any SMTP server
- [x] `yorindo-api/src/services/blast.service.ts` — Update sendWithRetry() to detect 429, parse Retry-After, apply exponential backoff with jitter -- Rate-limit aware retry
- [x] `yorindo-api/src/routes/settings.routes.ts` — Add SMTP fields (SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS) to SECRET_KEYS list, ensure clearSettingsCache() called on save -- Enable SMTP config via UI
- [x] `yorindo-app/src/app/app/settings/page.tsx` — Redesign email tab: provider dropdown (Brevo/Mailtrap/Gmail/SES/SendGrid/Custom), conditional sections, helper text, test-send button, status indicator -- Beginner-friendly UI
- [x] `yorindo-api/src/workers/blast.worker.ts` — Configure BullMQ job retry attempts = 3 with exponential backoff -- Queue recovery
- [x] Verify existing tests pass, add test for SMTP service and rate-limit retry logic -- Regression safety

**Acceptance Criteria:**
- Given an admin changes EMAIL_PROVIDER in Settings UI, when they save, then the next email send uses the new provider without server restart
- Given a provider returns HTTP 429 with Retry-After header, when retry logic runs, then next attempt is scheduled exactly Retry-After seconds later
- Given an admin selects Gmail preset and enters valid credentials, when Test Send is clicked, then email is delivered within 30 seconds
- Given a blast job fails after sending 200 of 500 contacts, when admin resumes the job, then sending continues from contact #201
- All 195+ existing backend tests pass

## Spec Change Log

## Verification

**Commands:**
- `cd yorindo-api && npm test` -- expected: all 195+ tests pass
- `cd yorindo-api && npx tsc --noEmit` -- expected: zero type errors
- `cd yorindo-app && npx tsc --noEmit` -- expected: zero type errors

**Manual checks:**
- Settings UI: dropdown shows 6 providers, selecting one shows only relevant fields
- Test Send: delivers email to admin inbox within 30 seconds
- Rate-limit: simulate 429 response, verify Retry-After is respected
