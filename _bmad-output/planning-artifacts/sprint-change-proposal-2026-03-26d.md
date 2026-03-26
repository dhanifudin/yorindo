# Sprint Change Proposal — 2026-03-26 (D)

**Trigger:** Architectural decisions on primary key strategy, database engine, and Phase 1 storage contract
**Scope:** Foundational (cross-cutting — affects BE scaffold stories and schema)
**Status:** Approved (Incremental review completed 2026-03-26)

---

## Section 1: Issue Summary

Three related architectural decisions with cascading impact on foundation stories:

1. **CUID2 as primary key strategy** — All primary keys use CUID2 (`@paralleldrive/cuid2`, `createId()`), generated application-side. DB columns are `TEXT PRIMARY KEY` (no `gen_random_uuid()`, no `SERIAL`). Chosen over UUID4 for sortability, collision resistance without DB coordination, and better readability in logs.

2. **PostgreSQL only — MongoDB removed entirely** — MongoDB is removed from the stack. Document-style storage needs (survey schemas, raw upload logs, template bodies) are handled by PostgreSQL JSONB columns. No `mongodb` npm package, no `mongodb.ts` singleton, no `mongo` container in docker-compose.

3. **Phase 1 memory-first contract explicitly documented** — Architecture now has a formal cross-cutting concern (#16) defining the Phase 1 invariants: `REPOSITORY_IMPL=memory`, `SERVICE_IMPL=mock`, MSW mocks on FE, Zustand in-memory state. Prevents accidental real-DB wiring in Phase 1 stories.

---

## Section 2: Impact Analysis

### Story Status Changes

| Story | Was | Now | Change |
|-------|-----|-----|--------|
| 1-1-backend-repository-scaffold-docker-compose | `review` | `ready-for-dev` | Remove MongoDB container, driver, singleton; update npm install; update docker-compose service list |
| 1-2-database-schema-migrations | `review` | `ready-for-dev` | All PKs: `TEXT PRIMARY KEY` (CUID2); remove `pgcrypto`; add `raw_uploads` table; `survey_schema_id TEXT` → `survey_schema JSONB` |
| 1-7-cicd-pipeline | `review` | `ready-for-dev` | Remove mongodb service from docker-compose snippets; remove `MONGODB_URL` from .env example |
| 1-8-service-adapter-scaffold-in-memory-repository-scaffold | `review` | `ready-for-dev` | Update `ISurveyRepository` description — PostgreSQL JSONB shape, not MongoDB shape |
| 3-3-etl-processing-ai-normalization-database-upsert | `review` | `ready-for-dev` | `raw_uploads` MongoDB collection → PostgreSQL table; `IRawUploadsRepository` added |
| 4-4-survey-template-builder | `ready-for-dev` | `ready-for-dev` | Survey storage: MongoDB `survey_schemas` collection → `events.survey_schema JSONB` column (already at ready-for-dev) |

### Artifacts Updated

| Artifact | Change |
|----------|--------|
| `architecture.md` | Tech constraint #8: UUID → CUID2; concern #10: Hybrid DB join → JSONB storage; concern #11: UUID → CUID2 serialization; concern #16 (new): Phase 1 memory-first contract; scaffold commands updated |
| `docker-compose.yml` | Removed `mongodb` service and `mongo_data` volume |
| `yorindo-api/.env.example` | Removed `MONGODB_URL` |
| `epics/epic-4-event-configuration-management.md` | Story 4.4: `events.survey_schema JSONB` (was MongoDB collection) |
| `implementation-artifacts/1-1-*.md` | Removed mongodb refs; updated to 5 containers, removed mongodb.ts singleton |
| `implementation-artifacts/1-2-*.md` | CUID2 PKs everywhere; added raw_uploads table; survey_schema JSONB |
| `implementation-artifacts/1-7-*.md` | docker-compose snippets updated; removed mongodb service and MONGODB_URL |
| `implementation-artifacts/1-8-*.md` | ISurveyRepository labeled PostgreSQL JSONB (not MongoDB shape) |
| `implementation-artifacts/3-3-*.md` | raw_uploads as PostgreSQL table; IRawUploadsRepository |
| `sprint-status.yaml` | 5 stories reset to `ready-for-dev` |

### Technical Impact

- **MongoDB removed from stack** — no `mongodb` npm package, no `mongo:7` container, no `MONGODB_URL` env var
- **CUID2 string IDs** — all FK columns change from `UUID REFERENCES` to `TEXT REFERENCES`; no DB extension needed for PK generation
- **raw_uploads table** — new PostgreSQL table in Migration 003; replaces MongoDB `raw_uploads` collection
- **Phase 1 unaffected** — in-memory repos already use string IDs; CUID2 is a drop-in replacement for UUID strings

---

## Section 3: Recommended Approach

**Option 1 — Direct Adjustment** (selected). All affected stories were in `review`, not `done`. No rollback required. Changes clarify the correct approach before any BE implementation begins.

**Effort:** Low-Medium
- Foundation stories (1.1, 1.2, 1.7, 1.8): Remove MongoDB references, update types
- Story 3.3: Update raw_uploads to PostgreSQL row shape

**Risk:** Low — CUID2 strings are backward-compatible with any field typed `string`. No FE changes required.

---

## Section 4: Detailed Change Proposals (all applied)

### Architecture — CUID2 Primary Keys (updated cross-cutting concern #8)

All tables use `id TEXT PRIMARY KEY`. Application generates IDs with:
```typescript
import { createId } from '@paralleldrive/cuid2'
const id = createId() // e.g. 'clh3z2p0k0000356j5r9e4x7b'
```
No `gen_random_uuid()`. No `pgcrypto` extension. FK columns: `TEXT REFERENCES table(id)`.

### Architecture — JSONB for document storage (cross-cutting concern #10)

| Field | Table | Was | Now |
|-------|-------|-----|-----|
| Survey schema | `events.survey_schema` | MongoDB `survey_schemas` | `JSONB { schema, uiSchema }` |
| ETL upload log | `raw_uploads` (new table) | MongoDB `raw_uploads` | PostgreSQL table |
| Template body | `notification_templates.body` | (JSONB, unchanged) | JSONB (confirmed) |

### Architecture — Phase 1 Memory Contract (new cross-cutting concern #16)

Phase 1 invariants (enforced via env vars):
- `REPOSITORY_IMPL=memory` → all repositories use `InMemory*` implementations
- `SERVICE_IMPL=mock` → all service adapters use `Mock*` implementations
- FE: MSW intercepts all API calls; no real network requests in Phase 1
- No real DB connections started in Phase 1 (lazy singleton pattern)

---

## Section 5: Implementation Handoff

**Scope: Low-Medium** — foundation story reworks, no new features

### Dev Team Tasks

1. **Stories 1.1, 1.7** — Remove MongoDB from docker-compose; remove `mongodb` driver from npm; remove `src/lib/mongodb.ts`; update `src/config/index.ts` to remove `mongodbUrl`
2. **Story 1.2** — Change all PK definitions: `UUID PRIMARY KEY DEFAULT gen_random_uuid()` → `TEXT PRIMARY KEY`; all FK columns: `UUID REFERENCES` → `TEXT REFERENCES`; add `raw_uploads` table to Migration 003; add `survey_schema JSONB` column to `events` table
3. **Story 1.8** — Update `ISurveyRepository` interface and `InMemorySurveyRepository` to use JSONB shape (store in `events` map, not separate collection)
4. **Story 3.3** — Update `raw_uploads` write to use `IRawUploadsRepository.create()` (PostgreSQL insert)
5. **Story 4.4** — Survey save endpoint writes to `events.survey_schema JSONB` (no separate collection)

### Success Criteria
- [ ] No `mongodb`, `mongoose`, or MongoDB driver anywhere in codebase
- [ ] No `mongo:7` container in any docker-compose file
- [ ] All table PKs are `TEXT PRIMARY KEY` (not `UUID DEFAULT gen_random_uuid()`)
- [ ] `createId()` from `@paralleldrive/cuid2` used wherever IDs are generated
- [ ] `raw_uploads` table exists in Migration 003 schema
- [ ] `events.survey_schema JSONB` column exists in Migration 001 schema
- [ ] All stories pass `bmad-code-review`
