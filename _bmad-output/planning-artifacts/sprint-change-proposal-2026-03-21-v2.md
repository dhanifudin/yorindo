# Sprint Change Proposal — v2
**Date:** 2026-03-21
**Author:** Dian (approved) via BMAD Correct Course workflow
**Status:** ✅ All three proposals approved
**Trigger:** Strategic pivot identified via `/bmad-help` — EM . U is primarily a Decision Support System for blasting contacts per events, not a contact management tool. Current UX treats contact browsing as the primary workspace; it should be the event lifecycle pipeline.

---

## Summary of Approved Changes

| # | Title | Artifact(s) Affected | Status |
|---|---|---|---|
| 1 | Event Pipeline Hub UX (6-tab `/app/events/:id`) | Epic 4, new UX spec | ✅ Approved |
| 2 | Concurrent FE+BE mock-first with Repository + Adapter patterns | architecture.md, development-phase-plan.md, Story 1.1, new Story 1.8 | ✅ Approved |
| 3 | Artifact creation/update sequencing | Workflow record only | ✅ Approved |

---

## Proposal 1: Event Pipeline Hub UX

### Problem
The current `/app/events/:id` detail page only covers event configuration. The primary admin workflow — managing the full funnel from blast → registration → approval → check-in — has no dedicated workspace. Admins must context-switch between Contacts, Events, and sub-pages constantly.

### Change
Introduce a 6-tab Event Pipeline Hub at `/app/events/:id` that gives admins a single workspace for the complete event lifecycle:

| Tab | Route | Purpose |
|---|---|---|
| Overview | `/app/events/:id` | Health KPIs — funnel metrics, blast status, pending approvals count |
| Undangan | `/app/events/:id/blast` | Send blast, schedule blast, view blast history per event |
| Registrasi | `/app/events/:id/registrations` | AI-graded approval queue, individual approve/reject, bulk accept AI list |
| Konfirmasi | `/app/events/:id/confirmation` | Double opt-in status, re-send ticket, waitlist promotions |
| Check-in | `/app/events/:id/checkin` | Live attendance counter, scan log, staff assignment |
| Laporan | `/app/events/:id/report` | Analytics dashboard, YoriMind panel, PDF export |

### Why Existing Work Is Preserved
- Stories 3.7–3.12 (Contacts Intelligence Hub) remain fully valid — contacts is repositioned as a "database asset" tool, not the primary workspace
- All Epic 4 Stories 4.1–4.6 remain — the Hub tabs add workflow context on top of existing event config
- `/app/contacts` remains as a secondary admin tool for database hygiene

### Artifacts to Create/Update
- **Create:** Stories 4.7–4.12 appended to `epic-4-event-configuration-management.md`
- **Create:** `_bmad-output/planning-artifacts/ux-event-pipeline.md` (via `/bmad-create-ux-design` in a fresh session)

### Before/After

**Before:** `/app/events/:id` = event config form only
**After:** `/app/events/:id` = 6-tab pipeline workspace (config + blast + registration review + check-in + analytics)

---

## Proposal 2: Concurrent FE+BE Mock-First Development

### Problem
Original `development-phase-plan.md` sequenced FE Phase 1 → BE Phase 2 (completely serial). This means:
- FE ships weeks before any BE integration testing
- BE ships weeks after FE, with no integration tests until the end
- External service dependencies (Brevo, Everpro, GPT-4o, Claude) block BE development

### Change
Replace the 2-phase serial plan with a **3-phase concurrent plan**:

**Phase 1 — Concurrent FE + BE (In-Memory / Mock):**
- FE: builds against MSW handlers (browser-side, existing approach)
- BE: Fastify routes fully implemented using **in-memory repository implementations** — no PostgreSQL/MongoDB/Redis required in this phase
- Service interfaces backed by **mock adapters** — Brevo mock, Everpro mock, GPT-4o mock, Claude mock, BullMQ in-memory queue
- Both FE and BE can be developed, reviewed, and unit-tested in parallel from Sprint 1
- Integration tests between FE and BE work in this phase via shared type contracts

**Phase 2 — Integration (Real Storage + Real Services):**
- Swap in-memory repositories for PostgreSQL/MongoDB implementations (one repo at a time, per epic)
- Swap mock service adapters for real Brevo, Everpro, GPT-4o, Claude implementations
- Run database migrations
- Integration + E2E tests against real stack

**Phase 3 — Hardening:**
- Load testing (500K contacts, 30K blast, 500 concurrent registrations)
- WCAG 2.1 AA accessibility audit
- Security penetration testing
- Performance optimization (FCP ≤ 3s, QR scan ≤ 2s)
- Production deploy + monitoring setup

### Enabling Patterns

**Repository Pattern (expanded from architecture.md cross-cutting concern #2):**
```
IContactRepository (interface)
  ├── InMemoryContactRepository    ← Phase 1
  └── PostgresContactRepository   ← Phase 2

IEventRepository (interface)
  ├── InMemoryEventRepository      ← Phase 1
  └── PostgresEventRepository      ← Phase 2

ISurveyRepository (interface)
  ├── InMemorySurveyRepository     ← Phase 1
  └── MongoSurveyRepository        ← Phase 2
```

**Service Adapter Pattern (new):**
```
IEmailService (interface)
  ├── MockEmailService             ← Phase 1
  └── BrevoEmailService            ← Phase 2

IWhatsAppService (interface)
  ├── MockWhatsAppService          ← Phase 1
  └── EverproWhatsAppService       ← Phase 2

IEtlNormalizationService (interface)
  ├── MockEtlNormalizationService  ← Phase 1
  └── GptEtlNormalizationService   ← Phase 2

IYoriMindService (interface)
  ├── MockYoriMindService          ← Phase 1
  └── ClaudeYoriMindService        ← Phase 2

IQueueService (interface)
  ├── InMemoryQueueService         ← Phase 1
  └── BullMQQueueService           ← Phase 2
```

All interfaces defined in `src/interfaces/` at the start of Epic 1.

### Artifacts to Create/Update
- **Update:** `development-phase-plan.md` — rewrite to 3-phase concurrent structure
- **Update:** `architecture.md` — add Repository Pattern detail section + Service Adapter Pattern section
- **Update:** Story 1.1 — add AC for in-memory repository scaffold
- **Create:** Story 1.8 — Service Adapter Scaffold (define all service interfaces + mock implementations)

### Before/After

**Before:** Phase 1 = FE only (MSW), Phase 2 = BE only (real DB + services) — serial
**After:** Phase 1 = FE + BE concurrent (MSW + in-memory), Phase 2 = Integration, Phase 3 = Hardening — parallel

---

## Proposal 3: Artifact Creation/Update Sequencing

### Change
Defines the execution order for Proposals 1 and 2 artifacts:

1. Write `sprint-change-proposal-2026-03-21-v2.md` (this document) ← executing now
2. Rewrite `development-phase-plan.md`
3. Append Repository Pattern + Service Adapter sections to `architecture.md`
4. Append Stories 4.7–4.12 to `epic-4-event-configuration-management.md`
5. Add Story 1.8 to `epic-1-foundation-openapi-contract-developer-experience.md`
6. Create `ux-event-pipeline.md` (fresh session via `/bmad-create-ux-design`)

### Rationale
Architecture docs before stories (stories reference architecture); Epic 1 additions before Epic 4 additions (foundation before feature).

---

## Impact Assessment

| Item | Impact |
|---|---|
| Existing Stories 1.1–1.7 | Minimal — Story 1.1 gets one new AC block; 1.2–1.7 unchanged |
| Existing Stories 2.x–3.x | None |
| Existing Stories 4.1–4.6 | None — new stories 4.7–4.12 append only |
| Sprint 1 capacity | Story 1.8 (Service Adapter Scaffold) is new work — estimate 3 story points |
| Development timeline | Concurrent FE+BE should reduce total calendar time vs. serial approach |
| Integration risk | Reduced — in-memory implementations are replaced one at a time; both layers tested together earlier |
