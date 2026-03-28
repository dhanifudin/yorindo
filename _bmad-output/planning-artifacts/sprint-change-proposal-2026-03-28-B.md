# Sprint Change Proposal — SCP-2026-03-28-B

**Date:** 2026-03-28
**Scope:** Moderate
**Status:** Approved

---

## Section 1: Issue Summary

Two coordinated changes from party mode design session (2026-03-28):

**A — Encrypted QR Access Control**
Current QR ticket (Story 6.6) is a plain HS256 JWT. Any device that scans it can read the payload. The requirement is that only authorized staff devices (holding a per-event `eventKey`) can decrypt the QR and perform check-in. Non-staff devices receive an unreadable AES-256-GCM encrypted blob.

**B — CUID2 Primary Keys (consistency)**
Architecture doc already declares `TEXT` CUID2 as the project-wide PK standard. Several story files and OpenAPI schema referenced UUID types. All `id` fields standardized to `type: string` (no `format: uuid`).

---

## Section 2: Impact Analysis

| Story | Change Type |
|-------|-------------|
| 1.2 Database Migrations | New columns: `events.event_key`, `registrations.check_in_method`, `registrations.checked_in_by` |
| 1.4 OpenAPI Spec | eventKeys in auth response; scan/verify redesign; all ids → `string` not `uuid` |
| 2.1 Admin Login | AC6 added; authStore shape updated; MSW updated with eventKeys |
| 6.6 QR Ticket | AES-256-GCM `qrPayload` replaces plain JWT; MSW shape updated |
| 7.2 QR Scan | Full AC redesign: local decrypt + profile + Setujui; `check_in_method: 'qr'` |
| 7.4 KTP/OTP | **Retired** — OTP flow removed entirely |
| 7.5 Name Search | Setujui screen replaces reason dialog; `check_in_method: 'manual'`; OTP refs removed |

**No new epics. No scope reduction. MVP unchanged.**

---

## Section 3: Recommended Approach

**Direct Adjustment** — modify existing stories within current epic structure.

- No rollback required
- Effort: Medium (7 story file updates, all non-blocking for current dev work)
- Risk: Low — Phase 1 FE work uses MSW mocks; real crypto runs Phase 2. Mock decrypt path handles `MOCK_ENCRYPTED_QR_` prefix strings without actual `crypto.subtle` calls.

---

## Section 4: Detailed Decisions

1. QR payload = AES-256-GCM encrypt(`{ registrationId, eventId, issuedAt }`, `eventKey`)
2. `eventKey` per-event (256-bit), stored in `events.event_key`, distributed to staff at login
3. Staff device: `crypto.subtle.decrypt` locally → send `registrationId` to `POST /api/scan/verify`
4. Non-staff device: decrypt fails → "QR tidak dapat dibaca oleh perangkat ini"
5. Post-scan display: Name + Company/Position + Reg# + **"Setujui"** button only
6. Story 7.4 retired entirely
7. QR scan fail → name search (Story 7.5) → same Setujui screen
8. `check_in_method: 'qr' | 'manual'` logged on `registrations` table
9. `checked_in_by TEXT` (CUID2 FK to users) logged for audit trail
10. Toast distinction: "check-in berhasil" (QR) vs "check-in manual berhasil" (name search)
11. `eventKey` validity = event duration (Phase 2 enforcement)
12. All PKs: `TEXT` (CUID2) — `id TEXT PRIMARY KEY`, app-layer via `@paralleldrive/cuid2`
13. All FK columns: `TEXT` (matching CUID2 PKs)

---

## Section 5: Implementation Handoff

**Scope:** Moderate

| Story | Assignee | Action |
|-------|----------|--------|
| 1.2 | Amelia (Dev) | Add Migration 005 columns: event_key, check_in_method, checked_in_by |
| 1.4 | Amelia (Dev) | Task 15: eventKeys + scan/verify schema + id type fix |
| 2.1 | Amelia (Dev) | AC6 + authStore shape + MSW eventKeys mock |
| 6.6 | Amelia (Dev) | Rewrite QR payload + MSW mock shape |
| 7.2 | Amelia (Dev) | Full AC redesign — decrypt + profile + Setujui |
| 7.4 | Bob (SM) | Confirmed retired in story file + sprint-status.yaml |
| 7.5 | Amelia (Dev) | Setujui screen + check_in_method:manual + remove OTP/reason dialog |

**Success criteria:**
- All story files reflect new check-in flow
- CUID2 consistent across 1.2 and 1.4
- Story 7.4 clearly marked retired
- `check_in_method` + `checked_in_by` in Migration 005
- `eventKeys` in 2.1 and 1.4 auth response shape
- MSW mocks updated in 6.6, 7.2, 7.5
