# Story 3.7: HealthBar — Database Quality Pulse

Status: review

## Story

As an admin,
I want to see a persistent health bar at the top of the contacts page showing flagged count, duplicate count, and contacts-missing-email count,
so that I immediately know what data quality tasks need attention when I arrive on the page.

## Acceptance Criteria

1. `HealthBar` component renders above the filter bar on `/app/contacts` with three stat columns: flagged count, duplicate count, contacts-missing-email count — each as a clickable `Button` with descriptive `aria-label`
2. `Skeleton` placeholders replace stat values during `GET /api/contacts/health` fetch
3. Flagged/duplicate stat uses `text-destructive` when count > 0; `text-muted-foreground` + "Semua bersih ✓" label when count = 0
4. Clicking "flagged" stat → TriagePanel opens in "flagged" mode (passes `onStatClick` callback, TriagePanel consumed in Story 3.10)
5. Clicking "duplicates" stat → TriagePanel opens in "duplicates" mode (same callback)
6. Clicking "missing email" stat → adds `missingEmail=true` query param to URL and contacts table re-fetches (see Story 3.8 for URL state; for this story, keep `filterStore`-based and add `missingEmail` field)
7. MSW: `GET /api/contacts/health` returns `{ flagged: 34, duplicates: 12, missingEmail: 58 }` with HTTP 200 and `delay(300)`
8. HealthBar container has `role="status"` and `aria-live="polite"`

## Tasks / Subtasks

- [x] Install missing shadcn components (AC: 1)
  - [x] `npx shadcn@latest add skeleton` — already installed; verify at `src/components/ui/skeleton.tsx`
  - [x] No new shadcn component needed for HealthBar itself (uses `Card` + `Button` + `Skeleton` — all installed)
- [x] Add MSW handler for `GET /api/contacts/health` (AC: 7)
  - [x] Add to `src/mocks/handlers/contacts.ts` inside `contactHandlers` array
  - [x] Handler: `http.get('/api/contacts/health', async () => { await delay(300); return HttpResponse.json({ flagged: 34, duplicates: 12, missingEmail: 58 }) })`
  - [x] No registration change needed — contacts.ts is already registered in `index.ts`
- [x] Add `ContactsHealth` type to `src/types/api.ts` (AC: 1)
  - [x] `export interface ContactsHealth { flagged: number; duplicates: number; missingEmail: number }`
- [x] Add `missingEmail` to `filterStore.ts` (AC: 6)
  - [x] Add `missingEmail: boolean` field to `FilterStore` interface (default `false`)
  - [x] Add to `resetFilter()`, `setFilter()` handling
  - [x] Add `missingEmail` param support to `useContacts` hook and contacts MSW handler
- [x] Add `missingEmail` filter to contacts MSW handler (AC: 6)
  - [x] In `src/mocks/handlers/contacts.ts`, the `contactsPool` all have faker emails — update seeding so ~20% of contacts have `email: ''` to support filtering
  - [x] Add filter: `const missingEmail = url.searchParams.get('missingEmail') === 'true'` → `if (missingEmail) filtered = filtered.filter((c) => !c.email)`
- [x] Create `src/components/features/contacts/HealthBar.tsx` (AC: 1–6, 8)
  - [x] `'use client'` — uses `useQuery` + click handlers
  - [x] Fetch from `useQuery({ queryKey: ['contacts-health'], queryFn: () => fetch('/api/contacts/health').then(r => r.json()) })`
  - [x] Render three stat columns in a 3-column grid using `Card` wrapper
  - [x] Each stat: `Button variant="ghost"` with `aria-label`, count as `text-2xl font-bold`, label as `text-xs text-muted-foreground uppercase tracking-wide`
  - [x] `text-destructive` on count when > 0; `text-muted-foreground` + "Semua bersih ✓" when 0
  - [x] Skeleton: `<Skeleton className="h-8 w-12" />` per stat during loading
  - [x] Props: `onStatClick: (type: 'flagged' | 'duplicates' | 'missingEmail') => void`
  - [x] Container: `<div role="status" aria-live="polite">`
- [x] Integrate `HealthBar` into contacts page (AC: 1)
  - [x] Created `ContactsCommandCenter.tsx` as `'use client'` wrapper with TriagePanel state
  - [x] `src/app/app/contacts/page.tsx` now renders `<ContactsCommandCenter />` wrapped in Suspense

## Dev Notes

### Critical Architecture Facts

- **Contacts page is a Server Component** (`src/app/app/contacts/page.tsx` — no `'use client'`). HealthBar is a client component. This is fine — client components render normally inside a Server Component. BUT: state coordination between HealthBar (what was clicked) and TriagePanel (what to show) requires a shared parent client component. Create `ContactsCommandCenter.tsx` as the client-side layout manager.

- **filterStore.ts** currently uses Zustand at `src/store/filterStore.ts`. Add `missingEmail: boolean` to it for Story 3.7. Story 3.8 will migrate the whole store to URL params — design `missingEmail` to be replaceable.

- **shadcn `Skeleton`** is already installed at `src/components/ui/skeleton.tsx`. No install needed.

- **`Card` component** is installed at `src/components/ui/card.tsx`. HealthBar wrapper uses it.

- **`useContacts` hook** (`src/hooks/useContacts.ts`) reads from `filterStore`. Add `missingEmail` to the params and the fetch URL construction.

### MSW Handler Placement

```
src/mocks/handlers/contacts.ts    ← add health handler here
```

Add **before** the existing `GET /api/contacts` handler (more specific path first — MSW matches routes in order; `/api/contacts/health` must appear before `/api/contacts/:id` patterns to avoid capture):

```typescript
http.get('/api/contacts/health', async () => {
  await delay(300)
  return HttpResponse.json({ flagged: 34, duplicates: 12, missingEmail: 58 })
}),
```

### contactsPool Email Nullability

Current `contactsPool` generates all 247 contacts with `email: faker.internet.email()`. To support `missingEmail` filter, update seeding so some contacts have empty email:

```typescript
email: i % 5 === 0 ? '' : faker.internet.email(),  // ~20% missing email (≈49 contacts)
```

This gives a realistic `missingEmail` count. Keep `faker.seed(42)` at top.

### Component File Convention

```
src/components/features/contacts/
  HealthBar.tsx              ← NEW (this story)
  ContactsCommandCenter.tsx  ← NEW (this story — client wrapper)
  ContactsFilterBar.tsx      ← EXISTING
  ContactsTable.tsx          ← EXISTING
  ContactsPagination.tsx     ← EXISTING
```

### Type Addition

In `src/types/api.ts`, add after the `Contact` interface:
```typescript
export interface ContactsHealth {
  flagged: number
  duplicates: number
  missingEmail: number
}
```

### Stat Design

```tsx
// Each stat column — identical structure
<div className="flex flex-col items-center gap-1">
  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
    Bermasalah
  </span>
  {isLoading ? (
    <Skeleton className="h-8 w-12" />
  ) : (
    <Button
      variant="ghost"
      className={`text-2xl font-bold h-auto p-0 ${data.flagged > 0 ? 'text-destructive' : 'text-muted-foreground'}`}
      onClick={() => onStatClick('flagged')}
      aria-label={`${data.flagged} catatan bermasalah, klik untuk tinjau`}
    >
      {data.flagged > 0 ? data.flagged : '✓'}
    </Button>
  )}
  {data?.flagged === 0 && <span className="text-xs text-muted-foreground">Semua bersih</span>}
</div>
```

### References

- [Source: epics/epic-3-contact-database-participant-intelligence.md#Story-3.7]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component-Strategy — HealthBar]
- [Source: src/mocks/handlers/contacts.ts — contactsPool pattern, MSW handler structure]
- [Source: src/store/filterStore.ts — existing filter state]
- [Source: src/hooks/useContacts.ts — existing useContacts hook pattern]
- [Source: src/types/api.ts — type contract pattern]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Implemented HealthBar with 3-column grid showing flagged, duplicates, missingEmail counts
- Created ContactsCommandCenter as client-side layout wrapper managing triageMode state
- filterStore simplified to only flagFilter + missingEmail (industry/city/companySize/page moved to URL)
- missingEmail filter added to contacts MSW handler; ~20% contacts have empty email
- All 69 tests pass, TypeScript clean

### File List

- CREATE: `src/components/features/contacts/HealthBar.tsx`
- CREATE: `src/components/features/contacts/ContactsCommandCenter.tsx`
- MODIFY: `src/app/app/contacts/page.tsx`
- MODIFY: `src/mocks/handlers/contacts.ts`
- MODIFY: `src/store/filterStore.ts`
- MODIFY: `src/hooks/useContacts.ts`
- MODIFY: `src/types/api.ts`
