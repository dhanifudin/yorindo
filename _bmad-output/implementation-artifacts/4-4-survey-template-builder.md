---
title: 'Survey Template Builder & Response Dashboard'
slug: '4-4-survey-template-builder'
created: '2026-03-28'
status: 'ready-for-dev'
epic: 4
story: 4
reopened: '2026-03-28 — Sprint Change Proposal 2026-03-28'
tech_stack: ['react', 'next.js', 'tailwindcss', 'react-query', 'msw', 'zod', 'shadcn/ui', 'rjsf', '@dnd-kit/sortable', 'recharts', 'tanstack-table', 'sonner']
files_to_create:
  - 'src/types/surveys.ts'
  - 'src/mocks/handlers/surveys.ts'
  - 'src/hooks/useSurveys.ts'
  - 'src/components/features/surveys/widgets/GridRadioWidget.tsx'
  - 'src/components/features/surveys/widgets/GridCheckboxWidget.tsx'
  - 'src/components/features/surveys/widgets/SectionWidget.tsx'
  - 'src/components/features/surveys/SurveyFieldEditor.tsx'
  - 'src/components/features/surveys/SurveyFieldList.tsx'
  - 'src/components/features/surveys/SurveyBuilderTab.tsx'
  - 'src/components/features/surveys/FormPreviewModal.tsx'
  - 'src/app/app/events/[id]/builder/page.tsx'
  - 'src/app/app/events/[id]/survey-responses/page.tsx'
  - 'src/components/features/surveys/SurveyResponseCharts.tsx'
  - 'src/components/features/surveys/SurveyResponsesTable.tsx'
files_to_modify:
  - 'src/types/api.ts'
  - 'src/mocks/handlers/index.ts'
  - 'src/app/app/events/[id]/builder/_client.tsx (if exists, else create)'
  - 'src/app/(public)/register/[slug]/form/page.tsx (or equivalent registration form)'
  - 'src/app/app/events/[id]/_client.tsx'
  - '_bmad-output/implementation-artifacts/1-4-openapi-30-specification.md'
code_patterns:
  - 'rjsf with @rjsf/shadcn theme — existing pattern in registration form'
  - 'MSW: static routes BEFORE dynamic :type routes (surveys/responses before surveys/:type)'
  - 'React Query keys: [surveys, eventId, type] for schemas; [survey-responses, eventId, type] for responses'
  - '@dnd-kit/sortable for drag-reorder of survey fields (DndContext + SortableContext + useSortable)'
  - 'Recharts BarChart/PieChart for aggregate question breakdowns'
  - 'TanStack Table v8 server-side mode for individual responses table'
  - 'shadcn Dialog for unified preview modal'
  - 'shadcn Tabs for dual survey tabs in builder and response dashboard'
---

# Story 4.4: Survey Template Builder & Response Dashboard

**Story ID:** 4.4
**Story Key:** 4-4-survey-template-builder
**Epic:** Epic 4 — Event Configuration & Management
**Status:** ready-for-dev
**Reopened:** 2026-03-28 — Sprint Change Proposal 2026-03-28

> **Reopened 2026-03-28:** Original done story covered a single survey with 3 field types.
> Expanded scope: dual survey schemas (registration + post-event), full Google Forms field parity
> (11 types, no file upload), survey response dashboard, unified preview modal.

---

## Story

As an admin,
I want to build two independently-structured survey templates per event (registration and post-event) using a Google Forms-equivalent field editor, and view all participant responses in a dedicated survey dashboard,
So that I can capture participant intent signals at registration and post-event feedback, and act on aggregated answers.

---

## Acceptance Criteria

### Builder — Dual Survey Structure

**AC1:** Survey builder page (`/app/events/:id/builder`) shows two tabs: "Survei Registrasi" (always active) and "Survei Post-Event" (with an enable/disable toggle). Each tab has its own independent JSON Schema + UISchema — changing fields in one does not affect the other.

**AC2:** "Survei Post-Event" tab has a toggle "Aktifkan Survei Post-Event". When enabled, `events.post_survey_enabled` is saved as `true` via `PATCH /api/events/:id`; toggling off preserves the schema but marks it inactive.

**AC3:** Each survey saved via its own endpoint:
- `PUT /api/events/:id/survey/registration` → stored in `events.registration_survey_schema JSONB`
- `PUT /api/events/:id/survey/post-event` → stored in `events.post_survey_schema JSONB`
- `GET /api/events/:id/survey/:type` returns the corresponding schema

### Builder — Field Types (Google Forms parity, no file upload)

**AC4:** Both survey tabs support all of the following field types:
- `text` — short answer (single-line free text)
- `textarea` — paragraph (multi-line free text)
- `radio` — multiple choice (select one via radio buttons)
- `select` — dropdown (select one)
- `checkboxes` — checkboxes (multi-select)
- `range` — linear scale (configurable min/max, default 1–5)
- `grid_radio` — multiple-choice grid (rows × columns, one per row)
- `grid_checkbox` — checkbox grid (rows × columns, multi-select per row)
- `date` — date picker
- `time` — time picker
- `section` — section header/divider (label + optional description, no response captured)

**AC5:** For `radio`, `select`, `checkboxes`: options defined as label+value pairs; stored as `enum` (radio/select) or `items.enum` (checkboxes).

**AC6:** For `range`: configurable min/max stored as `{ type: 'integer', minimum, maximum }`.

**AC7:** For `grid_radio` / `grid_checkbox`: row labels and column labels defined; stored as nested schema with `rows` and `columns` arrays.

**AC8:** Fields can be reordered via drag; `uiSchema["ui:order"]` reflects display order on save.

### Builder & Event Form — Preview

**AC9:** A "Preview Formulir" button appears on both the survey builder page and the event creation/edit form. Clicking it opens a unified tabbed preview modal.

**AC10:** Preview modal tab "Formulir Registrasi": renders the complete registration form via rjsf — fixed fields first (email, name, phone, company_email, company_name, company_location, position, industry_type), then current registration survey fields in order. Read-only. Reflects unsaved changes live (no save required from the builder).

**AC11:** Preview modal tab "Survei Post-Event": renders post-event survey fields via rjsf in order. If `post_survey_enabled` is false, shows empty state: "Survei Post-Event belum diaktifkan".

### Registration Form Integration

**AC12:** When a participant visits `/register/{slug}`, rjsf renders registration survey fields after the fixed fields per `uiSchema["ui:order"]`. No hardcoded custom fields outside the schema.

### Survey Response Dashboard

**AC13:** `/app/events/:id/survey-responses` shows two tabs: "Survei Registrasi" and "Survei Post-Event". Accessible to `admin` and `viewer` roles. Each tab shows total response count.

**AC14:** `GET /api/events/:id/survey/responses?type=registration|post-event` returns all responses. Aggregate summary section shows per-question breakdowns:
- `radio`, `select`, `checkboxes`: bar or pie chart with count + percentage per option
- `range`, `grid_radio`, `grid_checkbox`: average score + response distribution
- `text`, `textarea`: response count + sample text snippets

**AC15:** Below aggregate summary: individual responses table with columns Name, Phone, Submitted At. Row expand or side-drawer shows complete answers question-by-question.

**AC16:** Search/filter: `GET /api/events/:id/survey/responses?type=...&search=...` updates the table without full page reload.

**AC17:** "Export Responses" button calls `GET /api/events/:id/survey/responses/download?type=...&format=xlsx`. Returns `.xlsx` with one row per respondent, one column per question.

---

## Context for Development

### Codebase Patterns

- **rjsf pattern:** The project already uses `@rjsf/core` + `@rjsf/shadcn` on the registration form at `/register/[slug]/form`. Custom widgets follow the `WidgetProps` interface from `@rjsf/utils`. Do NOT use vanilla HTML inputs — all widgets must use shadcn/ui primitives (Input, Textarea, RadioGroup, Select, Checkbox, Slider) wrapped in rjsf widget adapters.
- **MSW handler ordering — CRITICAL:** Static sub-routes must be registered BEFORE dynamic `:type` routes. `GET /api/events/:id/survey/responses` and `GET /api/events/:id/survey/responses/download` MUST come before `GET /api/events/:id/survey/:type` in the handlers array. Violating this causes MSW to route `responses` as a `:type` value.
- **React Query conventions:** Keys: `['surveys', eventId, type]` for schemas, `['survey-responses', eventId, { type, search }]` for responses. Mutations invalidate related keys + show sonner toast.
- **Drag-and-drop:** Use `@dnd-kit/sortable` (DndContext + SortableContext + useSortable). This is the dnd solution consistent with the project's React 18 target. Do NOT use react-beautiful-dnd (deprecated).
- **Charts:** Use Recharts (already a project dependency — used in analytics dashboard 8-3). Follow `<ResponsiveContainer width="100%" height={300}>` pattern.
- **TanStack Table:** Use v8 with `getCoreRowModel()` for individual responses table. Same pattern as Contacts table (3-1).
- **Builder state:** Keep all builder state in local React state (not Zustand). State is `{ fields: SurveyField[], postSurveyEnabled: boolean }`. Save only on explicit "Simpan" button click — no auto-save.
- **Grid widget custom storage format:** rjsf doesn't natively support grid types. Store grid fields in JSON Schema using a custom extension: `{ type: 'object', 'x-widget': 'grid_radio', properties: { rows: { type: 'array', items: { type: 'string' } }, columns: { type: 'array', items: { type: 'string' } } } }`. Custom widgets are resolved via `uiSchema[fieldKey]['ui:widget']`.
- **Section field:** Stored as `{ type: 'null', 'x-widget': 'section', title: '...', description: '...' }`. No response is captured for section fields.

### JSON Schema Mapping Reference

This is the canonical mapping between builder field types and rjsf JSON Schema — follow exactly:

```typescript
// text
{ type: 'string' }
// uiSchema: { 'ui:widget': 'text' }

// textarea
{ type: 'string' }
// uiSchema: { 'ui:widget': 'textarea' }

// radio
{ type: 'string', enum: ['val1', 'val2'], enumNames: ['Label 1', 'Label 2'] }
// uiSchema: { 'ui:widget': 'radio' }

// select
{ type: 'string', enum: ['val1', 'val2'], enumNames: ['Label 1', 'Label 2'] }
// uiSchema: { 'ui:widget': 'select' }

// checkboxes
{ type: 'array', items: { type: 'string', enum: ['val1', 'val2'] }, uniqueItems: true }
// uiSchema: { 'ui:widget': 'checkboxes' }

// range
{ type: 'integer', minimum: 1, maximum: 5 }
// uiSchema: { 'ui:widget': 'range' }

// date
{ type: 'string', format: 'date' }
// uiSchema: { 'ui:widget': 'date' }

// time
{ type: 'string', format: 'time' }
// uiSchema: { 'ui:widget': 'time' }

// grid_radio (custom widget)
{ type: 'object', 'x-widget': 'grid_radio', properties: {
    rows: { type: 'array', items: { type: 'string' }, default: ['Row 1'] },
    columns: { type: 'array', items: { type: 'string' }, default: ['Col 1', 'Col 2'] }
} }
// uiSchema: { 'ui:widget': 'GridRadioWidget' }

// grid_checkbox (custom widget)
{ type: 'object', 'x-widget': 'grid_checkbox', properties: {
    rows: { type: 'array', items: { type: 'string' }, default: ['Row 1'] },
    columns: { type: 'array', items: { type: 'string' }, default: ['Col 1', 'Col 2'] }
} }
// uiSchema: { 'ui:widget': 'GridCheckboxWidget' }

// section (custom widget — no data captured)
{ type: 'null', 'x-widget': 'section' }
// uiSchema: { 'ui:widget': 'SectionWidget' }
```

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/types/api.ts` | Extend Event type with new survey fields; add SurveyField, SurveySchema, SurveyResponse types |
| `src/app/(public)/register/[slug]/form/page.tsx` (or equivalent) | Existing rjsf registration form — reference for widget usage and rjsf Form component setup |
| `src/components/features/events/YoriMindPanel.tsx` | Reference for expandable card pattern (loading/error/empty states) |
| `src/components/features/events/AnalyticsDashboard.tsx` | Reference for Recharts usage inside event detail page |
| `src/mocks/handlers/events.ts` | Reference for MSW handler pattern; existing event seeds to add survey schema fields |
| `src/hooks/useEvents.ts` | Reference for React Query hook pattern |
| `src/components/features/contacts/ContactsTable.tsx` | Reference for TanStack Table v8 server-side pattern |
| `_bmad-output/implementation-artifacts/tech-spec-ai-audience-recommendations.md` | MSW static-before-dynamic handler ordering pattern |

### Technical Decisions

- **Survey builder URL:** `/app/events/[id]/builder` — this may already exist as a stub (SurveyBuilder component mounted in event detail). If `src/app/app/events/[id]/builder/page.tsx` exists, modify it. If not, create it and add a link from the event detail page.
- **Dual survey tab isolation:** Each tab manages its own `SurveyField[]` array. Switching tabs never merges or overwrites the other tab's state.
- **"Simpan" button per tab:** Each survey tab has its own save button that calls the respective `PUT` endpoint. Saving tab A does NOT save tab B.
- **Live preview (unsaved changes):** The FormPreviewModal reads from the builder's current React state (prop-drilled or context), NOT from the saved API schema. This means the preview reflects unsaved changes.
- **Post-event toggle behavior:** When toggling off `post_survey_enabled`, the schema is preserved in local state but `post_survey_enabled = false` is PATCH'd to the API immediately. The schema is not deleted — toggling back on restores it.
- **Registration form integration:** The participant registration form at `/register/[slug]/form` already renders survey fields via rjsf (from the previous Story 4-4 implementation). It reads `registration_survey_schema` from the event public response. Ensure the renamed field (`survey_schema` → `registration_survey_schema`) is reflected in the MSW event seeds and the `Event` type.
- **Grid widget response storage:** Grid responses are stored as `{ [rowLabel]: columnLabel | columnLabel[] }` objects in `survey_responses.responses JSONB`.
- **Aggregate chart logic (FE-side in Phase 1):** Since Phase 1 has no real backend, the MSW mock for `GET /api/events/:id/survey/responses` returns pre-aggregated data alongside raw responses. The FE renders it directly. No client-side aggregation needed.
- **Response download mock:** MSW returns a Blob with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. Use `new Blob(['mock-xlsx'])` — the mock doesn't need to generate real xlsx. The actual xlsx generation is Phase 2 (BE).
- **@dnd-kit dependency:** If `@dnd-kit/core` and `@dnd-kit/sortable` are not yet in package.json, add them. They are the only new dependencies this story introduces.
- **Route guard:** `/app/events/[id]/survey-responses` must be accessible to both `admin` and `viewer` roles. Ensure it's included in `VIEWER_ALLOWED_PATHS` if that guard mechanism exists.

---

## Implementation Plan

### Task 1: Add Survey Types to `src/types/api.ts`

**File:** `src/types/api.ts`

**Actions:**

1. Extend the `Event` interface (add optional fields — backward compatible):
```typescript
// In Event interface, add:
registrationSurveySchema?: SurveySchema | null   // renamed from surveySchema
postSurveySchema?: SurveySchema | null
postSurveyEnabled?: boolean
```

2. Add new types (new file `src/types/surveys.ts` or inline in `api.ts` — follow existing convention):
```typescript
export type SurveyFieldType =
  | 'text' | 'textarea' | 'radio' | 'select' | 'checkboxes'
  | 'range' | 'grid_radio' | 'grid_checkbox' | 'date' | 'time' | 'section'

export interface SurveyFieldOption {
  label: string
  value: string
}

export interface SurveyField {
  id: string           // cuid2 — generated client-side when field is added
  type: SurveyFieldType
  label: string
  required?: boolean
  options?: SurveyFieldOption[]     // for radio, select, checkboxes
  minimum?: number                   // for range
  maximum?: number                   // for range
  rows?: string[]                    // for grid_radio, grid_checkbox
  columns?: string[]                 // for grid_radio, grid_checkbox
  description?: string               // for section
}

export interface SurveySchema {
  schema: Record<string, unknown>    // JSON Schema object
  uiSchema: Record<string, unknown>  // rjsf UI schema
}

export interface SurveyResponseAggregate {
  questionId: string
  questionLabel: string
  fieldType: SurveyFieldType
  // For radio/select/checkboxes:
  optionCounts?: { label: string; count: number; percentage: number }[]
  // For range/grid:
  average?: number
  distribution?: { label: string; count: number }[]
  // For text/textarea:
  totalCount?: number
  samples?: string[]
}

export interface SurveyResponseRecord {
  id: string
  registrationId: string
  contactName: string
  contactPhone: string
  submittedAt: string
  answers: Record<string, unknown>   // { [fieldId]: value }
}

export interface SurveyResponsesApiResponse {
  total: number
  aggregates: SurveyResponseAggregate[]
  responses: SurveyResponseRecord[]
}
```

---

### Task 2: Create MSW Handlers — `src/mocks/handlers/surveys.ts` (NEW FILE)

**File:** `src/mocks/handlers/surveys.ts`

**Critical ordering rule:** In this file, `responses` and `responses/download` handlers MUST appear BEFORE the `/:type` handler.

```typescript
// src/mocks/handlers/surveys.ts
import { http, HttpResponse, delay } from 'msw'
import { createId } from '@paralleldrive/cuid2'

// In-memory store for survey schemas per event
const surveyStore: Record<string, { registration?: unknown; 'post-event'?: unknown }> = {}

// In-memory store for survey responses (seeded with mock data)
const surveyResponsesStore: Record<string, SurveyResponseRecord[]> = {
  // seed with 5 mock responses for 'event-001' registration survey
}
```

Handlers array (ORDER MATTERS):
1. `PUT /api/events/:id/survey/registration` — save registration schema
2. `PUT /api/events/:id/survey/post-event` — save post-event schema
3. `GET /api/events/:id/survey/responses/download` — MUST be before /:type
4. `GET /api/events/:id/survey/responses` — MUST be before /:type
5. `GET /api/events/:id/survey/:type` — LAST (catches registration and post-event)

**Handler details:**

- `PUT /api/events/:id/survey/registration`: Store `{ schema, uiSchema }` in `surveyStore[id].registration`. Return `{ ok: true }`. `delay(300)`.
- `PUT /api/events/:id/survey/post-event`: Same pattern for `post-event`. Return `{ ok: true }`. `delay(300)`.
- `GET /api/events/:id/survey/responses/download`: Return `new Blob(['mock-xlsx'])` with header `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. `delay(500)`.
- `GET /api/events/:id/survey/responses`: Accept `?type=registration|post-event&search=`. Return `SurveyResponsesApiResponse` with seeded aggregates and 5–10 mock responses. `delay(400)`.
- `GET /api/events/:id/survey/:type`: Return `surveyStore[id][type] ?? { schema: { properties: {} }, uiSchema: {} }`. `delay(200)`.

Seeded mock responses (for `event-001`, type `registration`): generate 7 responses with realistic Indonesian names, phone numbers, and plausible answer values covering at least `radio`, `checkboxes`, and `text` question types.

---

### Task 3: Register Surveys Handlers in MSW Entry Point

**File:** `src/mocks/handlers/index.ts` (or wherever handlers are aggregated)

**Action:** Import `surveysHandlers` from `./surveys` and spread into the handlers array. Position: after events handlers, before any catch-all.

---

### Task 4: Create React Query Hooks — `src/hooks/useSurveys.ts` (NEW FILE)

**File:** `src/hooks/useSurveys.ts`

```typescript
// Load a survey schema by type
export function useSurveySchema(eventId: string | undefined, type: 'registration' | 'post-event') {
  return useQuery({
    queryKey: ['surveys', eventId, type],
    queryFn: () =>
      fetch(`/api/events/${eventId}/survey/${type}`).then(r => r.json()) as Promise<SurveySchema>,
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000,
  })
}

// Save a survey schema
export function useSaveSurveySchema(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ type, schema, uiSchema }: { type: 'registration' | 'post-event'; schema: unknown; uiSchema: unknown }) =>
      fetch(`/api/events/${eventId}/survey/${type}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema, uiSchema }),
      }).then(r => r.json()),
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: ['surveys', eventId, type] })
      toast.success('Survei disimpan')
    },
  })
}

// Load survey responses
export function useSurveyResponses(
  eventId: string | undefined,
  type: 'registration' | 'post-event',
  search?: string
) {
  return useQuery({
    queryKey: ['survey-responses', eventId, { type, search }],
    queryFn: () =>
      fetch(`/api/events/${eventId}/survey/responses?type=${type}${search ? `&search=${encodeURIComponent(search)}` : ''}`)
        .then(r => r.json()) as Promise<SurveyResponsesApiResponse>,
    enabled: !!eventId,
    staleTime: 60 * 1000,
  })
}
```

---

### Task 5: Create Custom rjsf Widgets

#### 5a: `src/components/features/surveys/widgets/GridRadioWidget.tsx` (NEW)

rjsf `WidgetProps`-compatible component. Renders an HTML table:
- Rows from `schema.properties.rows.default` (or `formData` object keys)
- Columns from `schema.properties.columns.default`
- Each row: radio button per column
- On change: update `formData` as `{ [rowLabel]: selectedColumnLabel }`
- Use shadcn `RadioGroup` + `RadioGroupItem` per row

#### 5b: `src/components/features/surveys/widgets/GridCheckboxWidget.tsx` (NEW)

Same structure as GridRadioWidget but uses checkboxes. `formData` is `{ [rowLabel]: string[] }`.

#### 5c: `src/components/features/surveys/widgets/SectionWidget.tsx` (NEW)

Renders a visual divider with the field's `title` as heading and `description` as subtext. No interaction. Returns `null` for `formData` (never updates form state).

Register all three in a `customWidgets` object:
```typescript
// src/components/features/surveys/widgets/index.ts
export const surveyCustomWidgets = {
  GridRadioWidget,
  GridCheckboxWidget,
  SectionWidget,
}
```

---

### Task 6: Create `SurveyFieldEditor.tsx` (NEW)

**File:** `src/components/features/surveys/SurveyFieldEditor.tsx`

A form for editing a single `SurveyField`'s properties. Rendered inside a shadcn `Card` or `Collapsible`. Props: `field: SurveyField`, `onChange: (updated: SurveyField) => void`, `onRemove: () => void`.

UI structure per field type:
- **All types:** Label input (required), Required toggle
- **radio / select / checkboxes:** Options editor — list of label+value pairs; "Add Option" button; delete per option
- **range:** Min/max number inputs (default 1–5)
- **grid_radio / grid_checkbox:** Rows textarea (one per line) + Columns textarea (one per line)
- **section:** Description textarea (optional)
- **text / textarea / date / time:** No extra config

---

### Task 7: Create `SurveyBuilderTab.tsx` (NEW)

**File:** `src/components/features/surveys/SurveyBuilderTab.tsx`

Props: `eventId: string`, `type: 'registration' | 'post-event'`, `postSurveyEnabled?: boolean`, `onTogglePostSurvey?: (enabled: boolean) => void`

Internal state: `fields: SurveyField[]` (initialized from `useSurveySchema` on mount)

Key behaviors:
- **Field type selector:** shadcn `Select` dropdown listing all 11 field types with Indonesian labels; "Tambah Pertanyaan" button appends a new field with `id: createId()`
- **Drag-to-reorder:** Wrap field list in `@dnd-kit/sortable`'s `DndContext` + `SortableContext`. Each `SurveyFieldEditor` wrapped in a `useSortable` hook. On drag end, update `fields` array order.
- **"Simpan" button:** Calls `useSaveSurveySchema`. Converts `fields` to `{ schema, uiSchema }` using the JSON Schema Mapping Reference (see Context section). Disables if no changes since last load.
- **"Preview Formulir" button:** Opens `FormPreviewModal` passing current `fields` state as prop (live, not saved).
- For `type === 'post-event'`: show toggle "Aktifkan Survei Post-Event" above field list; when disabled, field list is shown grayed/disabled.

**Converting `SurveyField[]` to `{ schema, uiSchema }` — helper function:**
```typescript
// src/components/features/surveys/surveySchemaBuilder.ts
export function buildSurveySchema(fields: SurveyField[]): SurveySchema {
  const properties: Record<string, unknown> = {}
  const uiSchema: Record<string, unknown> = {}
  const order: string[] = []

  for (const field of fields) {
    const key = field.id
    order.push(key)
    // Map each field type to JSON Schema property + uiSchema entry
    // (See JSON Schema Mapping Reference in Context section)
    properties[key] = buildFieldSchema(field)
    uiSchema[key] = buildFieldUiSchema(field)
  }

  uiSchema['ui:order'] = order

  return {
    schema: { type: 'object', properties },
    uiSchema,
  }
}
```

---

### Task 8: Create `FormPreviewModal.tsx` (NEW)

**File:** `src/components/features/surveys/FormPreviewModal.tsx`

Props: `open: boolean`, `onClose: () => void`, `registrationFields: SurveyField[]`, `postEventFields: SurveyField[]`, `postSurveyEnabled: boolean`

Structure:
- shadcn `Dialog` with max-width `2xl`
- shadcn `Tabs`: "Formulir Registrasi" | "Survei Post-Event"
- **"Formulir Registrasi" tab:** Renders rjsf `<Form>` with:
  - Fixed fields schema (hardcoded): `email`, `name`, `phone`, `company_email`, `company_name`, `company_location`, `position`, `industry_type` — all required, all `type: 'string'`
  - Merged with current `registrationFields` via `buildSurveySchema(registrationFields)`
  - `readonly: true` or `disabled` to prevent interaction
  - Submit button hidden (`omitExtraData`, custom `<></>` as `children`)
- **"Survei Post-Event" tab:**
  - If `!postSurveyEnabled`: show empty state "Survei Post-Event belum diaktifkan"
  - Else: renders rjsf `<Form>` with `buildSurveySchema(postEventFields)` schema, read-only

---

### Task 9: Create Builder Page — `src/app/app/events/[id]/builder/page.tsx`

**File:** `src/app/app/events/[id]/builder/page.tsx`

If the file already exists (check first), modify it. Otherwise create it.

Structure:
- `'use client'` page or use a `_client.tsx` pattern matching the existing event detail page
- Page layout: EventBreadcrumb header + shadcn `Tabs` for dual survey
- Tab "Survei Registrasi": `<SurveyBuilderTab eventId={id} type="registration" />`
- Tab "Survei Post-Event": `<SurveyBuilderTab eventId={id} type="post-event" postSurveyEnabled={postSurveyEnabled} onTogglePostSurvey={handleToggle} />`
- `handleToggle`: calls `PATCH /api/events/:id` with `{ postSurveyEnabled: boolean }` via existing `useUpdateEvent` mutation

Add a "Survey Builder" link/button to the event detail page (`src/app/app/events/[id]/_client.tsx`) if not already present.

---

### Task 10: Add "Preview Formulir" Button to Event Creation/Edit Form

**File:** Whichever file renders the event creation or edit form (likely `src/app/app/events/new/page.tsx` or `src/components/features/events/EventForm.tsx`)

**Action:**
- Add a `<Button variant="outline">Preview Formulir</Button>` near the form's submit buttons
- On click: open `FormPreviewModal` with the current event's survey schemas (fetched via `useSurveySchema` — may be empty if no survey built yet)
- If the event form is in create mode (no eventId yet), show only the fixed fields preview (no survey schema yet); if in edit mode, load saved schemas

---

### Task 11: Registration Form — Ensure Survey Fields Render Correctly

**File:** Public registration form (likely `src/app/(public)/register/[slug]/form/page.tsx` or similar)

**Action:**
- Verify that the existing rjsf render of survey fields references `event.registrationSurveySchema` (renamed from `event.surveySchema`).
- If the field name changed, update the reference in this file.
- Ensure the rjsf `Form` uses `surveyCustomWidgets` so `GridRadioWidget`, `GridCheckboxWidget`, and `SectionWidget` are available.
- The fixed fields (phone, name, email, etc.) are rendered before the dynamic schema fields — this ordering must be maintained.

---

### Task 12: Create Survey Response Dashboard Page

**File:** `src/app/app/events/[id]/survey-responses/page.tsx` (NEW)

Structure:
- shadcn `Tabs`: "Survei Registrasi" | "Survei Post-Event"
- Each tab content: `<SurveyResponsesView eventId={id} type="registration|post-event" />`
- Route guard: ensure `viewer` role can access this path

**`SurveyResponsesView` component (inline or separate file):**
- Calls `useSurveyResponses(eventId, type, search)`
- Shows total count: "Total Responden: {total}"
- "Export Responses" button: calls download endpoint, triggers browser download via `<a download>` blob URL
- Search input (debounced 300ms) updates `search` param → query re-fetches
- Renders `<SurveyResponseCharts aggregates={data.aggregates} />` (see Task 13)
- Renders `<SurveyResponsesTable responses={data.responses} />` (see Task 14)
- Loading state: skeleton cards
- Error state: "Gagal memuat data respons."
- Empty state: "Belum ada respons."

---

### Task 13: Create `SurveyResponseCharts.tsx` (NEW)

**File:** `src/components/features/surveys/SurveyResponseCharts.tsx`

Props: `aggregates: SurveyResponseAggregate[]`

For each aggregate item, render based on `fieldType`:
- `radio` / `select`: `<BarChart>` with option labels on Y-axis and counts on X-axis (horizontal bar). Show `{count} ({percentage}%)` label per bar.
- `checkboxes`: Same BarChart (multi-select, so each option counted independently).
- `range` / `grid_radio` / `grid_checkbox`: Show average score as a large number + `<BarChart>` for distribution.
- `text` / `textarea`: Show "X respons" + up to 3 sample quote blocks.
- `section`: Skip (no aggregate for section fields).

Wrap each question chart in a shadcn `Card` with the question label as the card title.

---

### Task 14: Create `SurveyResponsesTable.tsx` (NEW)

**File:** `src/components/features/surveys/SurveyResponsesTable.tsx`

Props: `responses: SurveyResponseRecord[]`

TanStack Table v8 with columns: Name, Phone, Submitted At, Actions (expand).

Row expansion: use shadcn `Sheet` (side drawer) showing complete answers. Answers rendered as a list of `{ questionLabel: answer }` pairs.

Follow the same expandable row pattern used in `ContactsTable.tsx` — open `Sheet` on row click.

---

### Task 15: Update OpenAPI Specification

**File:** `_bmad-output/implementation-artifacts/1-4-openapi-30-specification.md`

**Actions — add under Events section:**

1. `PUT /api/events/{id}/survey/registration`
   - Summary: Save registration survey schema for an event
   - Auth: Bearer (admin only)
   - Request body: `{ schema: object, uiSchema: object }`
   - Response 200: `{ ok: boolean }`

2. `PUT /api/events/{id}/survey/post-event`
   - Summary: Save post-event survey schema for an event
   - Auth: Bearer (admin only)
   - Request body: `{ schema: object, uiSchema: object }`
   - Response 200: `{ ok: boolean }`

3. `GET /api/events/{id}/survey/responses`
   - Summary: Get survey responses with aggregates
   - Auth: Bearer (admin, viewer)
   - Query params: `type: 'registration' | 'post-event'`, `search?: string`
   - Response 200: `SurveyResponsesApiResponse` schema

4. `GET /api/events/{id}/survey/responses/download`
   - Summary: Export survey responses as Excel
   - Auth: Bearer (admin, viewer)
   - Query params: `type: 'registration' | 'post-event'`, `format: 'xlsx'`
   - Response 200: binary (Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)

5. `GET /api/events/{id}/survey/{type}`
   - Summary: Get survey schema by type
   - Auth: Bearer (admin, viewer)
   - Path param: `type: 'registration' | 'post-event'`
   - Response 200: `SurveySchema` (schema + uiSchema)

**Also update `Event` schema:**
- Rename `surveySchema` → `registrationSurveySchema` (type: object | null)
- Add `postSurveySchema?: object | null`
- Add `postSurveyEnabled?: boolean`

---

## MSW Handlers Required

```typescript
// src/mocks/handlers/surveys.ts (new file)
// ORDER MATTERS — static before dynamic:
PUT  /api/events/:id/survey/registration   → 200 { ok: true }
PUT  /api/events/:id/survey/post-event     → 200 { ok: true }
GET  /api/events/:id/survey/responses/download → blob (xlsx)
GET  /api/events/:id/survey/responses      → 200 SurveyResponsesApiResponse
GET  /api/events/:id/survey/:type          → 200 { schema, uiSchema }  // LAST
```

---

## Architecture Notes

- `events.registration_survey_schema JSONB` (renamed from `survey_schema`)
- `events.post_survey_schema JSONB`
- `events.post_survey_enabled BOOL DEFAULT FALSE`
- New table `survey_responses` — see Sprint Change Proposal 2026-03-28 for DDL
- `ITargetRecommendationService` is separate (Story 4-5); not in scope here

---

## Dependencies

- `@dnd-kit/core` and `@dnd-kit/sortable` — install if not already present (check `package.json`)
- No other new dependencies. Recharts, rjsf (`@rjsf/core`, `@rjsf/shadcn`, `@rjsf/utils`), TanStack Table v8 are existing.

---

## Testing Approach

**Manual testing checklist:**
1. Builder: add one of each of the 11 field types → verify all render in the editor with correct config fields
2. Builder: drag to reorder fields → save → reload page → verify order persists
3. Builder: switch between Registration and Post-Event tabs → verify independent state (changes in tab A don't affect tab B)
4. Builder: "Preview Formulir" → Formulir Registrasi tab shows fixed fields + current survey fields in order
5. Builder: toggle Post-Event survey off → preview tab shows "belum diaktifkan"
6. Builder: toggle Post-Event survey on → "Aktifkan" saved to API → `post_survey_enabled: true`
7. Event form: "Preview Formulir" button opens modal with saved schemas
8. Registration form (`/register/[slug]/form`): survey fields appear after fixed fields; grid and section types render correctly
9. Response dashboard: two tabs; aggregate charts visible; individual table shows mock data
10. Response dashboard: search input filters table
11. Response dashboard: "Export Responses" triggers file download

**Regression checks:**
- Existing registration form tests must continue passing — only change is field rename (`surveySchema` → `registrationSurveySchema`) and addition of custom widget registry
- Event list, event detail, and event clone pages must not be affected

---

## References

- Epic file: `_bmad-output/planning-artifacts/epics/epic-4-event-configuration-management.md` — Story 4.4
- Sprint Change Proposal: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-28.md`
- Schema DDL: Sprint Change Proposal Section 2.2
- Previous done story (archived scope): text/radio/checkboxes only, single `PUT /api/events/:id/survey`
