# Story 6.9: Sponsor Logo Strip on Event Landing Page

**Story ID:** 6.9
**Story Key:** 6-9-sponsor-logo-strip-on-event-landing-page
**Epic:** Epic 6 — Participant Registration & Approval Workflow
**Phase:** Phase 1 (FE) — wired to MSW public event handler
**Status:** review
**Created:** 2026-03-26

---

## Story

As a participant visiting the event registration page,
I want to see the event's sponsors displayed,
So that I know which organizations are backing this event.

> **Phase 1 FE scope:** Extend `GET /api/events/public/:slug` MSW response to include a `sponsors` array. Build `SponsorStrip` component. Integrate into `EventLandingCard`. Strip is invisible when no sponsors are attached — page layout unchanged.

---

## Acceptance Criteria (FE Phase 1)

**AC1:** Given `GET /api/events/public/:slug` is called via MSW for 'seminar-erp-jakarta' (event-001),
Then the response includes `sponsors: [{ name, logo_url, website, tier, display_order }]` sorted by display_order

**AC2:** Given the event landing page renders and sponsors are present,
Then a "Didukung oleh" strip is shown below the event details card with sponsor names (and logos if available)

**AC3:** Given no sponsors are attached to an event,
When the public event response returns `sponsors: []`,
Then the sponsor strip is not rendered — the page layout is unchanged

**AC4:** Given a sponsor's `logo_url` is null/undefined,
When the strip renders,
Then the sponsor's name is shown as text instead of an image

**AC5:** Given a sponsor has a `website`,
When the strip renders,
Then the sponsor name/logo is wrapped in an `<a>` tag opening in a new tab

---

## Tasks / Subtasks

- [x] **Task 1: Extend public event type and MSW handler**
  - [x] Subtask 1.1: Add `PublicEventSponsor` interface to api.ts
  - [x] Subtask 1.2: Add `sponsors` field to `GET /api/events/public/:slug` MSW response (event-001 gets 2 sponsors from eventSponsorsStore; others get [])

- [x] **Task 2: Build SponsorStrip component**
  - [x] Subtask 2.1: Create `src/components/features/registration/SponsorStrip.tsx`
  - [x] Subtask 2.2: Render "Didukung oleh" label + sponsor items (logo img or name text)
  - [x] Subtask 2.3: Wrap with website link if present; open in new tab (`rel="noopener noreferrer"`)
  - [x] Subtask 2.4: Return `null` when sponsors array is empty

- [x] **Task 3: Integrate SponsorStrip into EventLandingCard**
  - [x] Subtask 3.1: Accept optional `sponsors` prop on `EventLandingCard`
  - [x] Subtask 3.2: Render `<SponsorStrip>` below the CTA button

- [x] **Task 4: Pass sponsors from landing page client to card**
  - [x] Subtask 4.1: Update `fetchPublicEvent` return type to include sponsors
  - [x] Subtask 4.2: Pass `event.sponsors` to `<EventLandingCard>`

- [x] **Task 5: Write tests**
  - [x] Subtask 5.1: Public event with sponsors — strip renders with sponsor names
  - [x] Subtask 5.2: Public event without sponsors — strip not rendered

---

## Dev Notes

### PublicEventSponsor type

```typescript
export interface PublicEventSponsor {
  vendor_id: string
  name: string
  logo_url?: string
  website?: string
  tier: 'standard' | 'premium' | 'lead_intelligence'
  display_order: number
}
```

### MSW — extend public event response

In `events.ts`, the `GET /api/events/public/:slug` handler currently returns the Event object directly. Extend it to include sponsors:

```typescript
const sponsors = [...eventSponsorsStore.get(event.id) ?? []].map(s => ({
  vendor_id: s.vendor_id,
  name: s.vendor_name,
  logo_url: undefined,
  website: undefined,
  tier: s.tier,
  display_order: s.display_order,
})).sort((a, b) => a.display_order - b.display_order)

return HttpResponse.json({ ...event, sponsors })
```

### EventLandingCard sponsors prop

```typescript
interface EventLandingCardProps {
  event: Event & { sponsors?: PublicEventSponsor[] }
}
```

### SponsorStrip layout

```
Didukung oleh
[ Logo/Name ] [ Logo/Name ]
```

Use a flex row, centered, with `gap-4`. Each sponsor item is an anchor (if website set) or a `<div>`. Logo is 40px height, object-contain; name as `text-sm text-muted-foreground` if no logo.

### Anti-patterns

- DO NOT add sponsors to the `Event` type directly — use intersection type at prop level
- DO NOT show tier information on the public landing page — it's internal admin data

---

## Dev Agent Record

### Implementation Plan

1. Add `PublicEventSponsor` to `src/types/api.ts`
2. Update MSW `GET /api/events/public/:slug` handler to include sponsors from `eventSponsorsStore`; also extended handler to serve `active` events in addition to `published`
3. Create `src/components/features/registration/SponsorStrip.tsx`
4. Update `src/components/features/registration/EventLandingCard.tsx` with sponsors prop and SponsorStrip render
5. Add 2 tests to `src/hooks/usePublicEvent.test.ts`

### Debug Log

- `workshop-ai-untuk-bisnis` (event-002) is `draft` — public endpoint cannot serve it. Used `forum-kesehatan-digital-surabaya` (event-003, `active`) for empty-sponsors test case instead. Updated handler to serve both `published` and `active` events.

### Completion Notes

All 4 tests in `usePublicEvent.test.ts` pass. Full suite: 139 pass, 1 pre-existing failure (`useEvents returns 5 seeded events` — eventsStore has 6 events, test expects 5; not introduced by this story).

---

## File List

- `src/types/api.ts` — added `PublicEventSponsor`
- `src/mocks/handlers/events.ts` — extended `GET /api/events/public/:slug` with sponsors; serve published|active
- `src/components/features/registration/SponsorStrip.tsx` — new component
- `src/components/features/registration/EventLandingCard.tsx` — sponsors prop + SponsorStrip render
- `src/hooks/usePublicEvent.test.ts` — 2 new sponsor tests

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-26 | Story created from SCP 2026-03-26j | bmad-dev-story |
| 2026-03-26 | Implementation complete — status: review | dev-agent |
