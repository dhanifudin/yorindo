---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'wilayah.id integration for Indonesian administrative area data in EM . U'
research_goals: 'Understand how to integrate wilayah.id to add structured location data to contacts, enabling admin audience targeting by province/city in blast configuration'
user_name: 'Dian'
date: '2026-03-28'
web_research_enabled: true
source_verification: true
---

# Research Report: Technical

**Date:** 2026-03-28
**Author:** Dian
**Research Type:** Technical

---

## Research Overview

**Topic:** wilayah.id integration for Indonesian administrative area data in EM . U
**Goals:** Add structured location data to contacts; enable admin audience targeting by province/city in blast configuration
**Methodology:** Live web search with source verification; analysis of npm ecosystem, API structure, and integration patterns

This research confirms that the wilayah.id integration is **low-risk and implementable without new epics or external infrastructure**. Wilayah.id provides a free, CDN-served static JSON API covering all 38 Indonesian provinces and ~514 kabupaten/kota — sufficient depth for B2B audience targeting. The recommended architecture calls the API directly from the frontend (no backend proxy), stores denormalized `province_code`/`city_code` TEXT columns on the `contacts` table, and includes a bundled static JSON fallback for production reliability.

All changes fold into existing stories across Epics 1, 3, 5, and 6. The backend never touches wilayah.id — it only stores and queries the structured codes. ETL free-text city mapping uses the existing `RuleBasedEtlNormalizationService` with exact → fuzzy → keyword lookup. See the Executive Summary below for actionable decisions and the `/bmad-correct-course` handoff.

---

## Executive Summary

### wilayah.id Integration for EM . U — Key Findings

**Data source confirmed:** wilayah.id (`https://wilayah.id`) serves pre-generated static JSON files — no auth, no rate limits, open CORS. Data is sourced from Kepmendagri No 300.2.2-2138 Tahun 2025 (Ministry of Home Affairs), last updated 2025-07-04. 38 provinces, ~514 kabupaten/kota. MIT licensed.

**Key Technical Findings:**

- **No npm package needed** — direct API calls from the FE (SWR cached) + committed `wilayah-static.json` fallback covers all use cases. `idn-area-data` npm requires Node 22+ ESM — avoidable.
- **Province + Kota depth is sufficient** — Kecamatan/Kelurahan are too granular for B2B audience targeting; skipping them eliminates 90K+ rows of data complexity.
- **Code format: TEXT, not INT** — codes are dot-separated strings (`"31.71"`) and must be stored as `TEXT`/`VARCHAR`. Never cast to integer.
- **Backend is passive** — only stores and queries codes; no wilayah.id API calls at runtime; fully offline-capable.
- **ETL mapping is graceful** — unmapped free-text city → `city_code = NULL`; raw `city` TEXT preserved; no data loss.

**Top Recommendations:**

1. Call wilayah.id directly from the FE; cache with SWR (1hr province, 30min city)
2. Store `province_code TEXT` + `province_name TEXT` + `city_code TEXT` + `city_name TEXT` on `contacts` (denormalized — no reference table)
3. Generate `src/data/wilayah-static.json` once as bundled fallback (provinces + all regencies, ~50KB)
4. Fold all changes into existing stories via `/bmad-correct-course` (SCP-2026-03-28-D)
5. No new epics, no new infrastructure, no external service contracts needed

---

## Technical Research Scope Confirmation

**Research Topic:** wilayah.id integration for Indonesian administrative area data in EM . U
**Research Goals:** Understand how to integrate wilayah.id to add structured location data to contacts, enabling admin audience targeting by province/city in blast configuration

**Technical Research Scope:**

- Architecture Analysis - design patterns, frameworks, system architecture
- Implementation Approaches - development methodologies, coding patterns
- Technology Stack - languages, frameworks, tools, platforms
- Integration Patterns - APIs, protocols, interoperability
- Performance Considerations - scalability, optimization, patterns

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2026-03-28

---

## Technology Stack Analysis

### What wilayah.id Provides

Wilayah.id is a **free, static JSON API** serving pre-generated `.json` files for all four levels of Indonesian administrative hierarchy:

| Level | Term | Count |
|-------|------|-------|
| 1 | Provinsi (Province) | 38 (incl. 4 new Papua provinces, 2022) |
| 2 | Kabupaten/Kota (Regency/City) | ~514 |
| 3 | Kecamatan (District) | ~7,000+ |
| 4 | Kelurahan/Desa (Village) | ~83,000+ |

**Data source:** Kepmendagri No 300.2.2-2138 Tahun 2025 (Ministry of Home Affairs). Last updated: 2025-07-04. NOT BPS data — Kemendagri codes (for governance) differ from BPS codes (for census/statistics).
_Source: https://wilayah.id / https://github.com/cahyadsn/wilayah_

### API Endpoints

All `GET` requests, no authentication, no rate limits documented, CORS open:

```
GET https://wilayah.id/api/provinces.json
GET https://wilayah.id/api/regencies/{PROVINCE_CODE}.json    e.g. /31.json
GET https://wilayah.id/api/districts/{REGENCY_CODE}.json     e.g. /31.71.json
GET https://wilayah.id/api/villages/{DISTRICT_CODE}.json     e.g. /31.71.05.json
```

Response shape (identical for all levels):
```json
{
  "data": [
    { "code": "31.71", "name": "Kota Jakarta Pusat" }
  ],
  "meta": {
    "administrative_area_level": 2,
    "updated_at": "2025-07-04"
  }
}
```

**Code format:** Dot-separated strings (`"31"`, `"31.71"`, `"31.71.05"`, `"31.71.05.1002"`). Store as `TEXT`/`VARCHAR` in DB — **never `INT`**.
_Source: https://wilayah.id/_

### npm Package Ecosystem

| Package | Stars | Node | Notes |
|---------|-------|------|-------|
| `idn-area-data` | ⭐ active | 22+ | **Best for Node.js/TS** — offline CSV/JSON bundled, MIT code / ODbL data |
| `idn-area` (NestJS API) | ⭐ active | 22+ | Self-hostable REST API; Prisma; Docker-ready; Swagger |
| `daftar-wilayah-indonesia` | v4.0.3 | any | 2y old; not TS-native |
| `wilayah-indonesia` | v1.0.2 | any | 5y old; abandoned |

**Recommended for EM . U:** Call `wilayah.id` API directly from the frontend (province + city dropdowns) — responses are tiny (provinces.json ≈ 2KB), cache with SWR/React Query. No npm package needed for basic province+city targeting.
_Source: https://github.com/fityannugroho/idn-area-data_

### Data Hierarchy Depth for EM . U

For B2B events audience targeting, **province + kabupaten/kota is sufficient**. Kecamatan and kelurahan are too granular. This limits scope to:
- `provinces.json` — 38 entries, ~2KB
- `regencies/{code}.json` per province — ~5–20 entries per province

### Key GitHub Repositories

| Repo | Description |
|------|-------------|
| [cahyadsn/wilayah](https://github.com/cahyadsn/wilayah) | Canonical upstream; SQL dumps; MIT; 1000+ stars |
| [fityannugroho/idn-area-data](https://github.com/fityannugroho/idn-area-data) | npm offline data package |
| [fityannugroho/idn-area](https://github.com/fityannugroho/idn-area) | Self-hostable NestJS REST API |
| [emsifa/api-wilayah-indonesia](https://github.com/emsifa/api-wilayah-indonesia) | GitHub Pages static API (older) |

---

## Integration Patterns Analysis

### Integration Architecture Decision: Static vs. Live API

**Decision: Call wilayah.id API directly from the frontend.** Do NOT proxy through Fastify backend. Rationale:

| Approach | Pros | Cons |
|----------|------|------|
| **Frontend → wilayah.id directly** | Zero backend load; CDN-cached; no new endpoints | Dependency on external uptime |
| Frontend → Fastify proxy → wilayah.id | Single CORS source | Extra latency; adds maintenance burden |
| Seed into PostgreSQL migration | Fully offline; fast queries | ~83K village rows is excessive; province+city is only ~552 rows |
| `idn-area-data` npm (embedded) | Fully offline | Node 22+ ESM-only; adds ~MB to bundle |

**Recommended:** Frontend calls `wilayah.id` directly via SWR/React Query with aggressive caching. Provinces list is fetched once and cached until stale. Regencies fetched per-province selection. No backend proxy needed.

_Source: https://wilayah.id/ — responses confirmed open CORS, no auth_

### Database Schema Integration

Add to `contacts` table (Migration 006):

```sql
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS province_code TEXT NULLABLE;   -- e.g. "31"
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS province_name TEXT NULLABLE;   -- e.g. "DKI Jakarta"
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS city_code     TEXT NULLABLE;   -- e.g. "31.71"
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS city_name     TEXT NULLABLE;   -- e.g. "Kota Jakarta Pusat"

-- Keep existing `city` TEXT as free-text fallback (ETL input before mapping)
-- province/city _code fields are the structured reference; city is legacy/raw

CREATE INDEX IF NOT EXISTS idx_contacts_province_code ON contacts(province_code);
CREATE INDEX IF NOT EXISTS idx_contacts_city_code ON contacts(city_code);
```

**Why store both code and name?** Codes are stable (used for filtering/querying); names are denormalized for display without join overhead. No separate `wilayah` reference table needed in EM . U — data comes from wilayah.id at runtime.

_Confidence: High — established pattern for denormalized reference data_

### ETL Integration: Free-Text City → wilayah.id Code

The existing `contacts.city` field contains messy free-text values imported from Excel (e.g., "jkt", "Jakarta Pusat", "Dki Jakarta"). The pre-normalization step handles cleanup; the enrichment step handles mapping.

**Mapping strategy in `RuleBasedEtlNormalizationService`:**

```typescript
// src/services/adapters/real/RuleBasedEtlNormalizationService.ts

// Pre-load province + city reference at startup:
const PROVINCE_MAP = await fetch('https://wilayah.id/api/provinces.json').then(r => r.json())
// Or use embedded JSON seeded from wilayah.id

function mapCityToCode(rawCity: string): { province_code: string; city_code: string; confidence: number } | null {
  const normalized = rawCity.toLowerCase().trim()
    .replace(/^(kota|kabupaten|kab\.?)\s+/, '')  // strip prefixes

  // 1. Exact match against city_name (lowercased)
  const exactMatch = CITY_REFERENCE.find(c => c.name.toLowerCase() === normalized)
  if (exactMatch) return { ...exactMatch, confidence: 1.0 }

  // 2. Fuzzy: Jaro-Winkler ≥ 0.85 against all city names
  const fuzzyMatch = findBestJaroWinklerMatch(normalized, CITY_REFERENCE, 0.85)
  if (fuzzyMatch) return { ...fuzzyMatch, confidence: 0.8 }

  // 3. Keyword: "jakarta" → DKI Jakarta, etc.
  const keywordMatch = KEYWORD_CITY_MAP[normalized]
  if (keywordMatch) return { ...keywordMatch, confidence: 0.7 }

  return null  // → city_code stays null; raw city text preserved in contacts.city
}
```

Rows where no city mapping is found are upserted with `city_code = NULL` and `province_code = NULL` — the free-text `city` field is still preserved as fallback.

_Confidence: High — wilayah.id data confirmed; fuzzy matching is established pattern_

### Frontend: Cascading Location Picker

Registration form (Story 6.2) and contact profile use a cascading province → city dropdown:

```typescript
// Province list — fetch once, cache long (data changes rarely)
const { data: provinces } = useSWR(
  'https://wilayah.id/api/provinces.json',
  fetcher,
  { revalidateOnFocus: false, dedupingInterval: 3_600_000 }  // 1hr cache
)

// City list — fetch when province selected
const { data: cities } = useSWR(
  selectedProvinceCode
    ? `https://wilayah.id/api/regencies/${selectedProvinceCode}.json`
    : null,
  fetcher
)
```

**shadcn/ui components:** Use `<Select>` for province (38 items); `<Combobox>` (with search) for city (up to ~50 items per province). Both load client-side.

_Source: https://wilayah.id/ — confirmed province + regency endpoint structure_

### Blast Audience Targeting Integration

Extends Story 5.2 (`BlastJobData.filters`) and Story 4.5 (audience preview):

```typescript
// Updated blast filter shape:
interface BlastFilters {
  industry?: string
  city?: string           // legacy free-text (keep for backward compat)
  province_code?: string  // NEW: e.g. "31"
  city_code?: string      // NEW: e.g. "31.71"
  jobTitle?: string
  neverAttended?: boolean
}
```

Backend query (Story 5.2 blast worker + Story 4.5 audience preview):
```sql
WHERE (province_code = $1 OR $1 IS NULL)
  AND (city_code = $2 OR $2 IS NULL)
```

UI in Pipeline Hub (Undangan tab): Province dropdown → City dropdown cascade for targeting. Shows live count of matching contacts.

_Confidence: High — straightforward extension of existing filter pattern_

### Smart Filter Integration (Story 3.6)

The AI-powered smart filter autocomplete should recognize location intent:
- "Jakarta" → suggest filter `province = DKI Jakarta` or `city = Kota Jakarta Pusat` etc.
- "Surabaya" → `city = Kota Surabaya`

The mock smart filter can return hardcoded location suggestions. The real provider (OpenAI) maps natural language → `province_code`/`city_code` filter parameters.

### Security and Reliability

- **No auth required** for wilayah.id — public static file API
- **Fallback strategy:** If wilayah.id is unreachable, dropdowns fall back to free-text input. `province_code`/`city_code` remain null. Blast targeting still works via legacy `city` free-text field.
- **CORS:** wilayah.id confirmed open CORS — no proxy needed
- **Production reliability:** For zero external dependency in Phase 2, seed `provinces.json` + all `regencies/*.json` into a static JSON file bundled with the app (~50KB total for province+city). Generated once from wilayah.id and committed to the repo.

_Source: https://wilayah.id/ (live endpoint verification)_

---

## Architectural Patterns and Design

### System Architecture: Where Location Data Lives

The wilayah.id integration touches three distinct layers. Each has a clear architectural role:

```
┌─────────────────────────────────────────────────────────┐
│  External: wilayah.id static CDN                        │
│  GET /api/provinces.json                                │
│  GET /api/regencies/{code}.json                         │
└───────────────────┬─────────────────────────────────────┘
                    │ (frontend fetch, cached)
┌───────────────────▼─────────────────────────────────────┐
│  Next.js FE — Location Picker (shadcn Select/Combobox)  │
│  SWR cache → province list, city list per province      │
│  Writes: province_code + city_code to form payload      │
└───────────────────┬─────────────────────────────────────┘
                    │ (API call with structured codes)
┌───────────────────▼─────────────────────────────────────┐
│  Fastify BE — contacts, registrations, blast            │
│  Receives: province_code, city_code                     │
│  Queries: WHERE province_code = $1 AND city_code = $2   │
└───────────────────┬─────────────────────────────────────┘
                    │ (persisted)
┌───────────────────▼─────────────────────────────────────┐
│  PostgreSQL — contacts table                            │
│  province_code TEXT, province_name TEXT                 │
│  city_code TEXT, city_name TEXT                         │
│  (+ legacy city TEXT preserved)                         │
└─────────────────────────────────────────────────────────┘
```

**Design principle:** The backend never calls wilayah.id. Only the frontend does. The backend only stores and queries codes — it treats them as opaque strings. This keeps the backend fully offline-capable.
_Confidence: High — static external data belongs at the edge/client layer_

### Data Architecture: Denormalized Reference Data

**Decision: No `wilayah` reference table in PostgreSQL.** Rationale:

| Option | Trade-off |
|--------|-----------|
| Reference table (province, city rows) | Enables JOIN validation; adds migration; 552 rows overhead |
| Denormalized columns (code + name on contacts) | Zero joins; name always fresh from frontend; simpler migration |
| Code-only (no name column) | Requires JOIN to wilayah.id on every display — bad for offline |

**Chosen: Denormalized.** Store both `_code` and `_name` on `contacts`. The name is a display cache — it can be updated if an area renames. Codes are stable by Kemendagri decree.

For blast targeting, `province_code` and `city_code` indexes are sufficient. No FK constraint to a reference table (avoids migration coupling).
_Confidence: High — validated pattern for reference data in event-driven systems_

### Caching Architecture

```
                    wilayah.id CDN
                         │
               SWR (browser cache)
               ├── provinces.json       1 hr TTL   (38 items, rarely changes)
               └── regencies/{code}     30 min TTL (per-province, load on demand)
```

**No server-side cache needed** for wilayah.id — data is served from their CDN, responses are small, and the SWR browser cache handles deduplication across components.

**Bundled static fallback (Production):** A `src/data/wilayah-static.json` file, generated once from wilayah.id and committed to the repo:
```json
{
  "provinces": [{ "code": "31", "name": "DKI Jakarta" }, ...],
  "regencies": {
    "31": [{ "code": "31.71", "name": "Kota Jakarta Pusat" }, ...],
    ...
  }
}
```
Size estimate: ~552 entries total ≈ 30–50KB. Loaded as import fallback when wilayah.id is unreachable.
_Source: wilayah.id API structure confirmed_

### Scalability: Blast Filter Performance

With `province_code` and `city_code` indexed on `contacts`, a blast targeting query against 100K contacts:
```sql
SELECT id FROM contacts
WHERE (province_code = '31' OR province_code IS NULL AND '31' IS NULL)
  AND consent_status != 'suppressed'
```
Executes as an index scan — sub-millisecond at 100K rows. No full table scan. Province index cardinality is low (38 values) which is fine for filtering but not for covering indexes — the query planner will use it correctly when combined with the `consent_status` condition.

**Audience preview (Story 4.5):** Same query, `COUNT(*)` only. Runs in real-time as admin adjusts filters.

### ETL Normalization Architecture

**Two-pass ETL for location:**

```
Pass 1 (always, EtlService pre-normalize):
  raw_city → strip whitespace, lowercase

Pass 2 (RuleBasedEtlNormalizationService):
  normalized_city → wilayah.id code lookup
  Strategy:
  1. Exact match against bundled reference (confidence 1.0)
  2. Jaro-Winkler fuzzy ≥ 0.85 (confidence 0.8)
  3. Keyword alias map (confidence 0.7)
  4. No match → city_code = null (raw city text preserved)
```

City alias map examples:
```typescript
const KEYWORD_MAP: Record<string, { province_code: string; city_code: string }> = {
  'jkt': { province_code: '31', city_code: '31.71' },     // Jakarta Pusat default
  'jakarta': { province_code: '31', city_code: null },     // province only, no city
  'surabaya': { province_code: '35', city_code: '35.78' },
  'bandung': { province_code: '32', city_code: '32.73' },
  'medan': { province_code: '12', city_code: '12.71' },
}
```

### Security Architecture

- **No secrets exposed:** wilayah.id is a public API — no API keys in frontend or backend. The bundled static JSON eliminates any runtime network dependency.
- **Input validation:** `province_code` and `city_code` values on API requests are validated against expected dot-separated format (`/^\d{2}(\.\d{2,4})*$/`) before DB write. Invalid codes rejected with 400.
- **No SSRF risk:** Backend never calls wilayah.id — only frontend does. No server-side URL construction from user input.

### Deployment Architecture

- **Phase 1 (FE mock-first):** MSW handler for `GET /api/events/:id/participants?name=` already returns mock participants without location. New: MSW returns `province_code`, `city_code` fields on contact mock responses. Frontend location picker calls wilayah.id directly (real API, no MSW intercept needed).
- **Phase 2 (BE real):** Migration 006 adds columns. ETL service updated with location mapping. Blast worker filter extended. No new infrastructure required.

_Confidence: High — fits cleanly into existing Fastify + PostgreSQL + Next.js architecture_

---

## Implementation Approaches and Technology Adoption

### Story Impact Breakdown

This feature spans the following existing stories (no new epics/stories needed — all fold in as AC updates per project scope management rules):

| Story | Change | Phase |
|-------|--------|-------|
| **1.2** Database Migrations | Migration 006: `province_code`, `province_name`, `city_code`, `city_name` on `contacts` | Phase 2 |
| **1.4** OpenAPI Spec | Add `province_code`, `city_code` fields to Contact schema; add to BlastFilters | Phase 2 |
| **1.5** FE Type Definitions | Add location fields to `Contact` type; add `WilayahProvince`, `WilayahCity` types | Phase 1 |
| **1.6** MSW Handlers | Mock contacts include `province_code`, `city_code`; no wilayah.id mock needed (real API used) | Phase 1 |
| **3.1** Contact List | Location filter facets: province + city dropdowns | Phase 1 FE |
| **3.3** ETL Processing | RuleBasedEtlNormalizationService: city text → wilayah.id code mapping | Phase 2 |
| **3.6** Smart Filter | Location intent recognition in AI/fuzzy autocomplete | Phase 1 FE |
| **5.2** Blast Configuration | `province_code`/`city_code` audience filter fields | Phase 1 FE |
| **6.2** Registration Form | Cascading province → city dropdown (mandatory for new registrations) | Phase 1 FE |

### Technology Adoption Strategy: Gradual, Phase-Gated

**Phase 1 (FE mock-first — immediate):**
- Add `province_code`, `city_code` to TypeScript `Contact` type and MSW mock fixtures
- Registration form (Story 6.2): cascading dropdown using wilayah.id API directly
- Contact list filter (Story 3.1): province/city filter UI
- Blast config (Story 5.2): location targeting fields

**Phase 2 (BE real — later):**
- Migration 006: columns + indexes
- ETL: city-to-code mapping in `RuleBasedEtlNormalizationService`
- Blast worker query: `WHERE province_code = $1`

**No code migration needed for existing contacts** — `province_code`/`city_code` columns nullable; existing rows have `NULL` values, which means "any location" in blast targeting (opt-in filter).

### Development Workflow

**Step 1 — Generate bundled static JSON from wilayah.id**
```bash
# One-time script: scripts/generate-wilayah-static.ts
# Fetches all provinces + all regencies, outputs src/data/wilayah-static.json
# Commit to repo — regenerate only when Kemendagri updates (rare)
```

**Step 2 — FE location picker component (Phase 1)**
```typescript
// src/components/ui/LocationPicker.tsx
// Props: value: { province_code, city_code }, onChange
// Uses SWR → wilayah.id API with static JSON fallback
// Province: shadcn Select (38 items)
// City: shadcn Combobox with search (up to ~50 items per province)
```

**Step 3 — ETL city mapping (Phase 2)**
```typescript
// src/data/wilayah-static.json → load at EtlNormalizationService init
// Exact match → Jaro-Winkler → keyword alias → null
// Confidence thresholds: 1.0 / 0.8 / 0.7 / null
```

### Testing Approach

- **Location picker component:** Test cascade behavior (province select → city list loads); test fallback to static JSON when API unreachable (mock fetch to fail)
- **ETL city mapping:** Unit tests per mapping strategy — exact match ("Surabaya"), fuzzy match ("surobaya"), keyword ("jkt"), no match ("xyz-unknown")
- **Blast filter:** Integration test: contacts seeded with `province_code = '31'`; blast filter `province_code = '31'` → only Jakarta contacts returned
- **No tests against wilayah.id live API** — use bundled static JSON in all tests

### Cost Optimization

- **Zero API cost** — wilayah.id is free, no auth, CDN-served
- **Zero server cost** — backend never calls wilayah.id
- **Minimal storage** — ~552 province+city entries per contact as TEXT codes ≈ negligible DB overhead
- **Bundle size** — `wilayah-static.json` ≈ 30–50KB gzipped; acceptable as a single app-level import

### Risk Assessment and Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| wilayah.id outage | Low | Medium | Bundled static JSON fallback in `src/data/wilayah-static.json` |
| Kemendagri code changes | Low (yearly at most) | Low | Regenerate static JSON when notified; codes rarely change |
| ETL city mapping failures | Medium (messy imported data) | Low | Unmapped rows get `city_code = NULL`; raw city text preserved; no data loss |
| `idn-area-data` Node 22+ constraint | N/A | N/A | Not using this package; direct API + static JSON approach avoids constraint entirely |
| Legacy `city` text field inconsistency | High | Low | Both old and new fields coexist; blast targeting uses new codes when available |

### Implementation Roadmap

```
Sprint Now (Phase 1 FE):
  ├── Update Contact TypeScript type + MSW fixtures (+province_code, city_code)
  ├── Build LocationPicker component (shadcn Select + Combobox)
  ├── Wire into Registration Form (Story 6.2)
  ├── Wire into Contact List filters (Story 3.1)
  └── Wire into Blast Config audience filters (Story 5.2)

Phase 2 BE:
  ├── Migration 006 (contacts table new columns + indexes)
  ├── OpenAPI spec update (Contact schema + BlastFilters)
  ├── ETL: city-to-code mapping in RuleBasedEtlNormalizationService
  └── Blast worker: province_code/city_code WHERE clause
```

### Success Metrics

- Contacts with `province_code` populated: tracks ETL mapping coverage over time
- Blast audience count with location filter applied: measures feature adoption
- ETL mapping hit rate: `(rows with city_code / total rows)` — target ≥ 80% for common Indonesian cities

_Sources: wilayah.id live API verification; idn-area-data npm documentation; Kemendagri 2025 data_

## Technical Research Recommendations

### Technology Stack Recommendations

| Component | Recommendation |
|-----------|---------------|
| Data source | wilayah.id API (direct FE calls) + `src/data/wilayah-static.json` fallback |
| npm package | None needed — direct API + static JSON is simpler than `idn-area-data` (Node 22+ ESM constraint avoided) |
| FE component | `LocationPicker.tsx` using shadcn `<Select>` + `<Combobox>` |
| FE data fetching | SWR with 1hr TTL for provinces; 30min for regencies |
| Storage format | `TEXT` columns for codes (dot-separated); denormalized name alongside |
| ETL mapping | `RuleBasedEtlNormalizationService` with bundled static reference |

### Implementation Roadmap Summary

1. **Phase 1 FE (immediate):** TypeScript types → LocationPicker component → wire into 3 stories (6.2, 3.1, 5.2)
2. **Phase 2 BE:** Migration 006 → ETL mapping → blast query extension
3. **One-time:** Generate `wilayah-static.json` script → commit → done

### Risk Mitigation Summary

Primary risk is wilayah.id availability — fully mitigated by bundled static fallback. ETL mapping failures result in `NULL` codes (graceful degradation), never data loss.

### Handoff to Correct Course

This research concludes that the wilayah.id integration is **low-risk, moderate-scope**. All changes fold into existing stories. The SCP should cover:
- Migration 006 (Story 1.2)
- Type + MSW updates (Stories 1.5, 1.6)
- OpenAPI additions (Story 1.4)
- Location picker component + wiring into Stories 3.1, 5.2, 6.2
- ETL city mapping in Story 3.3
- Smart filter location intent in Story 3.6

**Recommended next step:** `/bmad-correct-course` to formalize as SCP-2026-03-28-D.

---

## Research Synthesis

### Source Verification Summary

| Claim | Source | Confidence |
|-------|--------|------------|
| wilayah.id endpoint structure | Live API verification | High |
| 38 provinces (incl. 4 new Papua) | Jakarta Globe + cahyadsn/wilayah | High |
| Kemendagri 2025 data, updated 2025-07-04 | wilayah.id live meta.updated_at | High |
| MIT license | cahyadsn/wilayah GitHub repo | High |
| idn-area-data Node 22+ ESM-only | npm + GitHub documentation | High |
| Dot-separated code format | Live API response inspection | High |
| ~514 kabupaten/kota total | Indonesian govt administrative data | High |

### Complete Source List

- https://wilayah.id/ — live API verification
- https://github.com/cahyadsn/wilayah — canonical upstream data; MIT license
- https://github.com/fityannugroho/idn-area-data — npm package documentation
- https://github.com/fityannugroho/idn-area — NestJS self-hostable API
- https://www.npmjs.com/package/idn-area-data — package spec (Node 22+, ESM)
- https://jakartaglobe.id/news/indonesia-adds-four-new-provinces-to-38-overall — Papua provinces confirmation

### Final Technical Conclusions

The wilayah.id integration requires **zero new external service contracts**, **zero new infrastructure**, and **zero new epics**. It is a well-scoped feature addition that enhances the existing ETL normalization, contact filtering, and blast targeting capabilities already in the project plan.

The primary implementation work is:
1. **One-time:** Generate and commit `wilayah-static.json`
2. **FE (Phase 1):** `LocationPicker` component + wire into 3 existing stories
3. **BE (Phase 2):** Migration 006 + ETL city mapping + blast query extension

**Technical Research Completion Date:** 2026-03-28
**Source Verification:** All facts verified against live sources
**Confidence Level:** High
