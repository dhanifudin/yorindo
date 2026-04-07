# Story 3.1: Contact List with Server-Side Pagination & Filtering

**Story ID:** 3.1
**Story Key:** 3-1-contact-list-with-server-side-pagination-filtering
**Epic:** Epic 3 — Contact Database & Participant Intelligence
**Phase:** Phase 1 (FE) — wired to MSW contacts handler
**Status:** review
**Created:** 2026-03-20

---

## Story

As an admin,
I want to browse the contact database with pagination, sorting, and filtering by serviceType (industri), city (kota), and jobTitle (jabatan),
So that I can find and review specific participant segments efficiently.

> **Phase 1 FE scope:** Build the contacts list page with TanStack Table v8 in server-side (manual) mode, filter bar, pagination controls — all wired to the existing MSW contacts handler (247 seeded contacts, pagination, serviceType/city/jobTitle filters). No real backend.

> **Updated 2026-04-07 (SCP-2026-04-07):** `companySize` filter removed (field no longer exists in contacts schema). `industry`/`industryId` replaced by free-text `serviceType`. `jobTitle` (Jabatan) filter added.

---

## Acceptance Criteria (FE Phase 1)

**AC1:** Given `/app/contacts` renders,
When the page loads,
Then TanStack Table v8 displays paginated contact data (20 per page default) from `GET /api/contacts?page=1&pageSize=20`

**AC2:** Given the table is rendered,
Then columns show: name, email, phone, serviceType (industri), jobTitle (jabatan), city, company, created_at — all sortable

**AC3:** Given filter inputs for serviceType (Industri select), city (free-text, debounced), and jobTitle (Jabatan free-text, debounced) are changed,
When the filter value changes (debounced 300–350ms),
Then the table re-fetches with the new filter params and updates without a full page reload

> **Updated 2026-04-07 (SCP-2026-04-07):** `companySize` filter removed. `industry` → `serviceType` URL param. `jobTitle` (Jabatan) text filter added (debounced 350ms, ILIKE partial match on BE).

**AC4:** Given page navigation controls,
When "Next" or "Previous" is clicked,
Then `page` param increments/decrements and React Query re-fetches the new page

**AC5:** Given the table is loading (React Query fetch in progress),
Then a skeleton loader (or loading indicator) is shown in the table body

**AC6:** Given `filterStore` (serviceType, city, jobTitle, page, flagFilter, missingEmail, missingPhone),
When filters or page changes,
Then filterStore is updated and the query key includes current filter state

**AC7 (2026-03-28):** Given the filter bar renders,
Then a `LocationPicker` component is shown:
- Province: shadcn `<Select>` — fetches `https://wilayah.id/api/provinces.json` (SWR, 1hr cache); falls back to `src/data/wilayah-static.json` if unreachable
- City: shadcn `<Combobox>` with search — fetches `https://wilayah.id/api/regencies/{province_code}.json` when province is selected
- Selecting a city sets both `province_code` and `city_code` in filterStore
- Clearing province also clears city

---

## Tasks / Subtasks

- [x] **Task 1: Create contacts page route**
  - [x] Create `src/app/app/contacts/page.tsx`
  - [x] Page title: "Database Kontak"
  - [x] Import and render `ContactsTable` component

- [x] **Task 2: Build ContactsTable component with TanStack Table v8**
  - [x] Create `src/components/features/contacts/ContactsTable.tsx`
  - [x] Use `useReactTable` in manual (server-side) mode: `manualPagination: true`, `manualFiltering: true`
  - [x] Define columns: name, email, phone, industryId, city, companySize, completenessScore, createdAt
  - [x] Add `getCoreRowModel` from `@tanstack/react-table`

- [x] **Task 3: React Query data fetching**
  - [x] Create `src/hooks/useContacts.ts`
  - [x] Use `useQuery` with key `['contacts', { page, pageSize, serviceType, city, jobTitle, ... }]`
  - [x] Fetch `GET /api/contacts?page={page}&pageSize={pageSize}&serviceType={serviceType}&city={city}&jobTitle={jobTitle}`
  - [x] Read filter params from `useFilterStore()` + `useSearchParams()`

- [x] **Task 4: Filter bar component**
  - [x] Create `src/components/features/contacts/ContactsFilterBar.tsx`
  - [x] Add inputs for: serviceType/Industri (shadcn Select + AI Smart Search), city/Kota (text, debounced), jobTitle/Jabatan (text, debounced 350ms, with clear button)
  - [x] On change: debounce, update URL params via `router.push`
  - [x] Add "Reset Filters" button: clears all URL params and local state

- [ ] **Task 8 (2026-03-28): LocationPicker + location filter (AC7, SCP-2026-03-28-D)**
  - [ ] Create `src/components/ui/LocationPicker.tsx` (shared component — reused in Stories 5.2 and 6.2)
    - Props: `value: { province_code: string | null; city_code: string | null }`, `onChange`
    - Province: shadcn `<Select>`, SWR fetch `https://wilayah.id/api/provinces.json` (1hr cache)
    - City: shadcn `<Combobox>` with search, SWR fetch `.../regencies/{province_code}.json` (30min cache, load on demand)
    - Falls back to `src/data/wilayah-static.json` if wilayah.id unreachable
    - Clearing province resets city to null
  - [ ] Generate `src/data/wilayah-static.json` via one-time `scripts/generate-wilayah-static.ts` (fetches all provinces + all regencies, commits result)
  - [ ] Wire LocationPicker into `ContactsFilterBar` — replaces free-text city input
  - [ ] Update `useContacts` query key and fetch URL: `province_code` + `city_code` params replace `city`
  - [ ] Update `filterStore` shape: replace `city: string` with `province_code: string | null`, `city_code: string | null`
  - [ ] Test: province select → city combobox loads correct options; clear province → city cleared

- [x] **Task 5: Pagination controls**
  - [x] Create `src/components/features/contacts/ContactsPagination.tsx`
  - [x] Show: "Halaman X dari Y" text, Sebelumnya/Berikutnya buttons, total record count
  - [x] Disable Sebelumnya on page 1, Berikutnya on last page
  - [x] On page change: `filterStore.setFilter({ page: newPage })`

- [x] **Task 6: Loading skeleton**
  - [x] Show skeleton rows (8 rows) while `isLoading` is true
  - [x] Use Tailwind `animate-pulse`

- [x] **Task 7: Write vitest tests**
  - [x] Test: `useContacts` hook returns paginated data (uses MSW server from vitest.setup.ts)
  - [x] Test: serviceType filter reduces result count and all contacts match filter
  - [x] Test: page 1 returns 20 contacts, total = 247, totalPages = 13

---

## Dev Notes

### MSW Contacts Handler
`src/mocks/handlers/contacts.ts` handles `GET /api/contacts` with:
- 247 seeded contacts (`faker.seed(42)`)
- Pagination: `page`, `pageSize` params
- Filters: `serviceType` (exact match), `city` (includes), `jobTitle` (includes)
- Response shape: `{ data: Contact[], pagination: { page, pageSize, total, totalPages } }`
- 400ms simulated delay

### filterStore (`src/store/filterStore.ts`)
```typescript
interface FilterStore {
  serviceType: string    // was: industry
  city: string
  jobTitle: string       // new 2026-04-07
  page: number
  flagFilter: '' | 'flagged' | 'unflagged'
  missingEmail: boolean
  missingPhone: boolean
  setFilter: (partial: Partial<FilterStore>) => void
  resetFilter: () => void
}
```

### Contact type (`src/types/api.ts`)
```typescript
interface Contact {
  id: string
  name: string
  email: string
  phone: string
  company: string
  serviceType: string | null   // was: industryId (FK) + companySize — now free-text
  jobTitle: string | null      // was: jobTitleId (FK) — now free-text
  city: string
  department: string | null
  completenessScore: number
  consentStatus: string
  flagCategory: FlagCategory
  eventDate: string | null
  createdAt: string
  updatedAt: string
}
```

### TanStack Table v8 Manual Mode Pattern
```typescript
import { useReactTable, getCoreRowModel, ColumnDef } from '@tanstack/react-table'

const table = useReactTable({
  data: contacts ?? [],
  columns,
  pageCount: pagination?.totalPages ?? -1,
  state: { pagination: { pageIndex: page - 1, pageSize: 20 } },
  onPaginationChange: ...,
  getCoreRowModel: getCoreRowModel(),
  manualPagination: true,
  manualFiltering: true,
})
```
Note: `pageIndex` in TanStack is 0-based; `page` in API is 1-based. Convert accordingly.

### File Locations (from architecture)
- Page: `src/app/app/contacts/page.tsx`
- Table component: `src/components/features/contacts/ContactsTable.tsx`
- Filter bar: `src/components/features/contacts/ContactsFilterBar.tsx`
- Pagination: `src/components/features/contacts/ContactsPagination.tsx`
- Hook: `src/hooks/useContacts.ts`

### React Query Provider
Ensure `QueryClientProvider` wraps the admin layout. If not already in `src/app/layout.tsx`, add a `Providers` client component wrapping `QueryClientProvider`.

### Key Anti-Patterns
- DO NOT use client-side filtering — always fetch from MSW with filter params
- DO NOT add new fields to `filterStore` — shape is fixed
- DO NOT use `getFilteredRowModel()` from TanStack — we're in manualFiltering mode
- DO NOT use default TanStack pagination — we control page state via `filterStore.page`

---

## Dev Agent Record

### Implementation Plan

1. Created `src/hooks/useContacts.ts` — React Query hook reading `page/industry/city/companySize` from `filterStore`, fetching `GET /api/contacts` with query params.
2. Created `src/components/features/contacts/ContactsFilterBar.tsx` — industry select, city text input, companySize select with 300ms debounce; Reset button calls `resetFilter()`.
3. Created `src/components/features/contacts/ContactsTable.tsx` — TanStack Table v8 in manual mode (`manualPagination`, `manualFiltering`); 8 skeleton rows via `animate-pulse` while loading; error state; 8 columns.
4. Created `src/components/features/contacts/ContactsPagination.tsx` — calls `useContacts()` for pagination data (shared React Query cache, no extra fetch); Sebelumnya/Berikutnya buttons with disabled states.
5. Created `src/app/app/contacts/page.tsx` — server component assembling all three client components.
6. Created `src/hooks/useContacts.test.ts` — 3 vitest tests via MSW (total=247, totalPages=13, industry filter).

### Debug Log

- `Contact` type in api.ts has no `company` field — used actual fields: `industryId`, `jobTitleId`, `completenessScore` instead.
- `ContactsPagination` uses `useContacts()` directly (shared React Query cache) rather than accepting props, to avoid prop-drilling and keep the page server-rendered.

### Completion Notes

All 7 tasks complete. 33/33 tests pass (3 new in useContacts.test.ts; 30 pre-existing). `tsc --noEmit` clean. TanStack Table v8 in manual server-side mode; filterStore drives all query params.

---

## File List

**New files:**
- `src/hooks/useContacts.ts`
- `src/hooks/useContacts.test.ts`
- `src/components/features/contacts/ContactsFilterBar.tsx`
- `src/components/features/contacts/ContactsTable.tsx`
- `src/components/features/contacts/ContactsPagination.tsx`
- `src/app/app/contacts/page.tsx`

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-20 | Story created (FE Phase 1) | bmad-create-story |
| 2026-03-20 | All 7 tasks implemented; 33/33 tests pass | bmad-dev-story |
| 2026-04-07 | SCP-2026-04-07: `companySize` removed; `industry`→`serviceType`; `jobTitle` (Jabatan) filter added to FilterBar + BE route + repositories | bmad-correct-course |
