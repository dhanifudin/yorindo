# Story 6.6: QR Ticket Generation & Delivery

**Story ID:** 6.6
**Story Key:** 6-6-qr-ticket-generation-delivery
**Epic:** Epic 6 — Participant Registration & Approval Workflow
**Phase:** Phase 1 (FE) — public ticket display page wired to MSW; Phase 2 (BE) — encrypted QR generation
**Status:** review

---

## Story

As an approved participant,
I want to receive a QR code ticket and view it on a dedicated page,
So that I have a scannable ticket to present at event check-in.

> **Current implementation note (2026-03-30):** The active FE/MSW/runtime still uses the simpler current ticket-token flow. The encrypted `qrPayload` model remains a target-state follow-up.

---

## Acceptance Criteria

**AC1:** `GET /api/tickets/:token` returns ticket display data in the current runtime flow.
```ts
{
  qrPayload?: string       // target-state encrypted QR payload
  token?: string           // current runtime ticket token
  participantName: string
  eventName: string
  eventDate: string        // ISO date
  venue: string
}
```
Current FE/runtime may still resolve through `token`/`ticketToken` rather than the target encrypted payload.

**AC2:** Large QR code displayed using `react-qr-code`:
```tsx
<QRCode value={ticketData.qrPayload} size={256} />
```
The participant does not need to decode the QR — they only need to show it.

**AC3:** Participant name, event name, event date, and venue displayed below the QR code.

**AC4:** Download / print button (`window.print()` or canvas export).

> **Phase 2 BE note:** `qrPayload` generation:
> ```
> plaintext = JSON.stringify({ registrationId, eventId, issuedAt: ISO timestamp })
> key       = events.event_key  (base64-decoded to 256-bit AES key, per-event)
> iv        = crypto.randomBytes(12)  (96-bit GCM nonce)
> ciphertext = AES-256-GCM encrypt(plaintext, key, iv)
> qrPayload  = base64url(iv + ciphertext)  stored in registrations.ticket_token
> ```
> Use Node.js `crypto` module (`createCipheriv('aes-256-gcm', ...)`). `eventKey` generated server-side at event publish time via `@paralleldrive/cuid2`-seeded random or `crypto.randomBytes(32)`.

---

## Tasks / Subtasks

- [x] **Task 1 — MSW handler (AC: 1)**
  - [x] `GET /api/tickets/:token` returns mock ticket with `qrPayload` field (opaque string)
  - [x] Update mock shape: replace `ticketToken` with `qrPayload`

- [x] **Task 2 — Ticket display page (AC: 2, 3)**
  - [x] `src/app/tickets/[token]/page.tsx` — public route, no auth required
  - [x] `react-qr-code` renders `ticketData.qrPayload` as QR value
  - [x] Display participant name, event name, date (Indonesian locale), venue

- [x] **Task 3 — Download button (AC: 4)**
  - [x] `window.print()` triggers browser print dialog (QR + participant info)

---

## Dev Notes

### QR Value
The target-state QR value is `qrPayload`, but the current implementation still uses the simpler ticket-token model in active code.

### MSW Mock Shape
```typescript
// GET /api/tickets/:token
{
  qrPayload: 'MOCK_ENCRYPTED_QR_event-001_reg-001',
  participantName: 'Budi Santoso',
  eventName: 'Seminar ERP Jakarta 2026',
  eventDate: '2026-04-15T09:00:00Z',
  venue: 'Jakarta Convention Center'
}
```

### File Locations
- Ticket page: `src/app/tickets/[token]/page.tsx`
- MSW handler: `src/mocks/handlers/tickets.ts` (or registrations.ts)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-22 | Story created | bmad-context-engine |
| 2026-03-28 | QR payload changed from plain JWT to AES-256-GCM encrypted string; MSW shape updated (`ticketToken` → `qrPayload`); Phase 2 BE generation spec added | SCP-2026-03-28-B |
