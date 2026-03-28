# Spec: Service Provider Configuration

**Version:** 1.0
**Date:** 2026-03-28
**Source:** SCP-2026-03-28-C

---

## Overview

External services in Yorindo are configured via environment variables. Non-AI services (email, WhatsApp) have their own toggle for per-service provider selection (e.g., mock WhatsApp + real email). All AI features share a single `AI_PROVIDER` toggle.

---

## Environment Variables

| Env Var | Allowed Values | Default | Description |
|---------|---------------|---------|-------------|
| `REPOSITORY_IMPL` | `memory` \| `postgres` | `memory` | Repository layer toggle (Phase 1 = memory, Phase 2 = postgres) |
| `EMAIL_PROVIDER` | `mock` \| `brevo` \| `mailtrap` | `mock` | Email delivery service |
| `WHATSAPP_PROVIDER` | `mock` \| `everpro` | `mock` | WhatsApp blast service |
| `AI_PROVIDER` | `disabled` \| `mock` \| `openai` \| `anthropic` | `disabled` | AI provider for all AI features: ETL normalization, YoriMind analytics, SmartFilter autocomplete |

---

## Recommended Configurations

### Local Development (Phase 1 FE/BE mock-first)
```env
REPOSITORY_IMPL=memory
EMAIL_PROVIDER=mock
WHATSAPP_PROVIDER=mock
AI_PROVIDER=disabled
```

### Local Development — Real Email + Mock AI
```env
REPOSITORY_IMPL=memory
EMAIL_PROVIDER=mailtrap
MAILTRAP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USER=<your_mailtrap_user>
MAILTRAP_PASS=<your_mailtrap_pass>
WHATSAPP_PROVIDER=mock
AI_PROVIDER=mock
```

### Production (Phase 2, no AI)
```env
REPOSITORY_IMPL=postgres
EMAIL_PROVIDER=brevo
BREVO_API_KEY=<key>
BREVO_SENDER_EMAIL=noreply@yorindo.id
WHATSAPP_PROVIDER=everpro
EVERPRO_API_KEY=<key>
AI_PROVIDER=disabled
```

### Production (Phase 2, with AI features)
```env
REPOSITORY_IMPL=postgres
EMAIL_PROVIDER=brevo
WHATSAPP_PROVIDER=everpro
AI_PROVIDER=openai
OPENAI_API_KEY=<key>
```

---

## Provider → Adapter Class Mapping

### Email (`EMAIL_PROVIDER`)

| Value | Class | Location |
|-------|-------|----------|
| `mock` | `MockEmailService` | `src/services/adapters/mock/EmailService.ts` |
| `brevo` | `BrevoEmailService` | `src/services/adapters/real/BrevoEmailService.ts` |
| `mailtrap` | `MailtrapEmailService` | `src/services/adapters/real/MailtrapEmailService.ts` |

### WhatsApp (`WHATSAPP_PROVIDER`)

| Value | Class | Location |
|-------|-------|----------|
| `mock` | `MockWhatsAppService` | `src/services/adapters/mock/WhatsAppService.ts` |
| `everpro` | `EverproWhatsAppService` | `src/services/adapters/real/EverproWhatsAppService.ts` |

### AI Provider (`AI_PROVIDER`)

Applies to all three AI features: YoriMind analytics, ETL normalization, and SmartFilter autocomplete.

| Value | YoriMind | ETL Normalization | SmartFilter |
|-------|----------|-------------------|-------------|
| `disabled` | `DisabledYoriMindService` (returns `null`) | `RuleBasedEtlNormalizationService` (keyword maps, no external calls) | `MockSmartFilterService` |
| `mock` | `MockYoriMindService` (hardcoded insights) | `MockEtlNormalizationService` (fixture data) | `MockSmartFilterService` |
| `openai` | `OpenAiYoriMindService` | `OpenAiEtlNormalizationService` | `OpenAiSmartFilterService` |
| `anthropic` | `AnthropicYoriMindService` | `AnthropicEtlNormalizationService` | `AnthropicSmartFilterService` |

**Note:** `disabled` is the safe default — no AI calls, no external API keys required. ETL still works via rule-based normalization (`RuleBasedEtlNormalizationService`); YoriMind shows "Fitur YoriMind tidak aktif"; SmartFilter falls back to mock suggestions.

---

## ETL Pipeline

The ETL pipeline always executes in this order regardless of provider configuration:

```
Raw xlsx/csv rows
       ↓
1. Pre-normalize (always, built into EtlService — NOT configurable)
   - normalizePhone(): strip spaces/dashes, remove leading 0, add +62 prefix
     e.g. "08123456789" → "+628123456789"
   - normalizeEmail(): lowercase + trim
     e.g. "  Budi@Contoh.COM  " → "budi@contoh.com"
       ↓
2. Enrich (via AI_PROVIDER → ETL normalization adapter)
   - Industry slug classification
   - Job title slug classification
   - Company name standardization
   - Confidence scoring per field
       ↓
3. Route by confidence
   - >= 0.7 → upsert to contacts (ON CONFLICT phone DO UPDATE)
   - < 0.7  → insert to flagged_records (Story 3.4 admin review)
       ↓
4. Deduplicate (always, FuzzyDeduplicationService — NOT configurable)
   Runs on pre-normalized data. Flags pairs for Story 3.5 admin review.
```

---

## Deduplication Algorithm

`FuzzyDeduplicationService` is always the implementation — no env var, no AI.

### Match rules (ordered by confidence)

| Rule | Condition | Confidence |
|------|-----------|------------|
| Email exact | `normalize(a.email) === normalize(b.email)` | High (likely duplicate) |
| Phone exact | normalized phone digits match | High (likely duplicate) |
| Name similarity | Jaro-Winkler(a.name, b.name) ≥ 0.85 **AND** same company | Medium (probable duplicate — flag for review) |

- Pairs flagged as High go to `potential_duplicates` with `confidence: 'high'`
- Pairs flagged as Medium go with `confidence: 'medium'`
- Admin resolves via Story 3.5 side-by-side merge UI

### Why not AI for dedup?
Deduplication requires deterministic, auditable results. Email/phone are reliable unique identifiers once pre-normalized. Name similarity via Jaro-Winkler is well-understood and testable. AI would add latency, cost, and non-determinism with no accuracy advantage for this use case.

---

## Adding a New Provider

1. Create adapter class in `src/services/adapters/real/` implementing the relevant interface
2. Add the new value to the env var allowed list in `src/config/index.ts`
3. Add a new `case` in `container.ts` for the new env var value
4. Add env var to `.env.example` with a comment explaining the value
5. Document in this spec under the relevant provider section

---

## container.ts Wiring Pattern

```typescript
// src/container.ts

const aiProvider = config.aiProvider  // 'disabled' | 'mock' | 'openai' | 'anthropic'

function loadEmailService(): IEmailService {
  if (config.emailProvider === 'brevo') return new BrevoEmailService(config)
  if (config.emailProvider === 'mailtrap') return new MailtrapEmailService(config)
  return new MockEmailService()
}

function loadYoriMindService(): IYoriMindService {
  if (aiProvider === 'openai') return new OpenAiYoriMindService(config)
  if (aiProvider === 'anthropic') return new AnthropicYoriMindService(config)
  if (aiProvider === 'mock') return new MockYoriMindService()
  return new DisabledYoriMindService()  // disabled (default)
}

function loadEtlNormalizationService(): IEtlNormalizationService {
  if (aiProvider === 'openai') return new OpenAiEtlNormalizationService(config)
  if (aiProvider === 'anthropic') return new AnthropicEtlNormalizationService(config)
  if (aiProvider === 'mock') return new MockEtlNormalizationService()
  return new RuleBasedEtlNormalizationService()  // disabled → rule-based (no external calls)
}

function loadSmartFilterService(): ISmartFilterService {
  if (aiProvider === 'openai') return new OpenAiSmartFilterService(config)
  if (aiProvider === 'anthropic') return new AnthropicSmartFilterService(config)
  return new MockSmartFilterService()  // mock or disabled → mock
}

// Deduplication — always algorithmic, no toggle
export const deduplicationService: IDeduplicationService = new FuzzyDeduplicationService()

export const emailService = loadEmailService()
export const yoriMindService = loadYoriMindService()
export const etlNormalizationService = loadEtlNormalizationService()
export const smartFilterService = loadSmartFilterService()
// ...
```
