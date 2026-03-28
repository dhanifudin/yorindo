# Sprint Change Proposal — SCP-2026-03-28-C

**Date:** 2026-03-28
**Scope:** Moderate
**Status:** Approved

---

## Section 1: Issue Summary

Two coordinated changes from post-SCP-2026-03-28-B design session (2026-03-28):

**A — Per-Service Provider Configuration**
The single `SERVICE_IMPL` env var cannot differentiate providers per service (e.g., cannot have Mailtrap email + mock WhatsApp in the same environment). Each service now reads its own env var: `EMAIL_PROVIDER`, `WHATSAPP_PROVIDER`, `YORIMIND_PROVIDER`, `ETL_NORMALIZATION_PROVIDER`, `SMART_FILTER_PROVIDER`. YoriMind defaults to `disabled` so it is opt-in, not opt-out.

**B — ETL Deduplication is Algorithmic, Not AI**
ETL duplicate detection should use deterministic fuzzy matching (email exact, phone normalized, name Jaro-Winkler ≥ 0.85 + same company) — not AI. AI belongs only in the enrichment step (industry slug, job title classification). A mandatory pre-normalization step (phone → +62 format, email → lowercase+trim) runs on every row before enrichment or dedup, ensuring clean data for reliable matching.

---

## Section 2: Impact Analysis

| Story | Change Type |
|-------|-------------|
| 1.8 Service Adapter Scaffold | AC6 replaced; AC9/10/11 added; CUID2 fix; Tasks 8–11 added |
| 3.3 ETL Processing | Pre-normalization step added; ETL_AI_PROVIDER → ETL_NORMALIZATION_PROVIDER; dedup post-upsert via FuzzyDeduplicationService |
| 5.3 Blast Scheduling | Task 5 subtasks: SERVICE_IMPL=real → per-service env vars |
| 8.4 YoriMind Panel | AC5 added: YORIMIND_PROVIDER=disabled graceful degradation |
| spec-service-provider-configuration.md | NEW — full provider config SOP |

**No new epics. No scope reduction. MVP unchanged.**

---

## Section 3: Recommended Approach

**Direct Adjustment** — modify existing stories and add spec document.

- No rollback required
- Effort: Low-Medium (4 story file updates, 1 new spec)
- Risk: Low — changes are additive (new AC/tasks) or renaming (env var); no behavior change in Phase 1 FE work

---

## Section 4: Detailed Decisions

1. `SERVICE_IMPL` env var retired — each service has its own provider var
2. `YORIMIND_PROVIDER` defaults to `disabled`; FE shows placeholder text, no API call
3. `EMAIL_PROVIDER=mailtrap` → nodemailer SMTP for dev real-email testing without production risk
4. `ETL_NORMALIZATION_PROVIDER = mock | fuzzy | openai | anthropic`
   - `fuzzy` = `RuleBasedEtlNormalizationService` — keyword industry map + regex job title; safe production default
   - AI providers for higher accuracy on ambiguous data
5. Pre-normalization (phone +62, email lowercase/trim) is always deterministic — not configurable
6. Deduplication is always `FuzzyDeduplicationService` — no env var, no AI
7. Dedup runs on pre-normalized data (after step 2, before upsert confirmation)
8. Duplicate pairs flagged to `potential_duplicates` table → Story 3.5 admin review UI
9. CUID2 (`createId()` from `@paralleldrive/cuid2`) replaces `crypto.randomUUID()` in Story 1.8 examples
10. `DisabledYoriMindService.analyze()` returns `null` — not an error

---

## Section 5: Implementation Handoff

**Scope:** Moderate

| Story | Assignee | Action |
|-------|----------|--------|
| 1.8 | Amelia (Dev) | AC6/9/10/11 + Tasks 8–11; container.ts per-service wiring; CUID2 fix |
| 3.3 | Amelia (Dev) | Pre-normalization step in EtlService; ETL_NORMALIZATION_PROVIDER wiring; deduplicationService injected |
| 5.3 | Amelia (Dev) | Task 5 subtask env var refs updated |
| 8.4 | Amelia (Dev) | AC5: disabled provider UI placeholder |
| spec | Bob (SM) | Confirm spec-service-provider-configuration.md in planning-artifacts |

**Success criteria:**
- `SERVICE_IMPL` not referenced in any story file
- `ETL_PROVIDER` / `ETL_AI_PROVIDER` not referenced anywhere
- `YORIMIND_PROVIDER=disabled` has documented adapter + FE degraded state
- `EMAIL_PROVIDER=mailtrap` path documented for dev use
- Pre-normalization (phone/email) documented as always-on in Story 3.3
- `FuzzyDeduplicationService` documented as always-algorithmic (no AI, no env var)
- CUID2 consistent in Story 1.8 examples — no `crypto.randomUUID()`
- `spec-service-provider-configuration.md` exists in planning-artifacts
