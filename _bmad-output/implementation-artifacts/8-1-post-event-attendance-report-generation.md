# Story 8.1: Post-Event Attendance Report Page

**Story ID:** 8.1
**Story Key:** 8-1-post-event-attendance-report-generation
**Epic:** Epic 8 — Analytics, Reporting & YoriMind
**Phase:** Phase 1 (FE) — report page UI wired to MSW report handler
**Status:** review
**Created:** 2026-03-20

---

## Story

As an admin,
I want to view a comprehensive attendance report for a completed event,
So that I have an accurate record of event performance.

> **Phase 1 FE scope:** Build the post-event report page with attendance funnel chart (Recharts), demographic breakdowns, metric cards, and download buttons — all wired to a new MSW report handler. The actual BE report generation job (BullMQ) is Phase 2.

---

## Acceptance Criteria (FE Phase 1)

**AC1:** Given `/admin/events/:id/report` is accessed for a completed event,
When the page loads,
Then metric cards show: total invited, registered, approved, attended, attendance rate %, no-show rate %

**AC2:** Given the funnel section,
When Recharts renders,
Then a funnel chart shows: Invited → Registered → Approved → Attended with conversion rates between each stage

**AC3:** Given the demographics section,
Then Recharts bar/pie charts show: industry breakdown, city distribution, job title level breakdown

**AC4:** Given "Download Excel" or "Download PDF" buttons,
When clicked,
Then a loading state appears and a toast shows "Download dimulai..." (actual file download is Phase 2)

**AC5:** Given the report is loading,
Then metric cards and charts show skeleton loaders

---

## Tasks / Subtasks

- [x] **Task 1: Add MSW report handler**
  - [x] Create `src/mocks/handlers/reports.ts` with seeded data (500/180/120/95, demographics)
  - [x] 600ms delay; added to `handlers/index.ts`

- [x] **Task 2: Create report page route**
  - [x] Create `src/app/(admin)/events/[id]/report/page.tsx`; `useReport(id)` hook; skeleton loader

- [x] **Task 3: Build MetricCards component**
  - [x] Create `src/components/features/reports/MetricCards.tsx` with 6 metric cards + skeleton variant

- [x] **Task 4: Build AttendanceFunnelChart (Recharts)**
  - [x] Create `src/components/features/reports/AttendanceFunnelChart.tsx` — horizontal BarChart, 4 stages

- [x] **Task 5: Build DemographicsCharts (Recharts)**
  - [x] Create `src/components/features/reports/DemographicsCharts.tsx` — PieChart (industry) + 2× BarChart

- [x] **Task 6: Download buttons (Phase 1 stub)**
  - [x] Excel + PDF buttons; show inline "Download dimulai..." toast for 3s

- [x] **Task 7: Write vitest tests**
  - [x] Test: GET /api/events/:id/report returns 500 invited, 95 attended
  - [x] Test: attendance rate ≈ 79.2%

---

## Dev Notes

### New MSW Handler Required
```typescript
// src/mocks/handlers/reports.ts
const mockReport = {
  eventId: 'event-001',
  totalInvited: 500,
  registered: 180,
  approved: 120,
  attended: 95,
  attendanceRate: (95/120*100).toFixed(1),
  noShowRate: (25/120*100).toFixed(1),
  industryBreakdown: [
    { industry: 'teknologi', count: 38 },
    { industry: 'manufaktur', count: 22 },
    { industry: 'kesehatan', count: 18 },
    { industry: 'keuangan', count: 12 },
    { industry: 'other', count: 5 },
  ],
  cityBreakdown: [
    { city: 'Jakarta', count: 55 },
    { city: 'Surabaya', count: 20 },
    { city: 'Bandung', count: 12 },
    { city: 'Medan', count: 8 },
  ],
  jobTitleBreakdown: [
    { level: 'C-Level', count: 15 },
    { level: 'Director', count: 28 },
    { level: 'Manager', count: 35 },
    { level: 'Staff', count: 17 },
  ],
}
```

### Recharts — already installed
Recharts is in `package.json` from Story 1.3. Import:
```typescript
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
```

### File Locations (from architecture)
- Report page: `src/app/(admin)/events/[id]/report/page.tsx`
- Metric cards: `src/components/features/reports/MetricCards.tsx`
- Funnel chart: `src/components/features/reports/AttendanceFunnelChart.tsx`
- Demographics: `src/components/features/reports/DemographicsCharts.tsx`
- MSW handler: `src/mocks/handlers/reports.ts`

### Key Anti-Patterns
- DO NOT implement real file download in Phase 1 — stub with a toast
- DO NOT use `FunnelChart` from Recharts v2 if not available — use `BarChart` with decreasing values instead
- DO NOT hardcode report data in the component — always fetch from the hook

---

## Dev Agent Record

### Implementation Plan

1. Created `src/mocks/handlers/reports.ts` — seeded report with 500/180/120/95 metrics + 3 demographic breakdowns; added to handlers/index.ts.
2. Created `src/hooks/useReport.ts` — `useReport(eventId)` React Query hook.
3. Created `src/components/features/reports/MetricCards.tsx` — 6 metric cards + skeleton variant.
4. Created `src/components/features/reports/AttendanceFunnelChart.tsx` — Recharts horizontal BarChart, 4 stages.
5. Created `src/components/features/reports/DemographicsCharts.tsx` — PieChart + 2x BarChart.
6. Created `src/app/(admin)/events/[id]/report/page.tsx` — assembles all components; download stub toast.
7. Created `src/hooks/useReport.test.ts` — 2 tests.

### Debug Log

- Recharts `Tooltip.formatter` type: `(value: number) => ...` not assignable — fixed with `(value) => [(value as number)...]`.

### Completion Notes

All 7 tasks complete. 47/47 tests pass (2 new; 45 pre-existing). `tsc --noEmit` clean. Recharts components are all `'use client'`.

---

## File List

**New files:**
- `src/mocks/handlers/reports.ts`
- `src/hooks/useReport.ts`
- `src/hooks/useReport.test.ts`
- `src/components/features/reports/MetricCards.tsx`
- `src/components/features/reports/AttendanceFunnelChart.tsx`
- `src/components/features/reports/DemographicsCharts.tsx`
- `src/app/(admin)/events/[id]/report/page.tsx`

**Modified files:**
- `src/mocks/handlers/index.ts` — added `reportHandlers`

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-20 | Story created (FE Phase 1) | bmad-create-story |
| 2026-03-20 | All 7 tasks implemented; 47/47 tests pass | bmad-dev-story |
