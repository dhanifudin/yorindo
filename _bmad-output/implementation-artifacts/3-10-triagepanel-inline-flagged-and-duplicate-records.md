# Story 3.10: TriagePanel — Inline Flagged & Duplicate Records

Status: review

## Story

As an admin,
I want to review and resolve flagged records and duplicate contact pairs inline on the contacts page without navigating to a sub-page,
so that I can triage data quality issues within my current workflow context and see health counts update in real time.

## Acceptance Criteria

1. TriagePanel expands via shadcn `Collapsible` + `CollapsibleContent` with `motion-safe:data-[state=open]:animate-collapsible-down` animation when HealthBar flagged/duplicates stat is clicked
2. Focus moves to first interactive element on expand; returns to triggering HealthBar stat on collapse
3. In "flagged" mode: fetches `GET /api/contacts/flagged?status=pending&pageSize=20`; shows compact table with Setujui/Buang buttons per row
4. Clicking Setujui: optimistic decrement of HealthBar flagged count (e.g., 34→33); on success: Sonner "Catatan disetujui · 33 tersisa"; on failure: count rolls back + Sonner "Perubahan dibatalkan — terjadi kesalahan"
5. Clicking Buang: same optimistic + rollback behavior as Setujui
6. When last pending record resolved: TriagePanel auto-collapses; focus → HealthBar flagged stat; HealthBar shows "Semua bersih ✓"; Sonner "Semua catatan bermasalah diselesaikan"
7. In "duplicates" mode: fetches `GET /api/contacts/duplicates`; shows pairs with "Lihat Perbedaan" button; clicking opens Sheet with side-by-side diff and Gabung/Bukan Duplikat actions; optimistic count decrement on either action
8. `GET /api/contacts/duplicates` already exists in MSW — reuse existing handler (no changes needed)
9. Mode-switch (flagged→duplicates while open): panel stays open, content swaps without close/reopen animation
10. Collapse toggle button in panel header collapses panel; focus returns to triggering HealthBar stat
11. HealthBar count updates are optimistic — decrement immediately, rollback on error

## Tasks / Subtasks

- [ ] Install shadcn `Collapsible` component (AC: 1)
  - [ ] `npx shadcn@latest add collapsible` → `src/components/ui/collapsible.tsx`
  - [ ] Verify Tailwind config has collapsible animation keyframes (shadcn adds them automatically)
- [ ] Create `src/components/features/contacts/TriagePanel.tsx` (AC: 1–11)
  - [ ] `'use client'`
  - [ ] Props: `mode: 'flagged' | 'duplicates' | null; onClose: () => void; onHealthCountChange: (type: 'flagged' | 'duplicates', delta: -1) => void`
  - [ ] Use `Collapsible open={mode !== null} onOpenChange={(open) => !open && onClose()}`
  - [ ] Header: title ("Catatan Bermasalah" or "Duplikat") + collapse toggle Button
  - [ ] CollapsibleContent: renders `<FlaggedTriageTable>` or `<DuplicateTriageTable>` based on mode
  - [ ] Focus management: `useEffect` to focus first button when `mode` changes from null to non-null
- [ ] Create `FlaggedTriageTable` (AC: 3–6) — sub-component or inner component of TriagePanel
  - [ ] Fetch: `useQuery({ queryKey: ['triage-flagged'], queryFn: () => fetch('/api/contacts/flagged?status=pending&pageSize=20').then(r => r.json()) })`
  - [ ] Compact table: columns — Name, Flags (orange badges), Setujui/Buang buttons
  - [ ] Mutation: `useMutation` calling `POST /api/contacts/flagged/:id` with `{ action: 'approve' | 'discard' }`
  - [ ] Optimistic update via `onMutate` + `onError` rollback on `['contacts-health']` query cache
  - [ ] Decrement `flagged` count in `queryClient.setQueryData(['contacts-health'], ...)` inside `onMutate`
  - [ ] On success: `queryClient.invalidateQueries(['triage-flagged'])` + Sonner success toast with remaining count
  - [ ] When all resolved: `props.onClose()` + focus return
- [ ] Create `DuplicateTriageTable` (AC: 7) — sub-component of TriagePanel
  - [ ] Fetch: `useQuery({ queryKey: ['triage-duplicates'], queryFn: () => fetch('/api/contacts/duplicates').then(r => r.json()) })`
  - [ ] **MSW handler already exists** at `GET /api/contacts/duplicates` — returns 6 duplicate pairs from `contactsPool`
  - [ ] Table: columns — Contact 1, Contact 2, Match Score, "Lihat Perbedaan" Button
  - [ ] "Lihat Perbedaan" opens a Sheet with side-by-side diff
  - [ ] Gabung: `POST /api/contacts/:id/merge` — already has MSW handler; optimistic decrement on `['contacts-health'].duplicates`
  - [ ] Bukan Duplikat: call `DELETE /api/contacts/duplicates/:id` — add simple MSW handler returning 204
- [ ] Add `DELETE /api/contacts/duplicates/:id` MSW handler (AC: 7)
  - [ ] Add to `src/mocks/handlers/contacts.ts`: `http.delete('/api/contacts/duplicates/:id', async () => { await delay(300); return new HttpResponse(null, { status: 204 }) })`
- [ ] Integrate TriagePanel into `ContactsCommandCenter.tsx` (AC: 1, 9)
  - [ ] Pass `mode` state from `ContactsCommandCenter` to `TriagePanel`
  - [ ] `TriagePanel` positioned between `ActiveFilterPills` and `ContactsTable`
  - [ ] `onHealthCountChange` callback updates local optimistic state in `ContactsCommandCenter`

## Dev Notes

### CRITICAL: shadcn Collapsible Not Installed

**`Collapsible` is NOT in the current shadcn installation.** Current `src/components/ui/` directory contains only: badge, button, card, dialog, input, label, select, sheet, skeleton, sonner, step-indicator, table, textarea.

```bash
npx shadcn@latest add collapsible
```

This adds `src/components/ui/collapsible.tsx` and the required Tailwind keyframe animations in `tailwind.config.ts`.

### Optimistic Update Pattern

Use React Query's `onMutate` for optimistic updates on the `['contacts-health']` cache:

```typescript
const resolveMutation = useMutation({
  mutationFn: ({ id, action }: { id: string; action: 'approve' | 'discard' }) =>
    fetch(`/api/contacts/flagged/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    }).then(r => { if (!r.ok) throw new Error('Failed'); return r.json() }),

  onMutate: async ({ id }) => {
    await queryClient.cancelQueries({ queryKey: ['contacts-health'] })
    const prev = queryClient.getQueryData<ContactsHealth>(['contacts-health'])
    queryClient.setQueryData<ContactsHealth>(['contacts-health'], old =>
      old ? { ...old, flagged: Math.max(0, old.flagged - 1) } : old
    )
    return { prev }  // context for rollback
  },

  onError: (_err, _vars, context) => {
    if (context?.prev) queryClient.setQueryData(['contacts-health'], context.prev)
    toast.error('Perubahan dibatalkan — terjadi kesalahan')
  },

  onSuccess: (_data, _vars) => {
    const current = queryClient.getQueryData<ContactsHealth>(['contacts-health'])
    const remaining = current?.flagged ?? 0
    if (remaining === 0) {
      toast.success('Semua catatan bermasalah diselesaikan')
      props.onClose()
    } else {
      toast.success(`Catatan diselesaikan · ${remaining} tersisa`)
    }
    queryClient.invalidateQueries({ queryKey: ['triage-flagged'] })
  },
})
```

### Focus Management

```typescript
const firstButtonRef = useRef<HTMLButtonElement>(null)

useEffect(() => {
  if (mode !== null) {
    // Small delay to allow CollapsibleContent animation to start
    setTimeout(() => firstButtonRef.current?.focus(), 100)
  }
}, [mode])
```

For return focus on close, the `HealthBar` component should attach a `ref` to the stat button and expose it, OR `ContactsCommandCenter` stores a ref to the last-clicked stat. Simpler approach: `document.querySelector('[data-stat-trigger="${lastStatType}"]')?.focus()` — add `data-stat-trigger` attribute to HealthBar buttons.

### Collapsible Animation Setup

After `npx shadcn@latest add collapsible`, verify `tailwind.config.ts` has:

```ts
keyframes: {
  'collapsible-down': {
    from: { height: '0' },
    to: { height: 'var(--radix-collapsible-content-height)' },
  },
  'collapsible-up': {
    from: { height: 'var(--radix-collapsible-content-height)' },
    to: { height: '0' },
  },
},
animation: {
  'collapsible-down': 'collapsible-down 0.2s ease-out',
  'collapsible-up': 'collapsible-up 0.2s ease-out',
},
```

Usage in CollapsibleContent:
```tsx
<CollapsibleContent className="overflow-hidden motion-safe:data-[state=open]:animate-collapsible-down motion-safe:data-[state=closed]:animate-collapsible-up">
```

### Reuse from `/app/contacts/flagged/page.tsx`

The existing `FlaggedRecordsPage` at `src/app/app/contacts/flagged/page.tsx` has the full flagged records UI. Extract the core table rendering logic into a shared component rather than duplicating. Create:

```
src/components/features/contacts/FlaggedRecordsTable.tsx  ← extracted from flagged/page.tsx
```

`flagged/page.tsx` then imports from this shared component. `TriagePanel` also imports the same component. Prevents code duplication.

### Existing MSW Handlers (No Changes Needed)

- `GET /api/contacts/flagged` — already exists, handles `?status=pending&pageSize=20`
- `GET /api/contacts/duplicates` — already exists, returns 6 pairs from contactsPool
- `POST /api/contacts/flagged/:id` — already exists (returns a mock flagged record)
- `POST /api/contacts/:id/merge` — already exists

Only new handler needed: `DELETE /api/contacts/duplicates/:id` (simple 204).

### Files to Create / Modify

```
CREATE: src/components/features/contacts/TriagePanel.tsx
CREATE: src/components/features/contacts/FlaggedRecordsTable.tsx  (extracted)
CREATE: src/components/features/contacts/DuplicatePairsTable.tsx
MODIFY: src/app/app/contacts/flagged/page.tsx  (import from FlaggedRecordsTable)
MODIFY: src/components/features/contacts/ContactsCommandCenter.tsx  (wire TriagePanel)
MODIFY: src/mocks/handlers/contacts.ts  (add DELETE /api/contacts/duplicates/:id)
INSTALL: collapsible (via shadcn CLI)
```

### References

- [Source: epics/epic-3-contact-database-participant-intelligence.md#Story-3.10]
- [Source: ux-design-specification.md#Component-Strategy — TriagePanel]
- [Source: ux-design-specification.md#Responsive-Accessibility — shadcn/ui mapping, Collapsible pattern]
- [Source: src/app/app/contacts/flagged/page.tsx — existing flagged records UI to extract]
- [Source: src/mocks/handlers/contacts.ts — existing handlers to reuse]
- [Source: ux-design-specification.md#User-Journey-Flows — Journey 2: Daily Triage]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- TriagePanel uses Collapsible with motion-safe animation classes
- FlaggedRecordsTable extracted as reusable shared component with optimisticHealthUpdate prop
- DuplicateTriageTable embedded in TriagePanel with Sheet diff viewer
- Optimistic count updates on contacts-health query cache with rollback on error
- Focus management: focuses first button on expand, returns to stat trigger on collapse
- collapsible-down/up keyframes added to globals.css (Tailwind v4 CSS-first)

### File List

- CREATE: `src/components/features/contacts/TriagePanel.tsx`
- CREATE: `src/components/features/contacts/FlaggedRecordsTable.tsx`
- MODIFY: `src/app/app/contacts/flagged/page.tsx` (uses FlaggedRecordsTable)
- MODIFY: `src/components/features/contacts/ContactsCommandCenter.tsx` (wired TriagePanel)
- MODIFY: `src/mocks/handlers/contacts.ts` (added DELETE /api/contacts/duplicates/:id)
- INSTALL: collapsible (via shadcn CLI)
