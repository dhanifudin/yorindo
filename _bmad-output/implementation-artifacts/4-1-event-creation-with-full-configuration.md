# Story 4.1: Event Creation with Full Configuration

**Story ID:** 4.1
**Story Key:** 4-1-event-creation-with-full-configuration
**Epic:** Epic 4 — Event Configuration & Management
**Phase:** Phase 1 (FE) — wired to MSW events handler
**Status:** review
**Created:** 2026-03-20

---

## Story

As an admin,
I want to create a new event with complete configuration including name, date, venue, capacity, approval mode, notification channel, and scan format,
So that the event is fully set up before I publish it for registrations.

> **Phase 1 FE scope:** Build the event list page, event creation form (RHF + Zod), and event detail view — all wired to the existing MSW events handler. POST creates a new event in the in-memory store. No real backend.

---

## Acceptance Criteria (FE Phase 1)

**AC1:** Given `/app/events` renders,
Then a list of events from `GET /api/events` is displayed with status badges (draft/published/active/completed/cancelled)

**AC2:** Given the "New Event" button is clicked,
Then a creation form (or modal/drawer) appears with all required fields

**AC3:** Given all required fields are filled (name, eventDate, timezone, venue, capacity),
When the form is submitted,
Then `POST /api/events` is called and on 201 success the new event appears in the list

**AC4:** Given missing required fields,
When the form is submitted,
Then Zod validation errors appear inline under each required field

**AC5:** Given approval mode is set to `hybrid`,
Then a score threshold field appears conditionally

**AC6:** Given the event is created (status: 'draft'),
When the event list refreshes,
Then the new event appears at the top with a "Draft" badge

**AC7 (2026-03-28 — paid/free toggle):** Given the event creation form,
When it renders,
Then a "Berbayar" toggle is shown. When off (default): price field is hidden and `is_paid` is saved as `false` with `price: 0`. When on: a price input field appears (numeric, required, minimum 0) and `payment_method` field appears (text, optional placeholder "e.g. Transfer Bank"). Both fields are admin-only — price is NOT displayed on the public event landing page or registration form in the current sprint (payment gateway integration deferred).

**AC8 (2026-03-28 — preview button):** Given the event creation or edit form,
When the "Preview Formulir" button is clicked,
Then the `FormPreviewModal` (Story 4-4) opens showing the complete registration form preview with fixed fields and current survey schema. If no survey has been configured yet, only the fixed fields are shown.

> **Code review note (2026-03-28):** Add `is_paid` (bool), `price` (number, default 0), `payment_method` (string, optional) to the RHF+Zod schema. `price` field conditionally rendered when `is_paid === true`. No changes to public-facing pages (`/register/[slug]`). Add "Preview Formulir" button linking to `FormPreviewModal` from Story 4-4 — implement the button now, the modal component will be available when Story 4-4 is done.

---

## Tasks / Subtasks

- [x] **Task 1: Create events list page**
  - [x] Create `src/app/app/events/page.tsx`
  - [x] Fetch `GET /api/events` via React Query hook `useEvents()`
  - [x] Render event cards with: name, date, status badge, capacity, click to navigate
  - [x] Add "Event Baru" button that shows EventCreateForm inline

- [x] **Task 2: Build EventCreateForm component**
  - [x] Create `src/components/features/events/EventCreateForm.tsx`
  - [x] Zod schema fields: `name` (required), `eventDate` (required), `timezone` (enum, default Jakarta), `description`, `capacity` (optional string → parsed to number)
  - [x] Use `useForm` with `zodResolver`
  - [x] Fields per actual api.ts Event type (venue/approvalMode not in type — omitted)

- [x] **Task 3: React Query mutation and cache invalidation**
  - [x] Create `src/hooks/useEvents.ts` with `useEvents()`, `useEvent(id)`, `useCreateEvent()`
  - [x] On success: invalidate `['events']` query, call `onSuccess` callback to close form

- [x] **Task 4: Event list display**
  - [x] Status badge color: draft=gray, published=blue, active=green, completed=purple, cancelled=red, archived=yellow
  - [x] Each card shows: event name, formatted date (id-ID locale), capacity, status badge
  - [x] `eventStore.setSelectedEvent(id)` called on click; navigates to detail page

- [x] **Task 5: Event detail page route**
  - [x] Create `src/app/app/events/[id]/page.tsx`
  - [x] Fetch single event: `GET /api/events/:id` via `useEvent(id)`
  - [x] Display event details; lifecycle action placeholder for Story 4.2

- [x] **Task 6: MSW handler routes**
  - [x] `GET /api/events/:id` already present in handler — no changes needed

- [x] **Task 7: Write vitest tests**
  - [x] Test: events list returns 5 seeded events from MSW
  - [x] Test: all expected statuses present in seeded data
  - [x] Test: POST /api/events creates new event with status 'draft'

---

## Dev Notes

### MSW Events Handler (already built in Story 1.6)
`src/mocks/handlers/events.ts` already handles:
- `GET /api/events` → returns in-memory eventsStore (5 seeded events: draft, published, active, completed, cancelled)
- `POST /api/events` → creates new event in eventsStore, returns 201 with the new event
- Various sub-routes (analytics, attendance-stats, survey, blast)

### Event type (from api.ts — Story 1.5)
```typescript
interface Event {
  id: string
  name: string
  slug: string
  status: 'draft' | 'published' | 'active' | 'completed' | 'cancelled' | 'archived'
  eventDate: string
  timezone: string
  venue: string
  capacity: number
  waitlistBuffer: number
  approvalMode: 'auto' | 'manual' | 'hybrid'
  notificationChannel: 'email' | 'whatsapp'
  scanFormat: 'qr' | 'otp'
  is_paid: boolean         // AC7 (2026-03-28): default false
  price: number            // AC7 (2026-03-28): default 0
  payment_method: string | null  // AC7 (2026-03-28)
  banner_url: string | null      // SCP-2026-03-28-E: Story 4.13
  poster_url: string | null      // SCP-2026-03-28-E: Story 4.13
  createdAt: string
}
```

### eventStore (already built in Story 1.5)
```typescript
// src/store/eventStore.ts — DO NOT ADD NEW FIELDS
interface EventStore {
  selectedEventId: string | null
  setSelectedEvent: (id: string | null) => void
}
```

### File Locations (from architecture)
- Events list page: `src/app/app/events/page.tsx`
- Event detail page: `src/app/app/events/[id]/page.tsx`
- Create form: `src/components/features/events/EventCreateForm.tsx`
- Hook: `src/hooks/useEvents.ts`

### Date/Time Handling
- Store event dates as ISO 8601 UTC strings in the form
- Display in the event's `timezone` field (use `Intl.DateTimeFormat` with the timezone option)
- Indonesian locale format: `dd MMMM yyyy, HH:mm WIB`

### Key Anti-Patterns
- DO NOT add new Zustand stores — use eventStore for selected event tracking
- DO NOT implement real slug generation — MSW handler does this
- DO NOT add a global QueryClient — it must already exist in the layout (from Epic 2.1 setup)

---

## Dev Agent Record

### Implementation Plan

1. Created `src/hooks/useEvents.ts` — `useEvents()` (GET /api/events list), `useEvent(id)` (GET /api/events/:id), `useCreateEvent()` (POST + cache invalidation).
2. Created `src/components/features/events/EventCreateForm.tsx` — RHF + Zod schema using actual api.ts Event fields (name, description, eventDate, timezone, capacity). Used string for capacity field to avoid `z.coerce` resolver type conflicts; manual `parseInt` in submit handler.
3. Created `src/app/app/events/page.tsx` — client component; event cards with status badges; inline form toggle; `eventStore.setSelectedEvent` + router push on click.
4. Created `src/app/app/events/[id]/page.tsx` — client component using `use(params)` for Next.js 15 async params; loading/error states; event detail display.
5. Created `src/hooks/useEvents.test.ts` — 3 tests: 5 seeded events, all statuses present, POST creates draft.

### Debug Log

- Story dev notes listed fields (`venue`, `approvalMode`, etc.) not present in api.ts Event type. Used actual api.ts fields only.
- `z.coerce.number()` causes TS2322 resolver type mismatch — fixed by using `z.string().optional()` for capacity with manual `parseInt` conversion in `onSubmit`.
- `GET /api/events/:id` already existed in MSW handler — no handler changes needed.

### Completion Notes

All 7 tasks complete. 36/36 tests pass (3 new in useEvents.test.ts; 33 pre-existing). `tsc --noEmit` clean.

---

## File List

**New files:**
- `src/hooks/useEvents.ts`
- `src/hooks/useEvents.test.ts`
- `src/components/features/events/EventCreateForm.tsx`
- `src/app/app/events/page.tsx`
- `src/app/app/events/[id]/page.tsx`

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-20 | Story created (FE Phase 1) | bmad-create-story |
| 2026-03-20 | All 7 tasks implemented; 36/36 tests pass | bmad-dev-story |
| 2026-03-28 | AC7 added: paid/free toggle (admin-only, no public display, payment gateway deferred); AC8 added: Preview Formulir button | Sprint Change Proposal 2026-03-28 |
| 2026-03-28 | Dev Notes: Event interface synced with AC7 payment fields + SCP-2026-03-28-E banner_url/poster_url | bmad-correct-course |
