# Story 3.12: Contact Event History Tab in Sheet

Status: review

## Story

As an admin,
I want to see a contact's event registration history in the contact detail sheet,
so that I can understand their event engagement before deciding to invite them to a new event.

## Acceptance Criteria

1. Contact detail Sheet shows three shadcn `Tabs`: "Info" (existing fields), "Riwayat" (event history), "Segmen" (industry/city/size/flagCategory)
2. "Riwayat" tab shows chronological registration list: event name, formatted event date, status `Badge`; most recent first
3. Status badge colors: approved → green, attended → primary, cancelled → destructive, pending → muted
4. MSW: `GET /api/contacts/:id/history` returns `{ registrations: [{ eventId, eventName, eventDate, status }] }` — deterministically generated using djb2 hash of contact ID (same result for same ID across requests)
5. Empty state when no registrations: "Belum ada riwayat event"
6. "Segmen" tab shows: serviceType, city, completenessScore (as %), flagCategory with badge
7. Sheet uses `SheetContent side="right" className="sm:max-w-lg w-full"` — no SSR-unsafe `isMobile` or `window.innerWidth` checks
8. "Info" tab retains all existing contact field display (name, email, phone, company data)

## Tasks / Subtasks

- [ ] Install shadcn `Tabs` component (AC: 1)
  - [ ] `npx shadcn@latest add tabs` → `src/components/ui/tabs.tsx`
- [ ] Install shadcn `Separator` component (AC: 1)
  - [ ] `npx shadcn@latest add separator` → `src/components/ui/separator.tsx`
- [ ] Add `ContactRegistrationHistory` type to `src/types/api.ts` (AC: 4)
  ```typescript
  export interface ContactHistoryItem {
    eventId: string
    eventName: string
    eventDate: string
    status: 'pending' | 'confirmed' | 'approved' | 'attended' | 'cancelled' | 'rejected' | 'waitlisted'
  }
  export interface ContactHistoryResponse {
    registrations: ContactHistoryItem[]
  }
  ```
- [ ] Add MSW handler for `GET /api/contacts/:id/history` (AC: 4)
  - [ ] Add to `src/mocks/handlers/contacts.ts` BEFORE `GET /api/contacts/:id` to avoid path swallowing — or add after all other `/api/contacts/...` specific routes since `:id/history` is more specific
  - [ ] Use `djb2` from `@/lib/djb2` (already imported in events.ts MSW handler — import it in contacts.ts too)
  - [ ] Deterministic generation: `const seed = djb2(id as string)` → use to pick events and statuses from arrays
  - [ ] Generate 0–5 history items based on `seed % 6`
  - [ ] Each item: pick from `eventsStore` (imported from `./events`), assign status based on `djb2(id + eventId) % 5`
  - [ ] Sort most recent first by eventDate
  - [ ] `delay(250)`
- [ ] Refactor `ContactsTable.tsx` to add Tabs to the Sheet (AC: 1–8)
  - [ ] Current Sheet in `ContactsTable.tsx` shows contact detail inline (no tabs). Refactor to wrap content in `Tabs defaultValue="info"`
  - [ ] Tab "Info": existing name/email/phone/company/flagCategory fields
  - [ ] Tab "Riwayat": lazy-fetch `GET /api/contacts/:id/history` when this tab is selected (or always fetch when Sheet opens, using `enabled: !!selectedContact`)
  - [ ] Tab "Segmen": serviceType, city, completenessScore (as `Math.round(score * 100)%`), flagCategory Badge
  - [ ] Sheet: `<SheetContent side="right" className="sm:max-w-lg w-full">` — confirm no `isMobile` or `window.innerWidth` in existing code
- [ ] Implement "Riwayat" tab content (AC: 2, 3, 5)
  - [ ] `useQuery({ queryKey: ['contact-history', contactId], queryFn: () => fetch('/api/contacts/${contactId}/history').then(r => r.json()), enabled: !!contactId })`
  - [ ] Chronological list rendering with status badges
  - [ ] Empty state: `<p className="text-sm text-muted-foreground text-center py-8">Belum ada riwayat event</p>`

## Dev Notes

### CRITICAL: shadcn Tabs Not Installed

`Tabs` is **NOT** in the current shadcn installation. Run:

```bash
npx shadcn@latest add tabs
npx shadcn@latest add separator
```

### djb2 Hash Pattern (Already in Codebase)

The `djb2` hash is already used in `src/mocks/handlers/events.ts` and `src/mocks/handlers/contacts.ts` (recommended-events handler). It lives at `src/lib/djb2.ts`:

```typescript
// src/lib/djb2.ts (existing)
export function djb2(s: string): number {
  return s.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 100, 0)
}
```

For the history handler, use:
```typescript
import { djb2 } from '@/lib/djb2'
import { eventsStore } from './events'

http.get('/api/contacts/:id/history', async ({ params }) => {
  await delay(250)
  const id = params.id as string
  const seed = djb2(id)
  const count = seed % 6  // 0–5 history items
  if (count === 0) return HttpResponse.json({ registrations: [] })

  const STATUSES: ContactHistoryItem['status'][] = ['approved', 'attended', 'cancelled', 'pending', 'rejected']
  const registrations = eventsStore
    .slice(0, count)
    .map((event, i) => ({
      eventId: event.id,
      eventName: event.name,
      eventDate: event.eventDate,
      status: STATUSES[djb2(id + event.id + i) % STATUSES.length],
    }))
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())

  return HttpResponse.json({ registrations })
}),
```

### Status Badge Color Mapping

```typescript
const STATUS_BADGE: Record<ContactHistoryItem['status'], string> = {
  approved: 'bg-green-100 text-green-700',
  attended: 'bg-primary/10 text-primary',
  cancelled: 'bg-destructive/10 text-destructive',
  pending: 'bg-muted text-muted-foreground',
  rejected: 'bg-destructive/10 text-destructive',
  confirmed: 'bg-blue-100 text-blue-700',
  waitlisted: 'bg-orange-100 text-orange-700',
}
```

### Tabs Structure

```tsx
<Tabs defaultValue="info" className="mt-4">
  <TabsList className="grid w-full grid-cols-3">
    <TabsTrigger value="info">Info</TabsTrigger>
    <TabsTrigger value="riwayat">Riwayat</TabsTrigger>
    <TabsTrigger value="segmen">Segmen</TabsTrigger>
  </TabsList>

  <TabsContent value="info" className="mt-4">
    {/* existing name/email/phone fields */}
  </TabsContent>

  <TabsContent value="riwayat" className="mt-4">
    {isHistoryLoading ? (
      <div className="space-y-2">{Array.from({length:3}).map((_,i) => <Skeleton key={i} className="h-12" />)}</div>
    ) : history?.registrations.length === 0 ? (
      <p className="text-sm text-muted-foreground text-center py-8">Belum ada riwayat event</p>
    ) : (
      <div className="space-y-2">
        {history?.registrations.map(r => (
          <div key={r.eventId} className="flex items-center justify-between py-2 border-b last:border-0">
            <div>
              <p className="text-sm font-medium">{r.eventName}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(r.eventDate).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}
              </p>
            </div>
            <Badge className={STATUS_BADGE[r.status]}>{r.status}</Badge>
          </div>
        ))}
      </div>
    )}
  </TabsContent>

  <TabsContent value="segmen" className="mt-4 space-y-3">
    {/* industryId, city, companySize, completenessScore, flagCategory */}
  </TabsContent>
</Tabs>
```

### Existing Sheet in ContactsTable.tsx

The current `ContactsTable.tsx` has an inline Sheet — read it before editing. The existing Sheet content shows: flagCategory badge, name, contact info fields, a flag management mutation UI, and recommended events section. Preserve all of this under the "Info" tab. The Riwayat and Segmen tabs add new content without removing existing functionality.

### SSR Safety: No window.innerWidth

The Sheet must use `side="right"` only. Do NOT use `side={isMobile ? 'bottom' : 'right'}` with any `window.innerWidth` or `navigator.userAgent` check — this would cause Next.js SSR hydration errors. The UX spec explicitly mandates `side="right"` at all breakpoints with responsive width via CSS: `className="sm:max-w-lg w-full"`.

### History Handler Route Order

In `contacts.ts`, the route `/api/contacts/:id/history` must be registered **before** the generic `/api/contacts/:id` handler (if one exists). Current contacts.ts has `PUT /api/contacts/:id` for flag updates — ensure history handler is listed first:

```typescript
http.get('/api/contacts/:id/history', ...),  // NEW — list before other :id routes
http.put('/api/contacts/:id', ...),           // EXISTING
```

### Files to Create / Modify

```
MODIFY: src/components/features/contacts/ContactsTable.tsx  (add Tabs to Sheet)
MODIFY: src/mocks/handlers/contacts.ts  (add GET /api/contacts/:id/history handler)
MODIFY: src/types/api.ts  (add ContactHistoryItem, ContactHistoryResponse)
INSTALL: tabs, separator (via shadcn CLI)
```

### References

- [Source: epics/epic-3-contact-database-participant-intelligence.md#Story-3.12]
- [Source: ux-design-specification.md#Component-Strategy — Contact detail Sheet, Tabs usage]
- [Source: ux-design-specification.md#Responsive-Accessibility — SSR-safe Sheet side="right"]
- [Source: ux-design-specification.md#User-Journey-Flows — Journey 3: Contact Detail Review]
- [Source: src/components/features/contacts/ContactsTable.tsx — existing Sheet to extend]
- [Source: src/mocks/handlers/contacts.ts — djb2 import from events.ts, recommended-events pattern]
- [Source: src/mocks/handlers/events.ts — djb2 function usage, eventsStore available for import]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Sheet changed from side="bottom" to side="right" className="sm:max-w-lg w-full" (no isMobile checks)
- Three tabs: Info (existing content), Riwayat (event history), Segmen (segment data)
- History fetched via GET /api/contacts/:id/history using djb2 deterministic generation
- Status badges with color mapping per status type
- History handler placed before PUT /api/contacts/:id to avoid route swallowing
- djb2 imported from @/lib/djb2 in contacts.ts handler

### File List

- MODIFY: `src/components/features/contacts/ContactsTable.tsx` (added Tabs to Sheet)
- MODIFY: `src/mocks/handlers/contacts.ts` (added GET /api/contacts/:id/history handler)
- MODIFY: `src/types/api.ts` (added ContactHistoryItem, ContactHistoryResponse)
- INSTALL: tabs, separator (via shadcn CLI)
