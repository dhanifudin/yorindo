# Story 9.1: Participant Data Request (Copy of Stored Data)

**Story ID:** 9.1
**Story Key:** 9-1-participant-data-request-copy-of-stored-data
**Epic:** Epic 9 — Participant Data Rights & UU PDP Compliance
**Phase:** Phase 1 (FE) — data request form UI wired to MSW stub
**Status:** review
**Created:** 2026-03-20

---

## Story

As a participant,
I want to request a copy of all personal data Yorindo holds about me,
So that I can exercise my right to data portability under UU PDP Art. 28.

> **Phase 1 FE scope:** Build the data request form (phone + email, confirmation screen, submitted state), the erasure request form with two-step confirmation, and the erasure vs. cancellation explanation page — all wired to MSW stub 202 responses. These are public routes (no authentication required).

---

## Acceptance Criteria (FE Phase 1)

**AC1:** Given `/data-rights` is accessed (public, no auth required),
When the page loads,
Then three options are shown: "Minta Salinan Data", "Hapus Data Saya", "Pelajari Hak Data Anda"

**AC2:** Given "Minta Salinan Data" is clicked,
Then a form appears with phone and email fields and a submit button

**AC3:** Given the form is submitted with valid phone + email,
When `POST /api/participants/data-request` returns 202,
Then a confirmation screen shows: "Permintaan Anda sedang diproses. Kami akan mengirim salinan data ke email Anda dalam 24 jam."

**AC4:** Given "Hapus Data Saya" is clicked,
Then a two-step confirmation flow:
- Step 1: "Apakah Anda yakin?" with explanation of permanent anonymization
- Step 2: "Saya memahami bahwa tindakan ini tidak dapat dibatalkan" checkbox + "Hapus Data Saya" button

**AC5:** Given the erasure form is submitted,
When `POST /api/participants/erasure-request` returns 202,
Then: "Permintaan penghapusan data Anda telah diterima."

**AC6:** Given "Pelajari Hak Data Anda" is clicked,
Then an explanation page clearly distinguishes cancellation vs. erasure in Indonesian

---

## Tasks / Subtasks

- [x] **Task 1: Add MSW data rights handlers**
  - [x] Create `src/mocks/handlers/dataRights.ts` — POST data-request + erasure-request, 202, 500ms delay
  - [x] Added `dataRightsHandlers` to `handlers/index.ts`

- [x] **Task 2: Create data rights hub page**
  - [x] Create `src/app/data-rights/page.tsx` — 3 cards linking to request/erasure/learn; all Indonesian

- [x] **Task 3: Build data request form page**
  - [x] Create `src/app/data-rights/request/page.tsx` — RHF + Zod; phone regex; multi-step form → success screen

- [x] **Task 4: Build erasure request form with two-step confirmation**
  - [x] Create `src/app/data-rights/erasure/page.tsx` — warning step → form with checkbox; `z.literal(true)` + disabled submit

- [x] **Task 5: Build erasure vs. cancellation explanation page**
  - [x] Create `src/app/data-rights/learn/page.tsx` — static Indonesian content + comparison table

- [x] **Task 6: Write vitest tests**
  - [x] Test: POST data-request returns 202 with requestId
  - [x] Test: POST erasure-request returns 202
  - [x] Test: phone regex accepts +62/08 formats, rejects invalid

---

## Dev Notes

### New MSW Handler Required
```typescript
// src/mocks/handlers/dataRights.ts
import { http, HttpResponse, delay } from 'msw'
import { faker } from '@faker-js/faker'

export const dataRightsHandlers = [
  http.post('/api/participants/data-request', async () => {
    await delay(500)
    return HttpResponse.json({ message: 'Request queued', requestId: faker.string.uuid() }, { status: 202 })
  }),
  http.post('/api/participants/erasure-request', async () => {
    await delay(500)
    return HttpResponse.json({ message: 'Erasure queued', requestId: faker.string.uuid() }, { status: 202 })
  }),
]
```

### Indonesian Language Requirements
All user-facing text on these pages must be in Indonesian (Bahasa Indonesia). This is a compliance page — clarity is critical. Do not use English placeholders.

Key phrases:
- "Minta Salinan Data" = Request Data Copy
- "Hapus Data Saya" = Delete My Data
- "Pelajari Hak Data Anda" = Learn Your Data Rights
- "Permintaan sedang diproses" = Request is being processed

### File Locations (from architecture)
- Hub page: `src/app/data-rights/page.tsx`
- Request form: `src/app/data-rights/request/page.tsx`
- Erasure form: `src/app/data-rights/erasure/page.tsx`
- Explanation: `src/app/data-rights/learn/page.tsx`
- MSW handler: `src/mocks/handlers/dataRights.ts`

### Phone Validation (Indonesian format)
```typescript
const phoneSchema = z.string().regex(
  /^(\+62|08)\d{8,12}$/,
  'Nomor telepon tidak valid. Gunakan format +62 atau 08.'
)
```

### Public Routes
All `/data-rights/*` routes are public — no authentication required. Do NOT wrap in the admin layout.

### Key Anti-Patterns
- DO NOT hardcode English text on these pages — Indonesian only
- DO NOT skip the two-step confirmation for erasure — it's a compliance requirement
- DO NOT implement real data export/anonymization — Phase 2 only

---

## Dev Agent Record

### Implementation Plan

1. Created `src/mocks/handlers/dataRights.ts` — POST data-request + erasure-request with 202 + faker requestId. Added to handlers/index.ts.
2. Created `src/app/data-rights/layout.tsx` — minimal public layout, max-w-xl centered.
3. Created `src/app/data-rights/page.tsx` — hub with 3 cards (request/erasure/learn).
4. Created `src/app/data-rights/request/page.tsx` — RHF + Zod phone/email; POST on submit; success screen.
5. Created `src/app/data-rights/erasure/page.tsx` — 3-step: warning → form with `z.literal(true)` checkbox → success.
6. Created `src/app/data-rights/learn/page.tsx` — static Indonesian content + cancellation vs. erasure comparison table.
7. Created `src/app/data-rights/dataRights.test.ts` — 5 tests (2 API, 3 phone regex).

### Debug Log

- `z.literal(true, { errorMap: ... })` not valid in Zod v4 — fixed to `{ error: '...' }`.

### Completion Notes

All 6 tasks complete. 52/52 tests pass (5 new; 47 pre-existing). `tsc --noEmit` clean. All data-rights pages are public routes with Indonesian-only text.

---

## File List

**New files:**
- `src/mocks/handlers/dataRights.ts`
- `src/app/data-rights/layout.tsx`
- `src/app/data-rights/page.tsx`
- `src/app/data-rights/request/page.tsx`
- `src/app/data-rights/erasure/page.tsx`
- `src/app/data-rights/learn/page.tsx`
- `src/app/data-rights/dataRights.test.ts`

**Modified files:**
- `src/mocks/handlers/index.ts` — added `dataRightsHandlers`

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-20 | Story created (FE Phase 1) | bmad-create-story |
| 2026-03-20 | All 6 tasks implemented; 52/52 tests pass | bmad-dev-story |
