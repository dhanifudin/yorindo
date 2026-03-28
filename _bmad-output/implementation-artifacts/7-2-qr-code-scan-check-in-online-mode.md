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
I want to scan a participant's encrypted QR code, see their profile, and confirm check-in,
So that only authorized staff devices can perform check-in and the flow is fast and unambiguous.

> **Updated 2026-03-28** — QR payload is now AES-256-GCM encrypted (not plain JWT). Staff device decrypts locally using the `eventKey` from `scanStore` (synced at login via Story 2.1). Post-decrypt, the participant profile is displayed for KTP matching before staff taps "Setujui". Story 7.4 (OTP flow) retired — this story covers the primary check-in path.

> **Phase 1 FE scope:** Build the QR scanner UI using `html5-qrcode` v2.3.8, add local AES decrypt step using `crypto.subtle`, display participant profile card with Setujui button, wire to MSW handlers. Offline sync is Story 7.3.

---

## Acceptance Criteria (FE Phase 1)

**AC1 — Decrypt step:**
Given an event is selected and the scanner is active,
When a QR code is scanned,
Then the FE attempts `crypto.subtle.decrypt('AES-GCM', eventKey, qrPayload)` using the key from `scanStore.getEventKey(selectedEventId)`
- If `eventKey` is not found → show red card "Perangkat tidak diotorisasi untuk event ini"
- If decryption fails (wrong key / corrupted QR) → show red card "QR tidak dapat dibaca oleh perangkat ini"
- If decryption succeeds → extract `{ registrationId, eventId }` and proceed to AC2

**AC2 — Event mismatch check:**
Given decryption succeeds,
When `decryptedPayload.eventId !== selectedEventId`,
Then show red card "Tiket bukan untuk event ini" — no server call made

**AC3 — Verify + profile display:**
Given `registrationId` is extracted and `eventId` matches,
When `POST /api/scan/verify { registrationId }` returns 200,
Then show participant profile card:
```
┌──────────────────────────────────┐
│ ✓ Peserta Ditemukan               │
│                                   │
│ [Name — large bold]               │
│ [Company · Position]              │
│ Reg #[registrationNumber]         │
│                                   │
│      [Setujui Check-in]           │  ← full-width primary button
└──────────────────────────────────┘
```
Staff compares displayed name/company against physical KTP before tapping.

**AC4 — Already attended:**
Given `POST /api/scan/verify` returns `{ status: 'already_attended', attendedAt }`,
Then show yellow card "Peserta sudah check-in" with `attendedAt` formatted in Indonesian locale.

**AC5 — Setujui action:**
Given the profile card is shown,
When staff taps "Setujui Check-in",
Then `PATCH /api/registrations/:id/attendance { attendance_status: 'attended', check_in_method: 'qr' }` is called
→ 4s Sonner toast "✓ [name] — check-in berhasil"
→ 3s auto-reset or "Scan Berikutnya" tap → scanner resumes

**AC6 — Auto-reset:**
Given any result card is displayed,
When 3 seconds pass or "Scan Berikutnya" is tapped,
Then the scanner resets and resumes scanning

**AC7 — No event selected:**
Given no event is selected,
Then the scanner area is not shown

**AC8 — MSW handlers:**
- `POST /api/scan/verify` accepts `{ registrationId }` and returns:
  - `MOCK_REG_001` → `{ status: 'success', profile: { name: 'Budi Santoso', company: 'PT Maju Jaya', position: 'Manager', registrationNumber: 'REG-0042' } }`
  - `MOCK_REG_ALREADY` → `{ status: 'already_attended', attendedAt: '2026-04-15T09:15:00Z', profile: null }`
- `PATCH /api/registrations/:id/attendance` → `200 { success: true }`
- Mock encrypted QR values in dev: `'MOCK_ENCRYPTED_QR_event-001_reg-001'` decrypts to `{ registrationId: 'MOCK_REG_001', eventId: 'event-001' }` (Phase 1: mock decrypt function returns hardcoded payload for known mock values)

---

## Tasks / Subtasks

- [ ] **Task 1 — Crypto decrypt utility (AC: 1)**
  - [ ] Create `src/lib/qrDecrypt.ts`: `decryptQrPayload(qrPayload: string, eventKey: string): Promise<{ registrationId: string; eventId: string } | null>`
  - [ ] Use `crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)` — no external dep
  - [ ] Parse `qrPayload` as `base64url(iv[12 bytes] + ciphertext)`
  - [ ] Return `null` on any failure (wrong key, malformed payload, expired)
  - [ ] Phase 1 mock: if `qrPayload.startsWith('MOCK_ENCRYPTED_QR_')`, return hardcoded payload without actual crypto (allows MSW testing without real keys)

- [ ] **Task 2 — Update MSW scan handlers (AC: 8)**
  - [ ] Update `src/mocks/handlers/scan.ts`: replace token-based handler with `registrationId`-based
  - [ ] Add `PATCH /api/registrations/:id/attendance` stub (return `{ success: true }`)
  - [ ] Remove: `MOCK_INVALID`, `MOCK_WRONG_EVENT` raw token handlers (decrypt failure now handles these)

- [ ] **Task 3 — Update ScanResultState type (AC: 1–5)**
  - [ ] Replace old 4-state union with new states:
    ```typescript
    type ScanResultState =
      | { type: 'profile'; registrationId: string; name: string; company: string; position: string; registrationNumber: string }
      | { type: 'already_attended'; attendedAt: string | null }
      | { type: 'wrong_event' }
      | { type: 'decrypt_failed' }
      | { type: 'unauthorized_device' }
    ```

- [ ] **Task 4 — Update QRScanner component (AC: 1–2)**
  - [ ] On QR decode: call `decryptQrPayload(decodedText, eventKey)` before any server call
  - [ ] Read `eventKey` from `scanStore.getEventKey(selectedEventId)` (IndexedDB, Story 7.1)
  - [ ] Handle all decrypt error states → pass to result card

- [ ] **Task 5 — Rewrite ScanResultCard component (AC: 3–6)**
  - [ ] New `'profile'` state: show name (large), company/position, reg#, Setujui button
  - [ ] Setujui calls PATCH mutation with `check_in_method: 'qr'`
  - [ ] `'already_attended'`: yellow card with formatted attendedAt
  - [ ] `'wrong_event'`, `'decrypt_failed'`, `'unauthorized_device'`: red error cards
  - [ ] 3s auto-reset + "Scan Berikutnya" button (unchanged from original)

- [ ] **Task 6 — Update tests (AC: 8)**
  - [ ] Update `src/hooks/useScan.test.ts` for new `{ registrationId }` request shape
  - [ ] Add test: successful scan → profile displayed → Setujui → attendance PATCH called
  - [ ] Add test: `MOCK_REG_ALREADY` → already_attended card shown

---

## Dev Notes

### Crypto Pattern (`crypto.subtle` — no external dep)

```typescript
// src/lib/qrDecrypt.ts
export async function decryptQrPayload(
  qrPayload: string,
  eventKeyBase64: string
): Promise<{ registrationId: string; eventId: string } | null> {
  // Phase 1 mock path
  if (qrPayload.startsWith('MOCK_ENCRYPTED_QR_')) {
    const parts = qrPayload.split('_')
    return { eventId: parts[3], registrationId: parts[4] }
  }

  try {
    const keyBytes = Uint8Array.from(atob(eventKeyBase64), c => c.charCodeAt(0))
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']
    )
    const payloadBytes = Uint8Array.from(atob(qrPayload.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
    const iv = payloadBytes.slice(0, 12)
    const ciphertext = payloadBytes.slice(12)
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ciphertext)
    return JSON.parse(new TextDecoder().decode(decrypted))
  } catch {
    return null
  }
}
```

### `html5-qrcode` — unchanged pattern
Use `Html5Qrcode` (low-level API). Camera lifecycle + `isScanningRef` guard unchanged from original implementation. See Story 7.2 original dev notes pattern.

### API Call Pattern (new)
```typescript
async function verifyScan(registrationId: string): Promise<ScanResultState> {
  const res = await fetch('/api/scan/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
    body: JSON.stringify({ registrationId }),
  })
  const data = await res.json()
  if (data.status === 'already_attended') return { type: 'already_attended', attendedAt: data.attendedAt }
  return { type: 'profile', registrationId, ...data.profile }
}
```

### File Locations
- Decrypt utility: `src/lib/qrDecrypt.ts` (NEW)
- QR scanner component: `src/components/features/scan/QRScanner.tsx` (MODIFY)
- Result card component: `src/components/features/scan/ScanResultCard.tsx` (REWRITE)
- Scan page: `src/app/scan/page.tsx` (minor update — pass eventKey to QRScanner)
- MSW scan handler: `src/mocks/handlers/scan.ts` (MODIFY)

### Key Anti-Patterns
- **DO NOT** send raw QR string to server — decrypt locally first, send `registrationId` only
- **DO NOT** use asymmetric crypto — symmetric AES-GCM with per-event key is the spec
- **DO NOT** fail silently on decrypt — show explicit "perangkat tidak diotorisasi" message
- **DO NOT** call `html5QrCode.stop()` outside cleanup — camera leak risk unchanged

---

## Dev Agent Record

### Completion Notes (original — pre 2026-03-28)
All 6 original tasks complete. 62/62 tests pass. Plain JWT token sent to verify endpoint.

> **Updated 2026-03-28** — AC redesign: encrypted QR decrypt + profile display + Setujui button. All original tasks superseded by Tasks 1–6 above. Tests need update to reflect `{ registrationId }` request shape and new result states.

## File List

**Original:**
- `src/components/features/scan/QRScanner.tsx`
- `src/components/features/scan/ScanResultCard.tsx`
- `src/hooks/useScan.test.ts`
- `src/app/scan/page.tsx`
- `src/mocks/handlers/scan.ts`
- `src/types/api.ts`

**New (2026-03-28):**
- `src/lib/qrDecrypt.ts`

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-20 | Story created (FE Phase 1) | bmad-create-story |
| 2026-03-21 | All 6 tasks implemented; 62/62 tests pass | bmad-dev-story |
| 2026-03-28 | Full AC redesign: AES-GCM decrypt + profile display + Setujui; Story 7.4 OTP retired; Tasks 1–6 replace original tasks | SCP-2026-03-28-B |
