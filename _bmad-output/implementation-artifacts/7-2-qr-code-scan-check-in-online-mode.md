# Story 7.2: QR Code Scan Check-in (Online Mode)

**Story ID:** 7.2
**Story Key:** 7-2-qr-code-scan-check-in-online-mode
**Epic:** Epic 7 — Event-Day Check-in (Offline-First PWA)
**Phase:** Phase 1 (FE) — QR scanner UI wired to MSW mock
**Status:** review
**Created:** 2026-03-20

---

## Story

As a staff member,
I want to scan a participant's QR code ticket and confirm their check-in in under 2 seconds,
So that the check-in queue moves quickly and participants feel welcomed.

> **Phase 1 FE scope:** Build the QR camera scanner UI using `html5-qrcode` v2.3.8 (already installed), wire it to the existing MSW `POST /api/scan/verify` handler, and display inline scan result cards for all 4 outcome states (success, already-attended, wrong-event, invalid). Integrate into the existing `/scan` page which already has the event selector. Offline sync is Story 7.3.

---

## Acceptance Criteria (FE Phase 1)

**AC1:** Given an event is selected and the scanner is active,
When a valid token QR code is scanned,
Then `POST /api/scan/verify` is called with `{ token }` and a green success card shows the participant name within 2 seconds (NFR-P5)

**AC2:** Given the scanner is active,
When token `MOCK_ALREADY` is scanned,
Then the UI shows a yellow "Peserta sudah check-in" warning card with the attended-at time

**AC3:** Given the scanner is active,
When token `MOCK_WRONG_EVENT` is scanned,
Then `POST /api/scan/verify` returns `{ error: { code: 'WRONG_EVENT' } }` and the UI shows "Tiket bukan untuk event ini" — no cross-event participant details exposed (FR38)

**AC4:** Given the scanner is active,
When token `MOCK_INVALID` is scanned,
Then the UI shows a red "Tiket tidak valid atau sudah kedaluwarsa" error card (401 response)

**AC5:** Given a result card is displayed,
When 3 seconds pass or "Scan Berikutnya" is tapped,
Then the scanner resets and resumes scanning

**AC6:** Given no event is selected,
Then the scanner area is not shown (event must be selected first)

---

## Tasks / Subtasks

- [x] **Task 1: Add MOCK_WRONG_EVENT to MSW scan handler**
  - [x] Update `src/mocks/handlers/scan.ts`: add `MOCK_WRONG_EVENT` token → `{ error: { code: 'WRONG_EVENT', message: 'Tiket bukan untuk event ini', details: [] } }` status 400
  - [x] Also add `attendedAt` field to `MOCK_ALREADY` response for richer UI
  - [x] Keep existing 3 cases intact

- [x] **Task 2: Update `ScanResult` type in `api.ts`**
  - [x] `src/types/api.ts` already has `ScanResult`; current status: `'success' | 'already_attended' | 'invalid'`
  - [x] Add `attendedAt?: string | null` to `ScanResult` (for already-attended display)
  - [x] DO NOT add `wrong_event` to status — WRONG_EVENT is returned as `ApiError` shape (HTTP 400), not `ScanResult`

- [x] **Task 3: Build QRScanner component**
  - [x] Create `src/components/features/scan/QRScanner.tsx` — `'use client'`
  - [x] Use `Html5Qrcode` (low-level API, not `Html5QrcodeScanner`) for custom Tailwind UI
  - [x] Mount into `<div id="qr-reader">` via useRef + useEffect
  - [x] Props: `eventId: string`, `onResult: (result: ScanResultState) => void`
  - [x] Camera cleanup: call `html5QrCode.stop()` in useEffect cleanup (CRITICAL — prevents camera leak)
  - [x] Show camera preview in a styled square frame (250×250 px qrbox)

- [x] **Task 4: Build ScanResultCard component**
  - [x] Create `src/components/features/scan/ScanResultCard.tsx`
  - [x] Props: `result: ScanResultState | null`, `onReset: () => void`
  - [x] 4 visual states mapped to result.type:
    - `'success'` → green bg, ✓ icon, participant name + event name
    - `'already_attended'` → yellow bg, ⚠ icon, attended-at timestamp in Indonesian locale
    - `'wrong_event'` → red bg, ✗ icon, "Tiket bukan untuk event ini"
    - `'invalid'` → red bg, ✗ icon, "Tiket tidak valid atau sudah kedaluwarsa"
  - [x] Auto-reset after 3 seconds via `setTimeout` (cleared on manual reset)
  - [x] "Scan Berikutnya" button for immediate reset

- [x] **Task 5: Update `/scan` page to integrate scanner**
  - [x] `src/app/scan/page.tsx` — replace the stub comment with conditional scanner rendering
  - [x] When `selectedEventId` is set: show `QRScanner` + `ScanResultCard`
  - [x] Remove `<div className="mt-4 text-center ...">QR Scanner tersedia di Story 7.2</div>` stub
  - [x] Keep existing: event selector, `ParticipantSyncStatus`, `PWAInstallBanner`, auth guard

- [x] **Task 6: Write vitest tests**
  - [x] `src/hooks/useScan.test.ts` — test `POST /api/scan/verify` for all 4 token states (success, already_attended, WRONG_EVENT 400, MOCK_INVALID 401)

---

## Dev Notes

### `html5-qrcode` v2.3.8 — Use Low-Level API

**Use `Html5Qrcode`, NOT `Html5QrcodeScanner`:**
```typescript
import { Html5Qrcode } from 'html5-qrcode'

// In component:
const qrCodeRef = useRef<Html5Qrcode | null>(null)
const isScanningRef = useRef(false)

useEffect(() => {
  const html5QrCode = new Html5Qrcode('qr-reader')
  qrCodeRef.current = html5QrCode
  isScanningRef.current = true

  html5QrCode.start(
    { facingMode: 'environment' }, // rear camera
    { fps: 10, qrbox: { width: 250, height: 250 } },
    async (decodedText) => {
      if (!isScanningRef.current) return
      isScanningRef.current = false // prevent duplicate scans
      await html5QrCode.pause(true)
      // POST to /api/scan/verify
      onScanResult(decodedText)
    },
    () => { /* scan failure — called on every frame without QR, don't show errors */ }
  )

  return () => {
    // CRITICAL: always stop to release camera
    html5QrCode.stop().catch(() => {})
    qrCodeRef.current = null
  }
}, [eventId]) // restart scanner when event changes
```

**Why `Html5Qrcode` over `Html5QrcodeScanner`:**
- `Html5QrcodeScanner` renders its own HTML (not Tailwind-compatible)
- `Html5Qrcode` gives you a raw `<div id="qr-reader">` mount point and full UI control

### DOM Mount Point
```tsx
// In QRScanner.tsx
return (
  <div className="relative">
    <div id="qr-reader" className="w-full rounded-lg overflow-hidden" />
    {/* The html5-qrcode library injects video element here */}
  </div>
)
```

### Existing MSW Scan Handler (already in `src/mocks/handlers/scan.ts`)
Already handles 3 cases — you need to ADD `MOCK_WRONG_EVENT`:
```typescript
// CURRENT (don't break):
// MOCK_INVALID → 401 { error: { code: 'INVALID_TICKET' } }
// MOCK_ALREADY → 200 { status: 'already_attended', message: '...' }
// any other → 200 { status: 'success', registration: { id, contactName, eventName } }

// ADD:
// MOCK_WRONG_EVENT → 400 { error: { code: 'WRONG_EVENT', message: 'Tiket bukan untuk event ini', details: [] } }
// Also add attendedAt: faker.date.recent().toISOString() to MOCK_ALREADY response
```

### ScanResultState Type (define in QRScanner or shared types)
```typescript
// Define locally in scan components — not yet in api.ts
type ScanResultState =
  | { type: 'success'; contactName: string; eventName: string }
  | { type: 'already_attended'; attendedAt: string | null }
  | { type: 'wrong_event' }
  | { type: 'invalid' }
```

### API Call Pattern
```typescript
async function verifyScan(token: string, eventId: string): Promise<ScanResultState> {
  const res = await fetch('/api/scan/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
    body: JSON.stringify({ token }),
  })

  if (res.status === 401) return { type: 'invalid' }

  const data = await res.json()

  if (!res.ok) {
    // HTTP 400 — check error code
    if (data?.error?.code === 'WRONG_EVENT') return { type: 'wrong_event' }
    return { type: 'invalid' }
  }

  if (data.status === 'already_attended') {
    return { type: 'already_attended', attendedAt: data.attendedAt ?? null }
  }

  return { type: 'success', contactName: data.registration.contactName, eventName: data.registration.eventName }
}
```

### Result Card UI Design (Indonesian locale)
```typescript
// already_attended → format attendedAt nicely
const formattedTime = attendedAt
  ? new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }).format(new Date(attendedAt))
  : 'Waktu tidak diketahui'
```

### File Locations
- QR scanner component: `src/components/features/scan/QRScanner.tsx`
- Result card component: `src/components/features/scan/ScanResultCard.tsx`
- Updated scan page: `src/app/scan/page.tsx`
- Updated MSW handler: `src/mocks/handlers/scan.ts`
- Updated types: `src/types/api.ts` (only add `attendedAt?: string | null` to `ScanResult`)

### Scan Page Integration Pattern
```tsx
// In ScanPage — replace stub div with:
{selectedEventId && (
  <>
    <ParticipantSyncStatus eventId={selectedEventId} />
    {scanResult ? (
      <ScanResultCard result={scanResult} onReset={() => setScanResult(null)} />
    ) : (
      <QRScanner eventId={selectedEventId} onResult={setScanResult} />
    )}
  </>
)}
```

### Architecture Reference
Architecture defines `/scan/result/[token]` route but do NOT create this file for Story 7.2. Inline result cards are chosen for:
- NFR-P5 (2s) compliance — no navigation latency
- Token privacy — ticket JWTs not exposed in URL bar
- Better UX for high-throughput scanning sessions

Story 7.3 (offline mode) may revisit this.

### Key Anti-Patterns to Avoid
- **DO NOT** use `Html5QrcodeScanner` — it injects non-Tailwind HTML you can't style
- **DO NOT** forget to call `html5QrCode.stop()` in cleanup — camera stays on otherwise
- **DO NOT** trigger scan result on every failed frame — `onScanFailure` fires constantly; only process `onSuccess`
- **DO NOT** allow duplicate POST on multi-frame decode — use `isScanningRef` flag
- **DO NOT** show camera permission errors as scan results — handle separately
- **DO NOT** add `wrong_event` to `ScanResult.status` in api.ts — it comes back as `ApiError` (HTTP 400), not a `ScanResult`

---

## Dev Agent Record

### Implementation Plan

1. Updated `src/mocks/handlers/scan.ts` — added `MOCK_WRONG_EVENT` → 400 error; added `attendedAt` to `MOCK_ALREADY` response.
2. Updated `src/types/api.ts` — added `attendedAt?: string | null` to `ScanResult`.
3. Created `src/components/features/scan/QRScanner.tsx` — `Html5Qrcode` low-level API; `useEffect` camera lifecycle with `isScanningRef` guard against duplicate scans; camera stop in cleanup; exports `ScanResultState` discriminated union type.
4. Created `src/components/features/scan/ScanResultCard.tsx` — 4-state card (success/already_attended/wrong_event/invalid); 3s auto-reset via `setTimeout`; "Scan Berikutnya" manual reset button; `id-ID` locale for `attendedAt` timestamp.
5. Updated `src/app/scan/page.tsx` — removed stub div; integrated `QRScanner` + `ScanResultCard`; state toggle between scanner and result views; event change resets result.
6. Created `src/hooks/useScan.test.ts` — 4 tests covering all MSW token states via direct `fetch` calls.

### Debug Log

No issues encountered.

### Completion Notes

All 6 tasks complete. 62/62 tests pass (4 new; 58 pre-existing). `tsc --noEmit` clean.

---

## File List

**New files:**
- `src/components/features/scan/QRScanner.tsx`
- `src/components/features/scan/ScanResultCard.tsx`
- `src/hooks/useScan.test.ts`

**Modified files:**
- `src/app/scan/page.tsx` — integrated QRScanner + ScanResultCard, removed stub
- `src/mocks/handlers/scan.ts` — added MOCK_WRONG_EVENT token, added attendedAt to MOCK_ALREADY
- `src/types/api.ts` — added `attendedAt?: string | null` to `ScanResult`

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-20 | Story created (FE Phase 1) | bmad-create-story |
| 2026-03-21 | All 6 tasks implemented; 62/62 tests pass | bmad-dev-story |
