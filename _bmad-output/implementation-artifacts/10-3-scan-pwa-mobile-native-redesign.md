# Story 10.3: Scan PWA Mobile-Native Redesign

**Story ID:** 10.3
**Story Key:** 10-3-scan-pwa-mobile-native-redesign
**Epic:** Epic 10 — UI Design System & Mobile-Native Redesign
**Phase:** Phase 1 (FE) — UI-only, zero logic/API changes
**Status:** ready-for-dev
**Created:** 2026-03-21

---

## Story

As a staff member doing event-day check-in,
I want a full-screen, mobile-native scan interface with instant visual feedback and easy event switching,
So that I can check in participants quickly and confidently, even in low-light or fast-paced environments.

> **Scope:** Redesign `/scan` and its four feature components as a full-screen, mobile-native PWA UI. Replace the `max-w-md` centered card layout with a full-screen camera viewfinder. Replace `ScanResultCard` inline result panel with Sonner toasts. Replace the native `<select>` event picker with a shadcn `<Sheet>` drawer. Replace raw `<button>` elements with shadcn `<Button>`. Update `ParticipantSyncStatus` and `PWAInstallBanner` to use shadcn primitives. Zero changes to scan logic, MSW handlers, QR decoding, verifyScan, or tests.

---

## Acceptance Criteria

**AC1:** Given the `/scan` page is loaded,
When viewed on any mobile viewport,
Then the page occupies the full screen with no horizontal padding, no max-width constraint, and no gray background — the camera viewfinder fills the available height.

**AC2:** Given the `/scan` page is loaded with no event selected,
When the staff taps the event selection area,
Then a shadcn `<Sheet>` drawer slides up from the bottom listing all available events as tappable rows (min-height 56px each).

**AC3:** Given the Sheet drawer is open,
When the staff taps an event row,
Then the sheet closes, the selected event name appears in a sticky header bar, and the QR scanner activates.

**AC4:** Given a QR code is scanned and the result is `success`,
When `onResult` fires,
Then `toast.success("Check-in Berhasil — {contactName}")` appears via Sonner, the scanner auto-resumes after 3 seconds, and `ScanResultCard` is not rendered.

**AC5:** Given a QR code is scanned and the result is `already_attended`,
When `onResult` fires,
Then `toast.warning("Sudah Check-in — {formatted attendedAt}")` appears via Sonner.

**AC6:** Given a QR code is scanned and the result is `wrong_event` or `invalid`,
When `onResult` fires,
Then `toast.error("Tiket Salah Event")` or `toast.error("Tiket Tidak Valid")` appears via Sonner.

**AC7:** Given a scan result toast is visible,
When 3 seconds pass (matching existing `AUTO_RESET_MS`),
Then the scanner automatically resumes (calls `html5QrCode.resume()`) without requiring manual tap.

**AC8:** Given the scan page is active,
When a fixed bottom tab bar is rendered,
Then it shows: "Scan" (active, QrCode icon) and "Riwayat" (placeholder, Clock icon) — min-height 56px, minimum 44×44px touch targets.

**AC9:** Given the PWA install prompt is triggered by the browser,
When the banner is shown,
Then it uses shadcn `<Button>` for "Install" and "Nanti" actions and the card uses shadcn `<Card>` instead of raw div.

**AC10:** Given the `ParticipantSyncStatus` component is rendered,
When it displays,
Then it uses shadcn `<Button>` for the sync action and shadcn `<Card>` as the container.

**AC11:** Given all changes are applied,
When `npm test` runs,
Then 62/62 tests pass with zero regressions. No logic, hook, store, MSW, or verifyScan changes.

---

## Tasks / Subtasks

- [x] **Task 1: Update scan page layout — full-screen, no max-width**
  - [x] Remove `max-w-md mx-auto p-4` and `bg-gray-50` from page wrapper — use `min-h-screen bg-background flex flex-col`
  - [x] Add sticky header bar: event name chip (tappable, triggers Sheet) + "Staff: {user.id}" label
  - [x] If no event selected, show a centered CTA ("Pilih Event") instead of the select dropdown
  - [x] Remove `<select>` element — replaced by Sheet (Task 2)
  - [x] Camera/scanner fills remaining height: `flex-1` container
  - [x] Bottom tab bar: "Scan" (QrCode icon, active) + "Riwayat" (Clock icon, placeholder href="#") — fixed bottom, `min-h-[56px]`, `md:hidden`
  - [x] Add `<Toaster />` from `sonner` to this page (or confirm it's already in root layout)
  - [x] Keep all auth guard logic and state unchanged

- [x] **Task 2: Implement Sheet drawer for event selection**
  - [x] Add `showEventSheet` state (`useState(false)`)
  - [x] Trigger sheet open on: initial load if no event selected, and tapping the event name chip in header
  - [x] Render `<Sheet open={showEventSheet} onOpenChange={setShowEventSheet}>`
  - [x] `<SheetContent side="bottom">` with `<SheetHeader><SheetTitle>Pilih Event</SheetTitle></SheetHeader>`
  - [x] Map `data?.data` to `<button>` rows (min-h-[56px], full width, left-aligned event name, border-b between rows)
  - [x] On row tap: `setSelectedEventId(event.id)`, `setScanResult(null)`, `setShowEventSheet(false)`
  - [x] Show loading skeleton rows when `isLoading` is true (3 rows, `h-6 bg-muted rounded animate-pulse`)

- [x] **Task 3: Replace ScanResultCard with Sonner toasts in QRScanner**
  - [x] Import `toast` from `sonner` in `QRScanner.tsx`
  - [x] After `verifyScan` resolves, call `toast.*` based on result type instead of `onResult(result)`:
    - `success` → `toast.success(\`Check-in Berhasil\`, { description: result.contactName })`
    - `already_attended` → `toast.warning(\`Sudah Check-in\`, { description: \`Waktu: ${formatted}\` })`
    - `wrong_event` → `toast.error(\`Tiket Salah Event\`, { description: "Tiket bukan untuk event ini" })`
    - `invalid` → `toast.error(\`Tiket Tidak Valid\`, { description: "Tiket tidak valid atau kedaluwarsa" })`
  - [x] After toast, call `html5QrCode.resume()` after `AUTO_RESET_MS` (3000ms) delay via `setTimeout`
  - [x] Reset `isScanningRef.current = true` inside the setTimeout callback so next scan is accepted
  - [x] The `onResult` prop can be removed from QRScannerProps (or kept as optional for backward compat)
  - [x] Keep all existing `html5QrCode.start()` config, `useEffect` cleanup, and `verifyScan` function unchanged

- [x] **Task 4: Delete or archive ScanResultCard**
  - [x] Remove `ScanResultCard` import from `scan/page.tsx`
  - [x] Remove the `{scanResult ? <ScanResultCard ...> : <QRScanner ...>}` conditional — always render `<QRScanner>`
  - [x] Remove `scanResult` and `setScanResult` state from page
  - [x] `ScanResultCard.tsx` can be deleted (no longer referenced)

- [x] **Task 5: Update QRScanner viewfinder — full-screen**
  - [x] Remove `mt-4` wrapper and `text-sm font-medium text-gray-700 mb-2` label
  - [x] Remove the `minHeight: 280` inline style — let the viewfinder fill parent height
  - [x] Change `id="qr-reader"` container: `className="w-full flex-1 bg-black"` (remove border/rounded — full bleed)
  - [x] Keep the dev hint tokens `<p>` at bottom but use `text-muted-foreground` instead of `text-gray-400`

- [x] **Task 6: Update PWAInstallBanner — shadcn primitives**
  - [x] Import `Card`, `CardContent` from `@/components/ui/card` and `Button` from `@/components/ui/button`
  - [x] Replace root `<div className="fixed bottom-4 ...">` → `<Card className="fixed bottom-20 left-4 right-4 z-50 max-w-sm mx-auto shadow-lg md:bottom-4">`
  - [x] Replace "Install" `<button>` → `<Button size="sm" className="text-xs">Install</Button>`
  - [x] Replace "Nanti" `<button>` → `<Button size="sm" variant="ghost" className="text-xs">Nanti</Button>`
  - [x] Keep all `beforeinstallprompt` logic and session storage logic unchanged

- [x] **Task 7: Update ParticipantSyncStatus — shadcn primitives**
  - [x] Import `Card`, `CardContent` from `@/components/ui/card` and `Button` from `@/components/ui/button`
  - [x] Replace root `<div className="bg-white border ...">` → `<Card><CardContent className="pt-4">`
  - [x] Replace sync `<button>` → `<Button className="w-full" disabled={syncState === 'syncing'}>`
  - [x] Replace `text-gray-*` colors → `text-muted-foreground`, `text-foreground`
  - [x] Keep all sync state logic, `cacheParticipants`, and API call unchanged

- [x] **Task 8: Ensure Toaster is mounted**
  - [x] Check `src/app/layout.tsx` — if `<Toaster />` from sonner is not present, add it
  - [x] Import: `import { Toaster } from '@/components/ui/sonner'` (shadcn's sonner wrapper)
  - [x] Place `<Toaster richColors position="top-center" />` inside the `<body>` after `{children}`

- [x] **Task 9: Run regression tests**
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

### Layout Structure (after redesign)

```
<div className="min-h-screen bg-background flex flex-col">           ← full screen
  {/* Sticky header */}
  <header className="flex items-center justify-between px-4 py-3 border-b border-border">
    <button onClick={() => setShowEventSheet(true)}
            className="flex items-center gap-2 text-sm font-medium">
      <ChevronDown className="h-4 w-4 text-muted-foreground" />
      {selectedEvent?.name ?? 'Pilih Event'}
    </button>
    <span className="text-xs text-muted-foreground">Staff: {user?.id}</span>
  </header>

  {/* Scanner fills remaining space */}
  <div className="flex-1 relative">
    {selectedEventId
      ? <QRScanner eventId={selectedEventId} />
      : <div className="flex-1 flex items-center justify-center">
          <Button onClick={() => setShowEventSheet(true)}>Pilih Event untuk Mulai</Button>
        </div>
    }
  </div>

  {/* Participant sync — shown when event selected */}
  {selectedEventId && (
    <div className="px-4 pb-2">
      <ParticipantSyncStatus eventId={selectedEventId} />
    </div>
  )}

  {/* Bottom tab bar — mobile only */}
  <nav className="md:hidden fixed bottom-0 inset-x-0 bg-background border-t border-border flex items-center justify-around min-h-[56px] z-50">
    <button className="flex flex-col items-center gap-1 flex-1 min-h-[44px] py-2 text-primary">
      <QrCode className="h-5 w-5" />
      <span className="text-[10px] font-medium">Scan</span>
    </button>
    <button className="flex flex-col items-center gap-1 flex-1 min-h-[44px] py-2 text-muted-foreground" disabled>
      <Clock className="h-5 w-5" />
      <span className="text-[10px] font-medium">Riwayat</span>
    </button>
  </nav>
</div>
```

### Sheet Event Selector

```tsx
<Sheet open={showEventSheet} onOpenChange={setShowEventSheet}>
  <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
    <SheetHeader>
      <SheetTitle>Pilih Event</SheetTitle>
    </SheetHeader>
    {isLoading ? (
      Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-14 bg-muted rounded animate-pulse mx-4 my-2" />
      ))
    ) : (
      <div className="mt-2">
        {data?.data.map((event) => (
          <button
            key={event.id}
            className="w-full text-left px-4 py-4 min-h-[56px] text-sm font-medium border-b border-border last:border-0 hover:bg-muted/50 active:bg-muted"
            onClick={() => {
              setSelectedEventId(event.id)
              setScanResult(null)   // remove if scanResult state removed
              setShowEventSheet(false)
            }}
          >
            {event.name}
          </button>
        ))}
      </div>
    )}
  </SheetContent>
</Sheet>
```

### Sonner Toast Calls in QRScanner (replace onResult calls)

```tsx
import { toast } from 'sonner'
// ...
// Inside the Html5Qrcode success callback, after verifyScan:
const result = await verifyScan(decodedText, accessToken)

if (result.type === 'success') {
  toast.success('Check-in Berhasil', { description: result.contactName })
} else if (result.type === 'already_attended') {
  const formatted = result.attendedAt
    ? new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })
        .format(new Date(result.attendedAt))
    : 'Waktu tidak diketahui'
  toast.warning('Sudah Check-in', { description: `Waktu: ${formatted}` })
} else if (result.type === 'wrong_event') {
  toast.error('Tiket Salah Event', { description: 'Tiket bukan untuk event ini' })
} else {
  toast.error('Tiket Tidak Valid', { description: 'Tiket tidak valid atau kedaluwarsa' })
}

// Auto-resume after AUTO_RESET_MS
setTimeout(async () => {
  isScanningRef.current = true
  try {
    await html5QrCode.resume()
  } catch {
    // resume may fail if stopped — safe to ignore
  }
}, 3000)
```

### QRScanner Props Change

Remove `onResult` prop entirely from QRScannerProps (no longer needed since toasts are self-contained):

```tsx
// Before:
interface QRScannerProps {
  eventId: string
  onResult: (result: ScanResultState) => void
}

// After:
interface QRScannerProps {
  eventId: string
}
```

Also remove `ScanResultState` type export if nothing else imports it. Check usages first.

### Toaster in Root Layout

The shadcn sonner wrapper is at `@/components/ui/sonner`. It wraps the third-party `<Toaster>` from `sonner` with project defaults:

```tsx
// src/app/layout.tsx — add after {children}
import { Toaster } from '@/components/ui/sonner'
// ...
<Toaster richColors position="top-center" />
```

Only add `<Toaster>` once — in root layout. Do NOT add it inside scan page.

### Files to Change

| File | Change |
|------|--------|
| `src/app/scan/page.tsx` | Full rewrite — full-screen layout, Sheet trigger, remove select, remove ScanResultCard, bottom tab bar |
| `src/components/features/scan/QRScanner.tsx` | Replace `onResult` calls with Sonner toasts; add auto-resume setTimeout; remove onResult prop |
| `src/components/features/scan/PWAInstallBanner.tsx` | Card + Button shadcn primitives |
| `src/components/features/scan/ParticipantSyncStatus.tsx` | Card + Button shadcn primitives |
| `src/app/layout.tsx` | Add `<Toaster richColors position="top-center" />` if not present |
| `src/components/features/scan/ScanResultCard.tsx` | **Delete** — replaced by Sonner toasts |

### Imports Needed (scan page)

```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { QrCode, Clock, ChevronDown } from 'lucide-react'
```

### What NOT to Change

- `Html5Qrcode` initialization in `QRScanner.tsx` — `fps: 10`, `qrbox: { width: 250, height: 250 }`, `facingMode: 'environment'`
- `isScanningRef` guard logic (still needed — set to `false` on scan, reset to `true` after AUTO_RESET)
- `html5QrCode.stop()` cleanup in useEffect return
- `verifyScan()` function — zero changes
- All auth guard logic in `scan/page.tsx`
- MSW handlers, stores, hooks — zero changes
- All 62 tests

---

## Dev Agent Record

**Implementation Notes:**
- `ScanResultState` type kept as internal (unexported) type in QRScanner.tsx — no external consumers remain
- `scanResult` and `setScanResult` states removed from scan/page.tsx entirely — QRScanner now self-contained
- `AUTO_RESET_MS = 3000` constant moved into QRScanner.tsx (was only in ScanResultCard which is deleted)
- PWAInstallBanner bottom offset uses `bottom-20` on mobile (above bottom tab bar) and `md:bottom-4` on desktop
- Camera error (access denied) now fires `toast.error` instead of calling `onResult` — consistent UX

**Test Results:**
- `npm test` result: 62/62 passing

## File List

- `src/app/scan/page.tsx` — full rewrite (full-screen layout, Sheet drawer, bottom tab bar)
- `src/components/features/scan/QRScanner.tsx` — Sonner toasts, auto-resume, full-screen viewfinder, removed onResult prop
- `src/components/features/scan/PWAInstallBanner.tsx` — Card + Button shadcn primitives
- `src/components/features/scan/ParticipantSyncStatus.tsx` — Card + Button shadcn primitives
- `src/app/layout.tsx` — added Toaster import and `<Toaster richColors position="top-center" />`
- `src/components/features/scan/ScanResultCard.tsx` — **deleted**

## Change Log

- 2026-03-21: Story 10.3 implemented — Scan PWA mobile-native redesign. Full-screen layout, Sheet event picker, Sonner toasts replacing ScanResultCard, bottom tab bar, shadcn primitives in PWAInstallBanner and ParticipantSyncStatus. 62/62 tests pass.

**Status:** review
