---
title: 'Revamp completed-event smart dashboard analytics'
type: 'feature'
created: '2026-04-11'
status: 'in-progress'
baseline_commit: '2983afdebb0ee699bd1f2251c8534f01f187d25e'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The completed-event dashboard shows a generic report section (MetricCards, AttendanceFunnelChart, DemographicsCharts, AnalyticsDashboard, YoriMindPanel) with no Event Health Score, no OTS breakdown, no attendee-only demography, and no segment overlap map — leaving admins without actionable post-event insight.

**Approach:** Fully replace the completed-event report section in `_client.tsx` with a new smart dashboard: Event Health Score, updated Funnel Stats with OTS breakdown, Demography Quick Stats, Segment Overlap Map, and Survey Score Card. One new backend endpoint supplies the attendee-based demography and segment data.

## Boundaries & Constraints

**Always:**
- Only modify the completed/archived branch of `_client.tsx` — all other event status views stay untouched.
- Demography and segment overlap are based on ATTENDEES only (`status='attended'` OR `status='approved' AND attended_at IS NOT NULL`).
- Health Score formula: attendance rate ×40% + no-show penalty ×20% + blast conversion ×20% + survey score ×20%. If no survey: redistribute 20% proportionally across the other three.
- Use existing shadcn/ui components only (Card, Badge, Progress, Table, Skeleton).
- The `useReport` hook and `GET /api/events/:id/report` endpoint must not be removed (other consumers may exist).

**Ask First:**
- None anticipated.

**Never:**
- Do not alter migration files, DB schema, or any non-completed event views.
- Do not add AI chat, drawers, or new page routes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output | Error Handling |
|---|---|---|---|
| No blasts sent | `blastCount = 0` | Blast conversion omitted from score, weight redistributed | — |
| No post-event survey | No `range` aggregates returned | SurveyScoreCard shows muted "Survei belum tersedia" | — |
| All attendees via OTS | `attended = 0, otsCount > 0` | Pre-registered = 0, OTS = N, Hadir total = otsCount | — |
| No attendees at all | `attended = 0, otsCount = 0` | Health Score = 0 (red), segment overlap shows empty state | — |

</frozen-after-approval>

## Code Map

- `yorindo-app/src/app/app/events/[id]/_client.tsx:271` — `{isCompleted && ...}` block; full replacement target
- `yorindo-app/src/components/features/events/CompletedEventDashboard.tsx` — new top-level composition (new file)
- `yorindo-app/src/components/features/events/EventHealthScoreCard.tsx` — new component (new file)
- `yorindo-app/src/components/features/events/EventFunnelStats.tsx` — new component (new file)
- `yorindo-app/src/components/features/events/DemographyQuickStats.tsx` — new component (new file)
- `yorindo-app/src/components/features/events/SegmentOverlapMap.tsx` — new component (new file)
- `yorindo-app/src/components/features/events/SurveyScoreCard.tsx` — new component (new file)
- `yorindo-app/src/types/api.ts` — add `CompletionStats` type
- `yorindo-app/src/mocks/handlers/events.ts` — add `GET /api/events/:id/completion-stats` mock handler
- `yorindo-api/src/routes/events.routes.ts:857` — add `GET /api/events/:id/completion-stats` handler after `/report`

## Tasks & Acceptance

**Execution:**
- [ ] `yorindo-api/src/routes/events.routes.ts` — ADD `GET /api/events/:id/completion-stats` after the `/report` handler. Require `requireAuth + requireRoles('admin','viewer')`. Run three queries using attendee filter (`status='attended' OR (status='approved' AND attended_at IS NOT NULL)`): top-3 cities by count, top-3 service_type by count, top-3 job_title by count, plus segment overlap (top 10 industry×city by rate DESC). Return `{ demography: { cities, industries, jobTitles }, segmentOverlap }`.

  Segment overlap SQL:
  ```sql
  SELECT c.service_type AS industry, c.city,
    COUNT(*) FILTER (WHERE r.status='attended' OR (r.status='approved' AND r.attended_at IS NOT NULL)) AS attended,
    COUNT(*) FILTER (WHERE r.status IN ('approved','attended')) AS approved,
    ROUND(COUNT(*) FILTER (WHERE r.status='attended' OR (r.status='approved' AND r.attended_at IS NOT NULL))::numeric /
      NULLIF(COUNT(*) FILTER (WHERE r.status IN ('approved','attended')),0)*100) AS rate
  FROM registrations r JOIN contacts c ON c.id=r.contact_id
  WHERE r.event_id=$1
  GROUP BY c.service_type, c.city
  HAVING COUNT(*) FILTER (WHERE r.status IN ('approved','attended'))>0
  ORDER BY rate DESC LIMIT 10
  ```

- [ ] `yorindo-app/src/types/api.ts` — ADD `CompletionStats` interface: `{ demography: { cities: {name:string;count:number}[]; industries: {name:string;count:number}[]; jobTitles: {name:string;count:number}[] }; segmentOverlap: {industry:string;city:string;attended:number;approved:number;rate:number}[] }`

- [ ] `yorindo-app/src/mocks/handlers/events.ts` — ADD `http.get('/api/events/:id/completion-stats', async () => { await delay(300); return HttpResponse.json({ demography: { cities: [{name:'Jakarta',count:42},{name:'Surabaya',count:28},{name:'Bandung',count:15}], industries: [{name:'Fabrikasi Logam & Mesin Presisi',count:35},{name:'Fast-Moving Consumer Goods (FMCG)',count:22},{name:'Farmasi & Alat Kesehatan',count:18}], jobTitles: [{name:'manajer',count:30},{name:'direktur',count:20},{name:'staf',count:15}] }, segmentOverlap: [{industry:'Fabrikasi Logam & Mesin Presisi',city:'Surabaya',attended:28,approved:32,rate:87},{industry:'Farmasi & Alat Kesehatan',city:'Jakarta',attended:18,approved:22,rate:81},{industry:'Fast-Moving Consumer Goods (FMCG)',city:'Jakarta',attended:15,approved:22,rate:68},{industry:'Elektronik & Peralatan Rumah Tangga',city:'Bandung',attended:10,approved:18,rate:55},{industry:'Tekstil & Garmen',city:'Surabaya',attended:4,approved:12,rate:33}] }) })` — place BEFORE the `GET /api/events/:id` wildcard handler.

- [ ] `yorindo-app/src/components/features/events/EventHealthScoreCard.tsx` — CREATE. Props: `{ attended: number; approved: number; registered: number; blastCount: number; otsCount: number; surveyScore: number | null }`. Compute composite 0–100 score using the weight-redistribution formula. Render: prominent score badge (green ≥75%, yellow 50–74%, red <50%) + 4 sub-indicator rows each showing label, computed value, and weight %.

- [ ] `yorindo-app/src/components/features/events/EventFunnelStats.tsx` — CREATE. Props: `{ blastCount: number; registered: number; approved: number; attended: number; otsCount: number }`. Render 4-step horizontal/vertical funnel: Diundang → Daftar → Disetujui → Hadir, with conversion % between each step. Below the funnel: breakdown rows — Pre-registered hadir, OTS, No-show count, No-show rate (%).

- [ ] `yorindo-app/src/components/features/events/DemographyQuickStats.tsx` — CREATE. Props: `{ cities: {name:string;count:number}[]; industries: {name:string;count:number}[]; jobTitles: {name:string;count:number}[] }`. Three Cards side-by-side (lg:grid-cols-3), each listing top items with a Progress bar relative to the highest count in that category.

- [ ] `yorindo-app/src/components/features/events/SegmentOverlapMap.tsx` — CREATE. Props: `{ rows: CompletionStats['segmentOverlap'] }`. shadcn Table with columns: Industri, Kota, Hadir, Disetujui, Rate. Rate shown as colored Badge (green ≥75, secondary 50–74, destructive <50). Show empty state text when rows is empty.

- [ ] `yorindo-app/src/components/features/events/SurveyScoreCard.tsx` — CREATE. Props: `{ eventId: string }`. Fetches `GET /api/events/${eventId}/surveys/responses` via useQuery. From `aggregates`, filter `fieldType === 'range'`. For each, normalize: `(avg - min) / (max - min) * 100` (use field's distribution length as proxy for max if min/max not present, fallback max=5). Average all normalized scores → overall score. Render score /100 with response count. Muted empty state if no range aggregates.

- [ ] `yorindo-app/src/components/features/events/CompletedEventDashboard.tsx` — CREATE composition component. Props: `{ eventId: string; overview: { blastCount: number; registrationCount: number; approvedCount: number; attendedCount: number; otsCount: number } }`. Fetches `GET /api/events/:id/completion-stats` via useQuery (key: `['completion-stats', eventId]`). Derives `surveyScore` from SurveyScoreCard's internal fetch (pass `null` if not yet computed — SurveyScoreCard handles its own fetch). Renders in order:
  1. Section heading "Analitik Event" + subtitle
  2. `<EventHealthScoreCard>` (uses overview + surveyScore)
  3. `<EventFunnelStats>` (uses overview)
  4. `<DemographyQuickStats>` (uses completionStats.demography)
  5. `<SegmentOverlapMap>` (uses completionStats.segmentOverlap)
  6. `<SurveyScoreCard eventId={eventId} />`
  Skeleton placeholders for each section while `completionStats` is loading.

- [ ] `yorindo-app/src/app/app/events/[id]/_client.tsx` — REPLACE the entire `{isCompleted && (...)}` block (lines ~271–316). Remove imports: `MetricCards`, `MetricCardsSkeleton`, `AttendanceFunnelChart`, `DemographicsCharts`, `AnalyticsDashboard`, `YoriMindPanel`, `useReport`. Add import for `CompletedEventDashboard`. Replace block with: `{isCompleted && <CompletedEventDashboard eventId={id} overview={metrics} />}`

**Acceptance Criteria:**
- Given a completed event page loads, when rendered, then five analytics sections appear: Health Score, Funnel, Demography, Segment Overlap, Survey Score.
- Given `blastCount = 0`, when Health Score renders, then no NaN or divide-by-zero appears and score is still valid.
- Given OTS registrations exist, when EventFunnelStats renders, then OTS count row appears separately under Hadir.
- Given segment overlap rows exist, when SegmentOverlapMap renders, then rows are sorted by rate DESC and rate badges are color-coded.
- Given no post-event survey range fields, when SurveyScoreCard renders, then muted empty state shows without error.
- Given an active or published event is viewed, when the page renders, then none of the new dashboard components appear.

## Design Notes

**Health Score weight redistribution:**
```
No survey → drop survey 0.2, remaining 0.8 → scale: attendance=0.50, noshow=0.25, blast=0.25
No survey + no blast → remaining 0.6 → scale: attendance=0.67, noshow=0.33
```

**SurveyScoreCard min/max fallback:** If a range aggregate lacks explicit min/max in its schema context, default min=1 max=5 (most common scale in Indonesian event surveys).

## Verification

**Commands:**
- `docker compose -f docker-compose.dev.yml exec -T api npm run lint` — expected: no errors
- `docker compose -f docker-compose.dev.yml exec -T api npm test` — expected: all pass

**Manual checks:**
- Navigate to a completed event → all 5 analytics sections render with data.
- Navigate to an active event → pipeline funnel and action card still present, no new components visible.
