# Story 4.9: Event Pipeline Hub — Undangan Tab (Blast)

## Story

**As an** admin,
**I want** the Undangan tab to be a dedicated blast workspace for this event,
**So that** I can send invitations, schedule re-blasts, and see the blast history — all scoped to this event.

## Status

review

## Context

Third story in the Event Pipeline Hub series. Requires Story 4.7 (hub shell). The Undangan tab lives at `/app/events/:id/blast`. It provides a self-contained blast workspace so admins never need to leave the event context to send invitations.

**Key UX principle:** The blast config form is pre-populated with the event's target segment from `event.targetCriteria`. Admin sees the audience preview count immediately (same mechanism as Story 4.5 — audience preview endpoint). If the event has `status: 'draft'`, this tab is disabled (handled by hub shell in Story 4.7 — the page itself doesn't need to gate access).

The blast is submitted via `POST /api/blast` (not `POST /api/events/:id/blast` — the event context is passed in the request body as `eventId`). Response: `202 Accepted` with `{ jobId, status: 'queued' }`. A progress bar polled at 5s interval shows delivery progress.

## Acceptance Criteria

**AC1:** Given I am on the Undangan tab (`/app/events/:id/blast`),
When the tab loads,
Then it shows: audience segment preview count, blast history list (date, channel, recipients), and a "Kirim Undangan" primary `Button`

**AC2:** Given the "Kirim Undangan" button,
When I click it,
Then a blast config form appears (as a shadcn `Sheet` slide-in) with fields: channel (WA/email radio), template selector (`Select` pulling from templates), optional scheduledAt (`DateTimePicker`); form is pre-populated with the event's target segment criteria

**AC3:** Given the blast config form is submitted,
When `POST /api/blast` is called with `{ eventId, channel, templateId, scheduledAt? }`,
Then the Sheet closes, a Sonner success toast shows "Blast dijadwalkan", and the blast history list updates with the new job (`refetch()` called)

**AC4:** Given a blast is in progress (status: 'running'),
When the Undangan tab is viewed,
Then a `<Progress>` bar shows sent/total recipients with status label; `refetchInterval: 5_000` on the blast job query until status is 'completed' or 'failed'

**AC5:** Given the audience segment preview,
When the event has `targetCriteria` set,
Then `POST /api/events/:id/audience-preview` is called on tab load and shows the matching contact count with "N kontak cocok dengan kriteria ini"

**AC6:** Given no blast history exists for this event,
When the tab renders,
Then an empty state shows: "📨 Belum ada undangan terkirim — Kirim blast pertama untuk event ini" with a "Kirim Undangan" CTA button

**AC7:** Given `GET /api/blast/history?eventId=:id` is called via MSW,
Then it returns a list of past blasts for this event with `{ id, channel, recipientCount, sentAt, status }`

## Dev Notes

### File Locations (in `yorindo-app/`)

```
src/
  app/
    app/
      events/
        [id]/
          blast/
            page.tsx                   ← Undangan tab content
  components/
    undangan/
      BlastHistoryList.tsx             ← List of past blasts with status/count
      BlastConfigSheet.tsx             ← shadcn Sheet with blast config form (RHF + Zod)
      AudiencePreviewCard.tsx          ← Preview count card
      BlastProgressBar.tsx             ← Progress bar for in-flight blast
```

### Architecture Constraints

1. **Sheet for blast config form** — Use shadcn `Sheet` (not Dialog or Modal) for the config form. Form has ≤4 fields.
2. **Form validation:** `mode: 'onBlur'` for text/date; Select/radio validate on selection (React Hook Form Controller `onChange`).
3. **MSW handlers** — All API calls go through MSW. The `POST /api/blast` handler must return `{ jobId: 'mock-job-1', status: 'queued' }`.
4. **React Query patterns:** Blast history uses `staleTime: 30_000`. In-progress blast uses `refetchInterval: 5_000` (only when status is 'running').

### Key Code Patterns

**Blast config form (RHF + Zod):**
```tsx
const blastSchema = z.object({
  channel: z.enum(['whatsapp', 'email']),
  templateId: z.string().min(1, 'Pilih template'),
  scheduledAt: z.string().optional(),
})

const form = useForm<z.infer<typeof blastSchema>>({
  resolver: zodResolver(blastSchema),
  mode: 'onBlur',
  defaultValues: { channel: 'whatsapp' },
})
```

**Conditional refetchInterval:**
```tsx
const { data: blastStatus } = useQuery({
  queryKey: ['blast', activeJobId],
  queryFn: () => fetchBlastStatus(activeJobId),
  enabled: !!activeJobId,
  refetchInterval: (data) => data?.status === 'running' ? 5_000 : false,
})
```

**POST /api/blast (MSW handler):**
```typescript
http.post('/api/blast', async ({ request }) => {
  const body = await request.json()
  return HttpResponse.json({ jobId: 'mock-job-1', status: 'queued' }, { status: 202 })
})
```

**GET /api/blast/history (MSW):**
```typescript
http.get('/api/blast/history', ({ request }) => {
  const url = new URL(request.url)
  const eventId = url.searchParams.get('eventId')
  return HttpResponse.json([
    { id: '1', channel: 'whatsapp', recipientCount: 312, sentAt: '2026-03-20T09:00:00Z', status: 'completed' },
  ])
})
```

### Test Requirements

- Tab renders audience preview count on mount (POST /api/events/:id/audience-preview called)
- Empty state shows when blast history is empty
- "Kirim Undangan" click → Sheet opens with pre-populated channel + empty template selector
- Form submit → POST /api/blast called with correct body; Sheet closes; toast shown
- Progress bar renders when active job has status 'running'; disappears when 'completed'

### Dependencies

- **Prerequisite:** Story 4.7 (hub shell — Undangan tab route and layout)
- Story 4.5 (audience preview mechanism — same endpoint/pattern reused)
- Story 5.1 (templates — GET /api/templates needed for template selector dropdown)

## Tasks / Subtasks

- [ ] Task 1: Create `blast/page.tsx` with React Query data fetching
  - [ ] Subtask 1.1: Fetch blast history via `GET /api/blast/history?eventId=:id`
  - [ ] Subtask 1.2: Fetch audience preview via `POST /api/events/:id/audience-preview` on mount

- [ ] Task 2: Build `<AudiencePreviewCard>` component
  - [ ] Subtask 2.1: Show count or loading skeleton
  - [ ] Subtask 2.2: Warning state when count = 0

- [ ] Task 3: Build `<BlastHistoryList>` component
  - [ ] Subtask 3.1: List of blasts with channel icon, recipient count, sent date, status Badge
  - [ ] Subtask 3.2: Empty state with CTA

- [ ] Task 4: Build `<BlastConfigSheet>` component (RHF + Zod)
  - [ ] Subtask 4.1: Sheet trigger via "Kirim Undangan" button
  - [ ] Subtask 4.2: channel radio (WA/email), templateId Select, scheduledAt optional date picker
  - [ ] Subtask 4.3: Pre-populate channel from event's notification_channel setting
  - [ ] Subtask 4.4: On submit: POST /api/blast, close Sheet, refetch history, show toast

- [ ] Task 5: Build `<BlastProgressBar>` component
  - [ ] Subtask 5.1: Progress bar with sent/total + status label
  - [ ] Subtask 5.2: refetchInterval: 5_000 while running; stops when complete/failed
  - [ ] Subtask 5.3: Shows only when active job exists

- [ ] Task 6: Add MSW handlers
  - [ ] Subtask 6.1: GET /api/blast/history with eventId filter
  - [ ] Subtask 6.2: POST /api/blast returning 202 + jobId
  - [ ] Subtask 6.3: GET /api/blast/:jobId for status polling (returns { status, sent, total })

- [ ] Task 7: Write tests
  - [ ] Subtask 7.1: Tab loads + renders audience preview and history
  - [ ] Subtask 7.2: Sheet open/close + form submission
  - [ ] Subtask 7.3: Progress bar conditional rendering

## Dev Agent Record

### Implementation Plan

1. Create `src/components/ui/progress.tsx` — simple Tailwind progress bar (no Radix dep needed)
2. Create `src/components/undangan/` — AudiencePreviewCard, BlastHistoryList, BlastConfigSheet, BlastProgressBar
3. Replace stub `blast/page.tsx` with full React Query + layout
4. Create `src/mocks/handlers/blast.ts` — GET /api/blast/history, POST /api/blast, GET /api/blast/:jobId
5. Register blastHandlers in index.ts BEFORE eventHandlers
6. Write tests for BlastHistoryList and BlastProgressBar

### Debug Log

- Registered `blastHandlers` first in `handlers/index.ts` to avoid event wildcard matching `/api/blast/*`
- `Progress` component built with plain Tailwind (no `@radix-ui/react-progress` installed)
- `useMutation` import not needed — POST /api/blast handled inside BlastConfigSheet with fetch

### Completion Notes

- 100 tests pass (11 new for Story 4.9)
- TypeScript 0 errors
- BlastConfigSheet filters templates by selected channel (WA shows WA templates, email shows email templates)
- activeJobId seeded to 'mock-job-1' on blast success to trigger polling demo

## File List

- `src/components/ui/progress.tsx`
- `src/components/undangan/AudiencePreviewCard.tsx`
- `src/components/undangan/BlastHistoryList.tsx`
- `src/components/undangan/BlastHistoryList.test.tsx`
- `src/components/undangan/BlastProgressBar.tsx`
- `src/components/undangan/BlastProgressBar.test.tsx`
- `src/components/undangan/BlastConfigSheet.tsx`
- `src/app/app/events/[id]/blast/page.tsx` (replaced stub)
- `src/mocks/handlers/blast.ts` (new)
- `src/mocks/handlers/index.ts` (added blastHandlers)

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-22 | Story created from epic-4 + ux-event-pipeline.md | bmad-context-engine |
