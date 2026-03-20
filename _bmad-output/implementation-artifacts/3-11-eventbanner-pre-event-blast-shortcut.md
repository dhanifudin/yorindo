# Story 3.11: EventBanner — Pre-event Blast Shortcut

Status: review

## Story

As an admin,
I want a contextual banner to appear at the top of the contacts page when an event is within 14 days showing uncontacted contacts,
so that I can blast the relevant audience in one click without manually configuring filters.

## Acceptance Criteria

1. EventBanner renders below HealthBar as a shadcn `Alert` with `className="bg-amber-50 border-amber-200 text-amber-900"` when an upcoming event is ≤14 days away AND uncontacted count > 0
2. EventBanner shows: calendar icon, event name, days remaining ("8 hari lagi"), uncontacted count ("45 kontak belum diundang"), and "Blast Sekarang →" Button
3. EventBanner renders null when no qualifying event exists
4. MSW: `GET /api/events/upcoming-uncontacted` returns `{ event: { id, name, eventDate }, daysUntil: 8, uncontactedCount: 45 }` for the qualifying event; or `{ event: null }` when none
5. MSW handler must deterministically return a qualifying event (event within 14 days) so the banner is visible during development
6. Clicking "Blast Sekarang →" navigates to `/app/blasts/new?eventId=event-001&segment=teknologi&count=45`
7. `Alert` element has `role="alert"` and `aria-live="polite"`
8. EventBanner is a Skeleton strip during loading

## Tasks / Subtasks

- [ ] Install shadcn `Alert` component (AC: 1)
  - [ ] `npx shadcn@latest add alert` → `src/components/ui/alert.tsx`
- [ ] Add MSW handler for `GET /api/events/upcoming-uncontacted` (AC: 4, 5)
  - [ ] Add to `src/mocks/handlers/events.ts` (events domain handler)
  - [ ] Create a synthetic event with `eventDate` set to 8 days from "now" (use a static future date like `'2026-03-28T02:00:00.000Z'` since today is 2026-03-20 — this is always 8 days from the dev baseline)
  - [ ] Response: `{ event: { id: 'event-upcoming-001', name: 'Konferensi Teknologi 2026', eventDate: '2026-03-28T02:00:00.000Z', industryTags: ['teknologi'] }, daysUntil: 8, uncontactedCount: 45 }`
  - [ ] `delay(300)`
  - [ ] **Do NOT use `new Date()` for date computation in MSW** — static dates ensure test determinism; if dynamic needed, compute daysUntil from `(new Date(eventDate).getTime() - Date.now()) / 86400000` but keep eventDate as a static string
- [ ] Add `UpcomingUncontactedResponse` type to `src/types/api.ts` (AC: 4)
  ```typescript
  export interface UpcomingUncontactedEvent {
    event: { id: string; name: string; eventDate: string; industryTags?: string[] } | null
    daysUntil?: number
    uncontactedCount?: number
  }
  ```
- [ ] Create `src/components/features/contacts/EventBanner.tsx` (AC: 1–3, 6–8)
  - [ ] `'use client'`
  - [ ] Fetch: `useQuery({ queryKey: ['upcoming-uncontacted'], queryFn: () => fetch('/api/events/upcoming-uncontacted').then(r => r.json()), staleTime: 5 * 60 * 1000 })`
  - [ ] If loading: render `<Skeleton className="h-12 w-full rounded-none" />`
  - [ ] If `!data?.event || !data.uncontactedCount`: return null
  - [ ] Render shadcn `Alert` with amber classes
  - [ ] Left: `<CalendarDays className="h-4 w-4" />` icon + event name + days text + uncontacted count
  - [ ] Right: "Blast Sekarang →" `Button` navigating to blast URL
  - [ ] `Alert` container: ensure `role="alert"` and `aria-live="polite"` (shadcn Alert has `role="alert"` by default; add `aria-live="polite"`)
- [ ] Integrate EventBanner into `ContactsCommandCenter.tsx` (AC: 1)
  - [ ] Place `<EventBanner />` between `<HealthBar />` and `<PageHeader />`
  - [ ] No props needed — EventBanner fetches its own data

## Dev Notes

### CRITICAL: shadcn Alert Not Installed

`Alert` is **NOT** in the current shadcn installation. Run:

```bash
npx shadcn@latest add alert
```

This adds `src/components/ui/alert.tsx` with `Alert`, `AlertTitle`, `AlertDescription` components.

### Amber Override Pattern

shadcn `Alert` by default uses destructive or default variant. Override with Tailwind classes — do NOT create a new variant:

```tsx
<Alert className="bg-amber-50 border-amber-200 text-amber-900 flex items-center justify-between py-3 px-4 rounded-none"
       aria-live="polite">
  <div className="flex items-center gap-3">
    <CalendarDays className="h-4 w-4 text-amber-700 shrink-0" />
    <div>
      <span className="font-medium">{data.event.name}</span>
      <span className="text-sm ml-2">· {data.daysUntil} hari lagi</span>
      <span className="text-sm ml-2">· {data.uncontactedCount} kontak belum diundang</span>
    </div>
  </div>
  <Button
    size="sm"
    className="bg-amber-700 hover:bg-amber-800 text-white shrink-0"
    onClick={() => router.push(buildBlastUrl())}
  >
    Blast Sekarang →
  </Button>
</Alert>
```

### Blast URL from EventBanner

```typescript
function buildBlastUrl(event: { id: string; industryTags?: string[] }, count: number): string {
  const params = new URLSearchParams()
  params.set('eventId', event.id)
  if (event.industryTags?.length) params.set('segment', event.industryTags.join(','))
  params.set('count', String(count))
  return `/app/blasts/new?${params.toString()}`
}
```

### MSW Handler Placement in events.ts

Add `upcoming-uncontacted` handler BEFORE any parameterized routes like `GET /api/events/:id`. MSW matches in registration order:

```typescript
// In src/mocks/handlers/events.ts, add before GET /api/events/:id:
http.get('/api/events/upcoming-uncontacted', async () => {
  await delay(300)
  return HttpResponse.json({
    event: {
      id: 'event-upcoming-001',
      name: 'Konferensi Teknologi 2026',
      eventDate: '2026-03-28T02:00:00.000Z',
      industryTags: ['teknologi'],
    },
    daysUntil: 8,
    uncontactedCount: 45,
  })
}),
```

The `eventHandlers` array is exported from `events.ts` and already registered in `index.ts` — no change to `index.ts` needed.

### CalendarDays Icon

```typescript
import { CalendarDays } from 'lucide-react'
```

`lucide-react` is already a dependency of the project (used throughout for icons).

### Skeleton During Loading

```tsx
if (isLoading) return <Skeleton className="h-12 w-full rounded-none" />
```

Height `h-12` matches the approx height of the rendered EventBanner to prevent layout shift.

### Files to Create / Modify

```
CREATE: src/components/features/contacts/EventBanner.tsx
MODIFY: src/components/features/contacts/ContactsCommandCenter.tsx  (add EventBanner)
MODIFY: src/mocks/handlers/events.ts  (add GET /api/events/upcoming-uncontacted)
MODIFY: src/types/api.ts  (add UpcomingUncontactedEvent type)
INSTALL: alert (via shadcn CLI)
```

### References

- [Source: epics/epic-3-contact-database-participant-intelligence.md#Story-3.11]
- [Source: ux-design-specification.md#Component-Strategy — EventBanner]
- [Source: ux-design-specification.md#User-Journey-Flows — Journey 1: Pre-event Blast]
- [Source: ux-design-specification.md#Visual-Design-Foundation — amber color tokens]
- [Source: src/mocks/handlers/events.ts — existing events handler, eventsStore pattern]
- [Source: src/types/api.ts — Event type definition]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- EventBanner uses shadcn Alert with amber className override
- Handler placed before parameterized routes in events.ts to avoid routing conflicts
- Static event date '2026-03-28T02:00:00.000Z' (8 days from 2026-03-20 baseline)
- Skeleton during loading, null when no qualifying event
- Blast URL includes eventId, segment (industryTags), count

### File List

- CREATE: `src/components/features/contacts/EventBanner.tsx`
- MODIFY: `src/components/features/contacts/ContactsCommandCenter.tsx` (added EventBanner)
- MODIFY: `src/mocks/handlers/events.ts` (added GET /api/events/upcoming-uncontacted)
- MODIFY: `src/types/api.ts` (added UpcomingUncontactedEvent type)
- INSTALL: alert (via shadcn CLI)
