# Sprint Change Proposal 2026-03-26i
# Experimental Feature Flag — Centralized Utility + UI Gate Audit Fixes

**Date:** 2026-03-26
**Scope Classification:** Minor — 1 new utility file, 3 component patches
**Status:** Approved

---

## Section 1: Issue Summary

Audit of `NEXT_PUBLIC_ENABLE_EXPERIMENTAL` gating across all UI components revealed:
- Only `login/page.tsx` gates its features; all other gating is missing
- No centralized feature flag utility — each component must re-implement `process.env.NEXT_PUBLIC_ENABLE_EXPERIMENTAL === 'true'`
- `EventLandingCard.tsx` shows "Daftarkan ke Waiting List" CTA when full regardless of flag (violates Story 6.5 requirement from SCP 2026-03-26b)
- `cancel/[token]/_client.tsx` references waitlist in cancellation copy unconditionally

---

## Section 2: Impact Analysis

**Files changed:** 4 (1 new, 3 patched)
**Stories affected:** None — patches to already-implemented code
**Sprint-status changes:** None

---

## Section 3: Detailed Change Proposals

### Change 1: `src/lib/featureFlags.ts` (new)
Single source of truth for all feature flags. Components import from here.

### Change 2: `login/page.tsx`
Replace local `ssoEnabled` const with imported `EXPERIMENTAL_ENABLED`.

### Change 3: `EventLandingCard.tsx`
Gate waitlist CTA per Story 6.5 requirement: when `!EXPERIMENTAL_ENABLED` and event is full, show "Kapasitas Penuh" with no waitlist reference.

### Change 4: `cancel/[token]/_client.tsx`
Gate waitlist copy: when `!EXPERIMENTAL_ENABLED`, slot returns to event capacity (no waitlist mention).

---

## Section 5: Implementation Handoff

**Scope:** Minor — direct implementation, no PO/SM involvement needed.

**Success criteria:**
- `featureFlags.ts` exists and exports `EXPERIMENTAL_ENABLED`
- `login/page.tsx` imports from `featureFlags.ts`
- Full event shows "Kapasitas Penuh" (no waitlist) when `EXPERIMENTAL_ENABLED=false`
- Cancellation copy omits waitlist when `EXPERIMENTAL_ENABLED=false`
- `npm run build` — 0 TypeScript errors
- `npm test` — 127/128 (pre-existing failure only)
