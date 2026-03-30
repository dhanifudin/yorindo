# Story 3.10: TriagePanel — Inline Duplicate Records

**Status:** review

## Story

As an admin,
I want to review and resolve duplicate contact pairs inline on the contacts page without navigating to a sub-page,
so that I can triage duplicate data quality issues within my current workflow context and see health counts update in real time.

## Acceptance Criteria

1. TriagePanel expands via shadcn `Collapsible` + `CollapsibleContent` with `motion-safe:data-[state=open]:animate-collapsible-down` animation when the HealthBar duplicates stat is clicked.
2. Focus moves to first interactive element on expand; returns to the duplicates stat trigger on collapse.
3. In duplicates mode: fetches `GET /api/contacts/duplicates`; shows pairs with "Lihat Perbedaan"; clicking opens a `Sheet` with side-by-side diff and `Gabung` / `Bukan Duplikat` actions.
4. Duplicate resolution applies optimistic `contacts-health.duplicates` decrement and rolls back on failure.
5. When the last duplicate pair is resolved, the panel auto-collapses and a completion toast is shown.
6. Collapse toggle button in the panel header collapses the panel and restores focus to the triggering stat.

## Tasks / Subtasks

- [x] Install or keep shadcn `Collapsible` support available
- [x] Create `src/components/features/contacts/TriagePanel.tsx`
  - [x] `'use client'`
  - [x] Props: `mode: 'flagged' | 'duplicates' | null; onClose: () => void`
  - [x] Use `Collapsible open={mode !== null} onOpenChange={(open) => !open && onClose()}`
  - [x] Header: duplicate triage title + collapse toggle button
  - [x] Focus management on expand/collapse
- [x] Create duplicate triage view inside `TriagePanel`
  - [x] Fetch `GET /api/contacts/duplicates`
  - [x] Show pair rows with score and "Lihat Perbedaan"
  - [x] Open `Sheet` for pair diff review
  - [x] `POST /api/contacts/:id/merge` decrements duplicate count optimistically
  - [x] `DELETE /api/contacts/duplicates/:id` decrements duplicate count optimistically
- [x] Add `DELETE /api/contacts/duplicates/:id` MSW handler
- [x] Integrate `TriagePanel` into `ContactsCommandCenter.tsx`

## Dev Notes

- The current HealthBar exposes `duplicates`, `missingEmail`, and `missingPhone` as visible metrics. Only `duplicates` opens the TriagePanel.
- `flagged` still exists in the broader data-quality model and some internal panel code paths, but it is no longer the primary visible HealthBar trigger in the current implementation.
- Duplicate optimistic updates target the `['contacts-health']` React Query cache.
- The existing duplicate handlers and merge flow are reused rather than duplicated.

## Files

- `src/components/features/contacts/TriagePanel.tsx`
- `src/components/features/contacts/ContactsCommandCenter.tsx`
- `src/mocks/handlers/contacts.ts`
