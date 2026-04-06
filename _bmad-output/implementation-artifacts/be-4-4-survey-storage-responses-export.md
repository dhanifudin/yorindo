# Story BE-4.4: Survey Storage, Response Aggregation & Export (Phase 2 Backend)

## Story

**As an** admin,
**I want** the backend to store dual survey schemas (registration + post-event) per event, aggregate participant responses with per-question breakdowns, and export responses to XLSX,
**So that** the frontend survey builder and response dashboard have real persisted data and analytics.

## Status

ready-for-dev

## Context

This is the **Phase 2 Backend** implementation supporting Story 4.4 (Survey Template Builder & Response Dashboard). The frontend story (4.4) is already built against MSW mocks — this story replaces those mocks with real PostgreSQL-backed endpoints.

**Current state:** The backend already has a single survey endpoint (`GET/PUT /api/events/:id/survey`) that stores one survey schema per event using a legacy `fields` array format. The `ISurveyRepository` interface and `InMemorySurveyRepository` exist with basic CRUD.

**What this story adds:**
1. **Dual survey type support** — split the single survey endpoint into `registration` and `post-event` types, stored as separate JSONB columns on the `events` table
2. **Response aggregation** — `GET /api/events/:id/survey/responses` returns pre-computed per-question breakdowns (bar chart data, averages, text samples)
3. **XLSX export** — `GET /api/events/:id/survey/responses/download` streams a real `.xlsx` file
4. **Zod schema validation** — validate incoming survey schemas before storing to prevent malformed JSONB

**Key architectural decisions:**
- Survey schemas stored as JSONB on `events` table: `registration_survey_schema JSONB`, `post_survey_schema JSONB`, `post_survey_enabled BOOLEAN`
- Survey responses stored in a new `survey_responses` table with `answers JSONB`
- Aggregation computed at query time (no materialized view — Phase 1 scale doesn't warrant it)
- XLSX generated via `exceljs` library (streaming API for memory efficiency)

## Acceptance Criteria

**AC1:** Given an admin calls `PUT /api/events/:id/survey/registration` with a valid `{ schema, uiSchema }`,
Then `events.registration_survey_schema` is updated; `200 OK` returns the saved schema; an `audit_log` entry is written with action `survey.registration.updated`

**AC2:** Given an admin calls `PUT /api/events/:id/survey/post-event` with a valid `{ schema, uiSchema }`,
Then `events.post_survey_schema` is updated AND `events.post_survey_enabled` is set to `true`; `200 OK` returns the saved schema

**AC3:** Given an admin calls `PATCH /api/events/:id` with `{ postSurveyEnabled: false }`,
Then `events.post_survey_enabled` is set to `false`; the `post_survey_schema` JSONB is preserved (not deleted)

**AC4:** Given a caller requests `GET /api/events/:id/survey/registration`,
Then it returns `{ schema, uiSchema }` from `events.registration_survey_schema`; if null, returns `{ schema: { type: 'object', properties: {} }, uiSchema: {} }`

**AC5:** Given a caller requests `GET /api/events/:id/survey/post-event`,
Then it returns `{ schema, uiSchema }` from `events.post_survey_schema`; if `post_survey_enabled` is false, returns `{ schema: { type: 'object', properties: {} }, uiSchema: {}, enabled: false }`

**AC6:** Given `PUT /api/events/:id/survey/:type` is called with an invalid schema (missing `type: 'object'`, malformed `enum`, etc.),
Then it returns `400 Bad Request` with specific field-level Zod validation errors

**AC7:** Given `GET /api/events/:id/survey/responses?type=registration|post-event` is called,
Then it returns `{ total, aggregates: SurveyResponseAggregate[], responses: SurveyResponseRecord[] }` where:
- `aggregates` contains per-question breakdowns: `radio/select/checkboxes` → option counts + percentages; `range` → average + distribution; `text/textarea` → count + 3 sample snippets
- `responses` is paginated (`?page&pageSize`) with `search` filtering on contact name/phone
- Data is joined from `survey_responses` → `registrations` → `contacts`

**AC8:** Given `GET /api/events/:id/survey/responses/download?type=registration|post-event&format=xlsx` is called,
Then it streams a `.xlsx` file with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`; one row per respondent; column A = Name, B = Phone, C = Submitted At, D+ = one column per survey question label

**AC9:** Given a `viewer` role calls `GET /api/events/:id/survey/responses`,
Then it returns 200 (viewers have read access to survey responses)

**AC10:** Given a `participant` role calls any survey admin endpoint,
Then it returns `403 Forbidden` (participants cannot access survey admin data)

## Dev Notes

### Tech Stack

- **Fastify 4** — existing route plugin pattern
- **Zod** — schema validation for incoming survey schemas
- **node-postgres (pg)** — direct SQL with JSONB operators
- **exceljs** — XLSX generation (streaming workbook writer)
- **pino** — logging for export operations

### File Locations (in `yorindo-api/`)

```
src/
  routes/
    surveys.routes.ts                 ← NEW: dedicated survey routes (dual-type + responses + export)
  services/
    SurveyAggregationService.ts       ← NEW: computes aggregate breakdowns from raw responses
  tests/
    surveys.routes.test.ts            ← NEW: full route tests
    SurveyAggregationService.test.ts  ← NEW: aggregation logic tests
  types/
    domain.ts                         ← MODIFY: add SurveySchema fields, SurveyResponse type
  interfaces/
    repositories/
      ISurveyRepository.ts            ← MODIFY: add type parameter, response pagination
  repositories/
    memory/
      SurveyRepository.ts             ← MODIFY: support dual types, seed responses
    postgres/                         ← NEW (Phase 2): PostgresSurveyRepository.ts
  migrations/
    008_survey_responses_table.sql    ← NEW: migration for survey_responses table
```

### Architecture Constraints

1. **Repository pattern** — All DB access via `ISurveyRepository`. Route handlers call services; services call repositories. No direct `pool.query()` in routes.

2. **Dual survey type parameter** — The `type` parameter (`'registration' | 'post-event'`) routes to different JSONB columns. The repository interface must support this:
   ```typescript
   findByEventId(eventId: string, type: 'registration' | 'post-event'): Promise<SurveySchema | null>
   upsert(eventId: string, type: 'registration' | 'post-event', schema: SurveySchema): Promise<SurveySchema>
   ```

3. **Zod validation for survey schemas** — Validate the incoming `{ schema, uiSchema }` before storing:
   ```typescript
   const SurveySchemaInput = z.object({
     schema: z.object({
       type: z.literal('object'),
       properties: z.record(z.string(), z.any()),
     }),
     uiSchema: z.record(z.string(), z.any()).optional(),
   })
   ```
   This prevents malformed JSONB that would break rjsf rendering on the frontend.

4. **Response aggregation is service-layer logic** — The `SurveyAggregationService` takes raw `SurveyResponse[]` + the survey schema, and computes aggregates. It does NOT touch the database — it's a pure function service.

5. **XLSX export uses streaming** — For events with 500+ responses, loading all into memory is wasteful. Use `exceljs` streaming workbook writer:
   ```typescript
   const workbook = new ExcelJS.stream.xlsx.Writer(stream)
   const worksheet = workbook.addWorksheet('Responses')
   // stream rows one-by-one from DB cursor
   ```

6. **Route ordering** — In `surveys.routes.ts`, register static paths BEFORE dynamic `:type` paths:
   - `GET /api/events/:id/survey/responses` (static)
   - `GET /api/events/:id/survey/responses/download` (static)
   - `GET /api/events/:id/survey/:type` (dynamic — catches registration/post-event)

7. **RBAC** — Survey schema write endpoints require `admin`. Response read endpoints allow `admin` + `viewer`. Participant role is always denied.

### Database Migration

```sql
-- migrations/008_survey_responses_table.sql
CREATE TABLE IF NOT EXISTS survey_responses (
  id VARCHAR(24) PRIMARY KEY,
  event_id VARCHAR(24) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  registration_id VARCHAR(24) NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  survey_type VARCHAR(20) NOT NULL DEFAULT 'registration',  -- 'registration' | 'post-event'
  answers JSONB NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_survey_responses_event_type ON survey_responses(event_id, survey_type);
CREATE INDEX idx_survey_responses_registration ON survey_responses(registration_id);

-- Add dual survey columns to events table (if not already present)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS registration_survey_schema JSONB,
  ADD COLUMN IF NOT EXISTS post_survey_schema JSONB,
  ADD COLUMN IF NOT EXISTS post_survey_enabled BOOLEAN DEFAULT false;
```

### Key Code Patterns

**SurveyAggregationService — per-question breakdown:**
```typescript
class SurveyAggregationService {
  aggregate(
    responses: SurveyResponse[],
    schema: SurveySchema
  ): SurveyResponseAggregate[] {
    const aggregates: SurveyResponseAggregate[] = []

    for (const [fieldId, fieldSchema] of Object.entries(schema.schema.properties)) {
      const fieldType = this.inferFieldType(fieldSchema)

      if (fieldType === 'radio' || fieldType === 'select') {
        aggregates.push(this.aggregateSingleChoice(responses, fieldId, fieldSchema))
      } else if (fieldType === 'checkboxes') {
        aggregates.push(this.aggregateMultiChoice(responses, fieldId, fieldSchema))
      } else if (fieldType === 'range') {
        aggregates.push(this.aggregateRange(responses, fieldId, fieldSchema))
      } else if (fieldType === 'text' || fieldType === 'textarea') {
        aggregates.push(this.aggregateText(responses, fieldId))
      }
      // grid types handled similarly
    }

    return aggregates
  }

  private aggregateSingleChoice(responses, fieldId, fieldSchema) {
    const optionCounts: Record<string, number> = {}
    const total = responses.filter(r => r.answers[fieldId]).length

    for (const response of responses) {
      const val = response.answers[fieldId] as string
      if (val) optionCounts[val] = (optionCounts[val] || 0) + 1
    }

    return {
      questionId: fieldId,
      questionLabel: fieldSchema.title || fieldId,
      fieldType: 'radio',
      optionCounts: Object.entries(optionCounts).map(([label, count]) => ({
        label, count, percentage: total > 0 ? (count / total) * 100 : 0
      }))
    }
  }

  private aggregateRange(responses, fieldId, fieldSchema) {
    const values = responses
      .map(r => r.answers[fieldId] as number)
      .filter((v): v is number => typeof v === 'number')

    const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
    const distribution = this.countDistribution(values, fieldSchema.minimum, fieldSchema.maximum)

    return { questionId: fieldId, fieldType: 'range', average: avg, distribution }
  }

  private aggregateText(responses, fieldId) {
    const samples = responses
      .map(r => r.answers[fieldId] as string)
      .filter((v): v is string => typeof v === 'string' && v.length > 0)
      .slice(0, 3)  // top 3 samples

    return { questionId: fieldId, fieldType: 'text', totalCount: samples.length, samples }
  }
}
```

**XLSX export route handler:**
```typescript
fastify.get('/api/events/:id/survey/responses/download', { preHandler: [requireAuth] }, async (request, reply) => {
  const { id } = request.params
  const { type = 'registration' } = request.query as { type?: string }

  const event = await requireEventOr404(reply, id)
  if (!event) return

  const schema = await surveyRepository.findByEventId(id, type as SurveyType)
  const responses = await surveyRepository.getResponsesByEvent(id, type as SurveyType)

  reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  reply.header('Content-Disposition', `attachment; filename="survey-responses-${type}-${id}.xlsx"`)

  const workbook = new ExcelJS.stream.xlsx.Writer()
  const worksheet = workbook.addWorksheet('Responses')

  // Header row: Name, Phone, Submitted At, [question labels...]
  const headers = ['Name', 'Phone', 'Submitted At']
  if (schema) {
    for (const [fieldId, fieldSchema] of Object.entries(schema.schema.properties)) {
      headers.push(fieldSchema.title || fieldId)
    }
  }
  worksheet.addRow(headers)

  // Data rows
  for (const response of responses) {
    const contact = await contactRepository.findById(response.registration.contactId)
    const row = [contact?.name || 'Unknown', contact?.phone || '', response.submittedAt]
    if (schema) {
      for (const fieldId of Object.keys(schema.schema.properties)) {
        row.push(response.answers[fieldId] ?? '')
      }
    }
    worksheet.addRow(row)
  }

  await workbook.commit().pipe(reply.raw)
})
```

**MSW handler ordering (for reference — already in frontend story):**
```
PUT /api/events/:id/survey/registration    ← static
PUT /api/events/:id/survey/post-event      ← static
GET /api/events/:id/survey/responses       ← static (BEFORE :type)
GET /api/events/:id/survey/responses/download ← static (BEFORE :type)
GET /api/events/:id/survey/:type           ← dynamic (LAST)
```

### Test Requirements

- `PUT /api/events/:id/survey/registration` → saves schema, returns 200, audit log written
- `PUT /api/events/:id/survey/post-event` → saves schema + sets `post_survey_enabled = true`
- `PATCH /api/events/:id` with `{ postSurveyEnabled: false }` → toggles off, schema preserved
- `GET /api/events/:id/survey/registration` → returns saved schema; 404 if event not found
- Invalid schema payload → 400 with Zod validation errors
- `GET /api/events/:id/survey/responses` → returns aggregates + paginated responses
- Aggregation: radio question → correct option counts + percentages
- Aggregation: range question → correct average + distribution
- Aggregation: text question → 3 sample snippets
- `GET /api/events/:id/survey/responses/download` → returns valid xlsx stream
- RBAC: viewer can read responses; participant gets 403 on all survey endpoints

### Dependencies

- **Prerequisite:** Story 1.1 (repository scaffold), Story 1.2 (database schema migrations)
- **Prerequisite:** Story be-4-1 (event creation — events table exists)
- **Prerequisite:** Story 4.4 FE (frontend survey builder — this story provides the real backend)
- **New dependency:** `exceljs` — `npm install exceljs`

## Tasks / Subtasks

- [ ] **Task 1: Database migration**
  - [ ] Subtask 1.1: Create `008_survey_responses_table.sql` migration
  - [ ] Subtask 1.2: Add `registration_survey_schema`, `post_survey_schema`, `post_survey_enabled` columns to events table
  - [ ] Subtask 1.3: Run migration, verify indexes

- [ ] **Task 2: Update domain types**
  - [ ] Subtask 2.1: Extend `SurveySchema` interface with `schema` + `uiSchema` fields (keep backward compat with legacy `fields`)
  - [ ] Subtask 2.2: Add `SurveyResponse` interface with `answers: Record<string, unknown>`
  - [ ] Subtask 2.3: Add `SurveyType = 'registration' | 'post-event'` type alias

- [ ] **Task 3: Update ISurveyRepository interface**
  - [ ] Subtask 3.1: Add `type` parameter to `findByEventId(eventId, type)`
  - [ ] Subtask 3.2: Add `type` parameter to `upsert(eventId, type, schema)`
  - [ ] Subtask 3.3: Add `getResponsesByEvent(eventId, type, page?, pageSize?)` with pagination
  - [ ] Subtask 3.4: Add `saveResponse(registrationId, eventId, type, answers)`

- [ ] **Task 4: Update InMemorySurveyRepository**
  - [ ] Subtask 4.1: Split internal storage by type: `schemas: Map<`${eventId}:${type}`, SurveySchema>`
  - [ ] Subtask 4.2: Seed dual survey schemas for test events
  - [ ] Subtask 4.3: Seed 15+ mock responses across both types for aggregation testing
  - [ ] Subtask 4.4: Implement pagination in `getResponsesByEvent`

- [ ] **Task 5: Create SurveyAggregationService**
  - [ ] Subtask 5.1: `aggregate(responses, schema)` → `SurveyResponseAggregate[]`
  - [ ] Subtask 5.2: `aggregateSingleChoice()` → option counts + percentages
  - [ ] Subtask 5.3: `aggregateMultiChoice()` → checkbox breakdown
  - [ ] Subtask 5.4: `aggregateRange()` → average + distribution
  - [ ] Subtask 5.5: `aggregateText()` → count + 3 samples
  - [ ] Subtask 5.6: Unit tests for each aggregation method

- [ ] **Task 6: Create surveys.routes.ts**
  - [ ] Subtask 6.1: `GET /api/events/:id/survey/:type` — return schema by type
  - [ ] Subtask 6.2: `PUT /api/events/:id/survey/:type` — save schema with Zod validation (admin only)
  - [ ] Subtask 6.3: `GET /api/events/:id/survey/responses` — aggregates + paginated responses
  - [ ] Subtask 6.4: `GET /api/events/:id/survey/responses/download` — XLSX stream export
  - [ ] Subtask 6.5: RBAC middleware: admin write, admin+viewer read, participant denied
  - [ ] Subtask 6.6: OpenAPI request/response validation calls

- [ ] **Task 7: Register survey routes in Fastify app**
  - [ ] Subtask 7.1: Import `surveysRoutes` plugin in `app.ts` or `server.ts`
  - [ ] Subtask 7.2: Verify route ordering (static before dynamic)
  - [ ] Subtask 7.3: Remove legacy `/api/events/:id/survey` GET/PUT from `events.routes.ts` (superseded)

- [ ] **Task 8: Update OpenAPI spec**
  - [ ] Subtask 8.1: Add `/events/{id}/survey/{type}` GET + PUT
  - [ ] Subtask 8.2: Add `/events/{id}/survey/responses` GET with query params
  - [ ] Subtask 8.3: Add `/events/{id}/survey/responses/download` GET
  - [ ] Subtask 8.4: Add `SurveySchemaResponse`, `SurveyResponsesApiResponse` component schemas
  - [ ] Subtask 8.5: Run OpenAPI validation — all routes documented

- [ ] **Task 9: Write API tests**
  - [ ] Subtask 9.1: Schema CRUD tests (save, retrieve, validate errors)
  - [ ] Subtask 9.2: Dual survey isolation (registration ≠ post-event)
  - [ ] Subtask 9.3: Post-event toggle (off preserves schema)
  - [ ] Subtask 9.4: Response aggregation correctness (radio, range, text)
  - [ ] Subtask 9.5: XLSX export (valid file, correct columns)
  - [ ] Subtask 9.6: RBAC tests (viewer read, participant denied)

## Dev Agent Record

### Implementation Plan

1. Create migration `008_survey_responses_table.sql` — new table + event columns
2. Update `ISurveyRepository` interface — add `type` parameter, pagination
3. Update `InMemorySurveyRepository` — dual-type storage, seeded responses
4. Create `SurveyAggregationService` — pure function aggregation for all field types
5. Create `surveys.routes.ts` — dual-type endpoints + responses + XLSX export
6. Register routes, remove legacy survey endpoints from `events.routes.ts`
7. Update OpenAPI spec — new endpoints documented
8. Write comprehensive tests

### Debug Log

_(To be filled during implementation)_

### Completion Notes

_(To be filled upon completion)_

## File List

- `src/migrations/008_survey_responses_table.sql` (NEW)
- `src/types/domain.ts` (MODIFY — extend SurveySchema, add SurveyResponse)
- `src/interfaces/repositories/ISurveyRepository.ts` (MODIFY — type parameter, pagination)
- `src/repositories/memory/SurveyRepository.ts` (MODIFY — dual-type, seeded responses)
- `src/services/SurveyAggregationService.ts` (NEW)
- `src/services/tests/SurveyAggregationService.test.ts` (NEW)
- `src/routes/surveys.routes.ts` (NEW)
- `src/routes/tests/surveys.routes.test.ts` (NEW)
- `src/routes/events.routes.ts` (MODIFY — remove legacy survey endpoints)
- `openapi.yaml` (MODIFY — new survey endpoints)
- `package.json` (MODIFY — add `exceljs` dependency)

## Status

ready-for-dev

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-04-06 | Story created from frontend story 4.4 analysis | bmad-create-story |
