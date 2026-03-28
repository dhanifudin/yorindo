# Story 7.5: Name Search & Manual Check-in

**Story ID:** 7.5
**Story Key:** 7-5-name-search-manual-override-check-in
**Epic:** Epic 7 — Event-Day Check-in (Offline-First PWA)
**Phase:** Phase 1 (FE) — wired to MSW handlers
**Status:** review

---

## Story

As a staff member,
I want to search for a participant by name when QR scan fails,
So that I can still check them in by visually matching their displayed profile with their physical KTP.

> **Updated 2026-03-28** — Removed OTP fallback (Story 7.4 retired). Removed reason dialog for manual override. Name search result now leads to the same profile + Setujui screen as Story 7.2, maintaining a consistent check-in UX regardless of path. `check_in_method: 'manual'` logged to distinguish from QR path.

---

## Acceptance Criteria

**AC1:** A "Cari Peserta" button on the scan page opens a shadcn Sheet from the bottom.

**AC2:** Given the search sheet is open,
When staff types a name,
Then `GET /api/events/:id/participants?name=...` is called with 300ms debounce; results show Name, Company, and Reg# per row.

**AC3:** Given a search result row is tapped,
Then the sheet transitions to the same profile + Setujui screen as Story 7.2:
```
┌──────────────────────────────────┐
│ ✓ Peserta Ditemukan               │
│                                   │
│ [Name — large bold]               │
│ [Company · Position]              │
│ Reg #[registrationNumber]         │
│                                   │
│      [Setujui Check-in]           │
└──────────────────────────────────┘
```
Staff compares the displayed information against the physical KTP before tapping.

**AC4:** Given staff taps "Setujui Check-in",
Then `PATCH /api/registrations/:id/attendance { attendance_status: 'attended', check_in_method: 'manual' }` is called
→ 4s Sonner toast "✓ [name] — check-in manual berhasil"
→ sheet closes, scanner ready for next scan

**AC5 — MSW handlers:**
- `GET /api/events/:id/participants?name=...` — returns array of matching mock participants: `[{ id, name, company, position, registrationNumber }]`; returns empty `[]` for unknown names
- `PATCH /api/registrations/:id/attendance` — reuse handler from Story 7.2 (returns `{ success: true }`)

---

## Tasks / Subtasks

- [ ] **Task 1 — Search sheet UI (AC: 1, 2)**
  - [ ] Add "Cari Peserta" Button to scan page (below event selector)
  - [ ] Open shadcn `Sheet` on tap
  - [ ] `Input` with debounce → `useQuery` → `GET /api/events/:id/participants?name=`
  - [ ] Result list: Name, Company, Reg# per row

- [ ] **Task 2 — Profile + Setujui screen (AC: 3, 4)**
  - [ ] On row tap: sheet transitions to profile view (same visual structure as `ScanResultCard` `'profile'` state)
  - [ ] "Setujui Check-in" button calls `PATCH /api/registrations/:id/attendance { check_in_method: 'manual' }`
  - [ ] `useMutation` → on success: toast "check-in manual berhasil" → close sheet

- [ ] **Task 3 — MSW handlers (AC: 5)**
  - [ ] Add `GET /api/events/:id/participants` handler to `src/mocks/handlers/scan.ts` or `events.ts`
  - [ ] Returns 3–5 mock participants for any non-empty name query
  - [ ] `PATCH /api/registrations/:id/attendance` already exists from Story 7.2 — reuse

- [ ] **Task 4 — Tests**
  - [ ] Test: search input → debounced GET call → results rendered
  - [ ] Test: row tap → profile view shown with correct name/company
  - [ ] Test: Setujui → PATCH called with `check_in_method: 'manual'` → toast shown

---

## Dev Notes

### Shared Setujui screen
The profile + Setujui view is the same visual component as `ScanResultCard` with `type: 'profile'` from Story 7.2. Reuse `ScanResultCard` rather than duplicating the layout. Pass `checkInMethod: 'manual'` as a prop to control the PATCH payload.

### Participants endpoint
```typescript
// GET /api/events/:id/participants?name=budi
// MSW response:
[
  { id: 'reg-001', name: 'Budi Santoso', company: 'PT Maju Jaya', position: 'Manager', registrationNumber: 'REG-0042' },
  { id: 'reg-002', name: 'Budi Hartono', company: 'CV Teknologi', position: 'Direktur', registrationNumber: 'REG-0017' },
]
```

### Removed patterns
- No reason dialog — removed entirely
- No `POST /api/scan/manual-checkin` — replaced by `PATCH /api/registrations/:id/attendance`
- No OTP recovery reference

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-22 | Story created | bmad-context-engine |
| 2026-03-28 | Full redesign: Setujui screen replaces reason dialog; `check_in_method: 'manual'`; OTP references removed; PATCH endpoint aligned with Story 7.2 | SCP-2026-03-28-B |
