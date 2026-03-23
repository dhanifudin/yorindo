---
title: 'Emergency Blast, Waitlist Management & Admin Cancellation'
slug: 'emergency-blast-waitlist-admin-cancel'
created: '2026-03-22'
status: 'Implementation Complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Next.js 16 App Router', 'React 19', 'TanStack React Query v5', 'MSW v2', 'shadcn/ui', 'Sonner', 'Lucide React']
files_to_modify:
  - 'src/mocks/handlers/registrations.ts'
  - 'src/mocks/handlers/blast.ts'
  - 'src/types/api.ts'
  - 'src/app/app/events/[id]/blast/page.tsx'
  - 'src/app/app/events/[id]/registrations/_client.tsx'
  - 'src/components/undangan/EmergencyBlastSheet.tsx'
code_patterns: ['useMutation + optimistic setQueryData', 'Sheet for admin actions', 'MSW http.post handler', 'PUT /api/registrations/:id/status pattern', 'AlertDialog for destructive confirm']
test_patterns: []
---

# Tech-Spec: Emergency Blast, Waitlist Management & Admin Cancellation

**Created:** 2026-03-22

---

## Overview

### Problem Statement

Three operational admin workflows are missing from the event management UI:

1. **Emergency Blast**: When venue, time, or critical info changes for an active event, there is no way to notify confirmed registrants immediately. The existing blast (`POST /api/blast`) is audience-criteria-based (invitation blast to prospects). There is no `POST /api/events/:id/blast/emergency` MSW handler and no FE entry point.

2. **Waitlist Management**: `waitlisted` registrations exist in the data model and mock data, and the admin can move a registration to `waitlisted` when quota is full. However, there is no "promote from waitlist" action — admins cannot manually move a `waitlisted` participant to `approved`. Waitlisted registrations show no FIFO queue position.

3. **Admin Cancellation**: Self-cancellation via token link (`/register/cancel/[token]`) exists, and the MSW handler `POST /api/registrations/:id/cancel` exists. But the admin has no action button to cancel an `approved` or `waitlisted` participant's registration — the actions column only renders for `pending` rows.

### Solution

1. **Emergency Blast**: Add `POST /api/events/:id/blast/emergency` MSW handler. Add a visually separated "Kirim Pemberitahuan Darurat" button below the invitation section on the Undangan tab, opening `EmergencyBlastSheet` — a form with freeform message, channel selector, character counter, message preview in confirmation state, and recipient count.

2. **Waitlist Management**: Add `promoteMutation` to promote `waitlisted` → `approved`. Display FIFO queue position (#1, #2…) in the status badge area (not actions column). Add "Promosikan" button in the actions column for `waitlisted` rows.

3. **Admin Cancellation**: Add `cancelMutation` using the existing `POST /api/registrations/:id/cancel` endpoint. Add "Batalkan" button for `approved` and `waitlisted` rows behind an `AlertDialog` that shows participant name and confirms the action. State tracks `{ id, name }` to display participant name in the dialog.

### Scope

**In Scope:**
- Export `registrationsStore` from `registrations.ts` (required for MSW cross-import)
- `POST /api/events/:id/blast/emergency` MSW handler (derives recipientCount from exported store)
- `EmergencyBlastBody` + `EmergencyBlastResponse` types in `src/types/api.ts`
- `EmergencyBlastSheet` component — message textarea (max 500 chars), channel selector, character counter, message preview before send, recipient count display, warning banner
- "Kirim Pemberitahuan Darurat" button on Undangan tab — visually separated from "Kirim Undangan", placed below with a divider; approved registrant count from dedicated query (`queryKey: ['event-registrations-count', id, 'approved']`)
- `promoteMutation` in registrations — PUT `/api/registrations/:id/status` → `approved`, optimistic update
- Waitlist FIFO position displayed in status badge area (below the "Waitlist" badge), computed from `createdAt` sort
- `cancelMutation` — POST `/api/registrations/:id/cancel`, optimistic update
- `cancelTarget: { id: string; name: string } | null` state for AlertDialog
- AlertDialog showing participant name + confirmation before cancel
- Actions column multi-status rendering: `pending` → Setujui/Tolak; `waitlisted` → Promosikan + Batalkan; `approved` → Batalkan; all others → null

**Out of Scope:**
- Auto-promotion logic on cancel (BE, Phase 2)
- Real delivery via Everpro/Brevo
- Suppression list enforcement
- Bulk cancel / bulk promote
- Emergency blast appearing in blast history list
- `setActiveJobId` integration for emergency blast jobs

---

## Context for Development

### Codebase Patterns

- **Mutations**: All status changes use `useMutation` with optimistic `setQueryData` + rollback in `onError`, matching the `approveMutation` pattern in `registrations/_client.tsx` exactly.
- **Actions column**: Currently `if (reg.status !== 'pending') return null`. Must become a 4-branch conditional: `pending`, `waitlisted`, `approved`, and a fallthrough `null`.
- **AlertDialog**: shadcn/ui `AlertDialog` — `open` controlled by `cancelTarget !== null`. Check `src/components/ui/alert-dialog.tsx` exists before implementing; if missing, install via `npx shadcn@latest add alert-dialog`.
- **Sheet pattern**: `open` + `onOpenChange` props, `SheetContent side="bottom"` for mobile-first. Reference `BlastConfigSheet.tsx`.
- **MSW store export**: `registrationsStore` in `registrations.ts` is currently `let registrationsStore` with no export. Add `export` keyword. This is a prerequisite for the emergency blast handler to derive `recipientCount`.
- **Emergency blast ≠ active job polling**: `setActiveJobId` in `blast/page.tsx` is for invitation blast polling via `blastJobsStore`. Emergency blast jobs are NOT in `blastJobsStore` and must NEVER call `setActiveJobId`. Doing so will cause 404 polling errors.
- **Waitlist position**: Compute with `useMemo` outside the column definition. `const waitlistRanks = useMemo(() => { const sorted = allRows.filter(...).sort(...); return Object.fromEntries(sorted.map((r,i) => [r.id, i+1])) }, [allRows])`. Access via `waitlistRanks[reg.id]` in the cell — O(1) lookup, not O(n) `findIndex` inside the render.
- **Query key for approved count**: Use `['event-registrations-count', id, 'approved']` — distinct from registrations page's `['event-registrations', id]` to avoid cache collision.
- **`use(params)` pattern**: Already used throughout codebase. Next.js 16 + React 19 stable. No changes needed for new components — `EmergencyBlastSheet` receives `eventId` as a prop, not via params.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/app/app/events/[id]/blast/page.tsx` | Undangan tab — add emergency blast section + sheet |
| `src/app/app/events/[id]/registrations/_client.tsx` | Add promote + cancel + multi-status actions column |
| `src/mocks/handlers/blast.ts` | Add `POST /api/events/:id/blast/emergency` handler |
| `src/mocks/handlers/registrations.ts` | Export `registrationsStore`; cancel handler at line 168 |
| `src/types/api.ts` | Add `EmergencyBlastBody`, `EmergencyBlastResponse` |
| `src/components/undangan/BlastConfigSheet.tsx` | Reference Sheet pattern |
| `src/components/ui/alert-dialog.tsx` | Destructive confirm dialog |

### Technical Decisions

- **Emergency blast target**: Only `approved` registrations (not `waitlisted`, not `attended`) — per Epic 5.4.
- **Admin cancel endpoint**: Reuses `POST /api/registrations/:id/cancel` (same as self-cancel, no token body required — MSW handler confirmed at line 168).
- **Promote endpoint**: Reuses existing `PUT /api/registrations/:id/status` with `{ status: 'approved' }` — no new endpoint.
- **Waitlist position**: Client-side `useMemo` map from `createdAt` sort. After a promote, the map auto-recomputes since `allRows` changes via optimistic update.
- **After promote, quotaFull auto-adjusts**: `approvedCount` is derived from `allRows` with a filter — it will increase optimistically after a promote, causing the "Setujui"→"Waitlist" button label to switch automatically. No extra handling needed.
- **cancelTarget type**: `{ id: string; name: string } | null` — stores both ID (for mutation) and name (for AlertDialog description). Set via `setCancelTarget({ id: reg.id, name: reg.contactName })`.

---

## Implementation Plan

### Tasks

- [x] **T1 — Export `registrationsStore`** (`src/mocks/handlers/registrations.ts`)
  - File: `src/mocks/handlers/registrations.ts`
  - Action: Change `let registrationsStore` → `export let registrationsStore`
  - Notes: This is a prerequisite for T2. No other changes to this file.

- [x] **T2 — Types** (`src/types/api.ts`)
  - File: `src/types/api.ts`
  - Action: Add after `BlastPrefilledAudience`:
    ```ts
    export interface EmergencyBlastBody {
      message: string
      channel: 'whatsapp' | 'email'
    }

    export interface EmergencyBlastResponse {
      jobId: string
      recipientCount: number
      status: 'queued'
    }
    ```

- [x] **T3 — MSW Emergency Blast Handler** (`src/mocks/handlers/blast.ts`)
  - File: `src/mocks/handlers/blast.ts`
  - Action: Add import at top: `import { registrationsStore } from './registrations'`
  - Action: Add handler to `blastHandlers` array:
    ```ts
    http.post('/api/events/:id/blast/emergency', async ({ request, params }) => {
      await delay(400)
      const body = await request.json() as EmergencyBlastBody
      if (!body.message?.trim()) {
        return HttpResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'message required', details: [] } },
          { status: 400 }
        )
      }
      const recipientCount = registrationsStore.filter(
        (r) => r.eventId === params.id && r.status === 'approved'
      ).length
      return HttpResponse.json(
        { jobId: 'emergency-job-1', recipientCount, status: 'queued' },
        { status: 202 }
      )
    }),
    ```
  - Notes: Do NOT push to `blastJobsStore` — emergency jobs are not tracked in the invitation blast history.

- [x] **T4 — EmergencyBlastSheet component** (new file: `src/components/undangan/EmergencyBlastSheet.tsx`)
  - File: `src/components/undangan/EmergencyBlastSheet.tsx` (create new)
  - Action: Create `'use client'` component with:
    ```tsx
    interface EmergencyBlastSheetProps {
      open: boolean
      onOpenChange: (v: boolean) => void
      eventId: string
      approvedCount: number
    }
    ```
  - Internal state: `message: string`, `channel: 'whatsapp' | 'email'`, `confirmed: boolean`
  - Two-step UI:
    - **Step 1 (compose)**: Textarea for `message` (max 500 chars) with live char counter (`{message.length} / 500`), native `<select>` for `channel`, warning banner `"⚠️ Pesan ini akan dikirim ke semua peserta yang disetujui."`, "Preview & Kirim" button → sets `confirmed = true`
    - **Step 2 (confirm)**: Read-only display of the composed message in a bordered box ("Pratinjau pesan:"), shows `"Kirim ke {approvedCount} peserta yang disetujui?"`, two buttons: "Kembali" (→ `confirmed = false`) and "Ya, Kirim Sekarang" (→ trigger mutation)
  - `useMutation` calling `POST /api/events/${eventId}/blast/emergency`
  - `onSuccess`: `toast.success('Pemberitahuan darurat dikirim ke ${data.recipientCount} peserta')`, reset state, `onOpenChange(false)`
  - `onError`: `toast.error('Gagal mengirim pemberitahuan darurat')`
  - Validation: "Kembali" button in step 2 resets to step 1. Do NOT call `setActiveJobId` anywhere.

- [x] **T5 — Undangan tab: Emergency Blast entry point** (`src/app/app/events/[id]/blast/page.tsx`)
  - File: `src/app/app/events/[id]/blast/page.tsx`
  - Action: Add state: `const [showEmergencySheet, setShowEmergencySheet] = useState(false)`
  - Action: Add approved count query (after existing queries):
    ```ts
    const { data: approvedCountData } = useQuery<{ pagination: { total: number } }>({
      queryKey: ['event-registrations-count', id, 'approved'],
      queryFn: () =>
        fetch(`/api/registrations?eventId=${id}&status=approved&pageSize=1`).then((r) => r.json()),
      enabled: !!id,
      staleTime: 30_000,
    })
    const approvedCount = approvedCountData?.pagination.total ?? 0
    ```
  - Action: Add emergency blast section in JSX, **below** the `BlastHistoryList` card and separated by a visual divider:
    ```tsx
    <div className="border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Pemberitahuan Darurat</p>
          <p className="text-xs text-muted-foreground">
            Kirim pesan mendesak ke {approvedCount} peserta yang disetujui
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowEmergencySheet(true)}
        >
          Kirim Pemberitahuan Darurat
        </Button>
      </div>
    </div>
    ```
  - Action: Render sheet at bottom of component:
    ```tsx
    <EmergencyBlastSheet
      open={showEmergencySheet}
      onOpenChange={setShowEmergencySheet}
      eventId={id}
      approvedCount={approvedCount}
    />
    ```
  - Notes: Button is placed below history, NOT next to "Kirim Undangan". Emergency blast does NOT set `activeJobId`.

- [x] **T6 — Registrations: waitlistRanks memo** (`src/app/app/events/[id]/registrations/_client.tsx`)
  - File: `src/app/app/events/[id]/registrations/_client.tsx`
  - Action: Add after `const allRows = rawData?.data ?? []`:
    ```ts
    const waitlistRanks = useMemo<Record<string, number>>(() => {
      const sorted = allRows
        .filter((r) => r.status === 'waitlisted')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      return Object.fromEntries(sorted.map((r, i) => [r.id, i + 1]))
    }, [allRows])
    ```
  - Notes: O(1) lookup in column render. Add `waitlistRanks` to column `useMemo` deps array.

- [x] **T7 — Registrations: promoteMutation** (`src/app/app/events/[id]/registrations/_client.tsx`)
  - File: `src/app/app/events/[id]/registrations/_client.tsx`
  - Action: Add after `waitlistMutation`:
    ```ts
    const promoteMutation = useMutation({
      mutationFn: (regId: string) => patchRegistrationStatus(regId, 'approved'),
      onMutate: async (regId) => {
        await queryClient.cancelQueries({ queryKey: ['event-registrations', id] })
        const previous = queryClient.getQueryData(['event-registrations', id])
        queryClient.setQueryData(
          ['event-registrations', id],
          (old: { data: RegistrationWithContact[] } | undefined) => ({
            ...old,
            data: (old?.data ?? []).map((r) =>
              r.id === regId ? { ...r, status: 'approved' as const } : r
            ),
          })
        )
        return { previous }
      },
      onError: (_err, _regId, ctx) => {
        queryClient.setQueryData(['event-registrations', id], ctx?.previous)
        toast.error('Gagal mempromosikan peserta')
      },
      onSuccess: () => toast.success('Peserta dipromosikan dari waitlist', { duration: 4000 }),
    })
    ```

- [x] **T8 — Registrations: cancelTarget state + cancelMutation** (`src/app/app/events/[id]/registrations/_client.tsx`)
  - File: `src/app/app/events/[id]/registrations/_client.tsx`
  - Action: Add state: `const [cancelTarget, setCancelTarget] = useState<{ id: string; name: string } | null>(null)`
  - Action: Add mutation after `promoteMutation`:
    ```ts
    const cancelMutation = useMutation({
      mutationFn: async (regId: string) => {
        const res = await fetch(`/api/registrations/${regId}/cancel`, { method: 'POST' })
        if (!res.ok) throw new Error('Gagal membatalkan pendaftaran')
        return res.json()
      },
      onMutate: async (regId) => {
        await queryClient.cancelQueries({ queryKey: ['event-registrations', id] })
        const previous = queryClient.getQueryData(['event-registrations', id])
        queryClient.setQueryData(
          ['event-registrations', id],
          (old: { data: RegistrationWithContact[] } | undefined) => ({
            ...old,
            data: (old?.data ?? []).map((r) =>
              r.id === regId ? { ...r, status: 'cancelled' as const } : r
            ),
          })
        )
        return { previous }
      },
      onError: (_err, _regId, ctx) => {
        queryClient.setQueryData(['event-registrations', id], ctx?.previous)
        toast.error('Gagal membatalkan pendaftaran')
      },
      onSuccess: () => {
        toast.success('Pendaftaran dibatalkan')
        setCancelTarget(null)
      },
    })
    ```

- [x] **T9 — Registrations: actions column multi-status + waitlist position** (`src/app/app/events/[id]/registrations/_client.tsx`)
  - File: `src/app/app/events/[id]/registrations/_client.tsx`
  - Action: Replace the `actions` column cell render with:
    ```tsx
    cell: ({ row }) => {
      const reg = row.original
      // pending
      if (reg.status === 'pending') {
        return (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm" className="h-7 text-xs"
              variant={quotaFull ? 'outline' : 'default'}
              onClick={() => quotaFull ? waitlistMutation.mutate(reg.id) : approveMutation.mutate(reg.id)}
              disabled={approveMutation.isPending || waitlistMutation.isPending}
            >
              {quotaFull ? 'Waitlist' : 'Setujui'}
            </Button>
            <Button
              size="sm" variant="outline" className="h-7 text-xs text-destructive"
              onClick={() => rejectMutation.mutate(reg.id)}
              disabled={rejectMutation.isPending}
            >
              Tolak
            </Button>
          </div>
        )
      }
      // waitlisted
      if (reg.status === 'waitlisted') {
        return (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm" className="h-7 text-xs"
              onClick={() => promoteMutation.mutate(reg.id)}
              disabled={promoteMutation.isPending}
            >
              Promosikan
            </Button>
            <Button
              size="sm" variant="outline" className="h-7 text-xs text-destructive"
              onClick={() => setCancelTarget({ id: reg.id, name: reg.contactName })}
            >
              Batalkan
            </Button>
          </div>
        )
      }
      // approved
      if (reg.status === 'approved') {
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm" variant="outline" className="h-7 text-xs text-destructive"
              onClick={() => setCancelTarget({ id: reg.id, name: reg.contactName })}
            >
              Batalkan
            </Button>
          </div>
        )
      }
      return null
    },
    ```
  - Action: Update `status` column cell to show waitlist rank below badge:
    ```tsx
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5">
        <Badge className={`${STATUS_BADGE_CLASS[row.original.status]} text-xs`}>
          {STATUS_LABEL[row.original.status]}
        </Badge>
        {row.original.status === 'waitlisted' && waitlistRanks[row.original.id] && (
          <span className="text-xs text-muted-foreground">#{waitlistRanks[row.original.id]}</span>
        )}
      </div>
    ),
    ```
  - Action: Add `waitlistRanks` to the `useMemo` dependency array for columns: `], [quotaFull, waitlistRanks])`

- [x] **T10 — Registrations: AlertDialog** (`src/app/app/events/[id]/registrations/_client.tsx`)
  - File: `src/app/app/events/[id]/registrations/_client.tsx`
  - Action: Add `AlertDialog` imports: `import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'`
  - Action: Add AlertDialog at the bottom of the returned JSX (sibling to `ContactSheet`):
    ```tsx
    <AlertDialog open={cancelTarget !== null} onOpenChange={(open) => { if (!open) setCancelTarget(null) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Batalkan Pendaftaran?</AlertDialogTitle>
          <AlertDialogDescription>
            Anda akan membatalkan pendaftaran <strong>{cancelTarget?.name}</strong>.
            Slot akan dibebaskan dan diberikan ke peserta waitlist berikutnya.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
            disabled={cancelMutation.isPending}
          >
            Ya, Batalkan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    ```

### Acceptance Criteria

- [x] **AC1**: Given I am on the Undangan tab, when the page loads, then a "Pemberitahuan Darurat" section appears below the blast history with the count of approved registrants.

- [x] **AC2**: Given I click "Kirim Pemberitahuan Darurat", when the sheet opens, then I see step 1 (compose): a textarea, channel selector, char counter, and warning banner.

- [x] **AC3**: Given I type a message and click "Preview & Kirim", when step 2 renders, then I see the message text in a preview box, the recipient count, and "Kembali" + "Ya, Kirim Sekarang" buttons.

- [x] **AC4**: Given I click "Ya, Kirim Sekarang" with a valid message, when the mutation succeeds, then a toast "Pemberitahuan darurat dikirim ke N peserta" appears, the sheet closes, and `activeJobId` is NOT updated.

- [x] **AC5**: Given the message textarea is empty, when I click "Preview & Kirim", then step 2 does not show and the textarea shows a validation error.

- [x] **AC6**: Given I click "Kembali" on step 2, when it renders step 1 again, then my previously typed message is preserved.

- [x] **AC7**: Given multiple waitlisted registrations, when the registrations table renders, then each waitlisted row shows its FIFO position (#1, #2…) below the "Waitlist" badge in the status column, sorted by `createdAt`.

- [x] **AC8**: Given a `waitlisted` registration, when I click "Promosikan", then the row status changes to `approved` optimistically and a success toast appears.

- [x] **AC9**: Given a `waitlisted` or `approved` registration, when I click "Batalkan", then an AlertDialog opens showing the participant's name.

- [x] **AC10**: Given the AlertDialog is open, when I click "Ya, Batalkan", then `POST /api/registrations/:id/cancel` is called, the row status changes to `cancelled` optimistically, and a success toast appears.

- [x] **AC11**: Given the AlertDialog is open, when I click "Batal", then the dialog closes and no mutation is triggered.

- [x] **AC12**: Given the quota is full and I promote a waitlisted participant, when the optimistic update fires, then `quotaFull` re-evaluates (approved count increases) and pending row buttons auto-adjust to "Waitlist".

---

## Additional Context

### Dependencies

- `src/components/ui/alert-dialog.tsx` — verify exists. If missing: `npx shadcn@latest add alert-dialog`
- `registrationsStore` must be exported from `registrations.ts` before `blast.ts` can import it (T1 is a hard prerequisite for T3)
- No new API endpoints beyond `POST /api/events/:id/blast/emergency`

### Testing Strategy

No new test files required for Phase 1. Existing `handlers.test.ts` covers the MSW layer. Manual verification:
1. Open Undangan tab on an active event → verify emergency section visible with correct approved count
2. Send emergency blast → verify toast, no polling starts, history unchanged
3. Filter registrations to `waitlisted` → verify position numbers shown
4. Promote from waitlist → verify optimistic update + quotaFull re-evaluation
5. Cancel an approved/waitlisted registration → verify AlertDialog shows name, cancel works

### Notes

- **CRITICAL**: Emergency blast handler must NOT push to `blastJobsStore`. If it does, the polling query for the emergency job will return 404 continuously.
- **CRITICAL**: `EmergencyBlastSheet` must NOT call `setActiveJobId`. This state in `blast/page.tsx` is exclusively for invitation blast polling.
- `cancelTarget` must be `{ id, name }` not just `string` — the AlertDialog displays the participant name for confirmation.
- `waitlistRanks` must be in a `useMemo` outside columns definition to avoid O(n²) recompute inside the cell renderer.
- After Phase 1 ships, Phase 2 will add: auto-promotion on cancel (BE), `type: 'update'` templates for emergency blast, suppression enforcement, real delivery.
