---
title: 'Survey Builder Improvements — Copy from previous, templates, metadata'
type: 'feature'
created: '2026-04-12'
status: 'in-progress'
---

<frozen-after-approval reason="human-owned intent">

## Intent

**Problem:** Admins must rebuild surveys from scratch for each event. They cannot copy surveys from previous events or use pre-built templates.

**Approach:**
1. Add "Copy from Previous Event" button in survey builder
2. Add survey templates (pre-built presets for common use cases)
3. Add survey-level metadata (title, description) editing
4. Add "Save as Template" to reuse across events
5. Add validation before save

## Boundaries & Constraints

**Always:**
- Templates stored in new `survey_templates` table
- Copy operation clones schema + uiSchema completely
- Registration survey remains locked after draft status

**Ask First:**
- If AI-generated survey suggestions are needed

**Never:**
- Do not break existing survey data
- Do not allow editing registration survey after event leaves draft

</frozen-after-approval>

## Code Map

- `yorindo-api/migrations/023_survey_templates.sql` — New table for reusable templates
- `yorindo-api/src/routes/surveys.routes.ts` — Add copy-from-event, list-templates, save-as-template endpoints
- `yorindo-app/src/components/features/surveys/SurveyBuilderTab.tsx` — Add template picker, copy dialog, metadata editor
- `yorindo-app/src/components/features/surveys/SurveyTemplateDialog.tsx` — New dialog component

## Tasks & Acceptance

- [ ] Migration 023: Create survey_templates table
- [ ] GET /api/surveys/templates — List available templates
- [ ] POST /api/surveys/templates — Save current survey as template
- [ ] GET /api/events/:id/surveys/:type/from-event?sourceId=... — Copy from another event
- [ ] Survey builder: "Copy from Previous" button with event selector
- [ ] Survey builder: "Use Template" button with template picker
- [ ] Survey builder: Survey title/description editor
- [ ] Survey builder: Validation on save (required fields, labels, options)

## Verification

- `cd yorindo-api && npm test` — all tests pass
- `cd yorindo-api && npx tsc --noEmit` — zero errors
- `cd yorindo-app && npx tsc --noEmit` — zero errors
