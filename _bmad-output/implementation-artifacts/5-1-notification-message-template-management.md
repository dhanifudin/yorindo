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

> **Current implementation note (2026-03-30):** The active runtime still uses the simpler current template flow. The richer TipTap + QR-inline template model remains a target-state follow-up.

---

## Acceptance Criteria (FE Phase 1)

**AC1:** Given `/app/templates` renders,
When the page loads,
Then a list of templates is shown with: name, channel badge (email/whatsapp), type badge (invitation/confirmation/rejection/ticket_delivery), and edit/delete actions

**AC2:** Given the "New Template" button is clicked,
Then a form appears with: name, type (dropdown: `invitation | confirmation | rejection | ticket_delivery`), channel (dropdown: `email | whatsapp`), and TipTap body editor

**AC3:** Given the body editor contains `{{name}}`, `{{event_title}}`, `{{date}}`, `{{venue}}`,
When the preview panel renders (live — updates on every change via RHF `watch`),
Then sample values are substituted and the preview renders in a read-only panel next to the editor; email preview renders HTML; WhatsApp preview renders the WhatsApp-formatted string in a monospace-style panel

**AC4:** Given a valid template form is submitted,
When `POST /api/templates` returns 201,
Then the new template appears in the list and a success toast is shown

**AC5:** Given I click "Edit" on an existing template,
Then the form pre-fills with current values and `PATCH /api/templates/:id` is called on save

**AC6 (Later-spec follow-up):** Given the template channel is `email` or `whatsapp`,
When the template form renders,
Then a TipTap rich-text editor (`shadcn-tiptap` community package) is shown for both channels with channel-appropriate toolbars:
- **Email toolbar:** bold, italic, underline, headings (H1–H3), ordered list, unordered list, link, image; QR Code block button (visible only when `type=confirmation|ticket_delivery`)
- **WhatsApp toolbar:** bold (`*text*`), italic (`_text_`), strikethrough (`~text~`), monospace (`` `text` ``), quote (`> text`), unordered list (`- item`); no image, no headings, no QR button
Output format is determined by `TemplateBodySerializer.serialize(doc, channel)`:
- `channel=email` → HTML string
- `channel=whatsapp` → WhatsApp-formatted plain text string (custom serializer)

**AC7 (Later-spec follow-up):** Given a template of type `confirmation` or `ticket_delivery` with `channel=email`,
When the admin clicks the "QR Code" toolbar button,
Then a visual placeholder block is inserted: "QR Code — digenerate otomatis per peserta" (styled as a grey rounded box); in the live preview panel, a sample QR image is rendered via `react-qr-code` with value `"SAMPLE"`; the `{{qr_code}}` variable is stored in the serialized template body at that position

---

## Tasks / Subtasks

- [x] **Task 1: Add MSW templates handler**
  - [x] Create `src/mocks/handlers/templates.ts`
  - [x] **UPDATE** seeded templates to 4: invitation/whatsapp, confirmation/email (with `{{qr_code}}`), rejection/email, ticket_delivery/email (with `{{qr_code}}`)
  - [x] Handle: `GET /api/templates`, `POST /api/templates` (201), `PATCH /api/templates/:id`, `DELETE /api/templates/:id` (204)
  - [x] Export `templateHandlers` and add to `src/mocks/handlers/index.ts`

- [x] **Task 2: Create templates list page**
  - [x] Create `src/app/app/templates/page.tsx`
  - [x] Fetch via `useTemplates()` React Query hook
  - [x] Render table: name, channel badge, type badge, body preview (truncated), edit/delete actions

- [x] **Task 3: Build TemplateForm component**
  - [x] Create `src/components/features/templates/TemplateForm.tsx`
  - [x] Zod schema: name, type (enum: `invitation|confirmation|rejection|ticket_delivery`), channel (enum: `email|whatsapp`), body (min 10)
  - [x] Handles both create (POST) and edit (PATCH) mode

- [x] **Task 4: Live preview panel**
  - [x] Create `src/components/features/templates/TemplatePreview.tsx`
  - [x] Sample values substituted via regex
  - [x] Updates on every keystroke via RHF `watch('body')`

- [x] **Task 5: Create/Edit template inline panel**
  - [x] Inline panel in page.tsx; edit pre-fills form via `defaultValues`

- [x] **Task 6: Write vitest tests**
  - [x] Test: GET /api/templates returns 4 seeded templates
  - [x] Test: POST /api/templates creates and returns new template
  - [x] Test: preview substitution replaces {{name}} → 'Budi Santoso'

- [ ] **Task 7: TipTap channel-split editor (Later-spec follow-up)**
  - [ ] Install `shadcn-tiptap` and `@tiptap/extension-image`, `@tiptap/extension-strike`, `@tiptap/extension-code`
  - [ ] Create `src/components/features/templates/TemplateEditor.tsx` — wraps `shadcn-tiptap`; accepts `channel` prop; renders email toolbar or WhatsApp toolbar accordingly
  - [ ] Email toolbar: bold, italic, underline, H1–H3, ordered list, unordered list, link, image, QR Code block button (conditional on `type`)
  - [ ] WhatsApp toolbar: bold (`*`), italic (`_`), strikethrough (`~`), monospace (`` ` ``), quote (`>`), unordered list (`-`); no image, no headings, no QR button
  - [ ] Replace textarea in `TemplateForm.tsx` with `TemplateEditor`; wire to RHF via `Controller`

- [ ] **Task 8: TemplateBodySerializer + WhatsApp serializer (Later-spec follow-up)**
  - [ ] Create `src/components/features/templates/TemplateBodySerializer.ts`
  - [ ] `serialize(doc: JSONContent, channel)` → HTML string (email) or WhatsApp format string (whatsapp)
  - [ ] WhatsApp serializer: walk ProseMirror nodes — bold → `*text*`, italic → `_text_`, strike → `~text~`, code → `` `text` ``, blockquote → `> text\n`, bulletList → `- item\n`, paragraph → `text\n\n`
  - [ ] Update `TemplatePreview.tsx`: email preview renders HTML via `dangerouslySetInnerHTML`; WhatsApp preview renders serialized string in `<pre>` styled panel
  - [ ] Tests: email serializer produces HTML tags; WhatsApp serializer produces `*bold*`, `_italic_`, `~strike~`

- [ ] **Task 9: QR Code block extension (Later-spec follow-up)**
  - [ ] Create custom TipTap node extension `QrCodeBlock` — renders placeholder block in editor; serializes to `{{qr_code}}` in email HTML output
  - [ ] QR toolbar button shown only when `channel=email` AND `type=confirmation|ticket_delivery`
  - [ ] Update `TemplatePreview.tsx`: when body contains `{{qr_code}}`, render `<QRCode value="SAMPLE" size={128} />` via `react-qr-code`
  - [ ] **UPDATE** MSW seeded confirmation template body to include `{{qr_code}}` node
  - [ ] Tests: QR placeholder renders in editor; preview renders sample QR image; serialized body contains `{{qr_code}}`

---

## Dev Notes

### New MSW Handler Required
This story requires adding `src/mocks/handlers/templates.ts` — it does NOT exist yet from Story 1.6. Follow the same pattern as `events.ts`:
```typescript
import { http, HttpResponse, delay } from 'msw'

let templatesStore = [
  {
    id: 'tmpl-001', name: 'Undangan Event', type: 'invitation', channel: 'whatsapp',
    // WhatsApp format: *bold*, _italic_ etc.
    body: 'Halo *{{name}}*, Anda diundang ke *{{event_title}}* pada _{{date}}_ di {{venue}}.\n\nSegera daftarkan diri Anda!'
  },
  {
    id: 'tmpl-002', name: 'Konfirmasi Tiket', type: 'confirmation', channel: 'email',
    // HTML format; {{qr_code}} resolves to <img> at send time
    body: '<p>Selamat <strong>{{name}}</strong>! Registrasi Anda untuk <strong>{{event_title}}</strong> pada {{date}} di {{venue}} telah disetujui.</p><p>Tunjukkan QR code berikut saat check-in:</p>{{qr_code}}'
  },
  {
    id: 'tmpl-003', name: 'Penolakan', type: 'rejection', channel: 'email',
    body: '<p>Maaf <strong>{{name}}</strong>, registrasi Anda untuk <strong>{{event_title}}</strong> tidak dapat kami terima saat ini.</p>'
  },
  {
    id: 'tmpl-004', name: 'Pengiriman Tiket', type: 'ticket_delivery', channel: 'email',
    body: '<p>Halo <strong>{{name}}</strong>, berikut tiket Anda untuk <strong>{{event_title}}</strong> pada {{date}} di {{venue}}.</p><p>QR Tiket:</p>{{qr_code}}<p>Simpan email ini dan tunjukkan QR saat masuk acara.</p>'
  },
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

### TipTap Channel-Split Editor (SCP-2026-03-28-F)

Both channels use TipTap (`shadcn-tiptap`) — one editor library, two output modes.

```typescript
// src/components/features/templates/TemplateBodySerializer.ts
import { generateHTML } from '@tiptap/html'
import type { JSONContent } from '@tiptap/core'

export function serialize(doc: JSONContent, channel: 'email' | 'whatsapp'): string {
  if (channel === 'email') {
    return generateHTML(doc, [...starterKitExtensions])
  }
  // WhatsApp: walk ProseMirror nodes → WhatsApp format string
  return serializeToWhatsApp(doc)
}

// WhatsApp format map (applied by custom node walker):
// bold mark        → *text*
// italic mark      → _text_
// strike mark      → ~text~
// code mark        → `text`
// blockquote node  → > text\n
// bulletList item  → - text\n
// hardBreak        → \n
// paragraph        → text\n\n
```

The serialized string is stored in `template.body` (text/HTML for email; WhatsApp format string for whatsapp). The MSW handler stores and returns it as-is.

### QR Code Block (email only)

```typescript
// Custom TipTap node extension — email channel only
// Inserted via toolbar button; shown as placeholder block in editor
// Serializes to: <img src="{{qr_code}}" alt="QR Tiket" width="200" />
// Preview: renders <QRCode value="SAMPLE" size={128} /> via react-qr-code
```

### Key Anti-Patterns
- DO NOT output HTML for WhatsApp templates — use the WhatsApp format serializer
- DO NOT show QR toolbar button for `channel=whatsapp` or `type=invitation|rejection`
- DO NOT implement real WhatsApp/Brevo integration — that is Phase 2
- DO NOT use server actions — use React Query mutations with fetch()
- DO NOT store TipTap JSONContent in the DB — always serialize to string before POST

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
- `src/components/features/templates/TemplateEditor.tsx` — TipTap channel-split editor (Task 7)
- `src/components/features/templates/TemplateBodySerializer.ts` — HTML + WhatsApp serializers (Task 8)
- `src/app/app/templates/page.tsx`

**Modified files:**
- `src/mocks/handlers/index.ts` — added `templateHandlers` import + spread

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-20 | Story created (FE Phase 1) | bmad-create-story |
| 2026-03-20 | All 6 tasks implemented; 40/40 tests pass | bmad-dev-story |
| 2026-03-28 | AC6–AC7 added: TipTap channel-split editor (email=HTML, whatsapp=WA format); TemplateBodySerializer; QR Code block for confirmation/ticket_delivery; `ticket_delivery` type added; Tasks 7–9 added; seeded templates updated to 4 | SCP-2026-03-28-F |
