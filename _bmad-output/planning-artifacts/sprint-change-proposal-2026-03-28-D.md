# Sprint Change Proposal — SCP-2026-03-28-D

**Date:** 2026-03-28
**Scope:** Moderate
**Status:** Approved

---

## Section 1: Issue Summary

**Wilayah.id Location Integration**

Add structured Indonesian administrative area data (province + kabupaten/kota) to contacts, enabling admin audience targeting by location in blast configuration and registration form.

**Trigger:** Product requirement — admin needs to target blast audiences by location (e.g., "all contacts in DKI Jakarta"). Contacts currently have only a free-text `city` field, which is inconsistent and unsuitable for programmatic filtering.

**Solution:** Integrate wilayah.id (free static JSON API, Kemendagri 2025 data, 38 provinces + ~514 cities, MIT licensed) to provide structured location codes. Store denormalized `province_code`/`city_code` on the `contacts` table. Frontend calls wilayah.id directly (no backend proxy). ETL maps free-text city to structured codes. Bundled `wilayah-static.json` (~50KB) provides fallback.

**Technical research:** `_bmad-output/planning-artifacts/research/technical-wilayah-id-location-integration-research-2026-03-28.md`

---

## Section 2: Impact Analysis

| Story | Change Type |
|-------|-------------|
| 1.2 Database Migrations | Migration 006: 4 nullable TEXT columns + 2 indexes on contacts |
| 1.4 OpenAPI Spec | Task 16: Contact schema + BlastFilters location fields |
| 1.5 FE Type Definitions | Task 7: Contact location fields + WilayahProvince/City/ApiResponse types |
| 3.1 Contact List | AC3/6 updated + AC7 added; Task 8: LocationPicker component + wilayah-static.json |
| 3.3 ETL Processing | Task 6: city→code mapping in RuleBasedEtlNormalizationService |
| 5.2 Blast Configuration | AC5 added: LocationPicker province/city audience targeting |
| 6.2 Registration Form | company_location → LocationPicker cascade |

**No new epics. No scope reduction. MVP unchanged.**

---

## Section 3: Recommended Approach

**Direct Adjustment** — modify existing stories within current epic structure.

- No rollback required
- Effort: Medium (7 story updates, 3 new shared artifacts)
- Risk: Low — wilayah.id is free/open-CORS; bundled fallback eliminates external dependency at runtime; location fields are nullable (graceful degradation for existing contacts)

---

## Section 4: Detailed Decisions

1. Frontend calls wilayah.id API directly — backend never touches wilayah.id
2. `province_code` + `city_code` stored as TEXT (dot-separated, e.g. `"31.71"`) — never cast to INT
3. Both `_code` and `_name` stored (denormalized) — no reference table needed in PostgreSQL
4. Existing `contacts.city` TEXT field preserved as legacy free-text fallback — not removed
5. Bundled `src/data/wilayah-static.json` committed to repo (~50KB, provinces + all regencies) — generated once via `scripts/generate-wilayah-static.ts`
6. `LocationPicker` is a shared UI component created in Story 3.1, reused in 5.2 and 6.2
7. Frontend: shadcn `<Select>` for province (38 items); `<Combobox>` with search for city (cascade)
8. SWR cache: 1hr for provinces, 30min for regencies; falls back to static JSON if wilayah.id unreachable
9. ETL city mapping: exact match → Jaro-Winkler ≥ 0.85 → keyword alias → null (raw city preserved)
10. Depth: province + kabupaten/kota only — kecamatan/kelurahan too granular for B2B targeting
11. Blast filter: `province_code`/`city_code` are optional — null = any location (backward compatible)
12. Registration form: `company_location` field becomes LocationPicker; SSO pre-fill: read-only if contactProfile has codes

---

## Section 5: Implementation Handoff

**Scope:** Moderate

| Story | Assignee | Action |
|-------|----------|--------|
| 1.2 | Amelia (Dev) | Add Migration 006 SQL + update migrate.ts + update seed |
| 1.4 | Amelia (Dev) | Task 16: Contact + BlastFilters schema location fields |
| 1.5 | Amelia (Dev) | Task 7: WilayahProvince/City types + Contact location fields + MSW fixture update |
| 3.1 | Amelia (Dev) | AC7 + Task 8: LocationPicker + wilayah-static.json + filter update |
| 3.3 | Amelia (Dev) | Task 6: city→code mapping in RuleBasedEtlNormalizationService |
| 5.2 | Amelia (Dev) | AC5: wire LocationPicker into blast audience filters |
| 6.2 | Amelia (Dev) | Replace company_location text field with LocationPicker |

**Success criteria:**
- `contacts` table has `province_code`, `province_name`, `city_code`, `city_name` TEXT columns (nullable, indexed)
- `WilayahProvince`, `WilayahCity`, `WilayahApiResponse` types exported from `src/types/api.ts`
- `LocationPicker` component built and reused in Stories 3.1, 5.2, 6.2
- `src/data/wilayah-static.json` committed (provinces + all regencies, ~50KB)
- Blast config audience filters include province + city location fields
- Registration form uses cascading location picker for `company_location`
- ETL maps free-text city → `province_code`/`city_code` in `RuleBasedEtlNormalizationService`
- All location fields nullable — no data loss for existing contacts without location codes
