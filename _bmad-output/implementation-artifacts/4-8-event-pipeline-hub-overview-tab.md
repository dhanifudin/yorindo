# Story 4.8: Event Pipeline Hub — Overview Tab

## Story

**As an** admin,
**I want** the Overview tab to show a real-time funnel summary for the event,
**So that** I can see the blast → registration → approval → attendance pipeline health at a glance.

## Status

review

## Context

This is the second story in the Event Pipeline Hub series. Story 4.7 must be in review before this begins — it provides the hub shell, layout.tsx, and BlockerStrip. This story implements the content for the default Overview tab (`/app/events/:id`).

The Overview tab is the hub's "command center" — it must answer "where are we in the funnel?" in under 5 seconds. The key component is `<FunnelVisualization>`: a horizontal narrowing bar chart showing Diundang → Mendaftar → Disetujui → Hadir with drop-off rates. The layout is `lg:grid-cols-[2fr_1fr]` — funnel visualization left, action card right.

The tab has two modes: **ambient** (pipeline healthy, no CTA shown) and **action** (a `ConversionBadge` shows `bad` health — one highlighted CTA card appears). Only one CTA card appears at a time — the highest priority issue.

**Critical design rule:** The BlockerStrip in Story 4.7 also surfaces pending approvals count. The Overview tab must feed the `BlockerStrip` with its blockerState data via a shared React Query key. Both components share `queryKey: ['event', id, 'blockerState']` with `staleTime: 60_000`.

## Acceptance Criteria

**AC1:** Given I am on the Overview tab (`/app/events/:id`),
When the tab loads,
Then it shows four funnel metrics: Diundang (blast recipients count) → Mendaftar (total registrations) → Disetujui (approved count) → Hadir (attended count), each with a value and a `<ConversionBadge>` showing conversion rate vs. previous stage

**AC2:** Given the funnel metrics,
When any metric is zero,
Then it shows `—` instead of `0%` in the ConversionBadge and a contextual call-to-action: "Belum ada blast — kirim undangan sekarang" linking to the Undangan tab (for Diundang = 0)

**AC3:** Given the Overview tab loads,
Then it also shows: pending approvals count (with link to Registrasi tab), last blast sent date/time, days until event, seats remaining (capacity − approved)

**AC4:** Given `GET /api/events/:id/overview` returns pipeline metrics,
Then the MSW handler returns deterministic seeded data for all four funnel metrics

**AC5:** Given a `ConversionBadge` has `health: 'bad'`,
When rendering,
Then an action card appears on the right column with a specific CTA linking to the relevant tab; the action card is NOT shown when all badges are `good` or `warn`

**AC6:** Given days until event is < 24h,
When the BlockerStrip renders (from Story 4.7),
Then the countdown text shows in `text-amber-700`; < 6h shows in `text-red-700`

**AC7:** Given `GET /api/events/:id/overview` data loads,
Then the pending approvals count is passed to the shared `blockerState` query so the BlockerStrip can render "N menunggu persetujuan" linked to the Registrasi tab

## Dev Notes

### Tech Stack

- **Framework:** Next.js 16 App Router (page inside hub layout from Story 4.7)
- **UI:** shadcn/ui `Card`, `CardHeader`, `CardContent`, `Badge`, `Button`; custom `<FunnelVisualization>`, `<ConversionBadge>`
- **Charts:** No chart library — funnel is built with Tailwind width utilities, not Recharts (Recharts is for Epic 8 analytics)
- **State:** React Query `useQuery` with `staleTime: 60_000`

### File Locations (in `yorindo-app/`)

```
src/
  app/
    app/
      events/
        [id]/
          page.tsx                     ← Overview tab content (or overview/page.tsx)
  components/
    hub/
      FunnelVisualization.tsx          ← Horizontal funnel bars + ConversionBadge per stage
      ConversionBadge.tsx              ← health: good/warn/bad/pending → colored badge
      PipelineStats.tsx                ← Pending approvals, last blast, days until, seats remaining
      ActionCard.tsx                   ← Conditional CTA card (right column, only when bad health)
  lib/
    benchmarks.ts                      ← Conversion rate thresholds per stage
```

### Architecture Constraints

1. **No Recharts on Overview** — The funnel is Tailwind width utilities. Bar width = `(count / maxCount) * 100%`. Min width: `min-w-[4px]` for zero stages (visible thin line).
2. **Shared blockerState query** — `queryKey: ['event', id, 'blockerState']` feeds both Overview and BlockerStrip. BlockerStrip from Story 4.7 consumes it. Overview page updates it.
3. **Single action card at a time** — Only the highest-priority `bad` health stage shows an action card. Priority: Diundang = 0 > registration conversion bad > approval conversion bad.

### FunnelVisualization Component

```tsx
// Horizontal narrowing bars — width proportional to absolute count
// Max count = Diundang (first stage, always widest or equal)
const maxCount = Math.max(blastCount, 1)  // prevent /0

function FunnelBar({ label, count, maxCount, badge }: ...) {
  const widthPct = Math.max((count / maxCount) * 100, 2)  // min 2% for visibility
  return (
    <div className="flex items-center gap-4 py-2">
      <span className="w-24 text-sm text-right text-muted-foreground">{label}</span>
      <div className="flex-1 bg-muted rounded">
        <div
          role="meter"
          aria-valuenow={count}
          aria-label={`${label}: ${count}`}
          style={{ width: `${widthPct}%` }}
          className="h-8 bg-primary rounded transition-all"
        />
      </div>
      <span className="w-16 text-sm font-medium">{count.toLocaleString('id-ID')}</span>
      {badge}
    </div>
  )
}
```

### ConversionBadge Component

```tsx
// Benchmark thresholds in lib/benchmarks.ts (configurable)
// blast→registration: good ≥20%, warn 10–19%, bad <10%
// registration→approval: good ≥70%, warn 50–69%, bad <50%
// approval→attendance: always 'pending' until event is live/completed

type Health = 'good' | 'warn' | 'bad' | 'pending'

const healthConfig: Record<Health, { symbol: string; class: string }> = {
  good: { symbol: '✓', class: 'text-green-700 bg-green-50' },
  warn: { symbol: '~', class: 'text-amber-700 bg-amber-50' },
  bad:  { symbol: '✗', class: 'text-red-700 bg-red-50' },
  pending: { symbol: '—', class: 'text-muted-foreground bg-muted' },
}
```

### MSW Handler Requirements

Add `GET /api/events/:id/overview` to MSW handlers (if not already in Story 1.6):
```typescript
http.get('/api/events/:id/overview', ({ params }) => {
  return HttpResponse.json({
    blastCount: 2000,
    registrationCount: 400,
    approvedCount: 280,
    attendedCount: 0,  // 0 until live/completed
    lastBlastAt: '2026-04-01T09:00:00Z',
    pendingApprovals: 58,
    seatsRemaining: 120,
    daysUntilEvent: 3,
  })
})
```

### lib/benchmarks.ts

```typescript
export const FUNNEL_BENCHMARKS = {
  blastToRegistration: { good: 0.20, warn: 0.10 },
  registrationToApproval: { good: 0.70, warn: 0.50 },
  approvalToAttendance: { good: 0.90, warn: 0.75 },
}

export function getHealth(rate: number, stage: keyof typeof FUNNEL_BENCHMARKS): Health {
  const bench = FUNNEL_BENCHMARKS[stage]
  if (rate >= bench.good) return 'good'
  if (rate >= bench.warn) return 'warn'
  return 'bad'
}
```

### Layout Structure

```
[Overview Tab Content]
  lg:grid-cols-[2fr_1fr]
  Left (2fr):
    <FunnelVisualization> — 4 stages, bars, ConversionBadges
  Right (1fr):
    <PipelineStats> — pending approvals, last blast, days until, seats
    <ActionCard> — conditional (only when bad health detected)
```

### Test Requirements

- Funnel renders 4 stages with correct labels (Diundang, Mendaftar, Disetujui, Hadir)
- Zero Diundang → ConversionBadge shows `—`; CTA card "Belum ada blast" visible
- ConversionBadge health: 400/2000 = 20% → `good`; 100/2000 = 5% → `bad`
- MSW: GET /api/events/:id/overview returns seeded data; component renders without error
- PipelineStats shows: 58 pending approvals link to /registrations, seats remaining = 120
- ActionCard hidden when all badges are good/warn

### Dependencies

- **Prerequisite:** Story 4.7 (hub shell + layout.tsx + BlockerStrip component)
- Story 4.7 provides the shared blockerState query mechanism

## Tasks / Subtasks

- [ ] Task 1: Create Overview tab page file
  - [ ] Subtask 1.1: `app/app/events/[id]/page.tsx` — renders Overview content (or overview/page.tsx)
  - [ ] Subtask 1.2: `useQuery` for `GET /api/events/:id/overview` with `staleTime: 60_000`

- [ ] Task 2: Create `lib/benchmarks.ts`
  - [ ] Subtask 2.1: Define FUNNEL_BENCHMARKS thresholds
  - [ ] Subtask 2.2: Implement `getHealth()` function

- [ ] Task 3: Build `<ConversionBadge>` component
  - [ ] Subtask 3.1: Props: `rate: number | null`, `stage: keyof FUNNEL_BENCHMARKS`
  - [ ] Subtask 3.2: Render color + symbol + percentage (or `—` for null/zero)
  - [ ] Subtask 3.3: `aria-label` for screen reader

- [ ] Task 4: Build `<FunnelVisualization>` component
  - [ ] Subtask 4.1: 4 `<FunnelBar>` instances with proportional widths
  - [ ] Subtask 4.2: `role="meter"` + `aria-valuenow` + `aria-label` on each bar
  - [ ] Subtask 4.3: Min-width enforcement for zero stages (thin visible line + CTA link)

- [ ] Task 5: Build `<PipelineStats>` + `<ActionCard>` components
  - [ ] Subtask 5.1: PipelineStats: pending approvals (link to /registrations), last blast, days until, seats remaining
  - [ ] Subtask 5.2: ActionCard: conditional render; only shows for `bad` health with specific CTA per stage
  - [ ] Subtask 5.3: Countdown color: >24h muted, <24h amber-700, <6h red-700

- [ ] Task 6: Update BlockerStrip integration
  - [ ] Subtask 6.1: Overview query writes pendingApprovals to shared `blockerState` query cache
  - [ ] Subtask 6.2: BlockerStrip in layout.tsx reads from `['event', id, 'blockerState']`

- [ ] Task 7: Add MSW handler for /api/events/:id/overview
  - [ ] Subtask 7.1: Add handler to MSW handlers file (Story 1.6 location)
  - [ ] Subtask 7.2: Return seeded data per spec above

- [ ] Task 8: Write tests
  - [ ] Subtask 8.1: FunnelVisualization renders 4 stages
  - [ ] Subtask 8.2: ConversionBadge health computation tests
  - [ ] Subtask 8.3: ActionCard conditional rendering
  - [ ] Subtask 8.4: MSW integration — component renders with seeded data

## Dev Agent Record

### Implementation Plan

1. Create `src/lib/benchmarks.ts` with FUNNEL_BENCHMARKS and `getHealth()`
2. Create `ConversionBadge.tsx`, `FunnelVisualization.tsx`, `ActionCard.tsx` hub components
3. Rewrite `_client.tsx` for Overview tab with funnel + pipeline stats layout
4. Add `GET /api/events/:id/overview` MSW handler (before generic `:id` handler for correct matching)
5. Write component tests

### Debug Log

- MSW handler ordering: `/api/events/:id/overview` must be registered BEFORE `/api/events/:id` — MSW matches first
- `getWorstHealth` exported from FunnelVisualization for potential use by BlockerStrip integration

### Completion Notes

- 89 tests pass (15 new for Story 4.8)
- TypeScript 0 errors
- ActionCard renders null (not hidden div) when health is good/warn — React `null` return

## File List

- `src/lib/benchmarks.ts`
- `src/components/hub/ConversionBadge.tsx`
- `src/components/hub/FunnelVisualization.tsx`
- `src/components/hub/FunnelVisualization.test.tsx`
- `src/components/hub/ActionCard.tsx`
- `src/components/hub/ActionCard.test.tsx`
- `src/app/app/events/[id]/_client.tsx` (rewritten for hub overview)
- `src/mocks/handlers/events.ts` (added /overview handler)

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-22 | Story created from epic-4 + ux-event-pipeline.md | bmad-context-engine |
