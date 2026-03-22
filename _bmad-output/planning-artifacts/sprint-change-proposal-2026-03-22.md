# Sprint Change Proposal — AI Provider Abstraction

**Date:** 2026-03-22
**Proposed by:** Dian
**Workflow:** Correct Course (CC)
**Scope:** Minor — planning artifact updates only; no sprint backlog resequencing required
**Status:** ✅ Applied

---

## Section 1: Issue Summary

**Problem Statement:**
Planning artifacts (architecture.md, epics, requirements-inventory.md) referenced specific AI vendor names and model identifiers directly in story ACs and technical specifications. This coupled the implementation to specific providers (OpenAI GPT-4o, Anthropic Claude Sonnet/Haiku) at the planning layer, which would cause developers to hardcode vendor-specific SDK calls in business logic — bypassing the Service Adapter abstraction that is already defined in the architecture.

**Discovery context:**
Identified during pre-implementation review (2026-03-22) before Story 3.3 and 8.4 were implemented. Caught early — zero code rework required.

**Evidence:**
- `architecture.md` tech stack table: 3 rows hardcoding `OpenAI GPT-4o`, `Claude claude-sonnet-4-6`, `claude-haiku-4-5-20251001`
- `epic-3`: Story 3.3 title + 5 ACs referenced "GPT-4o"; Story 3.6 ACs referenced "Claude Haiku"
- `epic-8`: Story 8.4 AC hardcoded `claude-sonnet-4-6` model ID
- `requirements-inventory.md`: npm install included `openai @anthropic-ai/sdk` at scaffold time; YoriMind pattern said "Claude Sonnet API"
- `development-phase-plan.md`: 2 integration rows referenced specific vendor adapter names

---

## Section 2: Impact Analysis

**Epic Impact:**
- Epic 3: Story 3.3 title renamed; ACs genericized. Story 3.6 ACs genericized. Phase 2 note updated. Epic scope unchanged.
- Epic 8: Story 8.4 ACs genericized. Phase 2 note updated. Epic scope unchanged.
- All other epics: No impact.

**Story Impact:**
- Stories in `backlog` status (3.3 story file does not exist yet) — zero rework
- Stories in `review` status that touch AI: none directly
- Implementation-artifacts story files: `3-3-etl-processing-gpt-4o-normalization-database-upsert.md` was in backlog (no story file existed — now superseded by `3-3-etl-processing-ai-normalization-database-upsert`)

**Artifact Conflicts resolved:**
| Artifact | Change type |
|----------|-------------|
| `architecture.md` tech stack table | AI rows → service adapter interface references |
| `architecture.md` service boundaries | Vendor-specific → adapter-pattern language |
| `architecture.md` phase transition section | Added concrete adapter naming convention |
| `architecture.md` anti-patterns section | Vendor direct calls → adapter violations |
| `epic-3` Phase 2 note | Vendor names → `IEtlNormalizationService`, `ISmartFilterService` |
| `epic-3` Story 3.3 title + ACs | GPT-4o → AI normalization service |
| `epic-3` Story 3.6 ACs | Claude Haiku → AI smart filter service |
| `epic-8` Phase 2 note | Claude Sonnet API → `IYoriMindService` adapter |
| `epic-8` Story 8.4 ACs | `claude-sonnet-4-6` → `IYoriMindService.analyzeEvent()` |
| `epic-list.md` | Epic 3 description genericized |
| `index.md` | Story 3.3 link title updated |
| `development-phase-plan.md` | Phase 1 BE + Phase 2 integration rows updated |
| `requirements-inventory.md` | npm install, YoriMind pattern, AI provider env var section added |

**UX Impact:** None — UI language was already generic.

**Technical Impact:**
The `ISmartFilterService` interface is newly named (previously unnamed in architecture). Must be added to `src/interfaces/services/ISmartFilterService.ts` in Story 1.8, alongside `IEtlNormalizationService` and `IYoriMindService`.

---

## Section 3: Recommended Approach

**Option 1 (Direct Adjustment):** ✅ Selected
- Modify planning artifacts only — no story rollback, no backlog resequencing
- Low effort (2026-03-22 — 30 minutes documentation work)
- Low risk — changes are purely terminological at planning layer; Service Adapter Pattern was already the architectural intent
- High long-term value — developers cannot accidentally hardcode vendor SDKs if ACs don't reference them

**Rationale:**
The Service Adapter Pattern (`IEtlNormalizationService`, `IYoriMindService`) was already defined in architecture. The AI provider env var pattern (`REPOSITORY_IMPL`, `SERVICE_IMPL`) was already the established project convention. This change simply applies that same pattern consistently to the three AI service interfaces — closing the gap between the architectural intent and the epic-level ACs.

---

## Section 4: Detailed Change Proposals

### Architecture.md

**Change 1: Tech Stack Table**
```
OLD:
| AI — ETL | OpenAI GPT-4o | via API | Contact normalization & classification |
| AI — Analytics | Claude claude-sonnet-4-6 | via API | YoriMind event analysis |
| AI — Smart Filter | claude-haiku-4-5-20251001 | via API | Autocomplete industry filter |

NEW:
| AI — ETL | IEtlNormalizationService adapter | configured via ETL_AI_PROVIDER | ... |
| AI — Analytics | IYoriMindService adapter | configured via YORIMIND_AI_PROVIDER | ... |
| AI — Smart Filter | ISmartFilterService adapter | configured via SMART_FILTER_AI_PROVIDER | ... |
```

**Change 2: Service Boundaries**
Vendor-specific direct call descriptions → adapter-pattern language with env var routing.

**Change 3: Anti-patterns**
"Make direct HTTP calls to OpenAI/Anthropic" → "Make direct HTTP calls to any AI provider (always use adapter interface)"

**Change 4: Phase Transition**
Added concrete adapter naming convention: `OpenAIEtlAdapter`, `AnthropicYoriMindAdapter`, `GeminiSmartFilterAdapter` as examples — not prescriptions.

### Epic 3

**Change 5: Story 3.3 Title**
`ETL Processing — GPT-4o Normalization & Database Upsert` → `ETL Processing — AI Normalization & Database Upsert`

**Change 6: Story 3.3 ACs**
All "GPT-4o" → "`IEtlNormalizationService`"; testing strategy updated to reference `MockEtlNormalizationService` and `ETL_AI_PROVIDER`.

**Change 7: Story 3.6 ACs**
"Claude Haiku" × 2 → "AI smart filter service (`ISmartFilterService`)"

### Epic 8

**Change 8: Story 8.4 ACs**
`claude-sonnet-4-6` model ID removed; "Claude API call" → "`IYoriMindService.analyzeEvent()`"

### Requirements Inventory

**Change 9: AI Provider Env Var Section (NEW)**
Added mandatory `AI_PROVIDER_*` env var pattern with three vars, accepted values, Phase 1 defaults, and SDK install guidance.

**Change 10: npm install command**
Removed `openai @anthropic-ai/sdk` from scaffold-time install. Added note: install provider SDKs only when implementing real adapter.

**Change 11: YoriMind pattern line**
"Claude Sonnet API" → "`IYoriMindService.analyzeEvent()`"

---

## Section 5: Implementation Handoff

**Change scope:** Minor — documentation/planning artifacts only

**Handoff:** Development team — no PM/Architect re-involvement needed

**Story 1.8 impact (backlog):**
When Story 1.8 (Service Adapter Scaffold) is implemented, add `ISmartFilterService` interface to `src/interfaces/services/` alongside the other six service interfaces. Add `MockSmartFilterService` to `src/services/adapters/mock/`. Register in `container.ts` with `SMART_FILTER_AI_PROVIDER` env var (default: `mock`).

**Success criteria:**
- No story AC references a specific AI vendor name or model ID
- No implementation code imports AI provider SDKs except inside `src/services/adapters/real/`
- `container.ts` resolves `IEtlNormalizationService`, `IYoriMindService`, `ISmartFilterService` from their respective `*_AI_PROVIDER` env vars

---

*Correct Course workflow complete, Dian! All planning artifacts updated in-place — zero sprint disruption.*
