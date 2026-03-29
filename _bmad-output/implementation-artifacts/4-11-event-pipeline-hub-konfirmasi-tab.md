# Story 4.11: Event Pipeline Hub — Konfirmasi Tab

## Story

**As an** admin,
**I want** the Konfirmasi tab to show double opt-in and ticket delivery status,
**So that** I know which approved registrants have confirmed their attendance and received their QR ticket.

## Status

review

## Context

Fifth story in the Event Pipeline Hub series. Requires Story 4.7 (hub shell). Lives at `/app/events/:id/confirmation`.

The Konfirmasi tab surfaces post-approval status: which approved participants have received their QR ticket, and which are pending double opt-in confirmation. It also allows resending tickets to participants who have not yet confirmed.

> **Updated 2026-03-28** — Waitlist status removed from the participant status model. Stat cards reduced from 3 to 2: Tiket Terkirim + Menunggu Konfirmasi. "Promosi ke Approved" action removed. `confirmationStatus` no longer includes `'waitlisted'`. Story 6.5 dependency removed (waitlist retired).

## Acceptance Criteria

**AC1:** Given I am on the Konfirmasi tab (`/app/events/:id/confirmation`),
When the tab loads,
Then it shows two stat cards using shadcn `Card`: Tiket Terkirim (count with email/WA icon), Menunggu Konfirmasi (pending double opt-in count)

**AC2:** Given the registration list below the stats,
When rendered,
Then it shows columns: Name, channel (email icon or WA icon), ticket sent timestamp, confirmation status Badge; rows with unconfirmed opt-in have a highlighted background (`bg-amber-50`)

**AC3:** Given an unconfirmed registration row,
When I click "Kirim Ulang Tiket",
Then `POST /api/registrations/:id/resend-ticket` is called; a 4s success Sonner toast confirms "Tiket dikirim ulang"

**AC4:** Given `GET /api/events/:id/confirmation` is called via MSW,
Then it returns seeded data: stat counts + registration list with `{ id, contact, ticketSentAt, confirmationStatus: 'confirmed' | 'pending', channel }`

## Dev Notes

### File Locations (in `yorindo-app/`)

```
src/
  app/
    app/
      events/
        [id]/
          confirmation/
            page.tsx                   ← Konfirmasi tab content
  components/
    konfirmasi/
      ConfirmationStats.tsx            ← 2 stat cards (Tiket Terkirim, Menunggu Konfirmasi)
      ConfirmationTable.tsx            ← Registration list with resend action
```

### Architecture Constraints

1. **shadcn/ui exclusively** — `Card`, `Badge`, `Button`, `Sonner` for all UI.
2. **No confirmation dialog for resend** — This is reversible. Optimistic update + 4s toast only.
3. **MSW seeded data** — Stat counts must be deterministic; use fixed seed numbers (Tiket Terkirim: 180, Menunggu: 45).

### MSW Handler

```typescript
http.get('/api/events/:id/confirmation', ({ params }) => {
  return HttpResponse.json({
    stats: { ticketSent: 180, pendingConfirmation: 45 },
    registrations: Array.from({ length: 25 }, (_, i) => ({
      id: `reg-conf-${i}`,
      contact: { name: `Peserta ${i + 1}`, company: `PT ${i + 1}` },
      channel: i % 2 === 0 ? 'whatsapp' : 'email',
      ticketSentAt: i < 20 ? '2026-04-01T10:00:00Z' : null,
      confirmationStatus: i < 15 ? 'confirmed' : 'pending',
    })),
  })
})
```

### Test Requirements

- 2 stat cards render with correct values from seeded MSW data
- Unconfirmed rows have `bg-amber-50` highlighting
- "Kirim Ulang Tiket" → POST /api/registrations/:id/resend-ticket called; toast shown

### Dependencies

- **Prerequisite:** Story 4.7 (hub shell, Konfirmasi tab route)

## Tasks / Subtasks

- [ ] Task 1: Create `confirmation/page.tsx` with data fetching
  - [ ] Subtask 1.1: `useQuery` for GET /api/events/:id/confirmation
  - [ ] Subtask 1.2: `useMutation` for resend-ticket

- [ ] Task 2: Build `<ConfirmationStats>` component
  - [ ] Subtask 2.1: 2 `Card` components with icons and counts (Tiket Terkirim, Menunggu Konfirmasi)
  - [ ] Subtask 2.2: Skeleton loading state

- [ ] Task 3: Build `<ConfirmationTable>` component
  - [ ] Subtask 3.1: Table with Name, channel icon, ticketSentAt, status Badge
  - [ ] Subtask 3.2: `bg-amber-50` highlight for pending rows
  - [ ] Subtask 3.3: "Kirim Ulang Tiket" Button with POST mutation

- [ ] Task 4: Add MSW handlers
  - [ ] Subtask 4.1: GET /api/events/:id/confirmation (seeded data per spec)
  - [ ] Subtask 4.2: POST /api/registrations/:id/resend-ticket → 202 Accepted

- [ ] Task 5: Write tests
  - [ ] Subtask 5.1: Stat cards render correctly (2 cards)
  - [ ] Subtask 5.2: Row highlighting for pending confirmation
  - [ ] Subtask 5.3: Resend mutation + toast

## Dev Agent Record

### Implementation Plan

1. Build `ConfirmationStats.tsx` — 2 Card components with icons and counts
2. Build `ConfirmationTable.tsx` — rows with bg-amber-50 for pending, resend action
3. Rewrite `confirmation/page.tsx` — useQuery for GET /api/events/:id/confirmation, useMutation for resend
4. Add `GET /api/events/:id/confirmation` MSW handler to events.ts
5. Add `POST /api/registrations/:id/resend-ticket` to registrations.ts

### Completion Notes

- 122 tests pass (9 new for Story 4.11)
- TypeScript 0 errors
- Resend available for confirmed + pending rows

> **Updated 2026-03-28** — Removed: Daftar Tunggu stat card, "Promosi ke Approved" action (waitlist retired), `waitlisted` confirmationStatus. Story 6.5 dependency removed.

## File List

- `src/components/konfirmasi/ConfirmationStats.tsx`
- `src/components/konfirmasi/ConfirmationStats.test.tsx`
- `src/components/konfirmasi/ConfirmationTable.tsx`
- `src/components/konfirmasi/ConfirmationTable.test.tsx`
- `src/app/app/events/[id]/confirmation/page.tsx` (replaced stub)
- `src/mocks/handlers/events.ts` (added /confirmation handler)
- `src/mocks/handlers/registrations.ts` (added /resend-ticket handler)

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-22 | Story created from epic-4 + ux-event-pipeline.md | bmad-context-engine |
| 2026-03-28 | Waitlist removed: 3→2 stat cards, promote action removed, confirmationStatus simplified | bmad-correct-course |
