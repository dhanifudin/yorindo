# Story 4.16: VendorForm Edit Pre-Population Fix

**Story ID:** 4.16
**Story Key:** 4-16-vendor-form-edit-pre-population-fix
**Epic:** Epic 4 — Event Configuration & Management
**Status:** review
**Created:** 2026-03-26

---

## Story

As an admin editing a vendor,
I want the edit form to pre-populate with the vendor's existing data,
So that I can update specific fields without re-entering everything.

---

## Acceptance Criteria

**AC1:** Given I click Edit on an existing vendor,
When the VendorForm dialog opens,
Then all fields (name, contact_email, website, logo_url, industry, notes) are pre-filled with the vendor's current values

**AC2:** Given the form is pre-filled and I change only the `name` field,
When I submit,
Then only `name` is updated — all other fields retain their original values

**AC3:** Given I close the dialog without saving and re-open it,
When the dialog opens again,
Then it shows the original vendor values (not stale edited state)

---

## Tasks / Subtasks

- [x] **Task 1: Fix VendorForm reset on open**
  - [x] Subtask 1.1: Add `useEffect` that calls `reset()` with vendor values when `open` becomes true
  - [x] Subtask 1.2: Ensure create mode resets to empty values when opened without a vendor prop

- [x] **Task 2: Write tests**
  - [x] Subtask 2.1: Test that edit mode pre-fills all fields from vendor prop
  - [x] Subtask 2.2: Test that create mode opens with empty fields
  - [x] Subtask 2.3: Test that re-opening after close shows fresh vendor values

---

## Dev Notes

### Root Cause

`useForm` with `defaultValues` caches values on initial mount. The `VendorForm` Dialog is always mounted (not conditionally rendered) — when `vendor` prop changes (user clicks Edit on a different vendor), the form fields don't update because `defaultValues` was already computed on first render.

### Fix

```typescript
useEffect(() => {
  if (open) {
    reset({
      name: vendor?.name ?? '',
      contact_email: vendor?.contact_email ?? '',
      website: vendor?.website ?? '',
      logo_url: vendor?.logo_url ?? '',
      industry: vendor?.industry ?? '',
      notes: vendor?.notes ?? '',
    })
  }
}, [open, vendor, reset])
```

Triggering on `open` ensures the form is fresh every time the dialog is opened — whether for create or edit.

---

## Dev Agent Record

### Implementation Plan

Applied `useEffect` with `reset()` triggered on `[open, vendor, reset]` dependency array. This fires every time the dialog opens, ensuring form state reflects the current `vendor` prop — whether create mode (empty) or edit mode (pre-populated).

### Debug Log

No issues encountered.

### Completion Notes

Fix applied to `VendorForm.tsx`. Tests written in `VendorForm.test.tsx` covering all 3 ACs. Also fixed a pre-existing `useEvents.test.ts` seed count mismatch (5→6) caused by event-006 being added in earlier story work.

---

## File List

- `yorindo-app/src/components/features/vendors/VendorForm.tsx` — added `useEffect` import + reset-on-open effect
- `yorindo-app/src/components/features/vendors/VendorForm.test.tsx` — new test file (4 tests)
- `yorindo-app/src/hooks/useEvents.test.ts` — seed count corrected (5→6)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-26 | Story created from SCP 2026-03-26k | bmad-correct-course |
