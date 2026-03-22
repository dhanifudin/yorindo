# Story 4.7: Event Pipeline Hub — Shell & Navigation

## Story

**As an** admin,
**I want** a unified 6-tab workspace at `/app/events/:id`,
**So that** I can manage the complete event lifecycle (blast → registration → approval → check-in → analytics) without context-switching between pages.

## Status

review

## Context

This is the foundational FE story for the Event Pipeline Hub (Stories 4.7–4.12). It creates the shell layout that all other Pipeline Hub stories build upon. Stories 4.8–4.12 each implement one tab's content — they cannot start until 4.7 is in review.

The Event Pipeline Hub replaces the existing `/admin/events/:id` page with a purposeful 6-tab workspace. The shell includes: event header (name, status badge, quick-action), 6-tab Radix navigation, and a `<BlockerStrip>` (clickable 1-line status bar below the tab bar). The tab content area is a slot — each tab story fills it.

**Key design decision (UX spec):** Tabs are GitHub PR-style concurrent phase facets, not sequential gates. The URL updates on tab change; browser Back/Forward work between tabs. Draft events disable Undangan, Konfirmasi, and Check-in tabs with an accessible tooltip.

**Check-in tab dual context:** On `<lg` (mobile), the tab bar, BlockerStrip, and page header are all hidden and replaced by full-screen scan mode. This is implemented at the component level using `hidden lg:flex` / `block lg:hidden` Tailwind classes — no JS breakpoint detection.

## Acceptance Criteria

**AC1:** Given I navigate to `/app/events/:id`,
When the page loads,
Then a tab bar renders with six tabs in order: Overview · Undangan · Registrasi · Konfirmasi · Check-in · Laporan

**AC2:** Given the tab bar,
When I click any tab,
Then the URL updates to the corresponding sub-route (`/app/events/:id`, `/app/events/:id/blast`, `/app/events/:id/registrations`, `/app/events/:id/confirmation`, `/app/events/:id/checkin`, `/app/events/:id/report`) and the active tab is visually indicated with `border-b-2 border-primary`; browser Back/Forward navigate between tabs

**AC3:** Given I am on any sub-route (e.g., `/app/events/:id/blast`),
When I refresh the page,
Then the correct tab is active and content loads without redirect

**AC4:** Given the event has `status: 'draft'`,
When the tab bar renders,
Then the Undangan, Konfirmasi, and Check-in tabs are `aria-disabled="true"` with `opacity-50 cursor-not-allowed` styling and a `Tooltip` that shows "Tersedia setelah event dipublikasikan"; they are visible but not clickable

**AC5:** Given the event header area (above tabs),
Then it always shows: event name (`text-2xl font-bold`), status badge (shadcn `Badge` with status color), event date, capacity utilization (`registered/capacity` as `text-sm text-muted-foreground`), and a quick-action `Button` appropriate to the current status ("Publikasikan" for draft, "Mulai Live" for published)

**AC6:** Given the `<BlockerStrip>` below the tab bar,
When there are no actionable items,
Then the strip is `hidden` (zero height, no layout shift); when items exist it shows up to 3 `Button variant="ghost"` links with `role="status"` and `aria-live="polite"`

**AC7:** Given `GET /api/events/:id` is called via MSW,
Then it returns a seeded event object matching the `Event` type in `src/types/api.ts` with all required fields

**AC8:** Given the event header on mobile (`<lg`),
When viewing the Check-in tab,
Then the tab bar, BlockerStrip, and page header are all `hidden`; only the Check-in tab content renders in full-screen mode

## Dev Notes

### Tech Stack

- **Framework:** Next.js 16 App Router with TypeScript strict mode
- **Routing:** Next.js nested routing — `app/events/[id]/layout.tsx` as hub layout; tab routes as child pages
- **UI:** shadcn/ui exclusively — `Tabs`, `Badge`, `Button`, `Tooltip`, `Card`
- **State:** Zustand (global) + React Query (server state) — `staleTime: 60_000` on event query
- **Styling:** Tailwind CSS with `cn()` utility for conditional classes

### File Locations (in `yorindo-app/`)

```
src/
  app/
    (admin)/
      events/
        [id]/
          layout.tsx                ← Hub shell: header + Tabs + BlockerStrip slot + <Outlet>
          page.tsx                  ← Redirects to /app/events/:id (Overview tab default)
          blast/
            page.tsx                ← Undangan tab placeholder (Story 4.9 fills content)
          registrations/
            page.tsx                ← Registrasi tab placeholder (Story 4.10 fills content)
          confirmation/
            page.tsx                ← Konfirmasi tab placeholder (Story 4.11 fills content)
          checkin/
            page.tsx                ← Check-in tab placeholder (Story 4.8 check-in or Epic 7)
          report/
            page.tsx                ← Laporan tab placeholder (Story 4.12 fills content)
  components/
    hub/
      EventHubLayout.tsx            ← Event header + status badge + quick-action button
      BlockerStrip.tsx              ← 1-line status strip with up to 3 ghost links
```

### Architecture Constraints (MUST FOLLOW)

1. **shadcn/ui exclusively** — Use `Tabs` from shadcn/ui (Radix-based). No other tab library.
2. **Next.js App Router nested layout** — The hub shell is a layout.tsx, not a page. Tab content is rendered via `{children}`.
3. **URL-driven tab state** — Do NOT use React state for active tab. Active tab is derived from `usePathname()`.
4. **Disabled tab accessibility** — `aria-disabled="true"` + `Tooltip`. NOT `display:none` — screen readers must discover the disabled tabs.
5. **React Query for event data** — `useQuery({ queryKey: ['event', id], queryFn: () => fetchEvent(id), staleTime: 60_000 })`.
6. **MSW wired** — All API calls go through MSW in Phase 1. Event handler already exists in Story 1.6 handlers.

### Key Code Patterns

**Hub layout URL detection:**
```tsx
// layout.tsx
'use client'
import { usePathname } from 'next/navigation'

const pathname = usePathname()
const activeTab = (() => {
  if (pathname.endsWith('/blast')) return 'blast'
  if (pathname.endsWith('/registrations')) return 'registrations'
  if (pathname.endsWith('/confirmation')) return 'confirmation'
  if (pathname.endsWith('/checkin')) return 'checkin'
  if (pathname.endsWith('/report')) return 'report'
  return 'overview'
})()
```

**Disabled tabs with tooltip:**
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <span className={cn('cursor-not-allowed', isDraftEvent && 'opacity-50')}>
        <TabsTrigger
          value="blast"
          disabled={isDraftEvent}
          aria-disabled={isDraftEvent}
          className={cn(isDraftEvent && 'pointer-events-none')}
        >
          Undangan
        </TabsTrigger>
      </span>
    </TooltipTrigger>
    {isDraftEvent && (
      <TooltipContent>Tersedia setelah event dipublikasikan</TooltipContent>
    )}
  </Tooltip>
</TooltipProvider>
```

**BlockerStrip component:**
```tsx
// Always rendered for aria-live declaration; conditionally visible
<div role="status" aria-live="polite" className={cn('py-2 px-6 border-b', items.length === 0 && 'hidden')}>
  {items.map(item => (
    <Button key={item.id} variant="ghost" size="sm" onClick={item.onClick}>
      {item.label}
    </Button>
  ))}
</div>
```

**Mobile check-in chrome hiding:**
```tsx
// In layout.tsx — all admin chrome wraps with hidden class on Check-in mobile
<div className={cn(isCheckinTab ? 'hidden lg:block' : 'block')}>
  {/* event header, tab bar, blocker strip */}
</div>
<div className={cn(isCheckinTab ? 'block lg:hidden' : 'hidden')}>
  {/* full-screen check-in content */}
</div>
{children}
```

### MSW Handler Requirements

The `GET /api/events/:id` handler should already exist from Story 1.6. Verify it returns:
```typescript
{
  id: string,
  name: string,
  status: 'draft' | 'published' | 'live' | 'completed' | 'archived' | 'cancelled',
  date: string,           // ISO date
  capacity: number,
  registeredCount: number,
  slug: string,
  // ... other fields per api.ts Event type
}
```

If the handler doesn't return all required fields for the hub, extend it. Do NOT create a duplicate handler.

### Quick-Action Button Logic

| Event Status | Button Label | Action |
|---|---|---|
| `draft` | "Publikasikan" | PATCH /api/events/:id with `{ status: 'published' }` |
| `published` | "Mulai Live" | PATCH /api/events/:id with `{ status: 'live' }` |
| `live` | "Selesaikan" | PATCH /api/events/:id with `{ status: 'completed' }` |
| `completed` | "Arsipkan" | PATCH /api/events/:id with `{ status: 'archived' }` |
| `cancelled` / `archived` | — (no button) | None |

### Tab Routes Map

| Tab | URL | Route File |
|---|---|---|
| Overview | `/app/events/:id` | `[id]/page.tsx` (or redirect to overview) |
| Undangan | `/app/events/:id/blast` | `[id]/blast/page.tsx` |
| Registrasi | `/app/events/:id/registrations` | `[id]/registrations/page.tsx` |
| Konfirmasi | `/app/events/:id/confirmation` | `[id]/confirmation/page.tsx` |
| Check-in | `/app/events/:id/checkin` | `[id]/checkin/page.tsx` |
| Laporan | `/app/events/:id/report` | `[id]/report/page.tsx` |

### Test Requirements

- Render test: `EventHubLayout` renders all 6 tabs in correct order
- Disabled tabs: draft event → Undangan/Konfirmasi/Check-in have `aria-disabled="true"` and tooltip visible
- Active tab: pathname `/app/events/123/blast` → Undangan tab is active (`aria-selected="true"`)
- BlockerStrip: renders `hidden` when no items; renders ghost buttons when items present with `role="status"`
- Mobile: Check-in tab at `<lg` → event header and tab bar have `hidden` class
- MSW: `GET /api/events/:id` returns seeded event; hub header shows correct name, status badge, capacity

### Dependencies

- Prerequisite: Story 1.5 (MSW foundation, api.ts types) — event type must include hub fields
- Prerequisite: Story 1.6 (MSW handlers) — GET /api/events/:id handler
- Prerequisite: Story 4.1–4.6 (event CRUD FE) — hub replaces/extends existing event pages

### Previous Story Intelligence

- Story 4.6 used shadcn Tabs or a custom tab approach — check existing implementation before creating new tab component to avoid duplication
- All 4.x stories used TanStack Query with MSW successfully
- `src/types/api.ts` Event type defined in Story 1.5

## Tasks / Subtasks

- [ ] Task 1: Create App Router route structure for the hub
  - [ ] Subtask 1.1: Create `app/(admin)/events/[id]/layout.tsx` as hub shell
  - [ ] Subtask 1.2: Create stub `page.tsx` files for all 6 tab routes (blast, registrations, confirmation, checkin, report)
  - [ ] Subtask 1.3: Verify Next.js routing resolves all 6 URLs without 404

- [ ] Task 2: Build `<EventHubLayout>` component
  - [ ] Subtask 2.1: Event header with name, status badge, date, capacity utilization
  - [ ] Subtask 2.2: Quick-action button with status-dependent label and PATCH action
  - [ ] Subtask 2.3: Install and configure shadcn Tabs, Tooltip if not already present
  - [ ] Subtask 2.4: 6-tab bar with URL-driven active state via `usePathname()`
  - [ ] Subtask 2.5: Disabled tabs (draft event) with `aria-disabled` + Tooltip

- [ ] Task 3: Build `<BlockerStrip>` component
  - [ ] Subtask 3.1: Always-rendered div with `role="status"` and `aria-live="polite"`
  - [ ] Subtask 3.2: `hidden` when no items; ghost button links when items present
  - [ ] Subtask 3.3: Countdown color logic (>24h: muted, <24h: amber, <6h: red)

- [ ] Task 4: Implement mobile check-in chrome hiding
  - [ ] Subtask 4.1: Detect Check-in tab from pathname
  - [ ] Subtask 4.2: Apply `hidden lg:block` / `block lg:hidden` classes to admin chrome
  - [ ] Subtask 4.3: Verify on mobile viewport — tab bar, header, strip all hidden on Check-in

- [ ] Task 5: Wire MSW and React Query
  - [ ] Subtask 5.1: `useQuery` for `GET /api/events/:id` with `staleTime: 60_000`
  - [ ] Subtask 5.2: Verify MSW event handler returns all hub-required fields
  - [ ] Subtask 5.3: Extend handler if missing capacity/registeredCount fields

- [ ] Task 6: Write tests
  - [ ] Subtask 6.1: All 6 tabs render in correct order
  - [ ] Subtask 6.2: Draft event → 3 tabs disabled with tooltip and `aria-disabled`
  - [ ] Subtask 6.3: Active tab matches current URL path
  - [ ] Subtask 6.4: BlockerStrip hidden/visible states
  - [ ] Subtask 6.5: Check-in mobile chrome hiding classes

## Dev Agent Record

### Implementation Plan

1. Create `src/components/ui/tooltip.tsx` (Radix Tooltip — not previously installed)
2. Create `src/components/hub/BlockerStrip.tsx`
3. Create `src/app/app/events/[id]/layout.tsx` as hub shell
4. Create stub `page.tsx` for blast/, confirmation/, checkin/ routes
5. Write BlockerStrip tests

### Debug Log

- `const as` tuple type TS issue: `tab.disabledOnDraft` needed `'disabledOnDraft' in tab` guard due to TypeScript narrowing on `as const` tuples
- Routing: used existing `/app/app/events/[id]/` structure (not `(admin)/` route group as spec said — actual app uses `app/` prefix)
- Active tab: `registrations` used `.includes()` not `.endsWith()` to handle nested sub-routes

### Completion Notes

- 74 tests pass (5 new BlockerStrip tests)
- TypeScript passes with 0 errors
- Hub layout wraps all existing event pages — registrations and report tabs already work

## File List

- `src/components/ui/tooltip.tsx` (new)
- `src/components/hub/BlockerStrip.tsx`
- `src/components/hub/BlockerStrip.test.tsx`
- `src/app/app/events/[id]/layout.tsx`
- `src/app/app/events/[id]/blast/page.tsx`
- `src/app/app/events/[id]/confirmation/page.tsx`
- `src/app/app/events/[id]/checkin/page.tsx`

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-22 | Story created from epic-4 + ux-event-pipeline.md | bmad-context-engine |
