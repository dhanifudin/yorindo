# Story 11.3: Role-Based Personalized Dashboards

**Story ID:** 11.3
**Story Key:** 11-3-role-based-personalized-dashboards
**Epic:** Epic 11 — UX Experience & Routing Revamp
**Phase:** Phase 1 (FE) — MSW addition + new dashboard components
**Status:** review
**Created:** 2026-03-21

---

## Story

As a logged-in user,
I want to see a dashboard personalized to my role,
So that admins see management stats, viewers see read-only summaries, and staff see their assigned events for today.

> **Depends on:** Story 11.1 (routing migration complete — `/app` route exists at `src/app/app/page.tsx`).
> **Blocks:** Story 11.4 (staff scan filter requires `GET /api/users/me/assigned-events` MSW handler added here).

---

## Acceptance Criteria

**AC1:** `/app` reads `user.role` from `useAuthStore` and renders the appropriate dashboard component:
- `role === 'admin'` → `<AdminDashboard />`
- `role === 'viewer'` → `<ViewerDashboard />`
- `role === 'staff'` → `<StaffDashboard />`
- unknown/null role → redirect to `/login`

**AC2:** `AdminDashboard` displays:
- Greeting: "Selamat datang, {name}!" with today's date (formatted in Indonesian)
- Stats row: total events, active events, total contacts, pending registrations
- Recent events table: last 5 events by `createdAt`, showing Name, Status badge, Date
- Quick links section: "Buat Event" → `/app/events`, "Upload Kontak" → `/app/contacts/upload`, "Lihat Laporan" → `/app/events`

**AC3:** `ViewerDashboard` displays:
- Greeting: "Selamat datang, {name}!"
- Same stats row as admin (read-only, no action buttons)
- Recent events table (same as admin, without delete/create actions)
- No quick links section

**AC4:** `StaffDashboard` displays:
- Greeting: "Selamat datang, {name}! — Hari ini: {tanggal}"
- Assigned events widget: list of active events assigned to this staff with `eventDate` = today
- Each assigned event card: event name, time (formatted with timezone), check-in count (from attendance stats), "Mulai Scan" button → `/app/scan?eventId={id}`
- Empty state when no assigned active events today: "Tidak ada event yang ditugaskan hari ini."

**AC5:** All dashboard components display a loading skeleton while data is being fetched. Skeletons match the shape of the content they replace.

**AC6:** The current user's `name` is fetched via `GET /api/users/me`. The FE stores the name in component state (not authStore). If the request fails, display the user's `id` as fallback.

**AC7:** A new MSW handler `GET /api/users/me` is added to `src/mocks/handlers/users.ts`. It derives the current user from the Authorization header (`Bearer mock-token-{role}`) and returns the matching user from `usersStore`. For `dev-token`, it uses the `X-User-Id` request header (sent by the FE `useCurrentUser` hook) to look up by id; if not found, returns the first admin user.

**AC8:** A new MSW handler `GET /api/users/me/assigned-events` is added to `src/mocks/handlers/users.ts`. It returns the events assigned to the current user (derived same as AC7), looking up from `userEventAssignments` Map and returning the matching events from the events store. Returns an array of `Event[]`.

**AC9:** Dashboard components live in `src/components/features/dashboard/`:
- `AdminDashboard.tsx`
- `ViewerDashboard.tsx`
- `StaffDashboard.tsx`

**AC10:** `src/app/app/page.tsx` is updated to be a `'use client'` component that renders the role-based component. The metadata export from the current server component must be preserved.

**AC11:** `npm run build` passes with 0 TypeScript errors.

---

## Tasks / Subtasks

- [x] **Task 1 — Add MSW handlers (AC: 7, 8)**
  - [x] Add `GET /api/users/me` to `src/mocks/handlers/users.ts`
  - [x] Add `GET /api/users/me/assigned-events` to `src/mocks/handlers/users.ts`
  - [x] Verify handlers are exported from `src/mocks/handlers/index.ts`

- [x] **Task 2 — Create `useCurrentUser` hook (AC: 6)**
  - [x] Add `src/hooks/useCurrentUser.ts`
  - [x] Hook calls `GET /api/users/me` with the `Authorization: Bearer {accessToken}` header
  - [x] When `accessToken === 'dev-token'`, also send `X-User-Id: {user.id}` header
  - [x] Uses TanStack Query `useQuery` with key `['users', 'me']`
  - [x] Returns `{ data: User | undefined, isLoading: boolean }`

- [x] **Task 3 — Create `AdminDashboard` component (AC: 2, 5)**
  - [x] Create `src/components/features/dashboard/AdminDashboard.tsx`
  - [x] Use `useCurrentUser()` for greeting name
  - [x] Use `useEvents()` for stats (total events, active events, recent 5)
  - [x] Use `useContacts()` / existing hooks for total contacts (if available; use `data?.pagination?.total` or equivalent)
  - [x] For pending registrations: use a simple count from `useQuery(['registrations', 'pending'])` calling `GET /api/registrations?status=pending` — returns mock count
  - [x] Stats row: 4 metric cards (total events, active events, total contacts, pending registrations)
  - [x] Recent events table: last 5 by `createdAt` desc, columns Name + Status + Date
  - [x] Quick links: `<Link href="/app/events">`, `<Link href="/app/contacts/upload">`, `<Link href="/app/events">`
  - [x] Skeleton: 4 metric card skeletons + 5 row table skeleton

- [x] **Task 4 — Create `ViewerDashboard` component (AC: 3, 5)**
  - [x] Create `src/components/features/dashboard/ViewerDashboard.tsx`
  - [x] Same greeting + stats row as AdminDashboard
  - [x] Same recent events table, but no "Buat Event" or action buttons
  - [x] No quick links section

- [x] **Task 5 — Create `StaffDashboard` component (AC: 4, 5, 8)**
  - [x] Create `src/components/features/dashboard/StaffDashboard.tsx`
  - [x] Use `useCurrentUser()` for greeting name
  - [x] Call `GET /api/users/me/assigned-events` via a new hook `useAssignedEvents()`
  - [x] Client-filter: keep only events where `status === 'active'` AND `eventDate` falls on today's date in the event's timezone
  - [x] For each event, show: name, formatted time, attendance count (from `GET /api/events/:id/attendance-stats`), "Mulai Scan" → `/app/scan?eventId={id}`
  - [x] Empty state card: "Tidak ada event yang ditugaskan hari ini."
  - [x] Skeleton: 2 event card skeletons

- [x] **Task 6 — Create `useAssignedEvents` hook (AC: 8)**
  - [x] Add `src/hooks/useAssignedEvents.ts`
  - [x] Calls `GET /api/users/me/assigned-events`
  - [x] Returns `{ data: Event[] | undefined, isLoading: boolean }`

- [x] **Task 7 — Update `src/app/app/page.tsx` (AC: 1, 10)**
  - [x] Add `'use client'` directive
  - [x] Read `user` and `accessToken` from `useAuthStore`
  - [x] Redirect to `/login` if no `accessToken` (useEffect + router.replace)
  - [x] Render `<AdminDashboard />`, `<ViewerDashboard />`, or `<StaffDashboard />` based on `user.role`
  - [x] Return null while redirecting (unknown role or no token)
  - [x] Remove the old `<Metadata>` export (metadata in client components is not supported; add a `layout.tsx` for dashboard title if needed, or remove it)

- [x] **Task 8 — Verify build (AC: 11)**
  - [x] `npm run build` — 0 TypeScript errors

---

## Dev Notes

### `GET /api/users/me` MSW Handler

The handler needs to determine which user is "current". The token formats are:

| Token | User |
|---|---|
| `mock-token-admin` | user-001 (Super Admin, admin) |
| `mock-token-staff` | user-002 (Budi Santoso, staff) |
| `mock-token-viewer` | user-003 (Sari Dewi, viewer) |
| `dev-token` | Derived from `X-User-Id` header |

Implementation in `src/mocks/handlers/users.ts`:

```typescript
http.get('/api/users/me', async ({ request }) => {
  await delay(200)
  const auth = request.headers.get('Authorization') ?? ''
  const token = auth.replace('Bearer ', '')

  // Dev toolbar synthetic IDs
  const DEV_IDS: Record<string, User> = {
    'dev-admin':  { id: 'dev-admin',  name: 'Super Admin',    email: 'admin@yorindo.app', role: 'admin',  createdAt: '', updatedAt: '' },
    'dev-staff':  { id: 'dev-staff',  name: 'Budi Santoso',   email: 'budi@yorindo.app',  role: 'staff',  createdAt: '', updatedAt: '' },
    'dev-viewer': { id: 'dev-viewer', name: 'Sari Dewi',      email: 'sari@yorindo.app',  role: 'viewer', createdAt: '', updatedAt: '' },
  }

  if (token === 'dev-token') {
    const userId = request.headers.get('X-User-Id') ?? 'dev-admin'
    const devUser = DEV_IDS[userId]
    if (devUser) return HttpResponse.json(devUser)
    return usersStore.find((u) => u.id === userId)
      ? HttpResponse.json(usersStore.find((u) => u.id === userId))
      : HttpResponse.json(usersStore[0])
  }

  // Regular mock tokens: mock-token-admin / staff / viewer
  const roleFromToken = token.replace('mock-token-', '') as User['role']
  const user = usersStore.find((u) => u.role === roleFromToken)
  if (!user) return HttpResponse.json(usersStore[0])  // fallback to first admin
  return HttpResponse.json(user)
}),
```

### `GET /api/users/me/assigned-events` MSW Handler

```typescript
http.get('/api/users/me/assigned-events', async ({ request }) => {
  await delay(300)
  const auth = request.headers.get('Authorization') ?? ''
  const token = auth.replace('Bearer ', '')

  let userId: string
  if (token === 'dev-token') {
    userId = request.headers.get('X-User-Id') ?? 'dev-admin'
  } else {
    const roleFromToken = token.replace('mock-token-', '') as User['role']
    const user = usersStore.find((u) => u.role === roleFromToken)
    userId = user?.id ?? 'user-001'
  }

  // Dev IDs: map to real user IDs for assignment lookup
  const devToReal: Record<string, string> = {
    'dev-admin': 'user-001',
    'dev-staff': 'user-002',
    'dev-viewer': 'user-003',
  }
  const lookupId = devToReal[userId] ?? userId
  const assignedEventIds = Array.from(userEventAssignments.get(lookupId) ?? [])
  const assignedEvents = eventsStore.filter((e) => assignedEventIds.includes(e.id))
  return HttpResponse.json(assignedEvents)
}),
```

> **Note:** `eventsStore` is defined in `src/mocks/handlers/events.ts`. Since MSW handler files are separate modules, you'll need to either:
> 1. Export `eventsStore` from `events.ts` and import it in `users.ts`, or
> 2. Move the MSW endpoint to `events.ts`
>
> **Recommended:** Add the `GET /api/users/me/assigned-events` handler to `src/mocks/handlers/events.ts` where `eventsStore` already lives, and export it as part of `eventHandlers`.

### `useCurrentUser` Hook

```typescript
// src/hooks/useCurrentUser.ts
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types/api'

export function useCurrentUser() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)

  return useQuery<User>({
    queryKey: ['users', 'me'],
    queryFn: async () => {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
      }
      // Pass synthetic ID for DevToolbar users
      if (accessToken === 'dev-token' && user?.id) {
        headers['X-User-Id'] = user.id
      }
      const res = await fetch('/api/users/me', { headers })
      if (!res.ok) throw new Error('Failed to fetch current user')
      return res.json()
    },
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000, // 5 min
  })
}
```

### `useAssignedEvents` Hook

```typescript
// src/hooks/useAssignedEvents.ts
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import type { Event } from '@/types/api'

export function useAssignedEvents() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)

  return useQuery<Event[]>({
    queryKey: ['users', 'me', 'assigned-events'],
    queryFn: async () => {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
      }
      if (accessToken === 'dev-token' && user?.id) {
        headers['X-User-Id'] = user.id
      }
      const res = await fetch('/api/users/me/assigned-events', { headers })
      if (!res.ok) throw new Error('Failed to fetch assigned events')
      return res.json()
    },
    enabled: !!accessToken,
  })
}
```

### Today's Date Filter (for StaffDashboard)

Filter assigned events to only show those where the event date is today:

```typescript
function isToday(dateStr: string, timezone: string): boolean {
  const today = new Date()
  const eventDate = new Date(dateStr)
  // Convert both to the event's timezone and compare date parts
  const todayStr = today.toLocaleDateString('en-CA', { timeZone: timezone }) // "2026-03-20"
  const eventDateStr = eventDate.toLocaleDateString('en-CA', { timeZone: timezone })
  return todayStr === eventDateStr
}

// Usage in StaffDashboard:
const todayEvents = assignedEvents?.filter(
  (e) => e.status === 'active' && isToday(e.eventDate, e.timezone)
) ?? []
```

### MSW Fixture Alignment

The MSW data as of today (2026-03-20):
- `user-002` (Budi Santoso, staff) is assigned to `event-001` and `event-003`
- `event-003` (Forum Kesehatan Digital Surabaya) has `status: 'active'` and `eventDate: '2026-03-20T02:00:00.000Z'`

So when logged in as staff (via DevToolbar or `budi@yorindo.app`), the StaffDashboard should show event-003 as today's active assigned event. This is a good built-in test scenario.

### Dashboard Page (`src/app/app/page.tsx`)

The current `page.tsx` exports a `Metadata` object (server component feature). Converting to `'use client'` removes the ability to export metadata. Remove the metadata export — the page title can be set via a parent layout or left to browser default. If the dashboard title matters, consider adding a `<title>` tag via `useEffect` or using Next.js `<Head>` component.

Updated page:

```tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { AdminDashboard } from '@/components/features/dashboard/AdminDashboard'
import { ViewerDashboard } from '@/components/features/dashboard/ViewerDashboard'
import { StaffDashboard } from '@/components/features/dashboard/StaffDashboard'

export default function DashboardPage() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const router = useRouter()

  useEffect(() => {
    if (!accessToken) router.replace('/login')
  }, [accessToken, router])

  if (!accessToken || !user) return null

  if (user.role === 'admin') return <AdminDashboard />
  if (user.role === 'viewer') return <ViewerDashboard />
  if (user.role === 'staff') return <StaffDashboard />

  // Unknown role
  router.replace('/login')
  return null
}
```

### Stats for AdminDashboard / ViewerDashboard

Use existing hooks:
- Total events: `useEvents()` → `data?.pagination?.total` or `data?.data.length`
- Active events: filter `data?.data` by `status === 'active'`
- Total contacts: `useContacts()` — check the hook's return shape for total count
- Pending registrations: There is no cross-event registrations endpoint. Use `GET /api/registrations?status=pending` — if this doesn't exist in MSW, use a static mock count (`12`) as a placeholder or add a simple MSW handler to `registrations.ts`

> **Fallback:** If fetching pending registrations cross-event is complex, hardcode `42` as a placeholder stat with a `(mock)` label. This is a FE Phase 1 story — real data comes in Phase 2.

### File Change Summary

New files:
- `src/hooks/useCurrentUser.ts`
- `src/hooks/useAssignedEvents.ts`
- `src/components/features/dashboard/AdminDashboard.tsx`
- `src/components/features/dashboard/ViewerDashboard.tsx`
- `src/components/features/dashboard/StaffDashboard.tsx`

Modified files:
- `src/app/app/page.tsx` — replaced with role-switching client component
- `src/mocks/handlers/users.ts` — add `GET /api/users/me`
- `src/mocks/handlers/events.ts` — add `GET /api/users/me/assigned-events` (recommended location)
- `src/mocks/handlers/index.ts` — verify new handlers are exported

### References

- Sprint Change Proposal: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-21.md` — Story 11.3 spec
- `src/mocks/handlers/users.ts` — userEventAssignments, usersStore
- `src/mocks/handlers/events.ts` — eventsStore
- `src/mocks/handlers/auth.ts` — token format reference
- `src/components/dev/DevToolbar.tsx` — synthetic user IDs
- `src/store/authStore.ts` — authStore shape `{id, role}` only
- `src/app/app/scan/page.tsx` — example of role-checking pattern
- `src/components/layout/AdminShell.tsx` — NAV_ITEMS for role-based nav reference

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — build passed on first attempt.

### Completion Notes List

- `GET /api/users/me/assigned-events` placed in `events.ts` (not `users.ts`) as recommended, since `eventsStore` lives there. `usersStore` and `userEventAssignments` exported from `users.ts` and imported.
- `Skeleton` component created at `src/components/ui/skeleton.tsx` (was not in the shadcn UI set).
- `dateUtils.ts` created at `src/lib/dateUtils.ts` with `isToday`, `formatIndonesianDate`, `formatEventTime`.
- Pending registrations stat uses hardcoded `42 (mock)` per story notes — Phase 2 wires real data.
- `useTotalContacts` defined inline in AdminDashboard/ViewerDashboard using `GET /api/contacts?pageSize=1` to read `pagination.total`.

### File List

New files:
- `src/hooks/useCurrentUser.ts`
- `src/hooks/useAssignedEvents.ts`
- `src/lib/dateUtils.ts`
- `src/components/ui/skeleton.tsx`
- `src/components/features/dashboard/AdminDashboard.tsx`
- `src/components/features/dashboard/ViewerDashboard.tsx`
- `src/components/features/dashboard/StaffDashboard.tsx`

Modified files:
- `src/app/app/page.tsx` — replaced server component with role-switching client component
- `src/mocks/handlers/users.ts` — exported `usersStore` and `userEventAssignments`; added `GET /api/users/me`
- `src/mocks/handlers/events.ts` — exported `eventsStore`; imported from users.ts; added `GET /api/users/me/assigned-events`
