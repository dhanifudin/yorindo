# Story 7.4: ~~OTP-Based Identity Recovery~~ *(Retired 2026-03-28)*

**Story ID:** 7.4
**Story Key:** 7-4-ktp-based-identity-verification
**Epic:** Epic 7 — Event-Day Check-in (Offline-First PWA)
**Status:** review

---

> **RETIRED 2026-03-28** — OTP recovery flow removed entirely from the participant status model. KTP identity matching is now the primary identity confirmation step, built directly into the Setujui screen in Stories 7.2 (QR scan) and 7.5 (name search). No separate OTP story is needed.
>
> This story is kept for history. **Do not implement.**

---

## Original Story (archived)

Staff can recover participant identity by requesting/verifying OTP when QR is unavailable.

### Original Acceptance Criteria (DO NOT IMPLEMENT)
- ~~OTP Recovery Sheet on scan page~~
- ~~Enter phone → POST /api/scan/otp/request~~
- ~~Enter OTP → POST /api/scan/otp/verify~~
- ~~Success shows check-in confirmation~~

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-22 | Story created | bmad-context-engine |
| 2026-03-28 | Retired — OTP flow removed; KTP matching built into 7.2 + 7.5 Setujui screen | SCP-2026-03-28-B |
