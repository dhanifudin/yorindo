---
title: 'Fix audience-preview flagCategory bug + per-event seed criteria'
type: 'bugfix'
created: '2026-04-09'
status: 'done'
baseline_commit: 'efb3c602c90fbb600cbca0630a08caf0ecf39d3f'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The audience-preview endpoint always returns 0 contacts because `flagCategory: 'NONE'` in the Postgres `ContactRepository` generates `WHERE flag_category = 'NONE'` — a literal string comparison that matches nothing. Additionally, every active/published event in the demo seed uses identical generic `targetCriteria`, making the blast page indistinguishable across events.

**Approach:** Add special-case handling for the `'NONE'` sentinel in the Postgres repo (mirroring the existing in-memory repo logic). Update the demo seed to give each active/published event distinct, domain-appropriate targetCriteria.

## Boundaries & Constraints

**Always:**
- The `'NONE'` sentinel means "flag_category IS NULL" — contacts with no flag. Mirror exactly what `memory/ContactRepository.ts:158` already does.
- The `'ANY'` sentinel means "flag_category IS NOT NULL" — also mirror if present in Postgres repo.
- targetCriteria service types must use the display name values stored in `service_type` column (e.g. `'Fabrikasi Logam & Mesin Presisi'`, not slugs like `'manufaktur'`).
- Do not change the `ContactFilters` interface — `flagCategory: string` already accommodates sentinels.
- Do not touch the in-memory `ContactRepository` — it already handles `'NONE'` correctly.

**Ask First:**
- None anticipated.

**Never:**
- Do not change the audience-preview handler logic or the filter key name — only fix the Postgres repo.
- Do not alter any migration files or DB schema.
- Do not change targetCriteria for draft/completed/cancelled/archived events.

</frozen-after-approval>

## Code Map

- `yorindo-api/src/repositories/postgres/ContactRepository.ts:130` — `flagCategory` filter block; needs `'NONE'`/`'ANY'` sentinel cases before the general equality check
- `yorindo-api/src/repositories/memory/ContactRepository.ts:157` — reference implementation for sentinel logic (do not modify)
- `yorindo-api/scripts/seed-demo.ts:194` — targetCriteria loop; replace with per-event slug-keyed map

## Tasks & Acceptance

**Execution:**
- [x] `yorindo-api/src/repositories/postgres/ContactRepository.ts` — REPLACE the single `flagCategory` condition block (line ~130) with: `if 'NONE' → push 'flag_category IS NULL'`; `else if 'ANY' → push 'flag_category IS NOT NULL'`; `else if truthy → push parameterized equality` (no idx increment for the sentinel cases)
- [x] `yorindo-api/scripts/seed-demo.ts` — REPLACE the generic targetCriteria loop with a slug-keyed map assigning distinct criteria per event:
  - `techconf-jakarta-2026` → `{ cities: ['Jakarta'], serviceTypes: ['Elektronik & Peralatan Rumah Tangga'] }`
  - `ai-summit-bandung` → `{ cities: ['Bandung'], serviceTypes: ['Elektronik & Peralatan Rumah Tangga'] }`
  - `erp-workshop-surabaya` → `{ cities: ['Surabaya'], serviceTypes: ['Fabrikasi Logam & Mesin Presisi'] }`
  - `fintech-networking-bali` → `{ cities: ['Denpasar'], serviceTypes: ['Fast-Moving Consumer Goods (FMCG)'] }`
  - `konferensi-kesehatan-digital-2026` → `{ cities: ['Jakarta'], serviceTypes: ['Farmasi & Alat Kesehatan'] }`
  - Any other active/published event → `{ cities: [ev.city], serviceTypes: [SERVICE_TYPE_VALUES[0]] }` as fallback

**Acceptance Criteria:**
- Given `POST /api/events/:id/audience-preview` is called for an event with `targetCriteria` matching contacts in the DB, then `totalContacts > 0` is returned.
- Given a contact has `flag_category = 'duplicate'`, when audience-preview is called, then that contact is absent from results.
- Given a contact has `flag_category IS NULL` and `consent_status = 'active'` and matches the event criteria, then that contact appears in results.
- Given the demo seed runs, then `ERP Workshop Surabaya` has `serviceTypes: ['Fabrikasi Logam & Mesin Presisi']` and `Fintech Networking Bali` has `serviceTypes: ['Fast-Moving Consumer Goods (FMCG)']`.

## Verification

**Commands:**
- `docker compose -f docker-compose.dev.yml exec -T api npm run lint` — expected: no errors
- `docker compose -f docker-compose.dev.yml exec -T api npm test` — expected: all pass
- `make reset-dev` — expected: seed completes, all validation checks pass
- Manual: navigate to `/app/events/[any-active-event-id]/blast` — expected: Audiens Target shows > 0 contacts
