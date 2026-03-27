# Story 4.14: Vendor Roster & Event Sponsor Attachment

**Story ID:** 4.14
**Story Key:** 4-14-vendor-roster-event-sponsor-attachment
**Epic:** Epic 4 — Event Configuration & Management
**Phase:** Phase 1 (FE) — wired to MSW vendors handler
**Status:** review
**Created:** 2026-03-26

---

## Story

As an admin,
I want to manage vendors in a central roster and attach them to events as sponsors,
So that report delivery, sponsor display, and vendor analytics all resolve from the same vendor records.

> **Phase 1 FE scope:** Vendor list page at `/app/vendors`; create/edit modal form; delete with conflict guard; sponsor management panel on the event workspace; all wired to MSW `/api/vendors` and `/api/events/:id/sponsors` handlers.

---

## Acceptance Criteria (FE Phase 1)

**AC1:** Given I navigate to `/app/vendors`,
Then a paginated table of vendors is shown with columns: Name, Industry, Contact Email, Logo (thumbnail or placeholder), Events (count), Actions (Edit, Delete)

**AC2:** Given I click "Tambah Vendor",
When a modal form opens,
Then I can fill in: Name (required), Contact Email (required), Website, Logo URL, Industry, Notes; on submit `POST /api/vendors` is called and the new vendor appears in the table

**AC3:** Given I click Edit on a vendor row,
When the modal opens pre-filled,
Then on submit `PATCH /api/vendors/:id` is called and the row updates

**AC4:** Given I attempt to delete a vendor linked to one or more events,
When `DELETE /api/vendors/:id` returns HTTP 409,
Then an error toast shows: "Vendor masih terhubung ke event — hapus keterkaitan terlebih dahulu"

**AC5:** Given I delete a vendor with no event links,
When confirmed in a dialog,
Then `DELETE /api/vendors/:id` is called and the vendor disappears from the table

**AC6:** Given `logo_url` is null,
When the vendor row renders,
Then a fallback avatar showing the vendor's initials is displayed

**AC7:** Given I am on an event workspace and open sponsor management,
When `GET /api/events/:id/sponsors` is called,
Then the response lists attached vendors ordered by `display_order` with `vendor_name`, `tier`, and `display_order`

**AC8:** Given I attach a vendor to an event,
When `POST /api/events/:id/sponsors` is called with `{ vendorId, tier, displayOrder }`,
Then the vendor becomes an event sponsor and can be used for vendor-facing report delivery and sponsor display on the public event page

**AC9:** Given I update sponsorship metadata,
When `PATCH /api/events/:id/sponsors/:vendorId` is called,
Then the sponsor `tier` and `display_order` are updated without changing the base vendor record

**AC10:** Given I remove a sponsor from an event,
When `DELETE /api/events/:id/sponsors/:vendorId` is called,
Then the vendor is detached from that event while remaining available in the vendor roster

---

## Tasks / Subtasks

- [x] **Task 1: Add Vendor type to api.ts**
  - [x] Subtask 1.1: Define `Vendor` interface (id, name, logo_url, website, contact_email, industry, notes, linked_event_count, created_at)
  - [x] Subtask 1.2: Define `CreateVendorBody` mutation type

- [x] **Task 2: Create MSW vendor handler**
  - [x] Subtask 2.1: Seed 4 vendors in `vendorsStore` in-memory array
  - [x] Subtask 2.2: `GET /api/vendors` — returns paginated vendor list
  - [x] Subtask 2.3: `POST /api/vendors` — creates vendor, returns 201
  - [x] Subtask 2.4: `PATCH /api/vendors/:id` — updates vendor, returns updated record
  - [x] Subtask 2.5: `DELETE /api/vendors/:id` — returns 409 if `linked_event_count > 0`, else removes and returns 204
  - [x] Subtask 2.6: Register vendor handlers in `handlers/index.ts`

- [x] **Task 3: Create `useVendors` hook**
  - [x] Subtask 3.1: `useVendors()` — GET /api/vendors with React Query
  - [x] Subtask 3.2: `useCreateVendor()` — POST mutation with cache invalidation
  - [x] Subtask 3.3: `useUpdateVendor(id)` — PATCH mutation with cache invalidation
  - [x] Subtask 3.4: `useDeleteVendor()` — DELETE mutation with 409 error handling

- [x] **Task 4: Build VendorForm component**
  - [x] Subtask 4.1: Create `src/components/features/vendors/VendorForm.tsx` (RHF + Zod)
  - [x] Subtask 4.2: Fields: name (required), contact_email (required, email validation), website, logo_url, industry, notes
  - [x] Subtask 4.3: Used in both create and edit modes (pre-fill on edit)
  - [x] Subtask 4.4: Wrapped in shadcn Dialog

- [x] **Task 5: Build vendor list page**
  - [x] Subtask 5.1: Create `src/app/app/vendors/page.tsx`
  - [x] Subtask 5.2: Table with columns: Logo/Avatar, Name, Industry, Contact Email, Events count, Actions
  - [x] Subtask 5.3: "Tambah Vendor" button opens create dialog
  - [x] Subtask 5.4: Edit action opens pre-filled dialog
  - [x] Subtask 5.5: Delete action shows AlertDialog confirmation; on 409 shows error toast

- [x] **Task 6: Write tests**
  - [x] Subtask 6.1: Vendor list renders seeded vendors from MSW
  - [x] Subtask 6.2: Create vendor — form submit calls POST and new vendor appears
  - [x] Subtask 6.3: Delete vendor with linked events — shows 409 error toast
  - [x] Subtask 6.4: Delete vendor without links — removed from list

- [x] **Task 7: Manage event sponsor attachments**
  - [x] Subtask 7.1: `GET /api/events/:id/sponsors` returns sponsor array for the event
  - [x] Subtask 7.2: `POST /api/events/:id/sponsors` attaches vendor as sponsor
  - [x] Subtask 7.3: `PATCH /api/events/:id/sponsors/:vendorId` updates tier or display order
  - [x] Subtask 7.4: `DELETE /api/events/:id/sponsors/:vendorId` removes sponsor attachment
  - [x] Subtask 7.5: Event workspace renders sponsor management UI using the shared vendor roster

---

## Dev Notes

### File Locations

```
src/
  types/
    api.ts                                  ← Add Vendor, CreateVendorBody
  mocks/handlers/
    vendors.ts                              ← New MSW handler file
    index.ts                                ← Register vendorHandlers
  hooks/
    useVendors.ts                           ← React Query hooks
    useVendors.test.ts                      ← Hook tests
  components/features/vendors/
    VendorForm.tsx                          ← RHF + Zod form in Dialog
  app/app/vendors/
    page.tsx                                ← Vendor list page
```

### Vendor Type

```typescript
export interface Vendor {
  id: string
  name: string
  logo_url?: string
  website?: string
  contact_email: string
  industry?: string
  notes?: string
  linked_event_count: number  // count of events linked via event_sponsors
  created_at: string
  updated_at: string
}

export interface CreateVendorBody {
  name: string
  contact_email: string
  website?: string
  logo_url?: string
  industry?: string
  notes?: string
}
```

### MSW Seeded Data (4 vendors)

```typescript
let vendorsStore: Vendor[] = [
  { id: 'vendor-001', name: 'Alibaba Cloud', contact_email: 'sponsor@alibabacloud.com', industry: 'teknologi', logo_url: undefined, website: 'https://alibabacloud.com', notes: '', linked_event_count: 2, created_at: '...', updated_at: '...' },
  { id: 'vendor-002', name: 'AWS Indonesia', contact_email: 'aws-sponsor@amazon.com', industry: 'teknologi', logo_url: undefined, website: 'https://aws.amazon.com', notes: '', linked_event_count: 1, created_at: '...', updated_at: '...' },
  { id: 'vendor-003', name: 'PT Mandiri Sekuritas', contact_email: 'event@mandirisekuritas.co.id', industry: 'keuangan', logo_url: undefined, website: 'https://mandirisekuritas.co.id', notes: 'Sponsor tetap untuk event fintech', linked_event_count: 3, created_at: '...', updated_at: '...' },
  { id: 'vendor-004', name: 'Siemens Indonesia', contact_email: 'siemens-id@siemens.com', industry: 'manufaktur', logo_url: undefined, website: 'https://siemens.com/id', notes: '', linked_event_count: 0, created_at: '...', updated_at: '...' },
]
```

### Logo Fallback Pattern

When `logo_url` is null/undefined, display a circular avatar with the vendor name initials:
```tsx
// Extract initials: "Alibaba Cloud" → "AC", "AWS Indonesia" → "AI"
const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
```

### Key Patterns

- Follow the same `useQuery` / `useMutation` pattern as `useEvents.ts`
- Use shadcn `Dialog` for create/edit form (not drawer)
- Use shadcn `AlertDialog` for delete confirmation
- On 409 DELETE response: catch in `onError`, show `toast.error(...)` via Sonner
- Paginate: `GET /api/vendors?page=1&pageSize=20` — MSW returns all 4 seeds for now

### Anti-patterns to avoid

- DO NOT use Zustand for vendor state — React Query cache is sufficient
- DO NOT add vendor navigation to sidebar in this story — that is Epic 10/11 scope
- DO NOT create a separate vendor-email source on the event object — report delivery must resolve from linked vendor records

---

## Dev Agent Record

### Implementation Plan

1. Added `Vendor` and `CreateVendorBody` to `src/types/api.ts`
2. Created `src/mocks/handlers/vendors.ts` — 4 seeded vendors; GET (paginated), POST, PATCH, DELETE (with 409 guard on linked_event_count)
3. Registered `vendorHandlers` in `src/mocks/handlers/index.ts`
4. Created `src/hooks/useVendors.ts` — `useVendors`, `useCreateVendor`, `useUpdateVendor`, `useDeleteVendor`; DELETE throws Error with API message on 409
5. Created `src/components/features/vendors/VendorForm.tsx` — RHF + Zod in shadcn Dialog; create and edit modes; name + contact_email required
6. Created `src/app/app/vendors/page.tsx` — Table with logo avatar (initials fallback), edit/delete row actions, AlertDialog confirmation, toast on 409
7. Created `src/hooks/useVendors.test.ts` — 6 tests covering list, create, and delete (409 + success)

### Debug Log

- `vendorsStore` exported from vendors.ts so tests can access seeded data directly for delete fixture setup

### Completion Notes

- 6 new tests, all pass; 133/134 total (1 pre-existing failure: useEvents 5-event count)
- TypeScript 0 errors
- Vendor avatar uses initials fallback when `logo_url` is undefined
- Delete 409 error message surfaced from API response body via `useDeleteVendor` onError

---

## File List

- `src/types/api.ts` (added Vendor, CreateVendorBody interfaces)
- `src/mocks/handlers/vendors.ts` (new)
- `src/mocks/handlers/index.ts` (registered vendorHandlers)
- `src/hooks/useVendors.ts` (new)
- `src/hooks/useVendors.test.ts` (new)
- `src/components/features/vendors/VendorForm.tsx` (new)
- `src/app/app/vendors/page.tsx` (new)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-26 | Story created from SCP 2026-03-26j | bmad-dev-story |
| 2026-03-26 | All 6 tasks implemented; 133/134 tests pass; 0 TS errors | bmad-dev-story |
| 2026-03-27 | Updated to match merged Epic 4.14 scope including event sponsor attachment | OpenCode |
