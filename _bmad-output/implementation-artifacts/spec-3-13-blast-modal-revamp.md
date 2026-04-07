---
title: 'Blast Modal UX Revamp — Event Cards + Template Preview'
type: 'feature'
created: '2026-04-07'
status: 'done'
baseline_commit: 'ee04327fbad70b16e9cb4449ad773aad32becdc0'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The blast dialog's event `<Select>` dropdown is hard to scan when there are multiple upcoming events, and selecting a template gives no feedback on what the message will look like — admins have to guess the content before committing to send.

**Approach:** Replace the event dropdown with a scrollable list of radio-style cards (name + date visible at a glance). Add a read-only message preview panel below the template selector that renders the selected template's `body` field — all changes contained within `BlastModal.tsx`.

## Boundaries & Constraints

**Always:**
- Keep all existing form logic, Zod schema, RHF wiring, and API call (`POST /api/events/:id/blast`) unchanged
- Event cards must reflect the selected state visually (border/ring highlight on the chosen card)
- Template `body` field from `GET /api/templates` response shape: `{ id, name, channel, type, body, subject? }`
- Dialog must remain scrollable (`max-h-[90vh] overflow-y-auto`) — event card list must not overflow the dialog without its own scroll container
- Language: Bahasa Indonesia labels (already in place)

**Ask First:**
- If the real `/api/templates` BE route does not return `body`, confirm whether to use the MSW mock shape or add `body` to the real route

**Never:**
- Do not change `BlastModalProps`, the Zod schema, the mutation, or any parent component
- Do not add pagination or search to the event list — `pageSize=50` is sufficient
- Do not convert the template tab into anything other than a select + preview

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Events loading | `eventsLoading = true` | Skeleton placeholder cards (3 rows, muted pulse) | — |
| No published events | `sortedEvents = []` | Empty state message: "Tidak ada event yang dipublikasikan" inside the card list area | — |
| Event selected | User clicks a card | Card gets ring highlight; `form.setValue('eventId', id)` fires | — |
| Template selected | User picks template from Select | Preview panel below shows template `body` text; variables like `{{name}}` rendered as-is (plain text) | — |
| No template selected | `templateId = ''` | Preview panel hidden (not shown) | — |
| Channel changed | User switches WhatsApp ↔ Email | `templateId` reset to `''`; preview panel hides; filtered template list updates | — |

</frozen-after-approval>

## Code Map

- `yorindo-app/src/components/features/contacts/BlastModal.tsx` — sole file to modify; contains event query, template query, RHF form, Dialog render
- `yorindo-app/src/mocks/handlers/templates.ts` — template `body` field already present in MSW mock (shape confirmed)
- `yorindo-app/src/components/ui/` — `card.tsx`, `badge.tsx`, `skeleton.tsx` available; no new shadcn installs needed

## Tasks & Acceptance

**Execution:**

- [x] `yorindo-app/src/components/features/contacts/BlastModal.tsx` — Replace event `<Select>` with scrollable card list
  - Remove `Select`, `SelectTrigger`, `SelectContent`, `SelectItem` imports used for the event section (keep for template)
  - Add `import { Card } from '@/components/ui/card'` and `import { Skeleton } from '@/components/ui/skeleton'`
  - Render a `div` with `max-h-48 overflow-y-auto space-y-2 rounded-md border p-2` wrapping the card list
  - Loading state: 3× `<Skeleton className="h-14 w-full rounded-md" />`
  - Each event card: `<button type="button" onClick={() => field.onChange(e.id)}` wrapping a `<Card>` with `className` conditionally adding `ring-2 ring-primary` when `field.value === e.id`
  - Card body: event name (`text-sm font-medium`) + formatted date (`text-xs text-muted-foreground`) side by side or stacked

- [x] `yorindo-app/src/components/features/contacts/BlastModal.tsx` — Add template preview panel
  - Derive `selectedTemplate` from `filteredTemplates.find(t => t.id === watchedTemplateId)` — watch `templateId` with `form.watch('templateId')`
  - Below the template `<Select>`, conditionally render (when `selectedTemplate`) a `<div className="mt-2 rounded-md border bg-muted/40 p-3">` containing:
    - Label: `<p className="text-xs font-medium text-muted-foreground mb-1">Preview</p>`
    - Body: `<p className="text-sm whitespace-pre-wrap">{selectedTemplate.body}</p>`

**Acceptance Criteria:**

- Given the dialog is open and events are loading, when the Event section renders, then 3 skeleton cards appear in a bordered scroll area
- Given events are loaded, when the admin views the Event section, then each event appears as a clickable card showing name and date — no dropdown
- Given an event card is clicked, when the form field updates, then that card displays a primary ring border and the others do not
- Given the Template tab is active and a template is selected, when the template `<Select>` changes, then a read-only preview of the template `body` appears below the selector
- Given the channel radio changes, when `templateId` resets to empty, then the preview panel disappears
- Given the custom message tab is active, when the tab content renders, then the template preview section is not visible

## Design Notes

Event card example (selected state):
```tsx
<button
  type="button"
  onClick={() => field.onChange(e.id)}
  className={cn(
    'w-full text-left rounded-md border p-3 transition-all',
    field.value === e.id ? 'ring-2 ring-primary border-primary' : 'hover:bg-muted/50'
  )}
>
  <p className="text-sm font-medium">{e.name}</p>
  <p className="text-xs text-muted-foreground">{formatDate(e.date)}</p>
</button>
```

Use `cn` from `@/lib/utils` (already in project). `formatDate` = `new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })`.

## Suggested Review Order

**Event card list (entry point)**

- Core UX change: scrollable card container replacing the Select dropdown
  [`BlastModal.tsx:233`](../../yorindo-app/src/components/features/contacts/BlastModal.tsx#L233)

- Selected-state ring highlight via `cn()` conditional class
  [`BlastModal.tsx:244`](../../yorindo-app/src/components/features/contacts/BlastModal.tsx#L244)

- Loading skeleton placeholders (3× `h-14 w-full`)
  [`BlastModal.tsx:237`](../../yorindo-app/src/components/features/contacts/BlastModal.tsx#L237)

**Template preview**

- `templateId` watched to derive `selectedTemplate` for live preview
  [`BlastModal.tsx:119`](../../yorindo-app/src/components/features/contacts/BlastModal.tsx#L119)

- Preview panel: subject line (email) + body with `whitespace-pre-wrap`
  [`BlastModal.tsx:330`](../../yorindo-app/src/components/features/contacts/BlastModal.tsx#L330)

**Supporting**

- `formatDate` local-time parse avoids UTC off-by-one on date-only strings
  [`BlastModal.tsx:73`](../../yorindo-app/src/components/features/contacts/BlastModal.tsx#L73)

- `EventItem` / `TemplateItem` types narrowed from inline generics
  [`BlastModal.tsx:55`](../../yorindo-app/src/components/features/contacts/BlastModal.tsx#L55)

## Verification

**Manual checks:**
- Open blast modal → Event section shows card list (not dropdown); loading skeletons visible briefly
- Click different event cards → selected card gets ring highlight, others reset
- Select a template → preview text appears below selector
- Switch channel → template resets, preview disappears
- Switch to "Pesan Kustom" tab → preview not visible
