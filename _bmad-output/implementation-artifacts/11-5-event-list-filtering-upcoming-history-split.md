# Story 11.5 — Event List Filtering & Upcoming/History Split

**Epic:** 11 — UX Experience & Routing Revamp
**Phase:** FE-only (Phase 1)
**Priority:** Medium
**Depends on:** 11.1 (routing migration)
**Sprint Change Proposal:** 2026-03-20

---

## Description

Split the event list page into "Mendatang" (upcoming) and "Riwayat" (history) tabs with filtering controls. Upcoming shows draft/published/active events sorted soonest-first; History shows completed/cancelled/archived events sorted most-recent-first.

---

## Acceptance Criteria

### Tab Navigation
- [ ] `/app/events` page has tab navigation: "Mendatang" | "Riwayat"
- [ ] Default tab: Mendatang
- [ ] Event count badge on each tab: "Mendatang (5)" | "Riwayat (12)"
- [ ] Tab state preserved in URL: `?tab=upcoming` (default) or `?tab=history`

### Mendatang (Upcoming) Tab
- [ ] Shows events with status: `draft`, `published`, `active`
- [ ] Sorted by `eventDate` ascending (soonest first)
- [ ] Empty state: "Tidak ada event mendatang"

### Riwayat (History) Tab
- [ ] Shows events with status: `completed`, `cancelled`, `archived`
- [ ] Sorted by `eventDate` descending (most recent first)
- [ ] Empty state: "Belum ada riwayat event"

### Filter Controls
- [ ] Status filter: multi-select chips matching the active tab's valid statuses
  - Mendatang chips: Draft, Dipublikasi, Berlangsung
  - Riwayat chips: Selesai, Dibatalkan, Diarsipkan
- [ ] Date range filter: start date → end date picker
- [ ] Search: text search on event name (client-side filter)
- [ ] Filters reset when switching tabs

### Filter Persistence
- [ ] Filter state preserved in URL search params
  - Example: `?tab=history&status=completed&search=jakarta`
- [ ] Bookmarkable/shareable filter URLs

### Mobile UX
- [ ] Filters collapse into a filter sheet (bottom drawer) on mobile
- [ ] Filter button with active-filter count badge
- [ ] Tabs remain visible (horizontal scroll if needed)

---

## MSW Changes

- No additional handlers needed
- Client-side filtering of existing `useEvents()` hook data

---

## Technical Notes

- `useSearchParams` for filter state persistence
- Client-side filtering in Phase 1 (server-side pagination + filtering in Phase 2)
- Reuse existing `useEvents()` hook — no new API calls
- Status grouping constants:
  ```typescript
  const UPCOMING_STATUSES = ['draft', 'published', 'active'] as const
  const HISTORY_STATUSES = ['completed', 'cancelled', 'archived'] as const
  ```

---

## Out of Scope

- Server-side filtering/pagination (Phase 2)
- Saved/named filter presets
- Export filtered results
