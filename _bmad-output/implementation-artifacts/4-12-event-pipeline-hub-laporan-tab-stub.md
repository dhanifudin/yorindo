# Story 4.12: Event Pipeline Hub — Laporan Tab (Stub)

## Story

**As an** admin,
**I want** the Laporan tab to be present in the Event Pipeline Hub with a stub state during Phase 1,
**So that** the navigation is complete and the tab can be progressively filled in by Epic 8.

## Status

review

## Context

Final shell story in the Event Pipeline Hub series. Requires Story 4.7 (hub shell). Lives at `/app/events/:id/report`.

This story creates a placeholder Laporan tab. Epic 8 implements the real analytics content. The stub must be visually complete (not a blank page) with skeleton placeholders and a clear "coming soon" state. The YoriMind panel is referenced as a future Suspense-wrapped import.

**Critical:** The MSW handler for `GET /api/events/:id/report` must return seeded data matching the `EventReport` type — because Epic 8's real component will consume it. This story creates both the stub UI AND the MSW handler contract.

## Acceptance Criteria

**AC1:** Given I am on the Laporan tab (`/app/events/:id/report`),
When the event has `status: 'completed'` or `'live'`,
Then the tab shows: a Skeleton placeholder funnel chart (non-pulsing `animate-none`), a YoriMind panel placeholder ("Analisis tersedia setelah event selesai"), and a disabled "Unduh Laporan PDF" Button

**AC2:** Given the event has any status other than `completed` or `live`,
When the Laporan tab is viewed,
Then it shows an empty state: "Laporan tersedia setelah event berlangsung" with the expected event date

**AC3:** Given `GET /api/events/:id/report` is called via MSW,
Then it returns deterministic seeded analytics data matching the `EventReport` type in `src/types/api.ts`

**AC4:** Given the Laporan tab renders,
Then it attempts to import `<YoriMindPanel>` via `React.lazy` wrapped in `<Suspense>` with a Skeleton fallback; if the component doesn't exist yet (Epic 8 not implemented), the Suspense boundary catches the failure gracefully — no hard crash

**AC5:** Given the non-pulsing Skeleton placeholders,
Then they use `className="animate-none"` to distinguish intentional placeholder state from loading state

## Dev Notes

### File Locations (in `yorindo-app/`)

```
src/
  app/
    (admin)/
      events/
        [id]/
          report/
            page.tsx                   ← Laporan tab stub
  components/
    laporan/
      LaporanStub.tsx                  ← Stub UI (skeletons + copy + disabled button)
      LaporanPlaceholderChart.tsx      ← Non-pulsing skeleton chart placeholder
```

### Architecture Constraints

1. **Non-pulsing Skeleton** — Use shadcn `Skeleton` with `className="animate-none"` — intentional placeholder, not loading.
2. **Suspense for YoriMindPanel** — Use `React.lazy(() => import('@/components/yorimind/YoriMindPanel'))` wrapped in `Suspense`. Epic 8 will create this file. Until then, Suspense catches the import error via `ErrorBoundary`.
3. **EventReport type** — Add `EventReport` type to `src/types/api.ts` if not already present (stub type with required fields for Epic 8 contract).

### EventReport Type (add to api.ts if missing)

```typescript
export interface EventReport {
  eventId: string
  funnelMetrics: {
    blast: number
    registrations: number
    approved: number
    attended: number
  }
  demographics: {
    byIndustry: Array<{ industry: string; count: number }>
    byCity: Array<{ city: string; count: number }>
  }
  generatedAt: string
}
```

### MSW Handler

```typescript
http.get('/api/events/:id/report', ({ params }) => {
  return HttpResponse.json({
    eventId: params.id,
    funnelMetrics: { blast: 2000, registrations: 400, approved: 280, attended: 210 },
    demographics: {
      byIndustry: [
        { industry: 'manufaktur', count: 85 },
        { industry: 'teknologi', count: 62 },
        { industry: 'keuangan', count: 43 },
      ],
      byCity: [
        { city: 'Jakarta', count: 120 },
        { city: 'Surabaya', count: 55 },
      ],
    },
    generatedAt: new Date().toISOString(),
  } satisfies EventReport)
})
```

### Suspense Error Boundary Pattern

```tsx
// Graceful YoriMind panel placeholder
function YoriMindPanelOrFallback() {
  const YoriMindPanel = React.lazy(() =>
    import('@/components/yorimind/YoriMindPanel').catch(() => ({
      default: () => (
        <div className="rounded border p-4 text-sm text-muted-foreground">
          Analisis tersedia setelah event selesai
        </div>
      ),
    }))
  )
  return (
    <Suspense fallback={<Skeleton className="h-48 w-full animate-none" />}>
      <YoriMindPanel />
    </Suspense>
  )
}
```

### Test Requirements

- Completed/live event → skeleton chart + "Analisis tersedia" copy + disabled PDF button render
- Non-completed event → empty state with event date shown
- MSW: GET /api/events/:id/report returns EventReport-shaped data; component renders without crash
- Suspense fallback renders when YoriMindPanel component doesn't exist

### Dependencies

- **Prerequisite:** Story 4.7 (hub shell, Laporan tab route)
- Story 8.4 (YoriMind panel — will implement the actual `<YoriMindPanel>` component this story imports)

## Tasks / Subtasks

- [ ] Task 1: Create `report/page.tsx`
  - [ ] Subtask 1.1: `useQuery` for GET /api/events/:id/report
  - [ ] Subtask 1.2: Status-gated rendering (completed/live vs. other)

- [ ] Task 2: Add `EventReport` type to `src/types/api.ts`
  - [ ] Subtask 2.1: Define EventReport interface with funnelMetrics + demographics

- [ ] Task 3: Build stub UI components
  - [ ] Subtask 3.1: `<LaporanPlaceholderChart>` — Skeleton with `animate-none`, fixed height
  - [ ] Subtask 3.2: YoriMind panel Suspense + error boundary wrapper
  - [ ] Subtask 3.3: Disabled "Unduh Laporan PDF" Button (Epic 8 will enable)
  - [ ] Subtask 3.4: Empty state for non-live/completed events with event date

- [ ] Task 4: Add MSW handler for /api/events/:id/report
  - [ ] Subtask 4.1: Handler returns seeded EventReport data
  - [ ] Subtask 4.2: Verify handler doesn't conflict with existing event handlers

- [ ] Task 5: Write tests
  - [ ] Subtask 5.1: Completed event renders skeleton chart + disabled button
  - [ ] Subtask 5.2: Non-completed event renders empty state
  - [ ] Subtask 5.3: MSW integration — data loads without crash
  - [ ] Subtask 5.4: Suspense fallback renders gracefully without YoriMindPanel

## Dev Agent Record

### Implementation Plan

1. Add `EventReport` type to `src/types/api.ts`
2. Create `LaporanPlaceholderChart.tsx` — non-pulsing skeleton bars
3. Create `LaporanStub.tsx` — status-gated stub with lazy YoriMindPanel + disabled PDF button
4. MSW handler already exists in reports.ts

### Debug Log

- Skeleton component only accepts `className` prop — used raw `<div>` with `animate-none bg-muted` for custom height bars
- `React.lazy(() => import('@/components/yorimind/YoriMindPanel'))` fails at Vite build time (static analysis). Used `YORIMIND_PATH` variable with `/* @vite-ignore */` comment to suppress Vite's static import resolution
- rtk proxy passes `PASS (0)` for no-test runs; used `node_modules/.bin/vitest` directly to diagnose real test failures

### Completion Notes

- 128 tests pass (6 new for Story 4.12)
- TypeScript 0 errors
- report/_client.tsx already has full Epic 8 content; LaporanStub serves as the fallback component for events not yet completed

## File List

- `src/types/api.ts` (added EventReport interface)
- `src/components/laporan/LaporanPlaceholderChart.tsx`
- `src/components/laporan/LaporanStub.tsx`
- `src/components/laporan/LaporanStub.test.tsx`

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-22 | Story created from epic-4 + ux-event-pipeline.md | bmad-context-engine |
