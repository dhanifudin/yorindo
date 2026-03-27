# Story 4.15: Attach Sponsors to Event

**Story ID:** 4.15
**Story Key:** 4-15-attach-sponsors-to-event
**Epic:** Epic 4 — Event Configuration & Management
**Phase:** Phase 1 (FE) — wired to MSW event sponsors handler
**Status:** superseded
**Created:** 2026-03-26

---

## Story

As an admin,
I want to attach one or more vendors from the roster to an event as sponsors with a tier and display order,
So that sponsor information is formally linked to the event for report delivery, landing page display, and audit purposes.

> **Phase 1 FE scope:** Sponsor panel on the event Overview tab; vendor searchable dropdown; tier selector; remove action. All wired to MSW `/api/events/:id/sponsors` handlers. Vendor attachment is optional — events without sponsors are valid.

> **Superseded:** This implementation story has been merged into `/_bmad-output/implementation-artifacts/4-14-vendor-roster-management.md` to match the updated Epic 4 Story 4.14 scope.

---

## Acceptance Criteria (FE Phase 1)

**AC1:** Given I am on the event Overview tab (`/app/events/:id`),
Then a "Sponsor" section renders below the main funnel grid showing currently attached sponsors (name, tier badge) and an "Tambah Sponsor" button

**AC2:** Given I click "Tambah Sponsor",
When a popover/inline form opens,
Then I can select a vendor from the roster (searchable list) and a tier (`standard`/`premium`/`supporter`); on submit `POST /api/events/:id/sponsors` is called and the sponsor appears in the panel

**AC3:** Given I change a sponsor's tier,
When I select a new tier from the inline dropdown,
Then `PATCH /api/events/:id/sponsors/:vendorId` is called with `{ tier }` and the badge updates

**AC4:** Given I click the remove (×) button on an attached sponsor,
When confirmed in an AlertDialog,
Then `DELETE /api/events/:id/sponsors/:vendorId` is called and the sponsor card is removed

**AC5:** Given no sponsors are attached to the event,
When the Sponsor section renders,
Then it shows "Belum ada sponsor" empty state with the "Tambah Sponsor" button

**AC6:** Given `GET /api/events/:id/sponsors` returns sponsors,
Then the MSW handler returns deterministic seeded data (event-001 has 2 sponsors, others have 0)

---

## Tasks / Subtasks

- [x] **Task 1: Add EventSponsor type to api.ts**
  - [x] Subtask 1.1: Define `EventSponsor` interface (id, event_id, vendor_id, vendor_name, tier, display_order)
  - [x] Subtask 1.2: Define `AttachSponsorBody` mutation type

- [x] **Task 2: Add MSW handlers for event sponsors**
  - [x] Subtask 2.1: Seed event-001 with 2 sponsors (vendor-001 Alibaba Cloud + vendor-003 Mandiri Sekuritas)
  - [x] Subtask 2.2: `GET /api/events/:id/sponsors` — returns sponsor array for event
  - [x] Subtask 2.3: `POST /api/events/:id/sponsors` — attaches vendor as sponsor, returns 201
  - [x] Subtask 2.4: `PATCH /api/events/:id/sponsors/:vendorId` — updates tier/order
  - [x] Subtask 2.5: `DELETE /api/events/:id/sponsors/:vendorId` — removes sponsor

- [x] **Task 3: Create `useEventSponsors` hook**
  - [x] Subtask 3.1: `useEventSponsors(eventId)` — GET /api/events/:id/sponsors
  - [x] Subtask 3.2: `useAttachSponsor(eventId)` — POST mutation with cache invalidation
  - [x] Subtask 3.3: `useUpdateSponsorTier(eventId)` — PATCH mutation
  - [x] Subtask 3.4: `useRemoveSponsor(eventId)` — DELETE mutation

- [x] **Task 4: Build SponsorPanel component**
  - [x] Subtask 4.1: Create `src/components/features/vendors/SponsorPanel.tsx`
  - [x] Subtask 4.2: List attached sponsors with tier Badge and remove (×) button
  - [x] Subtask 4.3: "Tambah Sponsor" opens inline form with vendor select + tier select
  - [x] Subtask 4.4: Inline tier change updates via PATCH immediately
  - [x] Subtask 4.5: Remove action with AlertDialog confirmation

- [x] **Task 5: Integrate SponsorPanel into event Overview tab**
  - [x] Subtask 5.1: Import `SponsorPanel` into `_client.tsx`
  - [x] Subtask 5.2: Render below the main funnel grid

- [x] **Task 6: Write tests**
  - [x] Subtask 6.1: useEventSponsors returns seeded sponsors for event-001
  - [x] Subtask 6.2: useEventSponsors returns empty array for event-002
  - [x] Subtask 6.3: useAttachSponsor calls POST and returns new sponsor

---

## Dev Notes

### File Locations

```
src/
  types/
    api.ts                                        ← Add EventSponsor, AttachSponsorBody
  mocks/handlers/
    events.ts                                     ← Add /api/events/:id/sponsors handlers
  hooks/
    useEventSponsors.ts                           ← React Query hooks
    useEventSponsors.test.ts
  components/features/vendors/
    SponsorPanel.tsx                              ← Sponsor management panel
  app/app/events/[id]/
    _client.tsx                                   ← Add SponsorPanel below funnel grid
```

### EventSponsor Type

```typescript
export interface EventSponsor {
  id: string
  event_id: string
  vendor_id: string
  vendor_name: string
  tier: 'standard' | 'premium' | 'supporter'
  display_order: number
}

export interface AttachSponsorBody {
  vendorId: string
  tier: EventSponsor['tier']
  displayOrder?: number
}
```

### MSW Seeded Data

In-memory map: `eventSponsorsStore: Map<string, EventSponsor[]>`

event-001 seeded with:
- vendor-001 (Alibaba Cloud), tier: 'premium', order: 0
- vendor-003 (PT Mandiri Sekuritas), tier: 'standard', order: 1

All other events start with empty sponsor arrays.

### Tier Badge Colors

```
standard  → bg-muted text-muted-foreground
premium   → bg-blue-100 text-blue-700
supporter → bg-amber-100 text-amber-700
```

### Handlers placement in events.ts

Add sponsor sub-resource handlers BEFORE the `GET /api/events/:id` wildcard handler — the sponsors handlers have more specific paths `/api/events/:id/sponsors` and `/api/events/:id/sponsors/:vendorId`.

### Anti-patterns

- DO NOT implement drag-and-drop reordering in Phase 1 — display_order is set server-side
- DO NOT add sponsors to the event creation form — attachment is post-creation only
- DO NOT modify the Event type — sponsors are a separate resource fetched independently

---

## Dev Agent Record

### Implementation Plan

1. Added `EventSponsor` + `AttachSponsorBody` to `src/types/api.ts`
2. Added `eventSponsorsStore` (Map) + 4 sponsor handlers to `events.ts` — inserted before `GET /api/events/:id` wildcard to avoid route collision; POST resolves vendor name from `vendorsStore`
3. Created `src/hooks/useEventSponsors.ts` — 4 hooks covering full CRUD
4. Created `src/components/features/vendors/SponsorPanel.tsx` — inline add form, tier inline-select, AlertDialog for remove
5. Integrated `<SponsorPanel>` into `_client.tsx` Overview tab right column

### Debug Log

- Sponsor handlers must precede `GET /api/events/:id` in the handler array — MSW matches first literal path wins, `:id/sponsors` is more specific but only if ordered before `:id`
- POST `/api/events/:id/sponsors` dynamically imports `vendorsStore` to resolve vendor name (same pattern as other cross-handler imports)

### Completion Notes

- 4 new tests, all pass; 137/138 total (1 pre-existing failure unchanged)
- TypeScript 0 errors
- SponsorPanel is fully optional — events with no sponsors show empty state; event creation is unaffected

---

## File List

- `src/types/api.ts` (added EventSponsor, AttachSponsorBody)
- `src/mocks/handlers/events.ts` (added eventSponsorsStore + 4 sponsor handlers)
- `src/hooks/useEventSponsors.ts` (new)
- `src/hooks/useEventSponsors.test.ts` (new)
- `src/components/features/vendors/SponsorPanel.tsx` (new)
- `src/app/app/events/[id]/_client.tsx` (SponsorPanel integrated)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-26 | Story created from SCP 2026-03-26j | bmad-dev-story |
| 2026-03-26 | All 6 tasks implemented; 137/138 tests pass; 0 TS errors | bmad-dev-story |
| 2026-03-27 | Marked superseded after merge into updated Story 4.14 | OpenCode |
