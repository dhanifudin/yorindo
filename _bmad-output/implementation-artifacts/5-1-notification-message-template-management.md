# Story 5.1: Notification Message Template Management

**Story ID:** 5.1
**Story Key:** 5-1-notification-message-template-management
**Epic:** Epic 5 — Invitation Blast & Notifications
**Phase:** Phase 1 (FE) — wired to MSW templates handler (new handler needed)
**Status:** review
**Created:** 2026-03-20

---

## Story

As an admin,
I want to create and edit notification message templates with named variable substitution,
So that all outbound communications use consistent, personalized messaging.

> **Phase 1 FE scope:** Build the template management UI (list, create, edit) and a live preview that substitutes sample values into `{{variable}}` placeholders — all wired to a new MSW templates handler. No real backend.

---

## Acceptance Criteria (FE Phase 1)

**AC1:** Given `/app/templates` renders,
When the page loads,
Then a list of templates is shown with: name, channel badge (email/whatsapp), type badge (invitation/confirmation/rejection), and edit/delete actions

**AC2:** Given the "New Template" button is clicked,
Then a form appears with: name, type (dropdown), channel (dropdown), and body (textarea)

**AC3:** Given the body textarea contains `{{name}}`, `{{event_title}}`, `{{date}}`, `{{venue}}`,
When I click "Preview",
Then sample values are substituted and the preview renders in a read-only panel next to the editor

**AC4:** Given a valid template form is submitted,
When `POST /api/templates` returns 201,
Then the new template appears in the list and a success toast is shown

**AC5:** Given I click "Edit" on an existing template,
Then the form pre-fills with current values and `PATCH /api/templates/:id` is called on save

---

## Tasks / Subtasks

- [x] **Task 1: Add MSW templates handler**
  - [x] Create `src/mocks/handlers/templates.ts`
  - [x] Seed 3 templates: invitation/whatsapp, confirmation/email, rejection/email
  - [x] Handle: `GET /api/templates`, `POST /api/templates` (201), `PATCH /api/templates/:id`, `DELETE /api/templates/:id` (204)
  - [x] Export `templateHandlers` and add to `src/mocks/handlers/index.ts`

- [x] **Task 2: Create templates list page**
  - [x] Create `src/app/app/templates/page.tsx`
  - [x] Fetch via `useTemplates()` React Query hook
  - [x] Render table: name, channel badge, type badge, body preview (truncated), edit/delete actions

- [x] **Task 3: Build TemplateForm component**
  - [x] Create `src/components/features/templates/TemplateForm.tsx`
  - [x] Zod schema: name, type (enum), channel (enum), body (min 10)
  - [x] Handles both create (POST) and edit (PATCH) mode

- [x] **Task 4: Live preview panel**
  - [x] Create `src/components/features/templates/TemplatePreview.tsx`
  - [x] Sample values substituted via regex
  - [x] Updates on every keystroke via RHF `watch('body')`

- [x] **Task 5: Create/Edit template inline panel**
  - [x] Inline panel in page.tsx; edit pre-fills form via `defaultValues`

- [x] **Task 6: Write vitest tests**
  - [x] Test: GET /api/templates returns 3 seeded templates
  - [x] Test: POST /api/templates creates and returns new template
  - [x] Test: preview substitution replaces {{name}} → 'Budi Santoso'

---

## Dev Notes

### New MSW Handler Required
This story requires adding `src/mocks/handlers/templates.ts` — it does NOT exist yet from Story 1.6. Follow the same pattern as `events.ts`:
```typescript
import { http, HttpResponse, delay } from 'msw'

let templatesStore = [
  { id: 'tmpl-001', name: 'Undangan Event', type: 'invitation', channel: 'whatsapp', body: 'Halo {{name}}, Anda diundang ke {{event_title}} pada {{date}} di {{venue}}.' },
  { id: 'tmpl-002', name: 'Konfirmasi Tiket', type: 'confirmation', channel: 'email', body: 'Selamat {{name}}! Registrasi Anda untuk {{event_title}} telah disetujui.' },
  { id: 'tmpl-003', name: 'Penolakan', type: 'rejection', channel: 'email', body: 'Maaf {{name}}, registrasi Anda untuk {{event_title}} tidak dapat kami terima saat ini.' },
]

export const templateHandlers = [
  http.get('/api/templates', async () => { ... }),
  http.post('/api/templates', async ({ request }) => { ... }),
  http.patch('/api/templates/:id', async ({ request, params }) => { ... }),
  http.delete('/api/templates/:id', async ({ params }) => { ... }),
]
```
After creating the handler, add `...templateHandlers` to `src/mocks/handlers/index.ts`.

### File Locations (from architecture)
- Page: `src/app/app/templates/page.tsx`
- Form: `src/components/features/templates/TemplateForm.tsx`
- Preview: `src/components/features/templates/TemplatePreview.tsx`
- MSW handler: `src/mocks/handlers/templates.ts`
- Handler index: `src/mocks/handlers/index.ts` (add import + spread)

### Key Anti-Patterns
- DO NOT use a WYSIWYG editor — plain textarea is sufficient for Phase 1
- DO NOT implement real WhatsApp/Brevo integration — that is Phase 2
- DO NOT use server actions — use React Query mutations with fetch()

---

## Dev Agent Record

### Implementation Plan

1. Created `src/mocks/handlers/templates.ts` — in-memory `templatesStore`, 3 seeded templates, GET/POST/PATCH/DELETE handlers. Added to `handlers/index.ts`.
2. Created `src/hooks/useTemplates.ts` — `useTemplates()`, `useCreateTemplate()`, `useUpdateTemplate()`, `useDeleteTemplate()` with React Query cache invalidation.
3. Created `src/components/features/templates/TemplatePreview.tsx` — regex substitution of `{{variable}}` with sample values; updates live on keystroke.
4. Created `src/components/features/templates/TemplateForm.tsx` — RHF + Zod; handles create/edit mode via `template` prop; two-column layout (form + live preview).
5. Created `src/app/app/templates/page.tsx` — table with channel/type badges; inline create/edit panel.
6. Created `src/hooks/useTemplates.test.ts` — 3 tests (GET 3 templates, fields, POST new template) + preview substitution test.

### Debug Log

- JSX brace escaping: `{'{{'}}variabel{{'}}'}}` caused TS1381. Fixed by using single string `{'{{variabel}}'}`.

### Completion Notes

All 6 tasks complete. 40/40 tests pass (4 new; 36 pre-existing). `tsc --noEmit` clean.

---

## File List

**New files:**
- `src/mocks/handlers/templates.ts`
- `src/hooks/useTemplates.ts`
- `src/hooks/useTemplates.test.ts`
- `src/components/features/templates/TemplatePreview.tsx`
- `src/components/features/templates/TemplateForm.tsx`
- `src/app/app/templates/page.tsx`

**Modified files:**
- `src/mocks/handlers/index.ts` — added `templateHandlers` import + spread

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-20 | Story created (FE Phase 1) | bmad-create-story |
| 2026-03-20 | All 6 tasks implemented; 40/40 tests pass | bmad-dev-story |
