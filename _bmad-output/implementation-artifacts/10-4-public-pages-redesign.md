# Story 10.4: Public Pages Redesign

**Story ID:** 10.4
**Story Key:** 10-4-public-pages-redesign
**Epic:** Epic 10 — UI Design System & Mobile-Native Redesign
**Phase:** Phase 1 (FE) — UI-only, zero logic/API changes
**Status:** review
**Created:** 2026-03-21

---

## Story

As a participant visiting a public event page or data-rights page,
I want a mobile-first, visually trustworthy interface with consistent design language,
So that I feel confident registering for events and exercising my data rights.

> **Scope:** Redesign public-facing pages — `/register/[eventSlug]` (EventLandingCard) and all `/data-rights/*` pages — using shadcn primitives (Card, Button, Input), Tailwind design tokens (bg-background, text-foreground, border-border), a `PublicShell` wrapper replacing raw gray-background layouts, and a step-indicator component for the multi-step erasure flow. Zero changes to form logic, validation, API calls, or tests.

---

## Acceptance Criteria

**AC1:** Given the `/register/[eventSlug]` page is loaded,
When viewed on any mobile viewport,
Then the page uses a full-width mobile-first layout (no `max-w-md` hard constraint on small screens) with shadcn `<Card>` wrapping the event details.

**AC2:** Given the event landing card is rendered,
When the event is not full,
Then the CTA button uses shadcn `<Button>` with a primary variant and full-width size (≥48px height, large readable text).

**AC3:** Given the event landing card is rendered,
When the event is full,
Then a disabled shadcn `<Button variant="outline">` (or disabled default variant) is shown instead of the active CTA.

**AC4:** Given the loading skeleton for the event landing page,
When data is loading,
Then skeleton divs use `bg-muted` instead of `bg-gray-200`, consistent with the shadcn design system.

**AC5:** Given the `/data-rights` hub page is loaded,
When rendered,
Then each option card uses shadcn `<Card>` with hover state (shadcn `hover:bg-muted/50`), replacing raw `<div className="bg-white border...">` links.

**AC6:** Given the `/data-rights/request` page is loaded,
When the form is rendered,
Then phone and email inputs use shadcn `<Input>`, the submit button uses `<Button className="w-full">`, and error labels use `text-destructive` instead of `text-red-500`.

**AC7:** Given the `/data-rights/erasure` page is loaded with its 3-step flow (warning → form → success),
When each step is rendered,
Then:
- A step indicator shows current step (1: Peringatan, 2: Konfirmasi, 3: Selesai)
- The warning panel uses `<Card className="border-destructive bg-destructive/5">`
- The "Lanjutkan" button uses `<Button variant="destructive">`
- The "Batal" link uses `<Button variant="outline" asChild><Link>`
- The form step inputs use shadcn `<Input>`, submit uses `<Button variant="destructive" className="w-full">`

**AC8:** Given the `/data-rights/learn` page is loaded,
When rendered,
Then content panels use shadcn `<Card>`, the comparison table uses `text-foreground` / `text-muted-foreground` tokens, and no raw `bg-white border border-gray-200` divs remain.

**AC9:** Given the `/data-rights` layout and `/register` layout,
When either subtree is rendered,
Then both use a `PublicShell` component (new) that provides `min-h-screen bg-background` + centered content container with consistent max-width (`max-w-xl mx-auto px-4 py-8`), replacing the raw gray-background divs in both layout files.

**AC10:** Given all changes are applied,
When `npm test` runs,
Then 62/62 tests pass with zero regressions. No form logic, validation (zod), hooks, MSW handlers, or API calls are changed.

---

## Tasks / Subtasks

- [x] **Task 1: Create PublicShell component**
  - [x] Create `src/components/layout/PublicShell.tsx`
  - [x] Provides `min-h-screen bg-background` wrapper + `max-w-xl mx-auto px-4 py-8` inner container
  - [x] Accept optional `className` prop on the inner container for per-page overrides

- [x] **Task 2: Update layout files to use PublicShell**
  - [x] Update `src/app/data-rights/layout.tsx` — replace raw div stack with `<PublicShell>`
  - [x] Update `src/app/register/layout.tsx` — replace `min-h-screen bg-gray-50` with `<PublicShell className="px-0 py-0 max-w-none">` (EventLandingCard manages its own padding)

- [x] **Task 3: Redesign EventLandingCard**
  - [x] Import `Card`, `CardContent`, `CardHeader` from `@/components/ui/card` and `Button` from `@/components/ui/button`
  - [x] Replace outer `<div className="max-w-md mx-auto px-4 py-8">` — remove outer wrapper entirely (PublicShell owns max-width)
  - [x] Replace `<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">` → `<Card className="overflow-hidden shadow-sm">`
  - [x] Replace `<div className="bg-blue-600 px-6 py-8 text-white">` header → `<CardHeader className="bg-primary px-6 py-8 text-primary-foreground rounded-none">`
  - [x] Replace `<div className="px-6 py-6 space-y-4">` body → `<CardContent className="px-6 py-6 space-y-4">`
  - [x] Replace `<div className="px-6 pb-6">` CTA area → `<CardContent className="px-6 pb-6 pt-0">`
  - [x] Replace CTA `<Link>` styled as button → `<Button asChild size="lg" className="w-full text-base"><Link href=...>Daftar Sekarang</Link></Button>`
  - [x] Replace disabled `<button>` → `<Button disabled variant="outline" className="w-full py-4 text-base">Registrasi Penuh — Daftarkan ke Waiting List</Button>`
  - [x] Replace `text-gray-*` colors with `text-foreground`, `text-muted-foreground`

- [x] **Task 4: Update event landing page skeleton**
  - [x] `src/app/register/[eventSlug]/page.tsx` — replace `bg-gray-200` skeleton divs → `bg-muted`
  - [x] Replace error state `text-gray-600` → `text-muted-foreground`

- [x] **Task 5: Redesign data-rights hub page**
  - [x] `src/app/data-rights/page.tsx` — import `Card`, `CardContent` from `@/components/ui/card`
  - [x] Replace `<h1 className="text-2xl font-bold text-gray-900">` → `<h1 className="text-2xl font-bold">`
  - [x] Replace `<p className="text-gray-500">` → `<p className="text-muted-foreground">`
  - [x] Replace each raw Link card → `<Link className="block"><Card className="hover:bg-muted/50 transition-colors cursor-pointer"><CardContent className="flex items-start gap-4 pt-5 pb-5">`
  - [x] Replace inner `<h2 className="font-semibold text-gray-900">` → `<h2 className="font-semibold">`
  - [x] Replace inner `<p className="text-sm text-gray-500">` → `<p className="text-sm text-muted-foreground">`

- [x] **Task 6: Create StepIndicator component**
  - [x] Create `src/components/ui/step-indicator.tsx` (simple, not from shadcn — custom)
  - [x] Props: `steps: string[]`, `currentStep: 0-indexed number`
  - [x] Render: horizontal row of `steps.length` circles connected by lines
  - [x] Active step: filled `bg-primary text-primary-foreground` circle + label below
  - [x] Completed steps: filled `bg-primary/60` circle
  - [x] Upcoming steps: `border border-muted-foreground text-muted-foreground` circle
  - [x] Use `cn()` from `@/lib/utils`

- [x] **Task 7: Redesign data-rights/erasure page**
  - [x] `src/app/data-rights/erasure/page.tsx` — import Card, CardContent, Button, Input, StepIndicator
  - [x] Add step indicator at the top of all three step states: `steps={['Peringatan', 'Konfirmasi', 'Selesai']}` with `currentStep={0|1|2}`
  - [x] **Warning step:** Card with `border-destructive bg-destructive/5` + details Card
  - [x] Replace "Batal" → `<Button variant="outline" asChild><Link>Batal</Link></Button>`
  - [x] Replace "Lanjutkan" → `<Button variant="destructive" className="flex-1">`
  - [x] **Form step:** shadcn `<Input>` fields, `text-destructive` errors, Card for checkbox, `<Button variant="destructive" className="w-full">`
  - [x] **Success step:** `text-muted-foreground`, `text-primary hover:underline` back link
  - [x] Keep ALL zod schema, useForm, handleSubmit, watch, onSubmit, fetch logic unchanged

- [x] **Task 8: Redesign data-rights/request page**
  - [x] `src/app/data-rights/request/page.tsx` — import Button, Input
  - [x] Replace raw `<input>` fields → shadcn `<Input>`
  - [x] Replace `text-red-500` → `text-destructive`
  - [x] Replace submit `<button>` → `<Button type="submit" className="w-full" disabled={isSubmitting}>`
  - [x] Back links → `text-sm text-primary hover:underline`
  - [x] Keep ALL zod schema, useForm, handleSubmit, onSubmit, fetch logic unchanged

- [x] **Task 9: Redesign data-rights/learn page**
  - [x] `src/app/data-rights/learn/page.tsx` — import Card, CardContent
  - [x] Replace heading/paragraph `text-gray-*` → design tokens
  - [x] Replace each info div → `<Card><CardContent className="pt-5">`
  - [x] Replace table colors: `text-muted-foreground`, `text-primary`, `text-destructive`
  - [x] Keep comparison table structure and data unchanged

- [x] **Task 10: Run regression tests**
  - [x] `npm test` — 62/62 pass, zero regressions

---

## Dev Notes

> **Theme constraint (Sprint Change Proposal 2026-03-26f):**
> All components must use the blue brand token palette:
> - Primary: `hsl(217 73% 35%)` via `bg-primary` / `text-primary`
> - Accent/secondary: `hsl(217 60% 96%)` via `bg-secondary` / `bg-accent`
> - Surface: `bg-surface` for section backgrounds
> - Elevated cards: use `.card-elevated` utility class
> - Radius: `0.75rem` base (`rounded-lg`)
> - Font: Inter (`font-sans`)
> Reference: `src/app/globals.css` `:root` tokens (see Sprint Change Proposal 2026-03-26f)

### PublicShell Component

```tsx
// src/components/layout/PublicShell.tsx
import { cn } from '@/lib/utils'

interface PublicShellProps {
  children: React.ReactNode
  className?: string
}

export function PublicShell({ children, className }: PublicShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className={cn('max-w-xl mx-auto px-4 py-8', className)}>
        {children}
      </div>
    </div>
  )
}
```

### Register Layout — No Padding Override

The EventLandingCard manages its own padding/max-width, so the register layout should suppress the inner container's padding:

```tsx
// src/app/register/layout.tsx
import { PublicShell } from '@/components/layout/PublicShell'
export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell className="px-0 py-0 max-w-none">{children}</PublicShell>
}
```

### EventLandingCard After Redesign

```tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { Event } from '@/types/api'

export function EventLandingCard({ event }: EventLandingCardProps) {
  // ... same date formatting, same isFull logic ...
  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="bg-primary px-6 py-8 text-primary-foreground rounded-none">
          <p className="text-primary-foreground/70 text-sm font-medium uppercase tracking-wide mb-2">Event</p>
          <h1 className="text-2xl font-bold leading-tight">{event.name}</h1>
        </CardHeader>
        <CardContent className="px-6 py-6 space-y-4">
          {/* date, description, capacity rows */}
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Tanggal & Waktu</p>
            <p className="font-medium">{formattedDate}</p>
          </div>
          {/* ... */}
        </CardContent>
        <CardContent className="px-6 pb-6 pt-0">
          {isFull ? (
            <Button disabled variant="outline" className="w-full py-4 text-base">
              Registrasi Penuh — Daftarkan ke Waiting List
            </Button>
          ) : (
            <Button asChild size="lg" className="w-full text-base">
              <Link href={`/register/${event.slug}/form`}>Daftar Sekarang</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

### StepIndicator Component

```tsx
// src/components/ui/step-indicator.tsx
import { cn } from '@/lib/utils'

interface StepIndicatorProps {
  steps: string[]
  currentStep: number  // 0-indexed
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      {steps.map((label, i) => (
        <div key={i} className="flex flex-col items-center flex-1">
          <div className="flex items-center w-full">
            {/* connector line before */}
            {i > 0 && (
              <div className={cn('flex-1 h-px', i <= currentStep ? 'bg-primary' : 'bg-border')} />
            )}
            {/* circle */}
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0',
              i < currentStep && 'bg-primary/60 text-primary-foreground',
              i === currentStep && 'bg-primary text-primary-foreground',
              i > currentStep && 'border border-muted-foreground text-muted-foreground',
            )}>
              {i < currentStep ? '✓' : i + 1}
            </div>
            {/* connector line after */}
            {i < steps.length - 1 && (
              <div className={cn('flex-1 h-px', i < currentStep ? 'bg-primary' : 'bg-border')} />
            )}
          </div>
          <span className={cn(
            'text-[10px] mt-1 text-center leading-tight',
            i === currentStep ? 'text-foreground font-medium' : 'text-muted-foreground',
          )}>
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}
```

### Erasure Page Step Mapping

```
step === 'warning'  → currentStep = 0
step === 'form'     → currentStep = 1
step === 'success'  → currentStep = 2
```

### Data-Rights Hub Card Links Pattern

```tsx
// data-rights/page.tsx — each option card
<Link href="/data-rights/request" className="block">
  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
    <CardContent className="flex items-start gap-4 pt-5 pb-5">
      <div className="text-2xl">📋</div>
      <div>
        <h2 className="font-semibold">Minta Salinan Data</h2>
        <p className="text-sm text-muted-foreground mt-1">...</p>
      </div>
    </CardContent>
  </Card>
</Link>
```

### Input Field Pattern (replacing raw `<input>`)

```tsx
import { Input } from '@/components/ui/input'

// Before:
<input
  id="phone"
  type="tel"
  {...register('phone')}
  placeholder="..."
  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
/>

// After:
<Input
  id="phone"
  type="tel"
  {...register('phone')}
  placeholder="..."
/>
```

The shadcn `<Input>` already applies `w-full`, border, px-3 py-1, text-sm, focus-visible:ring-1 focus-visible:ring-ring from its component definition — no className needed.

### Back Link Pattern

Simple approach — keep as `<Link>` with design-token classes rather than Button asChild:
```tsx
<Link href="/data-rights" className="text-sm text-primary hover:underline mb-4 inline-block">
  ← Kembali
</Link>
```

This avoids complexity of `Button variant="link" asChild` for simple nav links.

### Files to Change

| File | Change |
|------|--------|
| `src/components/layout/PublicShell.tsx` | **New** — shared shell for public pages |
| `src/components/ui/step-indicator.tsx` | **New** — custom step indicator for multi-step flows |
| `src/app/data-rights/layout.tsx` | Use PublicShell |
| `src/app/register/layout.tsx` | Use PublicShell (no padding) |
| `src/components/features/registration/EventLandingCard.tsx` | Card + Button shadcn primitives |
| `src/app/register/[eventSlug]/page.tsx` | Skeleton: bg-muted; error: text-muted-foreground |
| `src/app/data-rights/page.tsx` | Card link cards |
| `src/app/data-rights/request/page.tsx` | Input + Button shadcn primitives |
| `src/app/data-rights/erasure/page.tsx` | StepIndicator + Card + Input + Button primitives |
| `src/app/data-rights/learn/page.tsx` | Card + design-token colors |

### What NOT to Change

- All zod schemas in `request/page.tsx` and `erasure/page.tsx`
- `useForm`, `zodResolver`, `handleSubmit`, `watch`, `register` — zero changes
- `onSubmit` functions and `fetch` calls
- MSW handlers, stores, hooks — zero changes
- All 62 tests

---

## Dev Agent Record

**Implementation Notes:**
- EventLandingCard retains its own `max-w-md mx-auto px-4 py-8` wrapper since register layout uses `max-w-none px-0 py-0` — this preserves the card's centered narrow presentation on wide screens
- `CardHeader` uses `rounded-none` (not `rounded-t-xl`) to avoid gap between header and card border
- `STEP_INDEX` lookup object used for clean mapping from `ErasureStep` string to 0-indexed number
- Comparison table in `learn/page.tsx` wraps `<Card>` with `overflow-x-auto` moved to Card level (was on outer div)

**Test Results:**
- `npm test` result: 62/62 passing

## File List

- `src/components/layout/PublicShell.tsx` — **new**
- `src/components/ui/step-indicator.tsx` — **new**
- `src/app/data-rights/layout.tsx` — PublicShell
- `src/app/register/layout.tsx` — PublicShell (no padding)
- `src/components/features/registration/EventLandingCard.tsx` — Card + Button
- `src/app/register/[eventSlug]/page.tsx` — bg-muted skeleton, text-muted-foreground error
- `src/app/data-rights/page.tsx` — Card link cards
- `src/app/data-rights/request/page.tsx` — Input + Button, text-destructive
- `src/app/data-rights/erasure/page.tsx` — StepIndicator + Card + Input + Button
- `src/app/data-rights/learn/page.tsx` — Card + design tokens

## Change Log

- 2026-03-21: Story 10.4 implemented — Public Pages Redesign. PublicShell + StepIndicator created, all public pages updated to shadcn primitives and design-token colors. 62/62 tests pass.

**Status:** review
