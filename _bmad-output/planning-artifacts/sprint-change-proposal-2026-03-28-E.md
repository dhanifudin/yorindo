# Sprint Change Proposal — SCP-2026-03-28-E

**Date:** 2026-03-28
**Scope:** Moderate
**Status:** Approved

---

## Section 1: Issue Summary

**Event Banner/Poster & Unified Registration Checkout**

Two related additions:

1. **Event visual assets** — Admin uploads a landscape banner and portrait poster when creating/editing an event. Banner appears as the header on the public event landing page and as a persistent visual anchor throughout the multi-step registration form. Poster is for sharing (WhatsApp, social media).

2. **Unified checkout step in registration** — The registration flow gains a 4th step: contact info → survey → **checkout/order summary** → confirmed. All events — free and paid — go through the same checkout flow. Free events show "Gratis" and the CTA reads "Daftar Sekarang"; paid events (future) will add a payment gateway step. When `total === 0` the backend skips payment processing entirely and advances registration status directly.

**Trigger:** Product requirement for a professional event landing/registration experience. Free events still benefit from an explicit confirmation step (reduces no-shows via intentional commitment). Unified checkout future-proofs for paid events without bifurcating the registration codebase.

---

## Section 2: Impact Analysis

| Story | Change Type |
|-------|-------------|
| 1.4 OpenAPI Spec | Task 17: Event schema `is_paid`/`price`/`payment_method` fields + Registration payload `order` object |
| 1.5 FE Type Definitions | Task 8: Update `Event` interface + add `RegistrationOrder` type + MSW fixture update |
| 4.1 Event Creation | Dev Notes update: sync `Event` interface in Dev Notes with AC7 payment fields |
| 4.13 Event Banner/Poster Upload | **Promote from backlog → ready-for-dev**: full story spec written |
| 6.2 Registration Form | AC8 added: checkout/order summary step (step 3 of 4-step flow) |

**No new epics. No scope reduction. MVP unchanged.**

---

## Section 3: Recommended Approach

**Direct Adjustment** — modify existing stories + create Story 4.13 file.

- No rollback required
- Effort: Medium (1 new story file, 4 story updates)
- Risk: Low — checkout step is a UI-only addition for Phase 1 (no payment gateway); banner/poster are nullable (graceful degradation for events without images)

---

## Section 4: Detailed Decisions

1. **Banner** = landscape image (16:9 recommended, max 2MB). Shown as full-width header on `/register/[eventSlug]` landing page and as a sticky top strip during the registration form steps.
2. **Poster** = portrait image (4:3 or A4 ratio, max 2MB). For sharing only — no functional role in the registration flow itself.
3. Both `banner_url` and `poster_url` are **nullable** on `Event` — existing events without images degrade gracefully (fallback: gradient placeholder using event name initials).
4. Phase 1 (MSW): store as object URL or base64 data URL in the in-memory events store. No S3 in Phase 1.
5. Phase 2 (BE): S3/object storage with signed URLs. `events` table gets `banner_url TEXT` and `poster_url TEXT` columns in Migration 007.
6. **Checkout step** is step 3 in a 4-step registration flow: contact info (1) → survey (2) → checkout (3) → confirmed (4).
7. Checkout step displays: event banner (if set), event name + date + venue, participant summary (name, email, phone), price line — hidden entirely when `total === 0`; shows **"Gratis"** badge when free.
8. CTA label adapts: `"Daftar Sekarang"` (free) vs `"Bayar Sekarang"` (paid, future).
9. `POST /api/registrations` payload extended with `order: { subtotal: number, discount: number, total: number, currency: 'IDR', payment_method: string | null }`. When `total === 0`, `payment_method` is `null`.
10. When `total === 0`: registration proceeds directly to status transition (no external payment call). Payment gateway integration (Midtrans/Xendit) is explicitly deferred — placeholder interface `IPaymentGatewayService` stubbed in Story 1.8 scope, not wired.
11. `Event` interface in Story 1.5 types updated to include `is_paid: boolean`, `price: number` (default 0), `payment_method: string | null`. These fields were added to Story 4.1 AC7 but never propagated to the shared type layer.

---

## Section 5: Implementation Handoff

**Scope:** Moderate

| Story | Assignee | Action |
|-------|----------|--------|
| 1.4 | Amelia (Dev) | Task 17: OpenAPI Event schema payment fields + Registration `order` object |
| 1.5 | Amelia (Dev) | Task 8: `Event` interface payment fields + `RegistrationOrder` type + MSW fixture update |
| 4.1 | Amelia (Dev) | Dev Notes update: sync `Event` interface with AC7 fields (`is_paid`, `price`, `payment_method`) |
| 4.13 | Amelia (Dev) | New story file created — full spec including banner/poster upload UI + MSW handler + vitest tests |
| 6.2 | Amelia (Dev) | AC8: checkout step — order summary display + `order` object in POST payload |

**Success criteria:**
- `Event` type exports `is_paid: boolean`, `price: number`, `payment_method: string | null`
- `RegistrationOrder` type exported from `src/types/api.ts`
- `POST /api/registrations` MSW handler accepts and stores `order` object
- Story 4.13: admin can upload banner + poster in event creation/edit form; images stored in MSW in-memory store; displayed on landing page + during registration form
- Registration flow is 4 steps: contact info → survey → checkout → confirmed
- Checkout step shows participant summary + event details + "Gratis" badge (free) or price (paid)
- CTA is "Daftar Sekarang" for free events
- All fields nullable/optional — no regressions for existing MSW-seeded events without images
