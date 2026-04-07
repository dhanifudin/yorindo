# Sprint Change Proposal — Data Model Field Rename Propagation
**Date:** 2026-04-07
**Classification:** Minor — direct implementation by dev team
**Status:** Approved and applied

---

## Section 1: Issue Summary

**Problem:** The `Contact` domain field was renamed from `industryId` + `companySize` (FK-based, referencing `industries` and `job_titles` lookup tables) to a single free-text `serviceType` field (stored as `service_type` in PostgreSQL). This change was implemented in the code layer during earlier sprint work but was never back-propagated to planning artifacts, epic ACs, or implementation story specs.

**Discovery:** Two runtime failures surfaced the gap:
1. Docker build failure: `error TS2353: Object literal may only specify known properties, and 'serviceType' does not exist in type 'FacetResult'` — `FacetResult` type still declared `industry` + `companySize` keys.
2. `GET /api/contacts` returning 401 — the FE was sending `?industry=` param which the BE no longer accepted; also `useContacts.ts` was building absolute URLs that bypassed the fetch interceptor.
3. `PostgresContactRepository.findFacets()` was querying a `industries` table JOIN that no longer exists in the live schema.

**Root cause:** No established propagation checklist for domain field renames. The rename happened during schema work and was applied to the repository layer only, without touching types, routes, seed data, or specs.

---

## Section 2: Impact Analysis

**Epic Impact:**
- Epic 3 (done): code correct, story docs were cosmetically stale — updated
- Epic 4 (active): Story 4.5 target criteria referenced `industry` — updated
- Epic 8 (future): Analytics filter param `?industry=` — updated to `?serviceType=`
- Epic 10 (future): Company Intelligence table column and Quick Filter panel — updated

**Artifact Conflicts fixed:**
- `types/domain.ts`: `FacetResult` and `TargetCriteria` interfaces
- `architecture.md`: DB schema snippet, indexes, filterStore shape, ETL output shape, code mapping snippet, INSERT snippet
- `epic-3`: ETL normalization output shape, completeness_score field list, facets response shape, filter URL param
- `epic-4`: target criteria type list
- `epic-8`: analytics filter param and demographic chart label
- `epic-10`: Quick Filter API call, Company Intelligence table column, response shape, filter params
- `1-2-database-schema-migrations.md`: contacts table DDL
- `3-12-contact-event-history-tab-in-sheet.md`: Segmen tab field list (×2)
- `4-5-event-capacity-target-criteria-with-audience-preview.md`: AC filter list

**Code fixes applied (cascade from `TargetCriteria` type change):**
- `repositories/memory/EventRepository.ts`: seed data `industries[]` → `serviceTypes[]`, removed `companySizes[]`
- `routes/events.routes.ts`: blast filter Zod schema, `toIndustryTags()` function, event creation fallback, `contactFilters` type
- `routes/users.routes.ts`: three `industryTags` mappings

**Note on `TargetCriteria`:** `industries?: string[]` renamed to `serviceTypes?: string[]` to match the contact field. `companySizes?: string[]` removed — `company_size` no longer exists in the `contacts` table.

---

## Section 3: Recommended Approach

**Option 1 — Direct Adjustment** ✅ Selected

All changes were surgical text edits to specs and type-safe code fixes. No rollback, no MVP reduction required. Build passes clean after all changes.

**Effort:** Low  
**Risk:** Low — all changes are type-checked by the compiler  
**Timeline impact:** None — applied in same session as discovery

---

## Section 4: Detailed Change Proposals (Applied)

| CP | Artifact | Change |
|----|----------|--------|
| CP1 | `architecture.md` | DB schema (removed `industry_id`/`company_size`, added `service_type`/`job_title`), indexes, filterStore shape, ETL output, mapping snippet, INSERT snippet |
| CP2 | `epic-3` | ETL row shape, completeness_score fields, facets response shape (`{ serviceType, city }`), filter URL param |
| CP3 | `epic-4` | Target criteria type: `industry` → `serviceType` |
| CP4 | `domain.ts` | `TargetCriteria`: `industries` → `serviceTypes`, removed `companySizes` |
| CP5 | `epic-8` | Analytics filter param and demographic breakdown label |
| CP6 | `epic-10` | Quick Filter API call, Company Intelligence column/response/filter |
| CP7 | Story files | `1-2`, `3-12`, `4-5` implementation artifacts |
| CP8 | Code cascade | `EventRepository`, `events.routes.ts`, `users.routes.ts` — all `TargetCriteria` consumers |

---

## Section 5: Implementation Handoff

**Scope:** Minor — all changes applied directly in this session.

**Prevention recommendation:** Before any future domain field rename, run a project-wide grep for the old field name across:
1. `src/types/domain.ts` (type definitions)
2. `src/routes/*.routes.ts` (Zod schemas, response mappers)
3. `src/repositories/**` (seed data, SQL)
4. `_bmad-output/planning-artifacts/epics/` (AC text)
5. `_bmad-output/implementation-artifacts/` (story task lists)

Add this as a step in the architecture ADR for any schema change.

---

---

## Addendum — Jabatan (Job Title) Filter for `/app/contacts`

**Date applied:** 2026-04-07 (same session)

### Change Summary

Added `jobTitle` as a first-class filter on the contacts page, completing the filter surface now that `companySize` was removed and `serviceType` replaced the FK-based industry field.

### Artifact Impact

| Layer | File | Change |
|-------|------|--------|
| BE interface | `IContactRepository.ts` | Added `jobTitle?: string` to `ContactFilters` |
| BE route | `contacts.routes.ts` | Added `jobTitle` to `ContactsQuerySchema`; passes to `filters.jobTitle`; cleaned up unused `CompanySize`/`INDONESIAN_JOB_TITLES` imports |
| BE repo (memory) | `memory/ContactRepository.ts` | Added `jobTitle` ILIKE (includes) filter |
| BE repo (postgres) | `postgres/ContactRepository.ts` | Added `job_title ILIKE $n` to `buildContactWhere` |
| API spec | `openapi.yaml` | Added `jobTitle` query param to `GET /contacts` |
| FE store | `filterStore.ts` | `serviceType`+`jobTitle` replace stale `industry`+`companySize` |
| FE hook | `useContacts.ts` | Params, query key, QS updated to `serviceType`+`jobTitle` |
| FE types | `types/api.ts` | `Contact`, `AudienceRecommendation`, `BlastPayload`, `ContactsFacets` all updated |
| FE filter bar | `ContactsFilterBar.tsx` | Added Jabatan text input (debounced 350ms, clear button); removed company size dropdown; fixed `industry`→`serviceType` URL param |
| FE active pills | `ActiveFilterPills.tsx` | `FILTER_KEYS` + labels updated: `serviceType`+`jobTitle`, `companySize` removed |
| FE table | `ContactsTable.tsx` | Detail panels show `serviceType`+`jobTitle`; mobile row uses `serviceType` |
| FE command center | `ContactsCommandCenter.tsx` | `FILTER_KEYS` + `setFilter` call updated |
| FE events | `AudiencePreview.tsx` | `companySize` filter removed from audience preview form |
| FE blast | `blast/page.tsx` | Filter state: `serviceType` replaces `industry`; `companySize` removed |
| FE dashboard | `ViewerDashboard.tsx` | Industry breakdown uses `c.serviceType` |
| FE recommendations | `AudienceRecommendationsCard.tsx` | Display field: `rec.serviceType` |
| FE duplicates | `duplicates/page.tsx` | Field comparison: `serviceType`+`jobTitle` replace stale FK fields |
| MSW handlers | `contacts.ts`, `events.ts` | Pool fields, facets handler, filter logic, recommendations all updated |
| Tests | `api.test.ts`, `useContacts.test.ts`, `handlers.test.ts` | Updated to match new Contact shape and filter params |

### Planning Artifacts Updated

- `epic-3`: Story 3.1 filter description + example params; Story 3.8 facets shape + filter pill params
- `3-1-contact-list-*`: Story description, ACs, Dev Notes (filterStore shape, Contact type, MSW handler)
- `3-8-filterbar-*`: ACs, tasks, Dev Notes code snippets, filterStore future state

*Addendum complete.*
