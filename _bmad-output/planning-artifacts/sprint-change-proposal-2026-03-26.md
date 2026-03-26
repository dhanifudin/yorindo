# Sprint Change Proposal — 2026-03-26

**Trigger:** Stakeholder requirement update — dynamic registration form fields and survey builder technology
**Scope:** Moderate
**Status:** Approved (Incremental review completed 2026-03-26)

---

## Section 1: Issue Summary

During the active implementation sprint, the stakeholder specified three requirements that conflict with or extend the current implementations of Story 4.4 (Survey Template Builder) and Story 6.2 (Participant Registration Form), both of which were in `review` status:

1. **Fixed registration fields** — The registration form must always collect a defined baseline set of fields: `phone`, `name`, `email`, `company_email`, `company_name`, `company_location`, `position` (jabatan), `industry_type`. The original stories referred only to "standard fields" without naming them.

2. **Technology switch** — Dynamic form rendering must use **`react-jsonschema-form` (rjsf)** (`@rjsf/core` + `@rjsf/shadcn` theme) instead of a custom drag-and-drop builder approach. The survey schema format changes from a proprietary field array to `{ schema: JSONSchema7, uiSchema: UISchema }`.

3. **Admin survey field widget types** — The admin-facing survey builder must support the full Google Forms widget set (excluding file upload): `text`, `textarea`, `radio`, `select`, `checkboxes`, `range`, `date`, `time`. These map directly to rjsf widget types.

**Discovery context:** Identified via `/bmad-help` requirements review session on 2026-03-26, before either story was signed off or merged.

---

## Section 2: Impact Analysis

### Epic Impact

| Epic | Story | Impact |
|------|-------|--------|
| Epic 4: Event Config & Management | 4.4 Survey Template Builder | **Full rework** — replace drag-and-drop custom builder with JSON Schema field editor; 8 widget types aligned to rjsf/GForms |
| Epic 6: Registration & Approval | 6.2 Participant Registration Form | **Field set + rendering rework** — add fixed baseline fields, switch to rjsf for survey section rendering |
| Epic 3: Contact Database | 6.2 pre-fill (cross-epic) | **Minor AC update only** — pre-fill mapping now specifies which fields map from contact record |
| All other epics | — | No impact |

### Story Status Changes

| Story | Was | Now | Reason |
|-------|-----|-----|--------|
| 4-4-survey-template-builder | `review` | `ready-for-dev` | Full rework required |
| 6-2-participant-registration-form-mobile-first | `review` | `ready-for-dev` | Fixed fields + rjsf integration required |

### Artifacts Updated

| Artifact | Change |
|----------|--------|
| `architecture.md` | Added `@rjsf/core + @rjsf/shadcn` to tech stack; widget type list documented |
| `epics/epic-4-event-configuration-management.md` | Phase 1 header updated; Story 4.4 ACs fully rewritten with 8 widget types |
| `epics/epic-6-participant-registration-approval-workflow.md` | Story 6.2 ACs updated with fixed field list + rjsf rendering AC |
| `prd.md` | FR24 updated with specific pre-fill field mapping; NFR-S14 updated to distinguish fixed baseline from custom survey fields |
| `sprint-status.yaml` | Stories 4.4 and 6.2 reset to `ready-for-dev` |

### Technical Impact

- **New dependency:** `@rjsf/core`, `@rjsf/utils`, `@rjsf/validator-ajv8`, `@rjsf/shadcn` (frontend only)
- **Schema format change:** MongoDB `survey_schemas` document shape changes from a custom field array to `{ schema: JSONSchema7, uiSchema: UISchema }` — MSW mock for `GET /api/events/:id/survey` must be updated
- **Registration payload change:** `POST /api/registrations` body must accept all 8 fixed fields; MSW handler and in-memory repo need updating
- **No impact** on auth, check-in, blast, analytics epics

---

## Section 3: Recommended Approach

**Selected: Option 1 — Direct Adjustment**

Both affected stories were in `review` (not `done`), making this the lowest-cost correction point. No rollback of merged work is required. Changes are scoped to two stories and their MSW mocks — no epic resequencing, no new epics, no MVP scope reduction.

**Effort estimate:** Medium
- Story 4.4: replace builder UI + update MSW mock schema format; add 8 widget types
- Story 6.2: add 4 new fixed fields + integrate rjsf for survey section + update pre-fill mapping
- Both can be worked concurrently

**Risk:** Low — rjsf is mature and well-typed; JSON Schema is a standard format; fixed field set aligns with the B2B lead intelligence focus of the product

**Timeline impact:** Minor — two stories reset; no downstream story dependencies broken

---

## Section 4: Detailed Change Proposals

### Story 4.4 — Survey Template Builder (full rewrite)

**User story change:**
- OLD: "using a drag-and-drop form builder"
- NEW: "using a JSON Schema field editor"

**Key AC changes:**
- Widget types expanded to full GForms set (minus file upload): `text`, `textarea`, `radio`, `select`, `checkboxes`, `range`, `date`, `time`
- Save payload: `{ schema: JSONSchema7, uiSchema: UISchema }` stored in MongoDB
- `radio`/`select` options → `enum`; `checkboxes` options → `items.enum`
- `range` fields: configurable `minimum`/`maximum` (default 1–5)
- Reordering updates `uiSchema["ui:order"]` — no DnD library dependency required

### Story 6.2 — Participant Registration Form

**Key AC changes:**
- AC1 (new): Fixed field list always shown in order: `phone`, `name`, `email`, `company_email`, `company_name`, `company_location`, `position`, `industry_type`
- AC2 (updated): Pre-fill maps `name`, `email`, `company_name`, `position` from contact record; `company_email`, `company_location`, `industry_type` pre-filled if available
- AC4 (updated): rjsf renders custom survey fields after fixed fields per `uiSchema["ui:order"]`
- AC5 (new): Single-column mobile layout constraint explicit for complete form

### PRD

- **FR24:** Now specifies exact pre-fill field mapping (named fields, not generic "standard fields")
- **NFR-S14:** Clarifies data minimization applies to custom survey fields only; fixed baseline is always collected per event

### Architecture

- `@rjsf/core + @rjsf/shadcn` added to tech stack with widget type documentation

---

## Section 5: Implementation Handoff

**Scope: Moderate** — two story reworks; one new library cluster; MSW mock data updates

### Dev Team Tasks

**Story 4.4** (`ready-for-dev`):
1. `npm install @rjsf/core @rjsf/utils @rjsf/validator-ajv8 @rjsf/shadcn`
2. Implement JSON Schema field editor UI (add/label/configure/reorder/delete fields)
3. Wire each widget type to its rjsf/JSON Schema representation
4. Update MSW `GET /api/events/:id/survey` mock → `{ schema: JSONSchema7, uiSchema: UISchema }`
5. Update MSW `PUT /api/events/:id/survey` to accept + echo the new shape

**Story 6.2** (`ready-for-dev`):
1. Add fixed fields to registration form: `company_email`, `company_location`, `industry_type` (with industry type as select); rename `position` label to "Jabatan"
2. Integrate rjsf to render the `survey_schema` section after fixed fields
3. Update pre-fill logic to map new fields from contact lookup response
4. Update MSW `POST /api/registrations` to accept full 8-field payload
5. Update MSW `GET /api/contacts/lookup` mock to include `company_email`, `company_location`, `industry_type`

### Success Criteria

- [ ] Admin can add all 8 widget types in the survey builder
- [ ] Saved schema shape is `{ schema: JSONSchema7, uiSchema: UISchema }`
- [ ] All 8 fixed fields present and required on the participant registration form
- [ ] Pre-fill correctly populates available fields on phone lookup
- [ ] rjsf custom survey section renders after fixed fields in correct order
- [ ] Mobile layout: single column, no horizontal scroll at 375px
- [ ] Both stories pass code review (`bmad-code-review`)
