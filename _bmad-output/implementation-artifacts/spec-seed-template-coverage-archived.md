---
title: 'Seed — Full Template Coverage + Per-Event MSW Report Profiles'
type: 'chore'
created: '2026-04-08'
status: 'draft'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Templates are only partially seeded (4 of 10 type×channel combos) and the type enum is inconsistent across `domain.ts`, `templates.routes.ts`, OpenAPI, and MSW — `cancellation` and `ticket_delivery` each appear in only some layers. The MSW report handler returns the same hardcoded numbers for every event, making the Laporan tab useless for demo differentiation.

**Approach:** Unify the type enum to `[invitation, confirmation, rejection, ticket_delivery, cancellation]` across all layers; seed all 10 type×channel templates; enrich the MSW report handler to return deterministic per-event profile data (hash of event ID selects one of 4 realistic attendance scenarios).

## Boundaries & Constraints

**Always:**
- Canonical type list: `invitation | confirmation | rejection | ticket_delivery | cancellation` (5 types × 2 channels = 10 templates).
- Template bodies: WhatsApp uses `*bold*` / `_italic_` format; email uses HTML.
- `cancellation/whatsapp` and `cancellation/email` bodies describe event or registration cancellation, not duplicate existing types.
- MSW report profiles are deterministic per event ID (same ID always yields the same profile) — use `id.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % 4` to pick profile index.
- Seed validation check in `seed-demo.ts` must be updated: templates count ≥ 10.
- `reminder` type in current `seed-demo.ts` template data is invalid — replace it with a valid type (`cancellation/whatsapp`).

**Ask First:**
- None anticipated.

**Never:**
- Do not add a real backend `/api/events/:id/report` endpoint — that is Epic 8 scope.
- Do not change the PostgreSQL DB schema or migration files.
- Do not alter MSW handlers for any route other than `/api/templates` (initial seed) and `/api/events/:id/report`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| GET /api/templates (backend) | InMemoryTemplateRepository seeds | Returns all 10 templates, all type/channel combos present | — |
| POST /api/templates with type=cancellation | Valid body | 201 created, passes Zod + OpenAPI validation | Zod rejects unknown types |
| GET /api/events/:id/report (MSW) | Any event ID | Returns profile deterministically keyed to ID hash (0–3) | — |
| Same event ID called twice | Identical ID | Identical report profile returned both times | — |

</frozen-after-approval>

## Code Map

- `yorindo-api/src/data/templates.ts` — `TemplateType` enum + seeded template array (source of truth for static data)
- `yorindo-api/src/types/domain.ts:338` — `TemplateType` domain union (add `cancellation`)
- `yorindo-api/src/routes/templates.routes.ts:53,101` — Zod enums for create + update (add `cancellation`)
- `yorindo-api/src/repositories/memory/TemplateRepository.ts:14` — in-memory seed (expand to 10 templates)
- `yorindo-api/openapi.yaml:1238,1264` — Template response enum + CreateTemplateBody enum (add missing values)
- `yorindo-api/scripts/seed-demo.ts:440` — templateData array (expand to 10; fix `reminder` type; update validation count)
- `yorindo-app/src/mocks/handlers/templates.ts:7` — Template interface + initial store (add `ticket_delivery`; seed all 10)
- `yorindo-app/src/mocks/handlers/reports.ts:3` — mockReport (replace with per-event profiles + hash selection)

## Tasks & Acceptance

**Execution:**
- [ ] `yorindo-api/src/data/templates.ts` — ADD `ticket_delivery` to `TemplateType`; ADD 6 missing templates (`confirmation/whatsapp`, `rejection/whatsapp`, `ticket_delivery/whatsapp`, `cancellation/email`, `cancellation/whatsapp`); UPDATE IDs to `tmpl-001`…`tmpl-010`
- [ ] `yorindo-api/src/types/domain.ts` — ADD `cancellation` to `TemplateType` union
- [ ] `yorindo-api/src/routes/templates.routes.ts` — ADD `cancellation` to Zod enum in `createSchema` and `updateSchema`
- [ ] `yorindo-api/src/repositories/memory/TemplateRepository.ts` — ADD 6 missing templates to `seed()` (matching `tmpl-005`…`tmpl-010`)
- [ ] `yorindo-api/openapi.yaml` — Template response (line 1238): ADD `cancellation`; CreateTemplateBody (line 1264): ADD `ticket_delivery`
- [ ] `yorindo-api/scripts/seed-demo.ts` — REPLACE `reminder/whatsapp` with `cancellation/whatsapp`; ADD 4 missing templates (`confirmation/whatsapp`, `rejection/whatsapp`, `ticket_delivery/whatsapp`, `cancellation/email`); UPDATE validation check to `c >= 10`
- [ ] `yorindo-app/src/mocks/handlers/templates.ts` — ADD `ticket_delivery` to `type` union; ADD all 10 templates to `templatesStore`
- [ ] `yorindo-app/src/mocks/handlers/reports.ts` — REPLACE single `mockReport` with 4 event-profile objects; ADD hash function; RETURN `REPORT_PROFILES[hashId(params.id as string)]`

**Acceptance Criteria:**
- Given `GET /api/templates` is called on the backend, then all 10 templates (5 types × 2 channels) are returned with no type validation errors.
- Given `POST /api/templates` with `type: 'cancellation'`, then the backend accepts it (Zod + OpenAPI pass) and returns 201.
- Given `GET /api/events/:id/report` is called via MSW twice with the same event ID, then both calls return identical data.
- Given four different event IDs are used, then at least 2 distinct report profiles appear across them.
- Given the demo seed runs, then the validation check reports ≥ 10 templates.

## Design Notes

**4 MSW report profiles:**
```ts
const REPORT_PROFILES = [
  { // Small — local meetup
    totalInvited: 80, registered: 55, approved: 42, attended: 35,
    attendanceRate: '83.3', noShowRate: '16.7',
    industryBreakdown: [{ industry: 'teknologi', count: 20 }, { industry: 'keuangan', count: 10 }, { industry: 'kesehatan', count: 5 }],
    cityBreakdown: [{ city: 'Jakarta', count: 25 }, { city: 'Bandung', count: 10 }],
    jobTitleBreakdown: [{ level: 'Manager', count: 15 }, { level: 'Staff', count: 12 }, { level: 'Director', count: 8 }],
  },
  { // Medium — workshop
    totalInvited: 300, registered: 150, approved: 110, attended: 85,
    attendanceRate: '77.3', noShowRate: '22.7',
    industryBreakdown: [{ industry: 'manufaktur', count: 35 }, { industry: 'teknologi', count: 28 }, { industry: 'retail', count: 15 }, { industry: 'keuangan', count: 7 }],
    cityBreakdown: [{ city: 'Jakarta', count: 55 }, { city: 'Surabaya', count: 20 }, { city: 'Bandung', count: 10 }],
    jobTitleBreakdown: [{ level: 'Manager', count: 30 }, { level: 'Director', count: 25 }, { level: 'Staff', count: 20 }, { level: 'C-Level', count: 10 }],
  },
  { // Large — conference
    totalInvited: 2000, registered: 450, approved: 310, attended: 248,
    attendanceRate: '80.0', noShowRate: '20.0',
    industryBreakdown: [{ industry: 'teknologi', count: 90 }, { industry: 'keuangan', count: 60 }, { industry: 'kesehatan', count: 45 }, { industry: 'manufaktur', count: 30 }, { industry: 'pendidikan', count: 23 }],
    cityBreakdown: [{ city: 'Jakarta', count: 150 }, { city: 'Surabaya', count: 50 }, { city: 'Bandung', count: 30 }, { city: 'Medan', count: 18 }],
    jobTitleBreakdown: [{ level: 'C-Level', count: 40 }, { level: 'Director', count: 75 }, { level: 'Manager', count: 90 }, { level: 'Staff', count: 43 }],
  },
  { // Archive — historical large event
    totalInvited: 1200, registered: 320, approved: 240, attended: 195,
    attendanceRate: '81.3', noShowRate: '18.8',
    industryBreakdown: [{ industry: 'retail', count: 70 }, { industry: 'teknologi', count: 55 }, { industry: 'keuangan', count: 40 }, { industry: 'kesehatan', count: 30 }],
    cityBreakdown: [{ city: 'Jakarta', count: 110 }, { city: 'Yogyakarta', count: 40 }, { city: 'Semarang', count: 25 }, { city: 'Denpasar', count: 20 }],
    jobTitleBreakdown: [{ level: 'Manager', count: 80 }, { level: 'Director', count: 60 }, { level: 'Staff', count: 35 }, { level: 'C-Level', count: 20 }],
  },
]

function hashId(id: string): number {
  return id.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % 4
}
```

## Verification

**Commands:**
- `docker compose -f docker-compose.dev.yml exec -T api npm run lint` — expected: no errors
- `docker compose -f docker-compose.dev.yml exec -T app npm run lint` — expected: no errors
- `make reset-dev` — expected: all validation checks pass, templates count ≥ 10
