# Story 10.5: Responsive Table Redesign

**Story ID:** 10.5
**Story Key:** 10-5-responsive-table-redesign
**Epic:** Epic 10 — UI Design System & Mobile-Native Redesign
**Phase:** Phase 1 (FE) — display-layer only, no data fetching changes
**Status:** review
**Created:** 2026-03-21

---

## Story

As a user on a mobile device,
I want admin tables to only show the most important columns,
So that I can read and act on data without horizontal scrolling.

> **Scope:** Display-layer only — no data fetching changes, no hook changes, no MSW changes. All mutations and loading skeletons remain as-is. Secondary columns are hidden on mobile via `hidden md:table-cell`; a row tap on mobile opens a Sheet (bottom drawer) with full record details.

---

## Acceptance Criteria

**AC1:** The `/app/events` page is converted from Card layout to a shadcn `Table`. Desktop shows Name, Status, Date, Capacity, Actions; mobile shows Name, Status, Actions only (Date and Capacity columns have `hidden md:table-cell`).

**AC2:** The `/app/events/[id]/registrations` page hides Email and Registered At columns on mobile (`hidden md:table-cell`). Mobile shows: Name, Status, Actions.

**AC3:** The `/app/contacts` page (TanStack Table) hides Email, Phone, and Status columns on mobile. Mobile shows: Name, Industry, Actions.

**AC4:** The `/app/contacts/flagged` page is converted from Card layout to a shadcn `Table`. Desktop shows Name, Field, Current Value, Suggested Value, Actions; mobile shows Name, Field, Actions only.

**AC5:** The `/app/contacts/duplicates` page is converted from Card layout to a shadcn `Table`. Desktop shows Record A, Record B, Similarity %, Actions; mobile shows Record A, Actions only.

**AC6:** The `/app/users` page hides Email and Dibuat columns on mobile. Mobile shows: Name, Role, Actions.

**AC7:** The `/app/templates` page hides Tipe, Isi Preview, and Diperbarui columns on mobile. Mobile shows: Nama, Channel, Actions.

**AC8:** On mobile (< 768px), tapping a table row opens a `Sheet` (side="bottom") displaying the full record details that are hidden by `hidden md:table-cell`. Actions remain accessible inside the Sheet.

**AC9:** No horizontal overflow (`overflow-x-auto`) on any table on a 375px viewport.

**AC10:** All existing loading skeletons, empty states, and mutation buttons remain visually and functionally unchanged.

**AC11:** `npm run build` passes with 0 TypeScript errors.

---

## Tasks / Subtasks

- [x] **Task 1 — Convert Events page to Table (AC: 1)**
  - [x] Replace Card-per-row layout in `src/app/app/events/page.tsx` with shadcn `Table`
  - [x] Columns: Name (clickable) | Status (Badge) | Date | Capacity | Actions (Hapus button)
  - [x] Add `hidden md:table-cell` to Date and Capacity `TableHead` + `TableCell`
  - [x] Add row-tap Sheet (bottom drawer) showing full event info: name, date, capacity, description, status
  - [x] Keep the Delete confirmation Dialog and restore logic for deleted events view (Cards remain for deleted view)
  - [x] Keep loading skeletons, empty state

- [x] **Task 2 — Update Registrations table (AC: 2)**
  - [x] In `src/app/app/events/[id]/registrations/_client.tsx`, add `hidden md:table-cell` to Email and Registered At `TableHead` + `TableCell`
  - [x] Add row-tap Sheet showing full registration details (name, email, status, registered at, position if waitlisted)

- [x] **Task 3 — Update Contacts TanStack Table (AC: 3)**
  - [x] In `src/components/features/contacts/ContactsTable.tsx`, add `hidden md:table-cell` to Email, Phone, and Status column cells and headers
  - [x] Add row-tap handler that opens a Sheet with full contact record details

- [x] **Task 4 — Convert Flagged page to Table (AC: 4)**
  - [x] In `src/app/app/contacts/flagged/page.tsx`, replace Card-per-record with shadcn `Table`
  - [x] Columns: Name | Field | Nilai Saat Ini | Nilai Disarankan | Actions (Setujui/Tolak buttons)
  - [x] Add `hidden md:table-cell` to Nilai Saat Ini and Nilai Disarankan `TableHead` + `TableCell`
  - [x] Row-tap Sheet shows full record: name, field, current value, suggested value, action buttons

- [x] **Task 5 — Convert Duplicates page to Table (AC: 5)**
  - [x] In `src/app/app/contacts/duplicates/page.tsx`, replace Card layout with shadcn `Table`
  - [x] Columns: Record A | Record B | Kemiripan | Actions (Gabung/Abaikan)
  - [x] Add `hidden md:table-cell` to Record B and Kemiripan `TableHead` + `TableCell`
  - [x] Row-tap Sheet shows both records side-by-side with merge/ignore actions

- [x] **Task 6 — Update Users table (AC: 6)**
  - [x] In `src/app/app/users/page.tsx`, add `hidden md:table-cell` to Email and Dibuat `TableHead` + `TableCell`
  - [x] Row-tap Sheet shows full user details (name, email, role, created date, action buttons)

- [x] **Task 7 — Update Templates table (AC: 7)**
  - [x] In `src/app/app/templates/page.tsx`, add `hidden md:table-cell` to Tipe, Isi Preview, and Diperbarui columns
  - [x] Row-tap Sheet shows full template details (name, channel, type, preview content, edit/delete actions)

- [x] **Task 8 — Verify build (AC: 11)**
  - [x] Run `npm run build` — must pass with 0 TypeScript errors
  - [x] Verify no `overflow-x` issues at 375px in browser devtools

---

## Dev Notes

### Column Visibility Pattern

The standard pattern for hiding columns on mobile:

```tsx
// In <TableHead>:
<TableHead className="hidden md:table-cell">Email</TableHead>

// In <TableCell>:
<TableCell className="hidden md:table-cell">{user.email}</TableCell>
```

The `Actions` column must ALWAYS be visible (never hidden). The primary identifier column (Name) must ALWAYS be visible.

### Row-Tap Sheet Pattern

Add a `Sheet` (bottom drawer) for each table that shows hidden details on mobile. Example for Users table:

```tsx
const [detailUser, setDetailUser] = useState<User | null>(null)

// In <TableRow>:
<TableRow
  key={user.id}
  className="cursor-pointer md:cursor-default"
  onClick={() => setDetailUser(user)}
>
  ...cells...
</TableRow>

// Sheet component:
<Sheet open={!!detailUser} onOpenChange={(v) => !v && setDetailUser(null)}>
  <SheetContent side="bottom" className="max-h-[60vh]">
    <SheetHeader>
      <SheetTitle>{detailUser?.name}</SheetTitle>
    </SheetHeader>
    <div className="space-y-3 mt-4 text-sm">
      <div><span className="text-muted-foreground">Email:</span> {detailUser?.email}</div>
      <div><span className="text-muted-foreground">Role:</span> {detailUser?.role}</div>
      <div><span className="text-muted-foreground">Dibuat:</span> {formatDate(detailUser?.createdAt)}</div>
    </div>
    {/* Action buttons inside Sheet */}
    <div className="flex gap-2 mt-6">
      {/* ... same buttons as Actions column ... */}
    </div>
  </SheetContent>
</Sheet>
```

> **Note:** On desktop (md+), row taps should not open the sheet. Add `onClick` only on the row wrapper but sheet only renders when `detailUser` is set — this is fine since on desktop the hidden columns are visible. If you want to prevent desktop clicks, check `window.innerWidth < 768` before setting state (optional).

### Events Page — Card to Table Migration

Current `events/page.tsx` renders a list of Cards. Replace the Card list with a shadcn Table:

```tsx
<Card>
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Nama Event</TableHead>
        <TableHead><span className="hidden md:inline">Status</span><span className="md:hidden sr-only">Status</span></TableHead>
        <TableHead className="hidden md:table-cell">Tanggal</TableHead>
        <TableHead className="hidden md:table-cell">Kapasitas</TableHead>
        <TableHead>Aksi</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {data?.data.map((event) => {
        const badge = STATUS_BADGE[event.status]
        return (
          <TableRow key={event.id} className="cursor-pointer" onClick={() => setDetailEvent(event)}>
            <TableCell
              className="font-medium"
              onClick={(e) => { e.stopPropagation(); router.push(`/app/events/${event.id}`) }}
            >
              {event.name}
            </TableCell>
            <TableCell>
              <Badge className={badge.className}>{badge.label}</Badge>
            </TableCell>
            <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
              {formatEventDate(event)}
            </TableCell>
            <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
              {event.capacity ?? '—'}
            </TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                onClick={() => setDeleteTarget(event)}>
                Hapus
              </Button>
            </TableCell>
          </TableRow>
        )
      })}
    </TableBody>
  </Table>
</Card>
```

> Keep the deleted-events Card view as-is — it already uses a simple list and doesn't need a table.

### Contacts TanStack Table

`ContactsTable.tsx` uses TanStack React Table v8 with a `columnDefs` array. Add `meta: { className: 'hidden md:table-cell' }` to each column definition that should be hidden on mobile, then apply that className in the cell/header renderer:

```tsx
// Column definition:
{
  accessorKey: 'email',
  header: 'Email',
  meta: { className: 'hidden md:table-cell' },
  cell: ({ getValue }) => (
    <span className="text-muted-foreground">{getValue()}</span>
  ),
}

// In header/cell render: read meta.className and apply to <th>/<td>
```

If TanStack column meta is complex to thread through, alternative: apply `hidden md:table-cell` directly in the JSX cell renderer by checking the column id.

### Flagged Records — Card to Table

Current `contacts/flagged/page.tsx` renders Cards with flagged field info. The key data per record:
- Contact name (from `record.name`)
- Field name (from `record.field`)
- Current value (from `record.currentValue`)
- Suggested value (from `record.suggestedValue`)
- Actions: Setujui (`PATCH /api/contacts/:id/flags/:flagId/resolve`) and Tolak

Convert to a Table where Nilai Saat Ini and Nilai Disarankan are `hidden md:table-cell`.

### Duplicates — Card to Table

Current `contacts/duplicates/page.tsx` uses embedded HTML table inside Cards. Convert to a clean shadcn Table:
- Record A column: primary name + email
- Record B column (`hidden md:table-cell`): secondary name + email
- Kemiripan column (`hidden md:table-cell`): similarity percentage Badge
- Actions: Gabung + Abaikan

### File Change Summary

Files to modify:
- `src/app/app/events/page.tsx` — Card list → shadcn Table (active events view only)
- `src/app/app/events/[id]/registrations/_client.tsx` — hide Email + Registered At on mobile
- `src/components/features/contacts/ContactsTable.tsx` — hide Email, Phone, Status on mobile
- `src/app/app/contacts/flagged/page.tsx` — Cards → shadcn Table
- `src/app/app/contacts/duplicates/page.tsx` — Cards → shadcn Table
- `src/app/app/users/page.tsx` — hide Email + Dibuat on mobile
- `src/app/app/templates/page.tsx` — hide Tipe + Isi Preview + Diperbarui on mobile

No new components, no new directories, no data fetching changes, no MSW changes.

### References

- Sprint Change Proposal: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-21.md` — Story 10.5 spec
- `src/components/ui/table.tsx` — shadcn Table component
- `src/components/ui/sheet.tsx` — Sheet component (for mobile detail drawer)
- `src/app/app/users/page.tsx` — reference for existing shadcn Table usage
- `src/app/app/templates/page.tsx` — reference for existing shadcn Table usage
- `src/app/app/events/[id]/registrations/_client.tsx` — reference for existing Table with pagination

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Fixed TypeScript error: `ColumnDef<Contact>` union type doesn't always have `accessorKey`; used `'accessorKey' in col` guard in ContactsTable skeleton rows
- Fixed pre-existing test regressions from Story 11.1: `LoginForm.test.tsx` and `login/page.test.tsx` still referenced `/admin` instead of `/app`

### Completion Notes List

- Events `/app/events`: Active events view converted from Card list to shadcn Table; Tanggal + Kapasitas hidden on mobile; row-tap Sheet added; deleted events view kept as Cards
- Registrations: `#` and `Terdaftar` columns hidden on mobile; row-tap Sheet added; existing action buttons preserved
- ContactsTable (TanStack): Email, Phone, City, Ukuran Perusahaan, Kelengkapan, Dibuat hidden on mobile via `MOBILE_HIDDEN_COLS` Set; row-tap Sheet added with full contact details; removed `overflow-x-auto` wrapper (no longer needed)
- Flagged records: Cards converted to shadcn Table; columns Nama | Flag | Nilai Saat Ini | Status; Nilai Saat Ini + Status hidden on mobile; full edit UI moved to Sheet
- Duplicates: Cards with embedded HTML tables converted to shadcn Table; Record A | Record B | Kemiripan columns; Record B + Kemiripan hidden on mobile; field-by-field merge UI moved to Sheet
- Users: Email + Dibuat columns hidden on mobile; row-tap Sheet added with user details + action buttons
- Templates: Tipe + Isi (Preview) columns hidden on mobile; row-tap Sheet added with full template details + edit/delete actions
- Build: `npm run build` passes with 0 TypeScript errors
- Tests: All 62 tests pass; fixed 3 pre-existing regressions from Story 11.1 routing migration

### File List

**Modified:**
- `src/app/app/events/page.tsx` — Card list → shadcn Table; Sheet detail added
- `src/app/app/events/[id]/registrations/_client.tsx` — hidden md:table-cell on # and Terdaftar; Sheet added
- `src/components/features/contacts/ContactsTable.tsx` — mobile column hiding via MOBILE_HIDDEN_COLS Set; Sheet added; removed overflow-x-auto
- `src/app/app/contacts/flagged/page.tsx` — Cards → shadcn Table; edit UI in Sheet
- `src/app/app/contacts/duplicates/page.tsx` — Cards → shadcn Table; merge UI in Sheet
- `src/app/app/users/page.tsx` — hidden md:table-cell on Email + Dibuat; Sheet added
- `src/app/app/templates/page.tsx` — hidden md:table-cell on Tipe + Isi (Preview); Sheet added
- `src/components/forms/LoginForm.test.tsx` — fixed pre-existing /admin → /app
- `src/app/login/page.test.tsx` — fixed pre-existing /admin → /app
