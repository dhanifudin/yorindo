---
title: 'Contacts Page — Row Selection, Bulk Flag & Blast'
slug: 'contacts-bulk-selection-flag-blast'
created: '2026-03-22'
status: 'superseded'
superseded_by:
  - 'Story 3.9 (row-selection ACs added via sprint-change-proposal-2026-03-31)'
  - 'Story 3.13 (inline blast modal)'
notes: >
  Row selection + bulk flag portions absorbed into Story 3.9 updated ACs.
  Blast modal pattern replaced navigation-to-/app/blasts/new with inline Dialog (Story 3.13).
  Bulk flag ACs (Tandai Spam, Tidak Potensial, Hapus Tanda) retained in Story 3.9 AC8.
  MSW bulk-flag handler pattern from this spec remains valid reference for dev agent.
stepsCompleted: [1, 2, 3, 4, 5]
tech_stack: ['react', 'next.js', 'tailwindcss', 'tanstack-table', 'react-query', 'msw', 'zustand', 'shadcn/ui']
files_to_modify:
  - src/components/ui/checkbox.tsx (new — shadcn install)
  - src/components/features/contacts/ContactsTable.tsx
  - src/components/features/contacts/ContactsCommandCenter.tsx
  - src/components/features/contacts/ActionToolbar.tsx
  - src/mocks/handlers/contacts.ts
code_patterns:
  - TanStack Table rowSelection state with getSelectedRowModel()
  - onSelectionChange callback to lift selectedIds to parent
  - useMutation for PATCH /api/contacts/bulk-flag
  - ActionToolbar appears when selectedIds.length > 0 OR hasFilters
test_patterns:
  - vitest + @testing-library/react
  - MSW in-memory contactsPool mutation (no DB)
---

# Tech-Spec: Contacts Page — Row Selection, Bulk Flag & Blast

**Created:** 2026-03-22

---

## Overview

### Problem Statement

The `/app/contacts` page displays 247 contacts across a paginated table but provides zero row-level selection. The ActionToolbar only appears when a filter is active and only supports segment blast — there is no way to select specific contacts for targeted actions (flag as spam, flag as not-potential, or blast a handpicked set). The table also shows 8 columns simultaneously, making it dense and not scannable. Mobile has cards but no selection mode.

### Solution

Add TanStack Table `rowSelection` to `ContactsTable`, install the shadcn `Checkbox` component, slim the desktop table to 5 columns, expose selected IDs to `ContactsCommandCenter` via an `onSelectionChange` callback, and upgrade `ActionToolbar` to show bulk flag and blast actions when rows are selected. Add a `PATCH /api/contacts/bulk-flag` MSW handler. Add a "Pilih" toggle button for mobile select mode.

### Scope

**In Scope:**
- Install `src/components/ui/checkbox.tsx` via shadcn
- Checkbox column in desktop TanStack Table (header = select-all, cell = select-row)
- Slim desktop columns: Name+flag badge, Phone, Industry, City, Completeness (5 columns — hide email, companySize, createdAt from table; they remain in the Sheet)
- `onSelectionChange: (ids: string[]) => void` prop on `ContactsTable` — fires on every selection change
- `selectedIds: string[]` state in `ContactsCommandCenter`, passed to `ActionToolbar`
- `ActionToolbar` upgrade: shows when `selectedIds.length > 0` OR `hasFilters`; new bulk flag submenu (Spam / Tidak Potensial / Hapus Tanda); existing Blast button updated to pass `selectedIds` when in selection mode
- `PATCH /api/contacts/bulk-flag` MSW handler: `{ ids: string[], flagCategory: FlagCategory | null }` → mutates `contactsPool` in-memory, returns `{ updated: number }`
- Mobile: "Pilih" button in page header toggles select mode; in select mode, cards show leading checkbox; ActionToolbar anchors to bottom
- Clear selection button ("× N terpilih") in ActionToolbar deselects all rows

**Out of Scope:**
- Export CSV (remains as `toast.info` stub)
- Real backend `PATCH /api/contacts/bulk-flag` API (Phase 2)
- Persist selection across page changes
- Bulk soft-delete
- Server-side selection of all pages (only current page selectable)

---

## Context for Development

### Codebase Patterns

**TanStack Table v8 rowSelection** (follows same pattern used in `src/app/app/events/[id]/registrations/_client.tsx`):
```tsx
const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

const table = useReactTable({
  data: data?.data ?? [],
  columns,
  state: { pagination: { pageIndex: page - 1, pageSize: 20 }, rowSelection },
  onRowSelectionChange: setRowSelection,
  getCoreRowModel: getCoreRowModel(),
  getSelectedRowModel: getSelectedRowModel,  // ← pass function reference, do NOT call it with ()
  manualPagination: true,
  manualFiltering: true,
  getRowId: (row) => row.id,   // ← REQUIRED so IDs survive re-renders
})

// Derive selected IDs — stabilize with useMemo to avoid array reference churn
const selectedIds = useMemo(
  () => table.getSelectedRowModel().rows.map(r => r.original.id),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [rowSelection],  // rowSelection state change is the true dependency
)
useEffect(() => { onSelectionChange(selectedIds) }, [selectedIds, onSelectionChange])
// ⚠️ Do NOT use [selectedIds] alone — selectedIds is a new array ref each render.
// Depending on [rowSelection] ensures the effect fires only when selection actually changes.
```

**Checkbox column** (must be first column, before name):
```tsx
{
  id: 'select',
  header: ({ table }) => (
    <Checkbox
      checked={table.getIsAllPageRowsSelected()}
      onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
      aria-label="Pilih semua"
    />
  ),
  cell: ({ row }) => (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(v) => row.toggleSelected(!!v)}
      onClick={(e) => e.stopPropagation()}  // prevent row click → Sheet open
      aria-label="Pilih baris"
    />
  ),
  size: 40,
}
```

**Bulk flag mutation** (in `ActionToolbar`):
```tsx
const bulkFlagMutation = useMutation({
  mutationFn: async ({ ids, flagCategory }: { ids: string[]; flagCategory: FlagCategory }) => {
    const res = await fetch('/api/contacts/bulk-flag', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, flagCategory }),
    })
    if (!res.ok) throw new Error('Bulk flag gagal')
    return res.json()
  },
  onSuccess: ({ updated }) => {
    queryClient.invalidateQueries({ queryKey: ['contacts'] })
    queryClient.invalidateQueries({ queryKey: ['contacts-health'] })
    toast.success(`${updated} kontak berhasil ditandai`)
    onClearSelection()
  },
  onError: () => toast.error('Gagal menandai kontak'),
})
```

**Blast URL with selectedIds** — when `selectedIds.length > 0` override the segment blast URL:
```tsx
// In ActionToolbar, blast button:
// ⚠️ Existing buildBlastUrl uses '/app/blasts/new' (plural) — match that exactly
const blastUrl = selectedIds.length > 0
  ? `/app/blasts/new?selectedIds=${selectedIds.join(',')}&count=${selectedIds.length}`
  : buildBlastUrl(searchParams, total)  // existing segment-based URL (unchanged)
```

**MSW bulk-flag handler** — must be added BEFORE `/api/contacts/:id` (literal before parameterized):
```ts
http.patch('/api/contacts/bulk-flag', async ({ request }) => {
  await delay(300)
  const { ids, flagCategory } = await request.json() as { ids: string[]; flagCategory: FlagCategory | null }
  let updated = 0
  for (const contact of contactsPool) {
    if (ids.includes(contact.id)) {
      contact.flagCategory = flagCategory
      updated++
    }
  }
  return HttpResponse.json({ updated })
}),
```

**Mobile select mode** — controlled boolean in `ContactsCommandCenter`:
```tsx
const [selectMode, setSelectMode] = useState(false)
// Pass selectMode + toggleSelectMode down to ContactsTable
// In mobile cards: when selectMode, show <Checkbox> at card left; onClick selects row, not opens Sheet
// When selectMode goes false: clear selection
```

### Files to Reference

| File | Purpose |
|------|---------|
| `src/components/features/contacts/ContactsTable.tsx` | Main file — add rowSelection, checkbox col, slim columns, mobile selectMode, onSelectionChange |
| `src/components/features/contacts/ContactsCommandCenter.tsx` | Add selectedIds state, pass to ActionToolbar; add selectMode toggle button |
| `src/components/features/contacts/ActionToolbar.tsx` | Upgrade: show on selection OR filter; bulk flag submenu; blast URL override |
| `src/mocks/handlers/contacts.ts` | Add PATCH /api/contacts/bulk-flag BEFORE /:id handler |
| `src/components/ui/checkbox.tsx` | New — install via shadcn |
| `src/app/app/events/[id]/registrations/_client.tsx` | Reference — existing rowSelection + Checkbox pattern |

### Technical Decisions

1. **`getRowId: (row) => row.id`** — required in `useReactTable` config. Without it, TanStack Table uses numeric array index as row ID, causing selection to break when page changes or data re-orders.

2. **Selection does NOT persist across pages** — `rowSelection` is local state in `ContactsTable`. When user navigates to page 2, selection resets. This is explicitly in scope as out-of-scope for this spec. Show a note in ActionToolbar: "N terpilih di halaman ini".

3. **`onSelectionChange` callback in `useEffect`** — avoids prop-drilling the entire `table` object upward while keeping `selectedIds` fresh in the parent.

4. **Checkbox stopPropagation** — `onClick={(e) => e.stopPropagation()}` on the cell checkbox is required because the table row `onClick` opens the detail Sheet. Without this, clicking the checkbox opens the Sheet AND selects the row.

5. **Bulk flag is in ActionToolbar, not ContactsTable** — keeps the table dumb (display + selection only); all mutation logic stays in the toolbar.

6. **Column visibility** — remove `email`, `companySize`, `createdAt` from the `columns` array definition. These fields are already in the detail Sheet (Info tab + Segmen tab). No new code needed in the Sheet.

7. **Mobile selectMode** — when `selectMode=false`, card tap → opens Sheet (existing behavior). When `selectMode=true`, card tap → toggles selection; Sheet does NOT open. Controlled via `selectMode` prop.

8. **`resetKey` pattern for external state reset** — `ContactsTable` owns `rowSelection` internally (can't be reset from outside without remounting). Passing `key={resetKey}` to `ContactsTable` from `ContactsCommandCenter` forces a remount (and `useState` re-initialization) when `resetKey` increments. This is the canonical React pattern for controlled external reset of internal state.

9. **Mobile sticky select bar lives in `ContactsTable`** — not in `ContactsCommandCenter`. Rationale: the bar needs access to `table.toggleAllPageRowsSelected()` which is only available inside `ContactsTable`. It is positioned `sticky top-0` within the `md:hidden` section, visible while scrolling the card list.

10. **`getSelectedRowModel` — no parentheses** — In TanStack Table v8, feature functions like `getSelectedRowModel`, `getSortedRowModel`, `getFilteredRowModel` are passed as *references* to `useReactTable`. Calling them with `()` before passing returns a bound factory immediately, breaking lazy evaluation. Always pass without `()`.

---

## Implementation Plan

### Tasks

**Task 1: Install Checkbox component**
- Run: `npx shadcn@latest add checkbox`
- Verify: `src/components/ui/checkbox.tsx` created
- No other changes in this task

**Task 2: Update `ContactsTable.tsx`**

- Subtask 2.1 — Add imports:
  ```tsx
  import { useState, useEffect } from 'react'                     // already imported
  import { getSelectedRowModel, type RowSelectionState } from '@tanstack/react-table'
  import { Checkbox } from '@/components/ui/checkbox'
  ```

- Subtask 2.2 — Add props interface:
  ```tsx
  interface ContactsTableProps {
    onSelectionChange: (ids: string[]) => void
    selectMode: boolean         // mobile select mode
  }
  export function ContactsTable({ onSelectionChange, selectMode }: ContactsTableProps)
  ```

- Subtask 2.3 — Add `rowSelection` state and `getRowId`:
  ```tsx
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  ```
  Update `useReactTable`:
  ```tsx
  state: { pagination: { pageIndex: page - 1, pageSize: 20 }, rowSelection },
  onRowSelectionChange: setRowSelection,
  getSelectedRowModel: getSelectedRowModel(),
  getRowId: (row) => row.id,
  ```

- Subtask 2.4 — Fire `onSelectionChange` effect:
  ```tsx
  const selectedIds = table.getSelectedRowModel().rows.map(r => r.original.id)
  useEffect(() => { onSelectionChange(selectedIds) }, [selectedIds, onSelectionChange])
  ```

- Subtask 2.5 — Add checkbox column to `columns` array (first position):
  See "Checkbox column" pattern in Codebase Patterns above.

- Subtask 2.6 — Slim desktop columns. Remove from `columns` array:
  - `{ accessorKey: 'email', header: 'Email' }` — remove
  - `{ accessorKey: 'companySize', header: 'Ukuran Perusahaan' }` — remove
  - `{ accessorKey: 'createdAt', header: 'Dibuat' }` — remove

  Remaining desktop columns (in order): select (checkbox), name+flag, phone, industryId, city, completenessScore — **6 total** (5 data + 1 checkbox).

- Subtask 2.7 — Mobile card selectMode behavior:
  ```tsx
  // In mobile card onClick handler:
  onClick={() => {
    if (selectMode) {
      row.toggleSelected()    // select, don't open Sheet
    } else {
      setDetailContact(contact)  // existing behavior
    }
  }}
  // Add checkbox at left of mobile card when selectMode:
  {selectMode && (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(v) => row.toggleSelected(!!v)}
      onClick={(e) => e.stopPropagation()}
      className="mr-2 flex-shrink-0"
    />
  )}
  ```
  Note: mobile cards currently use `(data?.data ?? []).map((contact) => ...)` without a `row` object. To access `row.toggleSelected()`, map over `table.getRowModel().rows` instead of `data?.data` so you have TanStack row objects available.

**Task 3: Update `ContactsCommandCenter.tsx`**

- Subtask 3.1 — Add state:
  ```tsx
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectMode, setSelectMode] = useState(false)
  const [resetKey, setResetKey] = useState(0)  // incrementing resets ContactsTable rowSelection

  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedIds(ids)
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedIds([])
    setResetKey(k => k + 1)  // forces ContactsTable to reinitialize rowSelection to {}
  }, [])
  ```

- Subtask 3.2 — Add "Pilih" toggle to page header (desktop only — `hidden md:flex`):
  ```tsx
  <div className="flex items-center justify-between mb-4">
    <h1 className="text-2xl font-bold text-gray-900">Database Kontak</h1>
    <Button
      variant={selectMode ? 'default' : 'outline'}
      size="sm"
      className="hidden md:inline-flex"
      onClick={() => {
        const next = !selectMode
        setSelectMode(next)
        if (!next) handleClearSelection()
      }}
    >
      {selectMode ? 'Batal Pilih' : 'Pilih'}
    </Button>
  </div>
  ```

  For **mobile**, add a sticky select bar directly above the mobile cards inside `ContactsTable` (rendered only at `md:hidden`):
  ```tsx
  {/* Mobile sticky select bar — above cards, below filters */}
  <div className="md:hidden sticky top-0 z-10 bg-background border-b px-0 py-2 flex items-center justify-between mb-2">
    <button
      type="button"
      className="text-sm font-medium text-primary"
      onClick={() => {
        // toggle via parent prop
        onToggleSelectMode()
      }}
    >
      {selectMode ? `Batal Pilih` : 'Pilih'}
    </button>
    {selectMode && selectedIds.length > 0 && (
      <span className="text-sm text-muted-foreground">{selectedIds.length} dipilih</span>
    )}
    {selectMode && (
      <button
        type="button"
        className="text-sm font-medium"
        onClick={() => table.toggleAllPageRowsSelected(true)}
      >
        Pilih Semua
      </button>
    )}
  </div>
  ```
  Add `onToggleSelectMode: () => void` to `ContactsTableProps`. In `ContactsCommandCenter`, pass:
  ```tsx
  onToggleSelectMode={() => {
    const next = !selectMode
    setSelectMode(next)
    if (!next) handleClearSelection()
  }}
  ```

- Subtask 3.3 — Pass new props to `ContactsTable`:
  ```tsx
  <ContactsTable
    key={resetKey}                        // ← increment to reset rowSelection state
    onSelectionChange={handleSelectionChange}
    onToggleSelectMode={() => {
      const next = !selectMode
      setSelectMode(next)
      if (!next) handleClearSelection()
    }}
    selectMode={selectMode}
    selectedIds={selectedIds}            // needed by mobile sticky bar for count display
  />
  ```

- Subtask 3.4 — Pass `selectedIds` and `onClearSelection` to `ActionToolbar`:
  ```tsx
  <ActionToolbar
    total={contacts?.pagination.total ?? 0}
    searchParams={searchParams}
    isVisible={hasFilters || selectedIds.length > 0}
    selectedIds={selectedIds}
    onClearSelection={handleClearSelection}
  />
  ```

**Task 4: Upgrade `ActionToolbar.tsx`**

- Subtask 4.1 — Update props interface:
  ```tsx
  interface ActionToolbarProps {
    total: number
    searchParams: URLSearchParams
    isVisible: boolean
    selectedIds: string[]
    onClearSelection: () => void
  }
  ```

- Subtask 4.2 — Add imports:
  ```tsx
  import { useMutation, useQueryClient } from '@tanstack/react-query'
  import { toast } from 'sonner'
  import { Badge } from '@/components/ui/badge'
  import type { FlagCategory } from '@/types/api'
  ```

- Subtask 4.3 — Add bulk flag mutation (see Codebase Patterns above). Update `onSuccess` to handle `updated === 0`:
  ```tsx
  onSuccess: ({ updated }) => {
    queryClient.invalidateQueries({ queryKey: ['contacts'] })
    queryClient.invalidateQueries({ queryKey: ['contacts-health'] })
    if (updated === 0) {
      toast.warning('Tidak ada kontak yang diperbarui')
    } else {
      toast.success(`${updated} kontak berhasil ditandai`)
    }
    onClearSelection()
  },
  ```

- Subtask 4.4 — Render selection count chip when `selectedIds.length > 0`:
  ```tsx
  {selectedIds.length > 0 && (
    <div className="flex items-center gap-2">
      <Badge variant="secondary">{selectedIds.length} terpilih</Badge>
      <button
        type="button"
        className="text-xs text-muted-foreground hover:text-foreground"
        onClick={onClearSelection}
      >
        × Batalkan
      </button>
    </div>
  )}
  ```

- Subtask 4.5 — Bulk flag buttons (show only when `selectedIds.length > 0`):
  ```tsx
  {selectedIds.length > 0 && (
    <>
      <Button variant="outline" size="sm"
        onClick={() => bulkFlagMutation.mutate({ ids: selectedIds, flagCategory: 'spam' })}
        disabled={bulkFlagMutation.isPending}
      >
        Tandai Spam
      </Button>
      <Button variant="outline" size="sm"
        onClick={() => bulkFlagMutation.mutate({ ids: selectedIds, flagCategory: 'not-potential' })}
        disabled={bulkFlagMutation.isPending}
      >
        Tidak Potensial
      </Button>
      <Button variant="outline" size="sm"
        onClick={() => bulkFlagMutation.mutate({ ids: selectedIds, flagCategory: null })}
        disabled={bulkFlagMutation.isPending}
      >
        Hapus Tanda
      </Button>
    </>
  )}
  ```

- Subtask 4.6 — Update blast button to use selectedIds when in selection mode:
  ```tsx
  // ⚠️ Use '/app/blasts/new' (plural) — matches existing buildBlastUrl in this file
  const blastUrl = selectedIds.length > 0
    ? `/app/blasts/new?selectedIds=${selectedIds.join(',')}&count=${selectedIds.length}`
    : buildBlastUrl(searchParams, total)

  // Label also updates:
  const blastLabel = selectedIds.length > 0
    ? `Blast ${selectedIds.length} kontak →`
    : `Blast Segmen · ${total} kontak →`
  ```

- Subtask 4.7 — Left side label update:
  ```tsx
  <span className="text-sm text-muted-foreground">
    {selectedIds.length > 0
      ? `${selectedIds.length} kontak terpilih di halaman ini`
      : `${total} kontak di segmen ini`}
  </span>
  ```

**Task 5: Add MSW bulk-flag handler to `contacts.ts`**

- Add the following handler BEFORE the `http.delete('/api/contacts/duplicates/:id')` line (line ~194) to ensure it's before any parameterized `/:id` routes:
  ```ts
  http.patch('/api/contacts/bulk-flag', async ({ request }) => {
    await delay(300)
    const { ids, flagCategory } = await request.json() as { ids: string[]; flagCategory: FlagCategory | null }
    let updated = 0
    for (const contact of contactsPool) {
      if (ids.includes(contact.id)) {
        contact.flagCategory = flagCategory
        updated++
      }
    }
    return HttpResponse.json({ updated })
  }),
  ```

---

### Acceptance Criteria

**AC1 — Checkbox selection, desktop:**
Given the contacts table is loaded,
When the admin checks a row checkbox,
Then that row is visually selected (highlighted `bg-muted/30`) and its ID appears in the ActionToolbar count badge.

**AC2 — Select all on current page:**
Given at least one contact is visible,
When the admin clicks the header checkbox,
Then all rows on the current page are selected; clicking again deselects all.

**AC3 — ActionToolbar appears on selection:**
Given no filters are active,
When the admin selects one or more rows,
Then the ActionToolbar slides into view at the bottom showing: "N kontak terpilih di halaman ini", bulk flag buttons, and the Blast button.

**AC4 — Bulk flag — spam:**
Given 3 contacts are selected,
When the admin clicks "Tandai Spam",
Then `PATCH /api/contacts/bulk-flag` is called with `{ ids: [3 IDs], flagCategory: 'spam' }`, a success toast shows "3 kontak berhasil ditandai", selection is cleared, and `['contacts']` + `['contacts-health']` queries are invalidated.

**AC5 — Bulk flag — clear:**
Given contacts with `flagCategory: 'spam'` are selected,
When the admin clicks "Hapus Tanda",
Then `PATCH /api/contacts/bulk-flag` is called with `{ flagCategory: null }` and the flag badges disappear from those rows after refetch.

**AC6 — Blast with selected IDs:**
Given 5 contacts are selected,
When the admin clicks "Blast 5 kontak →",
Then the router navigates to `/app/blast/new?selectedIds=<id1,id2,...>&count=5`.

**AC7 — Column density, desktop:**
Given the contacts table is loaded on a desktop viewport (≥ 768px),
Then the visible columns are: checkbox, Nama+flag badge, Telepon, Industri, Kota, Kelengkapan — exactly 6 columns; Email, Ukuran Perusahaan, and Dibuat are NOT visible in the table (they remain in the detail Sheet).

**AC8 — Mobile select mode:**
Given the user is on a mobile viewport (< 768px),
When the user taps "Pilih" in the page header,
Then contact cards switch to select mode: each card shows a leading checkbox; tapping a card selects it (does NOT open the Sheet); the ActionToolbar appears at the bottom.

**AC9 — Mobile select mode exit:**
Given select mode is active with 3 contacts selected,
When the user taps "Batal Pilih",
Then select mode exits, all selections are cleared, and cards return to tap-to-open-Sheet behavior.

**AC10 — Selection does not persist across page navigation:**
Given the admin has 5 contacts selected on page 1,
When the admin navigates to page 2 via pagination,
Then `handleClearSelection` is called (incrementing `resetKey`), `ContactsTable` remounts with empty `rowSelection`, selection resets to 0, and ActionToolbar shows only if a filter is active.
> Note: `ContactsPagination` must call `onPageChange` → `ContactsCommandCenter` calls `handleClearSelection` on page change. Add `onPageChange` prop to `ContactsPagination` or listen to `searchParams` page changes in `ContactsCommandCenter` via `useEffect`.

**AC11 — Bulk flag updated === 0 shows warning:**
Given the admin selects contacts that have already been removed from the pool,
When `PATCH /api/contacts/bulk-flag` returns `{ updated: 0 }`,
Then a warning toast "Tidak ada kontak yang diperbarui" appears instead of a success toast.

**AC12 — contacts-health invalidated on flag clear:**
Given flagged contacts are selected and admin clicks "Hapus Tanda",
When `PATCH /api/contacts/bulk-flag` with `{ flagCategory: null }` succeeds,
Then both `['contacts']` and `['contacts-health']` queries are invalidated (HealthBar count updates).

---

## Additional Context

### Dependencies

- `@tanstack/react-table` — already installed; `getSelectedRowModel` is a named export from v8
- `shadcn/ui Checkbox` — NOT yet installed (`src/components/ui/checkbox.tsx` missing); run `npx shadcn@latest add checkbox` first

### Testing Strategy

Write tests in `src/components/features/contacts/ContactsTable.test.tsx` (new file):

1. **Checkbox renders** — table renders with a checkbox column; header and cell checkboxes are present
2. **Row selection** — clicking a row checkbox calls `onSelectionChange` with that row's ID
3. **Select all** — clicking header checkbox calls `onSelectionChange` with all page IDs
4. **onSelectionChange fires on deselect** — deselecting a row fires with empty array
5. **Mobile selectMode** — when `selectMode=true`, card click does NOT trigger Sheet open; checkbox appears

Write tests in `src/components/features/contacts/ActionToolbar.test.tsx` (new file):

6. **Hidden when no selection and no filter** — `isVisible=false` renders null
7. **Shows bulk flag buttons when selectedIds present** — "Tandai Spam" button visible
8. **Bulk flag mutation called** — clicking "Tandai Spam" calls `PATCH /api/contacts/bulk-flag`
9. **Blast URL — selection mode** — blast button href contains `selectedIds=` and uses `/app/blasts/new` (plural)
10. **Blast URL — segment mode** — when `selectedIds=[]`, blast URL uses segment params
11. **updated === 0 → warning toast** — mock returns `{ updated: 0 }`, verify `toast.warning` called not `toast.success`
12. **contacts-health invalidated on clear-flag** — after `flagCategory: null` mutation, `queryClient.invalidateQueries(['contacts-health'])` called

### Notes

- `getSelectedRowModel` must be imported separately in TanStack Table v8: `import { ..., getSelectedRowModel } from '@tanstack/react-table'`
- The mobile card currently maps `data?.data ?? []` directly — switch to `table.getRowModel().rows` so each card has a `row` object for `row.toggleSelected()`. This is a non-breaking change since `row.original` gives back the contact.
- MSW handler ordering: `http.patch('/api/contacts/bulk-flag')` must appear before any `http.patch('/api/contacts/:id')` if that handler is ever added (currently it isn't, so order within the array is fine anywhere before the general GET `/:id`).
- The `'invalid-data'` and `'duplicate'` flag categories exist in `FLAG_LABELS` in `ContactsTable.tsx` but are NOT in the bulk flag submenu — intentionally excluded (those are set by ETL/triage flow, not manual admin bulk action). Only expose `spam`, `not-potential`, and `null` (clear).
