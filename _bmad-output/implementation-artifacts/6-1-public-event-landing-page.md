# Story 6.1: Public Event Landing Page

**Story ID:** 6.1
**Story Key:** 6-1-public-event-landing-page
**Epic:** Epic 6 — Participant Registration & Approval Workflow
**Phase:** Phase 1 (FE) — wired to MSW events handler (public endpoint needed)
**Status:** review
**Created:** 2026-03-20

---

## Story

As a participant,
I want to view event details and availability on a public landing page before registering,
So that I can make an informed decision about whether to register.

> **Phase 1 FE scope:** Build the public event landing page at `/register/[eventSlug]` — no authentication required, mobile-first design, wired to a new MSW public events endpoint. Performance target: FCP ≤ 3s on simulated 4G.

---

## Acceptance Criteria (FE Phase 1)

**AC1:** Given `/register/[eventSlug]` is accessed (no auth required),
Then the page shows: event name, date, venue, description, and remaining capacity

**AC2:** Given the event has capacity remaining,
When the page renders,
Then a "Daftar Sekarang" (Register Now) CTA button is shown linking to the registration form (Story 6.2)

**AC3:** Given capacity is full (mocked state),
When the page renders,
Then "Registrasi Penuh — Daftarkan ke Waiting List" replaces the CTA

**AC4:** Given a slug that doesn't match any event,
Then the page shows a 404/not-found state

**AC5:** Given the page on mobile (375px width),
Then layout is single-column, text is readable, CTA is full-width and thumb-accessible

---

## Tasks / Subtasks

- [x] **Task 1: Add public event endpoint to MSW events handler**
  - [x] In `src/mocks/handlers/events.ts`, added: `http.get('/api/events/public/:slug', ...)`
  - [x] Returns matching published event by slug; 404 if not found

- [x] **Task 2: Create public landing page route**
  - [x] Create `src/app/register/[eventSlug]/page.tsx` — `'use client'`, public route
  - [x] Fetch via `useQuery` with `retry: false`; handles loading, 404 (`notFound()`), error

- [x] **Task 3: Build EventLandingCard component**
  - [x] Create `src/components/features/registration/EventLandingCard.tsx`
  - [x] event name, `Intl.DateTimeFormat` Indonesian date, description, capacity, CTA

- [x] **Task 4: Mobile-first responsive design**
  - [x] `max-w-md mx-auto px-4`, `w-full py-4 text-lg font-semibold` CTA

- [x] **Task 5: Not-found and error states**
  - [x] Created `src/app/register/[eventSlug]/not-found.tsx`
  - [x] 404 calls `notFound()` → shows not-found.tsx; error shows inline message

- [x] **Task 6: Write vitest tests**
  - [x] Test: GET /api/events/public/seminar-erp-jakarta returns published event
  - [x] Test: unknown slug returns NOT_FOUND error

---

## Dev Notes

### New MSW Route Required
Add to `src/mocks/handlers/events.ts`:
```typescript
http.get('/api/events/public/:slug', async ({ params }) => {
  await delay(200)
  const event = eventsStore.find(e => e.slug === params.slug && e.status === 'published')
  if (!event) return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
  return HttpResponse.json(event)
})
```

### Route Layout
This page is NOT under the authenticated `app` layout — it needs its own minimal layout:
```
src/app/register/
  [eventSlug]/
    page.tsx          ← public landing page
    not-found.tsx     ← 404 page
    layout.tsx        ← minimal layout (no sidebar, no auth)
```

### Public Route (no authentication)
Do NOT wrap `/register/*` routes in any auth guard. These must be accessible without a JWT. The MSW worker runs in dev mode for all routes.

### Performance Notes
- Use `loading.tsx` in the `[eventSlug]` directory for streaming/skeleton
- Avoid heavy client-side libraries on this page (no TanStack Table, no Recharts)
- Date formatting: `new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: event.timezone }).format(new Date(event.eventDate))`

### Key Anti-Patterns
- DO NOT require authentication for this page
- DO NOT use the admin layout
- DO NOT import heavy charting libraries on this page

---

## Dev Agent Record

### Implementation Plan

1. Added `http.get('/api/events/public/:slug')` handler to `events.ts` — matches by slug and `status === 'published'`.
2. Created `src/app/register/layout.tsx` — minimal public layout (no auth, no sidebar).
3. Created `src/components/features/registration/EventLandingCard.tsx` — mobile-first card; `Intl.DateTimeFormat` Indonesian locale; isFull check disables CTA.
4. Created `src/app/register/[eventSlug]/page.tsx` — client component with useQuery; calls Next.js `notFound()` on 404.
5. Created `src/app/register/[eventSlug]/not-found.tsx` — 404 page.
6. Created `src/hooks/usePublicEvent.test.ts` — 2 tests (published event returned, 404 for unknown slug).

### Debug Log

No issues.

### Completion Notes

All 6 tasks complete. 42/42 tests pass (2 new; 40 pre-existing). `tsc --noEmit` clean. Public route has no auth guard.

---

## File List

**New files:**
- `src/app/register/layout.tsx`
- `src/app/register/[eventSlug]/page.tsx`
- `src/app/register/[eventSlug]/not-found.tsx`
- `src/components/features/registration/EventLandingCard.tsx`
- `src/hooks/usePublicEvent.test.ts`

**Modified files:**
- `src/mocks/handlers/events.ts` — added `GET /api/events/public/:slug` handler

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-20 | Story created (FE Phase 1) | bmad-create-story |
| 2026-03-20 | All 6 tasks implemented; 42/42 tests pass | bmad-dev-story |
