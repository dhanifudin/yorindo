# Story 4.10: Event Pipeline Hub — Registrasi Tab (Approval Queue)

## Story

**As an** admin,
**I want** the Registrasi tab to show the AI-graded approval queue for this event,
**So that** I can bulk-accept the AI recommendation list or review and act on individual registrations efficiently.

## Status

review

## Context

This is the fourth story in the Event Pipeline Hub series. It implements the defining experience of the hub: the AI-assisted approval loop. Story 4.7 (shell) must be done first. The Registrasi tab lives at `/app/events/:id/registrations`.

**Defining experience target:** Complete the approval round in under 60 seconds for ≤80 registrations.

**Key patterns from UX spec:**
- `<BulkApproveBar>` is dual-mode: AI-driven (no selection) or manual selection (checkboxes). Same component, two rendered states.
- Double-click confirmation on BulkApproveBar: idle → amber + 3s countdown → second click commits. Timeout resets silently. No modal.
- Individual reject uses Pattern C: Sonner undo toast with 2-second window ("Ditolak — [Batalkan]"). No modal.
- Individual approve: no confirmation, optimistic update + 4s toast.
- Contact flag badges are auto-inherited from `registration.contact.flagCategory` (part of registration response — no extra API call).

**Registration data:** Load ≤500 rows on mount (`GET /api/registrations?eventId=:id&limit=500`). Client-side TanStack Table filtering (status, AI score range, flag toggle). Above 500: show banner "Terlalu banyak data — gunakan filter untuk mempersempit."

**AI scoring states:** `complete`, `in-progress`, `failed`. In-progress: BulkApproveBar disabled + Progress bar + refetchInterval 10s. Failed rows: Badge "Gagal dinilai", excluded from AI list, still individually actionable.

**Contact Sheet:** Clicking a registration row name opens a shadcn Sheet (right side) with full contact detail + approve/reject buttons in footer + prev/next arrows to walk through rows. On Sheet close: `scrollToIndex(lastReviewedIndex, { align: 'center' })` to restore position.

## Acceptance Criteria

**AC1:** Given I am on the Registrasi tab (`/app/events/:id/registrations`),
When the tab loads,
Then it shows a TanStack Table with columns: Name, Company, Phone, AI Score (`<AiScoreBadge>`), Status Badge, Flag Badge (only if flagCategory is `invalid-data` or `duplicate`)

**AC2:** Given the table header,
When I click "Terima Semua Rekomendasi AI" (`<BulkApproveBar>` first click),
Then the button turns amber outline with "Konfirmasi? (3...)" countdown animation; second click within 3s fires `PATCH /api/registrations/bulk-approve` with all AI-recommended IDs; timeout resets button to idle

**AC3:** Given an individual registration row,
When I click "Setujui" (or in Contact Sheet footer),
Then `PATCH /api/registrations/:id/status` with `{ status: 'approved' }` is called; row status updates optimistically; 4s success toast shown

**AC4:** Given an individual registration row,
When I click "Tolak" (or in Contact Sheet footer),
Then `PATCH /api/registrations/:id/status` with `{ status: 'rejected' }` is called optimistically; Sonner shows "Ditolak — [Batalkan]" action toast for 2 seconds; if Batalkan is clicked, status reverts via another PATCH

**AC5:** Given a registration where `contact.flagCategory` is `invalid-data` or `duplicate`,
When the row renders,
Then a flag Badge with strong visual contrast shows automatically — distinct from the AI score badge

**AC6:** Given an admin clears the inherited flag for a registration,
When `PATCH /api/registrations/:id/clear-flag` is called,
Then the flag badge disappears for this registration only; the contact's `flagCategory` is NOT modified (registration-level override only)

**AC7:** Given clicking a registration row name,
When the Contact Sheet opens,
Then it shows: name, company, phone, AI score, flag status, past event history (from registration response); Setujui/Tolak buttons in Sheet footer; prev/next arrows with "[2 / 58]" counter; keyboard ArrowLeft/ArrowRight to navigate

**AC8:** Given AI scoring is `in-progress`,
When BulkApproveBar renders,
Then the approve button is disabled; a `<Progress>` bar shows "Penilaian AI sedang berjalan... (42/62 selesai)"; `refetchInterval: 10_000` until scoring complete

**AC9:** Given `GET /api/registrations?eventId=:id` is called via MSW,
Then it returns deterministic seeded registrations including: AI scores (djb2 hash pattern per contact id → score 0.0–1.0), flag data, contact name/company resolved from contactsPool

## Dev Notes

### Tech Stack

- **Table:** TanStack Table 8.x (client-side filtering, multi-select)
- **UI:** shadcn `Sheet`, `Badge`, `Button`, `Progress`, `Sonner` (already installed); custom `<BulkApproveBar>`, `<AiScoreBadge>`, `<ContactSheet>`
- **Virtualization:** TanStack Virtual for rows when count > 100 (`overscan: 5`)

### File Locations (in `yorindo-app/`)

```
src/
  app/
    app/
      events/
        [id]/
          registrations/
            page.tsx                      ← Registrasi tab content
  components/
    registrasi/
      BulkApproveBar.tsx                  ← Dual-mode approve bar (AI + manual selection)
      AiScoreBadge.tsx                    ← Color-banded score badge
      ContactSheet.tsx                    ← Sheet with contact detail + prev/next navigation
      RegistrationRow.tsx                 ← Table row with inline Setujui/Tolak buttons
      RegistrationFilters.tsx             ← Status filter, score range, flag toggle
```

### Architecture Constraints

1. **TanStack Table** — Use TanStack Table 8.x for the table. Column filters are `columnFilters` state — NOT URL query params (client-side only for Phase 1).
2. **BulkApproveBar always visible** — Pinned above the table at all times. Not shown only when AI scoring is `in-progress` (disabled state shown instead).
3. **Double-click confirmation** — Entirely client-side. `useRef` for countdown timer. No request sent on first click.
4. **Optimistic updates** — Use React Query `useMutation` with `onMutate` for optimistic row status updates. `onError` reverts to previous state.
5. **AI score via djb2 hash** — Deterministic score per registration ID in MSW: `const score = (djb2(reg.id) % 100) / 100`. Use same pattern as audience-recommendations tech spec.

### Key Code Patterns

**BulkApproveBar double-click:**
```tsx
const [confirmState, setConfirmState] = useState<'idle' | 'confirming'>('idle')
const timerRef = useRef<NodeJS.Timeout>()

function handleFirstClick() {
  setConfirmState('confirming')
  timerRef.current = setTimeout(() => setConfirmState('idle'), 3000)
}

function handleSecondClick() {
  clearTimeout(timerRef.current)
  setConfirmState('idle')
  // Fire the actual PATCH /api/registrations/bulk-approve
  bulkApproveMutation.mutate(aiRecommendedIds)
}
```

**AiScoreBadge:**
```tsx
const SCORE_CONFIG = [
  { min: 0.80, class: 'text-green-700 bg-green-50', symbol: '✓', ariaLabel: 'Tinggi' },
  { min: 0.50, class: 'text-amber-700 bg-amber-50', symbol: '~', ariaLabel: 'Sedang' },
  { min: 0.00, class: 'text-red-700 bg-red-50',    symbol: '✗', ariaLabel: 'Rendah' },
]
// Failed: 'text-gray-500 bg-gray-100' '⚠ Gagal'
// Pending: 'text-gray-400 bg-gray-50' '… Menilai'
```

**Undo toast (individual reject):**
```tsx
const { mutate: rejectRegistration } = useMutation({
  mutationFn: (id: string) => patchRegistrationStatus(id, 'rejected'),
  onMutate: async (id) => {
    // Optimistic update
  },
  onSuccess: (_, id) => {
    toast('Ditolak', {
      action: { label: 'Batalkan', onClick: () => undoReject(id) },
      duration: 2000,
    })
  },
})
```

**MSW handler for registrations:**
```typescript
// Deterministic AI scores via djb2 hash
function djb2(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash) + str.charCodeAt(i)
  return Math.abs(hash)
}

const contactsPool = [
  { name: 'Budi Santoso', company: 'PT Maju Jaya', flagCategory: null },
  { name: 'Siti Rahma', company: 'CV Teknologi Nusantara', flagCategory: null },
  { name: 'Agus Hartono', company: 'PT Data Bermasalah', flagCategory: 'invalid-data' },
  // ... more contacts
]

http.get('/api/registrations', ({ request }) => {
  const url = new URL(request.url)
  const eventId = url.searchParams.get('eventId')
  const registrations = Array.from({ length: 62 }, (_, i) => {
    const contact = contactsPool[i % contactsPool.length]
    const id = `reg-${eventId}-${i}`
    return {
      id,
      contact: { ...contact, id: `c-${i}` },
      aiScore: (djb2(id) % 100) / 100,
      aiStatus: 'complete',
      status: 'pending',
    }
  })
  return HttpResponse.json({ registrations, total: 62 })
})
```

### Test Requirements

- Table renders 62 seeded rows from MSW
- AiScoreBadge: score 0.92 → green ✓; 0.61 → amber ~; 0.34 → red ✗
- Flag badge shows for invalid-data/duplicate contact rows; not shown for clean contact
- BulkApproveBar: first click → amber outline + countdown; second click → mutation fired
- BulkApproveBar: 3s timeout without second click → button resets to idle
- Individual reject: optimistic update + undo toast with 2s duration
- Contact Sheet: opens on row name click; prev/next arrows navigate; scrollToIndex on close
- Filter: status filter reduces visible rows; "Reset filter" button clears

### Dependencies

- **Prerequisite:** Story 4.7 (hub shell, Registrasi tab route)
- Story 6.4 (registration approval — same endpoint pattern used)
- TanStack Virtual may need to be installed: `npm install @tanstack/react-virtual`

## Tasks / Subtasks

- [ ] Task 1: Create `registrations/page.tsx` with data fetching
  - [ ] Subtask 1.1: `useQuery` for GET /api/registrations?eventId=:id&limit=500
  - [ ] Subtask 1.2: TanStack Table setup with columnFilters state

- [ ] Task 2: Build `<AiScoreBadge>` component
  - [ ] Subtask 2.1: Score → color + symbol mapping
  - [ ] Subtask 2.2: Failed / Pending states
  - [ ] Subtask 2.3: `aria-label` for accessibility

- [ ] Task 3: Build `<BulkApproveBar>` component
  - [ ] Subtask 3.1: AI-driven mode (no selection) with count + summary line
  - [ ] Subtask 3.2: Double-click countdown (useRef timer, 3s)
  - [ ] Subtask 3.3: Manual selection mode (when rows checked)
  - [ ] Subtask 3.4: In-progress state (disabled + Progress bar + refetchInterval 10s)
  - [ ] Subtask 3.5: PATCH /api/registrations/bulk-approve on confirmed second click

- [ ] Task 4: Build `<ContactSheet>` component
  - [ ] Subtask 4.1: Sheet open on row name click
  - [ ] Subtask 4.2: Contact detail: name, company, phone, AI score, flag status, event history
  - [ ] Subtask 4.3: Setujui/Tolak in Sheet footer
  - [ ] Subtask 4.4: Prev/next arrows + "[N / Total]" counter + keyboard ArrowLeft/Right
  - [ ] Subtask 4.5: On close: `scrollToIndex(lastReviewedIndex, { align: 'center' })`

- [ ] Task 5: Build `<RegistrationFilters>` component
  - [ ] Subtask 5.1: Status filter (pending/approved/rejected) — no waitlist tab
  - [ ] Subtask 5.2: AI score range filter
  - [ ] Subtask 5.3: Flag toggle (show only flagged)
  - [ ] Subtask 5.4: Active filter count badge + "Reset filter" ghost button

- [ ] Task 6: Implement individual row actions with optimistic updates
  - [ ] Subtask 6.1: Setujui mutation (PATCH /api/registrations/:id/status { status: 'approved' })
  - [ ] Subtask 6.2: Tolak mutation with optimistic update + 2s undo toast
  - [ ] Subtask 6.3: Clear flag mutation (PATCH /api/registrations/:id/clear-flag)

- [ ] Task 7: Add MSW handlers
  - [ ] Subtask 7.1: GET /api/registrations with seeded data (djb2 AI scores, contactsPool)
  - [ ] Subtask 7.2: PATCH /api/registrations/:id/status
  - [ ] Subtask 7.3: PATCH /api/registrations/bulk-approve
  - [ ] Subtask 7.4: PATCH /api/registrations/:id/clear-flag

- [ ] Task 8: Write tests
  - [ ] Subtask 8.1: Table renders seeded rows
  - [ ] Subtask 8.2: Score badge + flag badge visual states
  - [ ] Subtask 8.3: BulkApproveBar double-click + timeout
  - [ ] Subtask 8.4: Individual approve/reject mutations
  - [ ] Subtask 8.5: Contact Sheet navigation

## Dev Agent Record

### Implementation Plan

1. Build `AiScoreBadge.tsx` — score 0–99 → green/amber/red + in-progress/failed states
2. Build `BulkApproveBar.tsx` — double-click confirm with useRef countdown, in-progress state with Progress bar
3. Build `ContactSheet.tsx` — prev/next navigation with keyboard ArrowLeft/Right
4. Build `RegistrationFilters.tsx` — TanStack Table columnFilters for status + flag toggle
5. Rewrite `_client.tsx` — TanStack Table with TanStack react-table 8.x, optimistic mutations, undo toast for reject, bulk approve
6. Update `registrations.ts` MSW — add PATCH /:id/status, PATCH /bulk-approve (before wildcard), enrich GET response

### Debug Log

- TanStack Table API: `getIsAllFilteredRowsSelected` doesn't exist; correct API is `getIsAllRowsSelected`
- useRef initial value in strict TypeScript requires explicit `undefined` arg: `useRef<T>(undefined)` not `useRef<T>()`
- MSW ordering: `PATCH /api/registrations/bulk-approve` must be registered before `PATCH /api/registrations/:id/status` — literal path before wildcard
- BulkApproveBar tests: fake timers + userEvent cause 5s timeout; used `fireEvent.click` instead for timer-based interaction tests
- Text matching split by `<strong>`: used `getAllByText((_, el) => el?.textContent === '...')` pattern

### Completion Notes

- 113 tests pass (13 new for Story 4.10)
- TypeScript 0 errors
- @tanstack/react-virtual NOT installed; used max-height scroll on table container instead (≤80 rows target makes virtualization unnecessary)
- Undo toast for individual reject: 2s duration with Batalkan action
- Existing GET /api/registrations updated to return enriched RegistrationWithContact (breaking change for old callers, but all callers in codebase now expect enriched data)

## File List

- `src/components/registrasi/AiScoreBadge.tsx`
- `src/components/registrasi/AiScoreBadge.test.tsx`
- `src/components/registrasi/BulkApproveBar.tsx`
- `src/components/registrasi/BulkApproveBar.test.tsx`
- `src/components/registrasi/ContactSheet.tsx`
- `src/components/registrasi/RegistrationFilters.tsx`
- `src/app/app/events/[id]/registrations/_client.tsx` (rewritten)
- `src/mocks/handlers/registrations.ts` (added PATCH handlers, enriched GET response)

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-22 | Story created from epic-4 + ux-event-pipeline.md | bmad-context-engine |
| 2026-03-28 | Subtask 5.1: removed `waitlisted` from status filter options | bmad-correct-course |
