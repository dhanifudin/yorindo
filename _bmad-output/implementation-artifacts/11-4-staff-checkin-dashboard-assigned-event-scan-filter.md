# Story 11.4: Staff Check-in Dashboard & Assigned Event Scan Filter

**Story ID:** 11.4
**Story Key:** 11-4-staff-checkin-dashboard-assigned-event-scan-filter
**Epic:** Epic 11 — UX Experience & Routing Revamp
**Phase:** Phase 1 (FE) — scan page update + in-session stats panel
**Status:** review
**Created:** 2026-03-21

---

## Story

As a staff member on event day,
I want the scan page to show only my assigned active events for today and display live check-in progress,
So that I don't accidentally scan the wrong event and can monitor attendance without leaving the scanner.

> **Depends on:** Story 11.1 (routing migration), Story 11.3 (`GET /api/users/me/assigned-events` MSW handler and `useAssignedEvents` hook created).

---

## Acceptance Criteria

**AC1 — Assigned Event Source for Staff:**
When `user.role === 'staff'`, the scan page event picker uses `GET /api/users/me/assigned-events` (via `useAssignedEvents`) instead of `GET /api/events` (via `useEvents`). Admin and Viewer roles continue to use `GET /api/events` (unaffected).

**AC2 — Date + Status Filter:**
The assigned events list is client-filtered to only include events where:
- `status === 'active'`
- `eventDate` falls on today's date in the event's timezone

**AC3 — Empty State:**
When filtered assigned events is empty, the scan page shows: "Tidak ada event aktif yang ditugaskan hari ini." The QR scanner section is not shown; a "Kembali ke Dashboard" button → `/app` is displayed.

**AC4 — Single-Event Auto-Select:**
When exactly one active-today assigned event exists, it is auto-selected (no event picker sheet shown). The user goes directly to the scan view for that event.

**AC5 — Multiple Events:**
When multiple active-today assigned events exist, the event picker Sheet is shown with only the filtered list. The picker header changes to "Pilih Event Hari Ini".

**AC6 — URL Parameter Pre-select:**
The scan page reads the `?eventId=` query param on mount. If present and the event is in the allowed list (assigned + active + today for staff, any event for admin/viewer), it auto-selects that event. This enables the "Mulai Scan" button from StaffDashboard (Story 11.3) to deep-link directly into scan mode.

**AC7 — In-Session Stats Bar:**
When an event is selected, a compact stats bar is rendered above the QR scanner viewport:
- "Check-in: {attended} / {total}" (from `GET /api/events/:id/attendance-stats`)
- A horizontal progress bar (percentage of capacity filled)
- "Terakhir scan: {contactName} — {timeAgo}" (from the most recent successful scan result, stored in component state)
- The stats bar collapses (hides) when the user scrolls down to maximize scanner area; it reappears when scrolling back up

**AC8 — Stats Refresh:**
The attendance stats (`GET /api/events/:id/attendance-stats`) are fetched with `refetchInterval: 10_000` (10 seconds). The stats bar updates automatically without user action.

**AC9 — Stats Bar Loading:**
While the first stats fetch is pending, the stats bar shows a single-line skeleton placeholder. It does not show 0/0 before data arrives.

**AC10:** `npm run build` passes with 0 TypeScript errors.

---

## Tasks / Subtasks

- [x] **Task 1 — Role-conditional event source (AC: 1, 2)**
  - [x] In `src/app/app/scan/page.tsx`, import `useAssignedEvents` from `@/hooks/useAssignedEvents`
  - [x] Call both `useEvents()` and `useAssignedEvents()` conditionally: call `useAssignedEvents` only when `user?.role === 'staff'`; call `useEvents` otherwise (or always call both and pick based on role — choose whichever avoids conditional hook call issues)
  - [x] Build `filteredEvents` array: for staff = `useAssignedEvents.data` filtered by `status === 'active'` AND `isToday(eventDate, timezone)`; for admin/viewer = `useEvents.data?.data`

- [x] **Task 2 — Empty state (AC: 3)**
  - [x] When `user.role === 'staff'` and `filteredEvents.length === 0` (after loading), replace the scan viewport with empty state UI:
    - Centered message: "Tidak ada event aktif yang ditugaskan hari ini."
    - `<Button asChild><Link href="/app">Kembali ke Dashboard</Link></Button>`
  - [x] Show skeleton while loading (not empty state)

- [x] **Task 3 — Auto-select single event (AC: 4)**
  - [x] After `filteredEvents` resolves, if `filteredEvents.length === 1` and no `selectedEventId` is set, auto-call `setSelectedEventId(filteredEvents[0].id)`

- [x] **Task 4 — URL param pre-select (AC: 6)**
  - [x] Use `useSearchParams()` to read `eventId` query param on mount
  - [x] In a `useEffect` that runs after `filteredEvents` is loaded, if `eventId` param is present AND it's in `filteredEvents`, set it as the selected event
  - [x] This `useEffect` runs once (depend on `filteredEvents` loading state)

- [x] **Task 5 — Stats bar component (AC: 7, 8, 9)**
  - [x] Create `src/components/features/scan/ScanStatsBar.tsx`
  - [x] Props: `eventId: string`, `lastScan: { contactName: string; time: Date } | null`
  - [x] Fetches `GET /api/events/:id/attendance-stats` via `useQuery` with `refetchInterval: 10_000`
  - [x] Renders: "Check-in: {attended} / {total}", progress bar, last scan info
  - [x] While loading: single skeleton line (no 0/0 flash)
  - [x] Collapses on scroll (see Scroll Collapse Pattern in Dev Notes)

- [x] **Task 6 — Integrate stats bar into scan page (AC: 7)**
  - [x] Import and render `<ScanStatsBar>` in `src/app/app/scan/page.tsx` above the scanner viewport when `selectedEventId` is set
  - [x] Pass `lastScan` state from `handleCheckInSuccess` callback (update it with `{ contactName, time: new Date() }`)
  - [x] Update `handleCheckInSuccess` callback to also set `lastScan` state

- [x] **Task 7 — Update event picker for staff (AC: 5)**
  - [x] When `user.role === 'staff'`, change `<SheetTitle>` from "Pilih Event" to "Pilih Event Hari Ini"
  - [x] The Sheet renders `filteredEvents` (already filtered) — no further change needed

- [x] **Task 8 — Verify build (AC: 10)**
  - [x] `npm run build` — 0 TypeScript errors

---

## Dev Notes

### Avoiding Conditional Hook Calls

React's rules of hooks prohibit calling hooks conditionally. The staff role check happens at runtime, not at compile time. Use this pattern:

```tsx
// Always call both hooks; use the appropriate data based on role
const { data: allEventsData, isLoading: allEventsLoading } = useEvents()
const { data: assignedEvents, isLoading: assignedLoading } = useAssignedEvents()

const isStaff = user?.role === 'staff'
const isLoading = isStaff ? assignedLoading : allEventsLoading

const allEvents = isStaff
  ? (assignedEvents ?? []).filter(
      (e) => e.status === 'active' && isToday(e.eventDate, e.timezone)
    )
  : (allEventsData?.data ?? [])
```

> `useAssignedEvents` will not actually fire a network request when disabled via `enabled: !!accessToken` — it only fetches when the user is authenticated, which is always true on this page. This is acceptable overhead (one extra MSW call that returns fast).
>
> If you prefer, add an `enabled` option to `useAssignedEvents` to only fetch when `user?.role === 'staff'`. This requires passing the role as a parameter to the hook.

### `isToday` Utility

The same helper from Story 11.3 applies here. If Story 11.3 defines it in a shared location (e.g., `src/lib/dateUtils.ts`), import it. If not, define it locally in the scan page or in `src/lib/dateUtils.ts`:

```typescript
export function isToday(dateStr: string, timezone: string): boolean {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: timezone })
  const eventDay = new Date(dateStr).toLocaleDateString('en-CA', { timeZone: timezone })
  return today === eventDay
}
```

### URL Param Pre-select (AC6)

The "Mulai Scan" button in `StaffDashboard` (Story 11.3) links to `/app/scan?eventId={id}`. The scan page must read this on mount:

```tsx
import { useSearchParams } from 'next/navigation'

const searchParams = useSearchParams()

// After filteredEvents is loaded:
useEffect(() => {
  if (isLoading) return
  const preselect = searchParams.get('eventId')
  if (preselect && !selectedEventId) {
    const found = filteredEvents.find((e) => e.id === preselect)
    if (found) setSelectedEventId(found.id)
  }
}, [isLoading])
```

> `useSearchParams()` requires the component to be a client component (already is) and the page to be wrapped in a `<Suspense>` boundary for static export. Since the scan page is already a `'use client'` component and is not statically exported (it contains dynamic logic), this is fine. Verify the build does not error on this.

### Auto-Select Single Event (AC4)

```tsx
useEffect(() => {
  if (isLoading || selectedEventId) return
  if (isStaff && filteredEvents.length === 1) {
    setSelectedEventId(filteredEvents[0].id)
  }
}, [isLoading, filteredEvents.length, isStaff])
```

Run this after the URL param pre-select effect so URL params take priority.

### ScanStatsBar Component

```tsx
// src/components/features/scan/ScanStatsBar.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { Progress } from '@/components/ui/progress'  // or use a div-based bar

interface Props {
  eventId: string
  capacity: number
  lastScan: { contactName: string; time: Date } | null
}

interface AttendanceStats {
  total: number
  attended: number
  pending: number
}

export function ScanStatsBar({ eventId, capacity, lastScan }: Props) {
  const { data, isLoading } = useQuery<AttendanceStats>({
    queryKey: ['attendance-stats', eventId],
    queryFn: () => fetch(`/api/events/${eventId}/attendance-stats`).then((r) => r.json()),
    refetchInterval: 10_000,
  })

  if (isLoading) {
    return <div className="h-10 bg-muted animate-pulse rounded mx-4 my-2" />
  }

  const percent = capacity > 0 ? Math.round(((data?.attended ?? 0) / capacity) * 100) : 0

  return (
    <div className="px-4 py-2 bg-muted/50 border-b border-border">
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="font-medium">Check-in: {data?.attended ?? 0} / {capacity}</span>
        {lastScan && (
          <span className="text-xs text-muted-foreground">
            {lastScan.contactName} — {formatTimeAgo(lastScan.time)}
          </span>
        )}
      </div>
      <div className="w-full bg-background rounded-full h-1.5">
        <div
          className="bg-primary h-1.5 rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return `${seconds}d lalu`
  return `${Math.floor(seconds / 60)}m lalu`
}
```

> **Note:** The `capacity` prop should come from the selected event object. Pass `selectedEvent?.capacity ?? 0` from the scan page.

### Scroll Collapse Pattern (AC7)

To collapse the stats bar on scroll and show on scroll-up:

```tsx
// In ScanStatsBar or in the parent container:
const [collapsed, setCollapsed] = useState(false)
const lastScrollY = useRef(0)

useEffect(() => {
  const container = document.querySelector('.scan-scroll-container') // or window
  const onScroll = () => {
    const current = container?.scrollTop ?? window.scrollY
    setCollapsed(current > lastScrollY.current && current > 40)
    lastScrollY.current = current
  }
  container?.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('scroll', onScroll, { passive: true })
  return () => {
    container?.removeEventListener('scroll', onScroll)
    window.removeEventListener('scroll', onScroll)
  }
}, [])

// Apply:
<div className={`transition-all overflow-hidden ${collapsed ? 'max-h-0' : 'max-h-20'}`}>
  <ScanStatsBar ... />
</div>
```

Alternatively, use `className="hidden"` toggle for simplicity — smooth animation is nice-to-have, not required.

### `handleCheckInSuccess` Update

The current `handleCheckInSuccess` in `scan/page.tsx`:
```tsx
const handleCheckInSuccess = useCallback((result: { contactName: string; eventName: string }) => {
  toast.success(`✓ ${result.contactName}`)
}, [])
```

Update to also set `lastScan` state:
```tsx
const [lastScan, setLastScan] = useState<{ contactName: string; time: Date } | null>(null)

const handleCheckInSuccess = useCallback((result: { contactName: string; eventName: string }) => {
  toast.success(`✓ ${result.contactName}`)
  setLastScan({ contactName: result.contactName, time: new Date() })
}, [])
```

### MSW Fixture for Testing (AC4)

With the current MSW data:
- DevToolbar "staff" → id `dev-staff` → maps to `user-002` (Budi Santoso)
- `user-002` assigned to `event-001` and `event-003`
- `event-003` status: `active`, eventDate: `2026-03-20T02:00:00.000Z` (today = 2026-03-20)
- `event-001` status: `published`, eventDate: `2026-04-15T02:00:00.000Z` (future, not today)

**Expected behavior when logged in as DevToolbar "staff":**
- `filteredEvents` = [`event-003`] (only active+today after filtering)
- Auto-select triggers: `selectedEventId` = `event-003`
- Scanner opens immediately for "Forum Kesehatan Digital Surabaya"
- Stats bar shows attendance for event-003

This provides an immediately testable scenario without any fixture changes.

### File Change Summary

New files:
- `src/components/features/scan/ScanStatsBar.tsx`

Modified files:
- `src/app/app/scan/page.tsx` — role-conditional event source, auto-select, URL param, stats bar integration, lastScan state

No new MSW handlers required (added in Story 11.3). No new hooks (uses `useAssignedEvents` from Story 11.3).

> **If Story 11.3 hasn't been implemented yet:** You'll also need to create `src/hooks/useAssignedEvents.ts` and add the MSW handler for `GET /api/users/me/assigned-events` before implementing this story.

### References

- Sprint Change Proposal: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-21.md` — Story 11.4 spec
- `src/app/app/scan/page.tsx` — full current scan page implementation
- `src/hooks/useAssignedEvents.ts` — created in Story 11.3
- `src/mocks/handlers/events.ts` — eventsStore, `GET /api/events/:id/attendance-stats` handler
- `src/mocks/handlers/users.ts` — userEventAssignments, `GET /api/users/me/assigned-events` (Story 11.3)
- `_bmad-output/implementation-artifacts/11-3-role-based-personalized-dashboards.md` — dependency story

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — build passed on first attempt.

### Completion Notes List

- Used the "always call both hooks" pattern to avoid conditional hook calls; pick data by role at runtime.
- `isToday` imported from `src/lib/dateUtils.ts` (created in Story 11.3).
- `useAssignedEvents` imported from Story 11.3 hook (already created).
- `ScanStatsBar` uses scroll collapse via `window.scroll` listener with `max-h` transition.
- URL param pre-select effect runs once after `isLoading` clears; auto-select single event runs after, so URL param takes priority.

### File List

New files:
- `src/components/features/scan/ScanStatsBar.tsx`

Modified files:
- `src/app/app/scan/page.tsx` — role-conditional event source, auto-select, URL param pre-select, stats bar integration, lastScan state, staff empty state, picker title
