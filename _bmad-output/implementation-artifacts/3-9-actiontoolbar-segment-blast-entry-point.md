# Story 3.9: ActionToolbar — Segment Blast Entry Point

Status: review

## Story

As an admin,
I want a sticky action toolbar to appear at the bottom of the contacts page when filters are active or rows are selected,
so that I can blast the current filtered segment to the blast composer in one click.

## Acceptance Criteria

1. `ActionToolbar` renders null when no filters active and no rows selected; has `aria-hidden="true"` in that state
2. `ActionToolbar` appears as a `Card` with `className="sticky bottom-0 z-10 rounded-none border-t border-x-0 border-b-0"` when any filter is active
3. Left side shows "N kontak di segmen ini"; right side has "Export CSV" `Button variant="outline"` and "Blast Segmen · N kontak →" primary `Button`
4. Contact count in toolbar reflects `pagination.total` from the current contacts query — updates when filters change
5. Clicking "Blast Segmen" navigates to `/app/blasts/new?segment=teknologi,jakarta&count=18` with all active filter slugs comma-separated in `segment` param and live count in `count`
6. ActionToolbar root element has `role="toolbar"` and `aria-label="Aksi segmen"`
7. "Export CSV" button is present but can be a no-op (stub) in V1 — no backend endpoint required yet

## Tasks / Subtasks

- [ ] Verify `Card` component is installed (AC: 2)
  - [ ] `src/components/ui/card.tsx` — already installed, no action needed
- [ ] Create `src/components/features/contacts/ActionToolbar.tsx` (AC: 1–6)
  - [ ] `'use client'`
  - [ ] Props: `total: number; activeFilters: Record<string, string>; isVisible: boolean`
  - [ ] If `!isVisible` return null (or render with `aria-hidden="true"` for screen readers)
  - [ ] Render sticky Card with `role="toolbar"` and `aria-label="Aksi segmen"`
  - [ ] Left: `<span className="text-sm text-muted-foreground">{total} kontak di segmen ini</span>`
  - [ ] Right: Export CSV `Button variant="outline"` + Blast Segmen `Button`
  - [ ] Blast button: `onClick={() => router.push(buildBlastUrl(activeFilters, total))}`
- [ ] Implement `buildBlastUrl` helper (AC: 5)
  - [ ] Inline in component or as a pure function in the file
  - [ ] `const segment = Object.entries(activeFilters).filter(([,v]) => v).map(([,v]) => v).join(',')`
  - [ ] Returns `/app/blasts/new?segment=${segment}&count=${total}`
  - [ ] Only include filter params that have values (skip empty strings)
- [ ] Wire ActionToolbar into `ContactsCommandCenter.tsx` (AC: 1, 4)
  - [ ] `ContactsCommandCenter` (created in Story 3.7) passes filter state and contact total to ActionToolbar
  - [ ] Read `activeFilters` from `useSearchParams` (post Story 3.8 URL migration)
  - [ ] Read `total` from `useContacts()` query result — `data?.pagination.total ?? 0`
  - [ ] `isVisible` = `Object.values(activeFilters).some(v => !!v)`
- [ ] Handle "Export CSV" stub (AC: 7)
  - [ ] Button shows `toast.info('Export CSV belum tersedia')` on click — no backend call

## Dev Notes

### Dependency on Story 3.8 (URL State)

`ActionToolbar` reads filter state from URL params (via `useSearchParams`) to build the blast URL. This story should be implemented **after** Story 3.8 completes the URL state migration. If implementing before Story 3.8, temporarily read from `filterStore` instead.

### Sticky Card Pattern

```tsx
<Card className="sticky bottom-0 z-10 rounded-none border-t border-x-0 border-b-0 shadow-md">
  <div className="flex items-center justify-between px-4 py-3">
    <span className="text-sm text-muted-foreground">
      {total} kontak di segmen ini
    </span>
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => toast.info('Export CSV belum tersedia')}>
        Export CSV
      </Button>
      <Button size="sm" onClick={handleBlast}>
        Blast Segmen · {total} kontak →
      </Button>
    </div>
  </div>
</Card>
```

### Blast URL Construction

```typescript
function buildBlastUrl(searchParams: URLSearchParams, total: number): string {
  const segmentParts: string[] = []
  const industry = searchParams.get('industry')
  const city = searchParams.get('city')
  const companySize = searchParams.get('companySize')
  if (industry) segmentParts.push(industry)
  if (city) segmentParts.push(city)
  if (companySize) segmentParts.push(companySize)

  const params = new URLSearchParams()
  if (segmentParts.length) params.set('segment', segmentParts.join(','))
  params.set('count', String(total))
  return `/app/blasts/new?${params.toString()}`
}
```

### ContactsCommandCenter Integration

`ContactsCommandCenter.tsx` (created in Story 3.7) is the client wrapper. It coordinates:

```tsx
'use client'
export function ContactsCommandCenter() {
  const [triageMode, setTriageMode] = useState<'flagged' | 'duplicates' | null>(null)
  const searchParams = useSearchParams()
  const { data: contacts } = useContacts()

  const hasFilters = ['industry', 'city', 'companySize', 'q']
    .some(k => !!searchParams.get(k))

  return (
    <>
      <HealthBar onStatClick={(type) => {
        if (type === 'missingEmail') { /* add missingEmail URL param */ }
        else setTriageMode(type)
      }} />
      <EventBanner />  {/* Story 3.11 */}
      <PageHeader />
      <ContactsFilterBar />
      <ActiveFilterPills total={contacts?.pagination.total} />
      <TriagePanel mode={triageMode} onClose={() => setTriageMode(null)} />  {/* Story 3.10 */}
      <ContactsTable />
      <ContactsPagination />
      <ActionToolbar
        total={contacts?.pagination.total ?? 0}
        searchParams={searchParams}
        isVisible={hasFilters}
      />
    </>
  )
}
```

### No MSW Handler Needed

ActionToolbar makes no API calls — it just reads state and navigates. No new MSW handler for this story.

### `aria-hidden` Pattern

When ActionToolbar is not visible, either return `null` or render with `aria-hidden`:

```tsx
if (!isVisible) return (
  <div role="toolbar" aria-label="Aksi segmen" aria-hidden="true" />
)
```

Returning `null` is simpler and acceptable — the comment in the AC notes `aria-hidden` but null is the cleaner approach.

### Files to Create / Modify

```
CREATE: src/components/features/contacts/ActionToolbar.tsx
MODIFY: src/components/features/contacts/ContactsCommandCenter.tsx  (wire ActionToolbar)
MODIFY: src/app/app/contacts/page.tsx  (ensure ContactsCommandCenter is rendered)
```

### References

- [Source: epics/epic-3-contact-database-participant-intelligence.md#Story-3.9]
- [Source: ux-design-specification.md#Component-Strategy — ActionToolbar]
- [Source: ux-design-specification.md#UX-Consistency-Patterns — Button Hierarchy]
- [Source: src/components/ui/card.tsx — Card component already installed]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Sticky ActionToolbar renders at bottom when industry/city/companySize/q filters active
- Shows contact count, Export CSV (toast stub), Blast Segmen button with URL navigation
- role="toolbar" aria-label="Aksi segmen" present

### File List

- CREATE: `src/components/features/contacts/ActionToolbar.tsx`
- MODIFY: `src/components/features/contacts/ContactsCommandCenter.tsx` (wired ActionToolbar)
