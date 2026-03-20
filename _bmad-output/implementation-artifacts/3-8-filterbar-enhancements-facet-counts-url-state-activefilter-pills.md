# Story 3.8: FilterBar Enhancements — Facet Counts, URL State & ActiveFilterPills

Status: review

## Story

As an admin,
I want filter dropdowns to show contact counts per option, all applied filters to persist in the URL, and active filters to appear as dismissible pills below the filter bar,
so that I know segment size before applying a filter, can share or restore filter state via URL, and have a clear view of what's currently active.

## Acceptance Criteria

1. FilterBar dropdowns (Industry, City, Company Size) show count suffixes from `GET /api/contacts/facets` — e.g., "Teknologi (47)"
2. MSW: `GET /api/contacts/facets` returns `{ industry: [{slug, label, count}], city: [{slug, label, count}], companySize: [{slug, label, count}] }` with HTTP 200
3. Selecting a filter updates URL via `router.push` (Next.js `useRouter`) — e.g., `?industry=teknologi`; contacts table re-fetches from URL params
4. Page loading with query params (e.g., `?industry=teknologi&city=jakarta`) pre-selects dropdowns via `useSearchParams`
5. Active filters shown as `ScrollArea orientation="horizontal"` + `Badge variant="secondary"` with ghost × button; "Hapus semua" when ≥2 active; "N kontak ditemukan" count below pills
6. `ActiveFilterPills` renders null when no filters active
7. Clicking × on a pill removes that filter's URL param and table re-fetches
8. AI search Input shows violet `Badge` "AI ✦" trailing slot; `Loader2` spinner while `isSearching=true`; `aria-busy={isSearching}` on results container
9. Clearing AI search removes only `q` URL param; instant filter params preserved
10. "Simpan Segmen" `Button` visible only when filters active; opens `Popover` with autofocused `Input`; on submit saves to `localStorage` + Sonner toast
11. Migrate filter state from Zustand `filterStore` to URL search params using Next.js `useSearchParams`/`useRouter` — existing `filterStore.ts` deprecated
12. All existing FilterBar functionality (AI industry suggestions, reset) preserved

## Tasks / Subtasks

- [ ] Install missing shadcn/ui components (AC: 5, 10)
  - [ ] `npx shadcn@latest add scroll-area` → `src/components/ui/scroll-area.tsx`
  - [ ] `npx shadcn@latest add popover` → `src/components/ui/popover.tsx`
  - [ ] `npx shadcn@latest add separator` → `src/components/ui/separator.tsx`
  - [ ] shadcn `Select` is already installed at `src/components/ui/select.tsx` — migrate FilterBar from native `<select>` to shadcn `Select`
- [ ] Add MSW handler for `GET /api/contacts/facets` (AC: 2)
  - [ ] Add to `src/mocks/handlers/contacts.ts` (before `GET /api/contacts` to avoid route order issues)
  - [ ] Compute counts from `contactsPool` at handler call time using Array.filter
  - [ ] Response shape: `{ industry: INDUSTRIES.map(slug => ({ slug, label: slug[0].toUpperCase()+slug.slice(1), count: contactsPool.filter(c=>c.industryId===slug).length })), city: [...], companySize: [...] }`
  - [ ] `delay(200)` — facets feel fast
- [ ] Add `ContactsFacets` type to `src/types/api.ts` (AC: 2)
  - [ ] `export interface FacetItem { slug: string; label: string; count: number }`
  - [ ] `export interface ContactsFacets { industry: FacetItem[]; city: FacetItem[]; companySize: FacetItem[] }`
- [ ] Migrate filter state from Zustand to URL params (AC: 3, 4, 11)
  - [ ] **CRITICAL:** Current `filterStore.ts` (`src/store/filterStore.ts`) manages `industry`, `city`, `companySize`, `flagFilter`, `page` — all consumed by `useContacts` hook and `ContactsFilterBar`
  - [ ] Replace `useFilterStore` calls in `ContactsFilterBar.tsx` with `useSearchParams()` + `useRouter()` from `next/navigation`
  - [ ] Update `useContacts` hook to accept params from URL or receive them as arguments — read from `useSearchParams` inside the hook (hook must be client-side)
  - [ ] Keep `filterStore.ts` for `missingEmail` (Story 3.7) and `page` pagination state — OR migrate page to URL too (`?page=2`)
  - [ ] `ContactsPagination.tsx` must also update to read/write URL param `page`
  - [ ] **Recommended approach:** Keep `filterStore.ts` only for pagination (`page`); migrate industry/city/companySize/q to URL params. `missingEmail` from Story 3.7 stays in filterStore temporarily.
- [ ] Refactor `ContactsFilterBar.tsx` to use shadcn `Select` + URL state (AC: 1, 3, 4, 8, 9, 10, 12)
  - [ ] Replace native `<select>` elements with shadcn `Select` + `SelectTrigger` + `SelectContent` + `SelectItem`
  - [ ] Industry SelectItem labels: `{label} ({count})` — from `useQuery(['contacts-facets'], ...)`
  - [ ] City: keep as text `Input` (no facets for free-text); OR convert to Select with city facets
  - [ ] Company Size SelectItem labels: `{label} ({count})`
  - [ ] AI search: wrap existing AI Input with violet Badge "AI ✦" in trailing slot via `relative` + `absolute` positioning
  - [ ] Add `aria-busy={isSearching}` to results container
  - [ ] Clearing AI input (backspace to empty): remove only `q` param from URL, keep others
  - [ ] Add "Simpan Segmen" Button (Popover) — conditionally rendered when `hasActiveFilters`
- [ ] Create `src/components/features/contacts/ActiveFilterPills.tsx` (AC: 5, 6, 7)
  - [ ] `'use client'`
  - [ ] Read active filters from `useSearchParams`
  - [ ] Render `ScrollArea orientation="horizontal"` + horizontal flex of `Badge variant="secondary"` per filter
  - [ ] Each Badge: label + ghost icon Button with `X` lucide icon (`h-3 w-3`) to remove
  - [ ] "Hapus semua" as ghost link-style button — clears all filter params
  - [ ] Contact count: `{pagination?.total ?? 0} kontak ditemukan` below pills (receives `total` prop from parent)
  - [ ] Returns null when no active filters

## Dev Notes

### CRITICAL: shadcn Select vs Native Select

**Current `ContactsFilterBar.tsx` uses native `<select>` elements** styled with a custom `nativeSelectClass` string. Story 3.8 must migrate to shadcn `Select` components which support `SelectItem` with rich content (count badges). This is a full replacement — remove `nativeSelectClass` helper variable.

```tsx
// Before (native select)
<select value={industry} onChange={...} className={nativeSelectClass}>
  {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
</select>

// After (shadcn Select)
<Select value={industry} onValueChange={(val) => updateParam('industry', val)}>
  <SelectTrigger className="w-[160px]">
    <SelectValue placeholder="Semua Industri" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="">Semua Industri</SelectItem>
    {facets?.industry.map(f => (
      <SelectItem key={f.slug} value={f.slug}>{f.label} ({f.count})</SelectItem>
    ))}
  </SelectContent>
</Select>
```

### URL State Migration Pattern

```tsx
// In ContactsFilterBar.tsx
'use client'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

const searchParams = useSearchParams()
const router = useRouter()
const pathname = usePathname()

const industry = searchParams.get('industry') ?? ''

const updateParam = (key: string, value: string) => {
  const params = new URLSearchParams(searchParams.toString())
  if (value) params.set(key, value)
  else params.delete(key)
  params.delete('page') // reset to page 1 on filter change
  router.push(`${pathname}?${params.toString()}`)
}

const removeParam = (key: string) => updateParam(key, '')
```

### useContacts Hook Refactor

```typescript
// src/hooks/useContacts.ts — after migration
export function useContacts() {
  const searchParams = useSearchParams()
  const industry = searchParams.get('industry') ?? ''
  const city = searchParams.get('city') ?? ''
  const companySize = searchParams.get('companySize') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const q = searchParams.get('q') ?? ''

  return useQuery({
    queryKey: ['contacts', { industry, city, companySize, page, q }],
    queryFn: () => fetchContacts({ industry, city, companySize, page, pageSize: 20, q }),
  })
}
```

**Note:** `useSearchParams` requires `'use client'`. The hook is already used only in client components, so this is fine.

### facets Handler: Route Order Critical

In `contacts.ts`, add facets handler **before** `GET /api/contacts` to prevent `/api/contacts/facets` being swallowed by a dynamic-like match. MSW matches in registration order. Current `contactHandlers` array order matters:

```typescript
export const contactHandlers = [
  http.get('/api/contacts/health', ...),   // NEW Story 3.7
  http.get('/api/contacts/facets', ...),   // NEW this story — before GET /api/contacts
  http.get('/api/contacts', ...),          // EXISTING
  http.get('/api/contacts/flagged', ...),  // EXISTING
  // ...rest
]
```

### City Facets Note

Current `contactsPool` uses `INDONESIAN_CITIES` array for city — these are exact string values. For the city facet, generate: `INDONESIAN_CITIES.map(city => ({ slug: city.toLowerCase(), label: city, count: contactsPool.filter(c => c.city === city).length }))`. The contacts handler currently uses `city.toLowerCase()` comparison — stay consistent.

### Popover: Save Segment

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" size="sm">Simpan Segmen</Button>
  </PopoverTrigger>
  <PopoverContent className="w-64 space-y-2 p-3">
    <Input placeholder="Nama segmen..." autoFocus className="h-8" />
    <Button size="sm" className="w-full" onClick={handleSave}>Simpan</Button>
  </PopoverContent>
</Popover>
```

`handleSave`: store `{ name, params: Object.fromEntries(searchParams) }` in `localStorage` under key `yorindo:segments`. Toast: `"Segmen '${name}' disimpan"`.

### ActiveFilterPills: ScrollArea Import

```tsx
import { ScrollArea } from '@/components/ui/scroll-area'
// Usage:
<ScrollArea orientation="horizontal" className="w-full whitespace-nowrap">
  <div className="flex items-center gap-2 px-4 py-2">
    {/* pills */}
  </div>
</ScrollArea>
```

### filterStore.ts Future

After Story 3.8, `filterStore.ts` retains only `missingEmail: boolean` and `page` (if not moved to URL). Story 3.9's ActionToolbar reads filter state from URL directly. Do NOT delete `filterStore.ts` yet.

### Files to Create / Modify

```
CREATE: src/components/features/contacts/ActiveFilterPills.tsx
MODIFY: src/components/features/contacts/ContactsFilterBar.tsx  (full refactor)
MODIFY: src/hooks/useContacts.ts  (migrate to useSearchParams)
MODIFY: src/store/filterStore.ts  (remove migrated fields)
MODIFY: src/mocks/handlers/contacts.ts  (add facets handler)
MODIFY: src/types/api.ts  (add FacetItem, ContactsFacets)
INSTALL: scroll-area, popover, separator (via shadcn CLI)
```

### References

- [Source: epics/epic-3-contact-database-participant-intelligence.md#Story-3.8]
- [Source: ux-design-specification.md#Component-Strategy — FilterBar, ActiveFilterPills]
- [Source: ux-design-specification.md#Responsive-Design — shadcn/ui mapping]
- [Source: src/components/features/contacts/ContactsFilterBar.tsx — current implementation to refactor]
- [Source: src/store/filterStore.ts — Zustand store being replaced]
- [Source: src/hooks/useContacts.ts — hook to migrate]
- [Source: src/mocks/handlers/contacts.ts — handler order, contactsPool]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- ContactsFilterBar fully refactored to use shadcn Select with facet counts, URL params, AI Smart Search with violet Badge
- ActiveFilterPills shows dismissible pills per active filter with "Hapus semua" button
- "Simpan Segmen" Popover added (visible only with active filters), saves to localStorage
- ContactsPagination migrated to URL params
- ScrollArea uses ScrollBar subcomponent for horizontal scrolling (shadcn v4 API)

### File List

- CREATE: `src/components/features/contacts/ActiveFilterPills.tsx`
- MODIFY: `src/components/features/contacts/ContactsFilterBar.tsx` (full refactor — shadcn Select + URL state + facets + Popover + AI badge)
- MODIFY: `src/hooks/useContacts.ts` (migrated to useSearchParams)
- MODIFY: `src/store/filterStore.ts` (removed industry/city/companySize/page — now URL-only)
- MODIFY: `src/mocks/handlers/contacts.ts` (added facets handler)
- MODIFY: `src/types/api.ts` (added FacetItem, ContactsFacets)
- INSTALL: scroll-area, popover, separator (via shadcn CLI)
