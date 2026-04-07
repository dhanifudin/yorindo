# Story 3.13: Inline Blast Modal — Contact-Page Blast Composer

Status: review

## Story

As an admin,
I want a blast form to appear as a modal directly on the contacts page when I click Blast,
so that I can configure and send an event blast without leaving the contacts workspace.

## Acceptance Criteria

1. Clicking "Blast Segmen · N kontak →" or "Blast N kontak →" in `ActionToolbar` opens a shadcn `Dialog` titled "Kirim Blast" — the app does NOT navigate to `/app/blasts/new`
2. The modal contains: Event selector (required), Channel RadioGroup (WhatsApp / Email, required), Message type Tabs ("Template" / "Pesan Kustom"), recipient count badge (read-only), "Kirim Blast" primary Button (disabled until event + channel + message filled), "Batal" ghost Button
3. Template tab shows a `Select` populated from `GET /api/templates` filtered client-side by selected channel
4. Custom message tab shows a `Textarea` (min 10 chars) with helper text showing `{{name}}` and `{{event_title}}` variable hints
5. Event selector is populated from `GET /api/events?status=published&pageSize=50`; shows skeleton/disabled while loading
6. Submitting the form calls `POST /api/blast` with `{ eventId, channel, templateId?, customMessage?, recipientCount, selectedIds? }`; on 202 response: Sonner toast "Blast dijadwalkan untuk N kontak", modal closes, ActionToolbar clears selection
7. Switching between Template and Custom tabs preserves each tab's content (controlled state — not remounted)
8. Pressing Escape or clicking outside the Dialog closes the modal without submitting; form state resets on close
9. While `POST /api/blast` is pending, the "Kirim Blast" button shows a `Loader2` spinner and is disabled

## Tasks / Subtasks

- [x] Install shadcn `RadioGroup` component (AC: 2)
  - [x] `npx shadcn@latest add radio-group` → `src/components/ui/radio-group.tsx`
  - [x] Verify: `import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'` resolves

- [x] Add `BlastModalFormValues` type to `src/types/api.ts` (AC: 6)
  ```typescript
  export interface BlastModalPayload {
    eventId: string
    channel: 'whatsapp' | 'email'
    templateId?: string
    customMessage?: string
    recipientCount: number
    selectedIds?: string[]
  }
  ```

- [x] Create `src/components/features/contacts/BlastModal.tsx` (AC: 1–9)
  - [x] Props interface:
    ```tsx
    interface BlastModalProps {
      open: boolean
      onClose: () => void
      recipientCount: number
      mode: 'segment' | 'selection'
      selectedIds: string[]
    }
    ```
  - [x] Zod schema + RHF setup (see Dev Notes)
  - [x] `useQuery` for events (`GET /api/events?status=published&pageSize=50`)
  - [x] `useQuery` for templates (`GET /api/templates`)
  - [x] `useMutation` for `POST /api/blast`
  - [x] Channel RadioGroup → filters templates list client-side on change
  - [x] Message type Tabs (controlled `activeTab` state — NOT `defaultValue`)
  - [x] Reset form on modal close (`reset()` in `onOpenChange` handler)
  - [x] Disable submit until `isValid` and `!isPending`
  - [x] Loader2 spinner in submit button while `isPending`

- [x] Modify `src/components/features/contacts/ActionToolbar.tsx` (AC: 1)
  - [x] Add `onOpenBlastModal: () => void` prop
  - [x] Remove `const router = useRouter()` import and usage (no more navigation)
  - [x] Remove `buildBlastUrl` function (no longer needed)
  - [x] Replace `handleBlast` → `onClick={onOpenBlastModal}` on the blast Button
  - [x] Update props interface to remove `searchParams` (no longer needed for URL building)
    > ⚠️ Check if `searchParams` is used anywhere else in ActionToolbar before removing. If only used in `buildBlastUrl`, remove it.

- [x] Modify `src/components/features/contacts/ContactsCommandCenter.tsx` (AC: 1, 6)
  - [x] Add `blastModalOpen` state: `const [blastModalOpen, setBlastModalOpen] = useState(false)`
  - [x] Pass `onOpenBlastModal={() => setBlastModalOpen(true)}` to `ActionToolbar`
  - [x] Render `<BlastModal>` at the end of the component:
    ```tsx
    <BlastModal
      open={blastModalOpen}
      onClose={() => setBlastModalOpen(false)}
      recipientCount={selectedIds.length > 0 ? selectedIds.length : (contacts?.pagination.total ?? 0)}
      mode={selectedIds.length > 0 ? 'selection' : 'segment'}
      selectedIds={selectedIds}
    />
    ```
  - [x] After successful blast (call `handleClearSelection` from `BlastModal.onClose` post-success):
    Pass `onBlastSuccess={handleClearSelection}` prop to `BlastModal`

## Dev Notes

### Critical: Radio Group Not Installed

`RadioGroup` is NOT in `src/components/ui/`. Run before implementing:

```bash
npx shadcn@latest add radio-group
```

Verify import works: `import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'`

### Installed Components Confirmed

- `dialog.tsx` ✅ — `import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'`
- `select.tsx` ✅ — `import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'`
- `tabs.tsx` ✅ — `import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'`
- `badge.tsx` ✅
- `button.tsx` ✅
- `textarea.tsx` ✅

### Zod Schema + React Hook Form

```typescript
import { z } from 'zod'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const blastSchema = z.object({
  eventId: z.string().min(1, 'Pilih event'),
  channel: z.enum(['whatsapp', 'email'], { required_error: 'Pilih channel' }),
  messageType: z.enum(['template', 'custom']),
  templateId: z.string().optional(),
  customMessage: z.string().optional(),
}).refine(
  (data) => {
    if (data.messageType === 'template') return !!data.templateId
    if (data.messageType === 'custom') return (data.customMessage?.trim().length ?? 0) >= 10
    return false
  },
  {
    message: 'Isi pesan wajib diisi (minimal 10 karakter untuk pesan kustom)',
    path: ['templateId'], // attach to templateId so error surfaces near form
  }
)

type BlastFormValues = z.infer<typeof blastSchema>

const form = useForm<BlastFormValues>({
  resolver: zodResolver(blastSchema),
  defaultValues: { eventId: '', channel: 'whatsapp', messageType: 'template', templateId: '', customMessage: '' },
})
```

### Existing POST /api/blast MSW Handler

**DO NOT create a new MSW handler.** The existing `POST /api/blast` handler in `src/mocks/handlers/blast.ts` already handles this:

```typescript
// Existing handler (blast.ts)
http.post('/api/blast', async ({ request }) => {
  const body = await request.json() as {
    eventId: string
    channel: 'whatsapp' | 'email'
    templateId: string
    scheduledAt?: string
  }
  // returns { jobId, status } with 202
})
```

Call it from `BlastModal` with:
```typescript
const res = await fetch('/api/blast', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    eventId: values.eventId,
    channel: values.channel,
    templateId: values.templateId ?? 'custom',
    recipientCount,
    selectedIds: mode === 'selection' ? selectedIds : undefined,
  }),
})
```

### Events Query

```typescript
const { data: eventsData, isLoading: eventsLoading } = useQuery({
  queryKey: ['events', 'published'],
  queryFn: async () => {
    const res = await fetch('/api/events?status=published&pageSize=50')
    return res.json() as Promise<{ data: Array<{ id: string; name: string; status: string }> }>
  },
  staleTime: 60_000,
})
```

### Templates Query + Client-Side Channel Filter

```typescript
const { data: allTemplates } = useQuery({
  queryKey: ['templates'],
  queryFn: async () => {
    const res = await fetch('/api/templates')
    return res.json() as Promise<Array<{ id: string; name: string; channel: 'email' | 'whatsapp'; type: string }>>
  },
  staleTime: 60_000,
})

// Derive filtered list from watched channel value
const channel = form.watch('channel')
const filteredTemplates = (allTemplates ?? []).filter((t) => t.channel === channel)

// Reset templateId when channel changes (avoids mismatch)
useEffect(() => {
  form.setValue('templateId', '')
}, [channel, form])
```

### Tab State: Use Controlled Value

Use controlled Tabs (not `defaultValue`) so switching tabs preserves content:

```tsx
const [activeTab, setActiveTab] = useState<'template' | 'custom'>('template')

// Sync activeTab → form messageType
useEffect(() => {
  form.setValue('messageType', activeTab)
}, [activeTab, form])

<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'template' | 'custom')}>
```

### Reset on Close

```typescript
const handleClose = useCallback(() => {
  form.reset()
  setActiveTab('template')
  onClose()
}, [form, onClose])

// Dialog onOpenChange fires on Escape and outside click:
<Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
```

### ActionToolbar: Prop Changes

**Remove** from `ActionToolbarProps`:
- `searchParams: URLSearchParams`

**Add** to `ActionToolbarProps`:
- `onOpenBlastModal: () => void`

**Remove** from component:
- `const router = useRouter()` (and `useRouter` import if not used elsewhere)
- `buildBlastUrl` function
- `const blastUrl = ...` and `const blastLabel = ...` variables (simplify to inline)

**Update blast button:**
```tsx
<Button size="sm" onClick={onOpenBlastModal}>
  {selectedIds.length > 0 ? `Blast ${selectedIds.length} kontak →` : `Blast Segmen · ${total} kontak →`}
</Button>
```

### ContactsCommandCenter: Minimal Changes

Only 3 additions needed:
1. `const [blastModalOpen, setBlastModalOpen] = useState(false)` 
2. Pass `onOpenBlastModal={() => setBlastModalOpen(true)}` to `ActionToolbar`
3. Remove `searchParams` from `ActionToolbar` props (no longer needed)
4. Render `<BlastModal>` after `<ActionToolbar>`

Pass `onBlastSuccess` to clear selection after blast succeeds:
```tsx
<BlastModal
  open={blastModalOpen}
  onClose={() => setBlastModalOpen(false)}
  onBlastSuccess={handleClearSelection}
  recipientCount={selectedIds.length > 0 ? selectedIds.length : (contacts?.pagination.total ?? 0)}
  mode={selectedIds.length > 0 ? 'selection' : 'segment'}
  selectedIds={selectedIds}
/>
```

In `BlastModal`, call `onBlastSuccess()` inside `onSuccess` of the mutation before closing:
```typescript
onSuccess: () => {
  toast.success(`Blast dijadwalkan untuk ${recipientCount} kontak`)
  onBlastSuccess?.()
  handleClose()
}
```

### BlastModal Full Structure Sketch

```tsx
<Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Kirim Blast</DialogTitle>
    </DialogHeader>

    <div className="space-y-4 py-2">
      {/* Recipient badge */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Penerima:</span>
        <Badge variant="secondary">{recipientCount} kontak</Badge>
        {mode === 'selection' && (
          <span className="text-xs text-muted-foreground">(dipilih manual)</span>
        )}
      </div>

      {/* Event selector */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Event *</label>
        <Controller name="eventId" control={form.control} render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange} disabled={eventsLoading}>
            <SelectTrigger>
              <SelectValue placeholder={eventsLoading ? 'Memuat...' : 'Pilih event'} />
            </SelectTrigger>
            <SelectContent>
              {eventsData?.data.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )} />
      </div>

      {/* Channel radio */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Channel *</label>
        <Controller name="channel" control={form.control} render={({ field }) => (
          <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-4">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="whatsapp" id="ch-wa" />
              <label htmlFor="ch-wa" className="text-sm cursor-pointer">WhatsApp</label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="email" id="ch-email" />
              <label htmlFor="ch-email" className="text-sm cursor-pointer">Email</label>
            </div>
          </RadioGroup>
        )} />
      </div>

      {/* Message type tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'template' | 'custom')}>
        <TabsList className="w-full">
          <TabsTrigger value="template" className="flex-1">Template</TabsTrigger>
          <TabsTrigger value="custom" className="flex-1">Pesan Kustom</TabsTrigger>
        </TabsList>
        <TabsContent value="template" className="mt-3">
          <Controller name="templateId" control={form.control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}
              disabled={filteredTemplates.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={
                  filteredTemplates.length === 0
                    ? 'Tidak ada template untuk channel ini'
                    : 'Pilih template'
                } />
              </SelectTrigger>
              <SelectContent>
                {filteredTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )} />
        </TabsContent>
        <TabsContent value="custom" className="mt-3 space-y-1.5">
          <Controller name="customMessage" control={form.control} render={({ field }) => (
            <Textarea {...field} placeholder="Tulis pesan..." rows={4} />
          )} />
          <p className="text-xs text-muted-foreground">
            Variabel tersedia: <code>{'{{name}}'}</code> <code>{'{{event_title}}'}</code>
          </p>
        </TabsContent>
      </Tabs>
    </div>

    <DialogFooter>
      <Button variant="ghost" onClick={handleClose} disabled={isPending}>Batal</Button>
      <Button onClick={form.handleSubmit(onSubmit)} disabled={!form.formState.isValid || isPending}>
        {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mengirim...</> : 'Kirim Blast'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Files to Create / Modify

```
INSTALL: radio-group (via shadcn CLI)
CREATE:  src/components/features/contacts/BlastModal.tsx
MODIFY:  src/components/features/contacts/ActionToolbar.tsx  (replace router.push with onOpenBlastModal prop)
MODIFY:  src/components/features/contacts/ContactsCommandCenter.tsx  (add blastModalOpen state + BlastModal render)
MODIFY:  src/types/api.ts  (add BlastModalPayload interface)
```

**No MSW handler changes needed** — `POST /api/blast` already exists in `blast.ts`.

### References

- [Source: epics/epic-3-contact-database-participant-intelligence.md#Story-3.13]
- [Source: sprint-change-proposal-2026-03-31.md — change proposals CP1, CP3]
- [Source: src/components/features/contacts/ActionToolbar.tsx — existing blast button + props to update]
- [Source: src/components/features/contacts/ContactsCommandCenter.tsx — state management pattern]
- [Source: src/mocks/handlers/blast.ts — existing POST /api/blast handler (reuse, do not duplicate)]
- [Source: src/mocks/handlers/templates.ts — GET /api/templates shape: { id, name, channel, type, body }]
- [Source: src/mocks/handlers/events.ts:139 — GET /api/events?status=published returns { data: Event[], pagination }]
- [Source: _bmad-output/implementation-artifacts/4-9-event-pipeline-hub-undangan-tab-blast.md — BlastConfigSheet pattern reference (uses Sheet; this story uses Dialog)]
- [Source: _bmad-output/implementation-artifacts/3-12-contact-event-history-tab-in-sheet.md — Tabs controlled state pattern]
- [Source: ux-design-specification.md#ActionToolbar — updated 2026-03-31: inline modal, not navigation]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Replaced embedded blast Dialog in `ActionToolbar.tsx` with `onOpenBlastModal` prop; removed all inline blast state/handlers
- `BlastModal.tsx` created with Zod/RHF, controlled Tabs, event+template queries, `POST /api/blast` mutation
- `z.enum` `required_error` option removed (not valid in Zod v4); channel validation relies on default enum error
- `bulkFlagMutation` removed from `ActionToolbar` (was never wired to any UI element)

### File List

- `src/components/features/contacts/BlastModal.tsx` (created)
- `src/components/features/contacts/ActionToolbar.tsx` (modified — removed embedded Dialog, added `onOpenBlastModal` prop)
- `src/components/features/contacts/ContactsCommandCenter.tsx` (modified — added `blastModalOpen` state, wired `<BlastModal>`)
- `src/types/api.ts` (modified — added `BlastModalPayload` interface)
