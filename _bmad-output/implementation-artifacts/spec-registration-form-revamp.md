---
title: 'Registration Form Revamp'
type: 'feature'
created: '2026-04-07'
status: 'done'
context:
  - '_bmad-output/planning-artifacts/ux-design-registration-form.md'
baseline_commit: 'd111bef8f3a154f82667bf523eaebd703916ac7d'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The registration form (`/register/[eventSlug]/form`) has only 3 contact fields (name, email, phone) — missing 5 fields from the event organizer's Google Form reference (company, industry dropdown, location, title, secondary email). The 4 steps are rendered inline in a single ~400-line file with inconsistent styling between steps. The final CTA says "Daftar Sekarang" instead of "Selesai", confusing participants at the final step.

**Approach:** Expand Step 0 from 3 fields to 5 required + 3 optional fields with consistent shadcn/ui styling. Keep the existing RJSF survey renderer (Step 1) — it already dynamically renders event-specific questions from JSONB schema. Fix the Checkout step (Step 2) CTA text and styling. Ensure visual consistency across all steps.

## Boundaries & Constraints

**Always:**
- All new fields use existing shadcn/ui components (`Input`, `Select`, `Label`) — no new UI dependencies
- Survey step (Step 1) continues using RJSF with existing custom widgets — do not replace
- Form state uses `useState` pattern (existing approach) — do not migrate to react-hook-form or zod on frontend
- Free events show "Gratis" in checkout, no payment fields
- Final CTA text is "Selesai" (not "Daftar Sekarang")
- Backend `CreateRegistrationBodySchema` Zod validation must accept new optional fields

**Ask First:**
- If any existing field name conflicts with new fields (e.g., `email` vs `emailGmail` + `emailPerusahaan`)
- If the RJSF survey schema fetch endpoint returns unexpected shape

**Never:**
- Do not replace RJSF with a custom survey renderer — the existing dynamic renderer works
- Do not add auto-save / draft persistence (out of scope per UX spec)
- Do not change the API contract for `POST /api/registrations` — extend it, don't break it
- Do not split the form into separate route files — keep it as a single client component with step state

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path | All 5 required fields filled + survey completed + "Selesai" clicked | Registration created with status `pending`, redirect to confirmation | N/A |
| Missing required field | Step 0 with empty required field, clicks "Lanjut" | Inline error on field, step does not advance | Field-level error message |
| Optional field left blank | Step 0 with optional fields empty | Registration created, optional fields null/empty in payload | N/A |
| Free event checkout | Step 2 review, clicks "Selesai" | Submit with `order: { subtotal: 0, total: 0, ... }` | N/A |
| Survey fetch fails | GET `/api/events/{id}/survey/registration` returns 404/500 | Show fallback message, allow skip or retry | Error toast + retry button |

</frozen-after-approval>

## Code Map

- `yorindo-app/src/app/register/[eventSlug]/form/_client.tsx` -- Main registration form component (~400 lines, all 4 steps inline)
- `yorindo-app/src/components/features/registration/EventLandingCard.tsx` -- Pre-form event card (no changes needed)
- `yorindo-api/src/routes/registrations.routes.ts` -- Backend registration endpoint with Zod validation
- `yorindo-api/src/types/domain.ts` -- Contact domain type (may need new optional fields)
- `_bmad-output/planning-artifacts/ux-design-registration-form.md` -- Full UX design spec

## Tasks & Acceptance

**Execution:**
- [ ] `yorindo-app/src/app/register/[eventSlug]/form/_client.tsx` -- Expand Step 0 from 3 fields to 8 fields (5 required + 3 optional) with consistent shadcn/ui styling -- Matches Google Form reference fields
- [ ] `yorindo-app/src/app/register/[eventSlug]/form/_client.tsx` -- Add industry dropdown select with 11 manufacturing industry options -- Required field, scrollable dropdown
- [ ] `yorindo-app/src/app/register/[eventSlug]/form/_client.tsx` -- Fix Step 2 (Checkout) CTA from "Daftar Sekarang" to "Selesai", ensure consistent button sizing -- Visual consistency fix
- [ ] `yorindo-app/src/app/register/[eventSlug]/form/_client.tsx` -- Ensure all steps use consistent card styling, typography, and spacing -- Theme consistency across wizard
- [ ] `yorindo-api/src/routes/registrations.routes.ts` -- Extend `CreateRegistrationBodySchema` to accept new optional fields (company, industry, title, location, secondaryEmail) -- Backend validation alignment
- [ ] `yorindo-api/src/repositories/postgres/ContactRepository.ts` -- Ensure contact upsert handles new optional fields -- Data persistence

**Acceptance Criteria:**
- Given participant lands on registration form, when they view Step 0, then they see 8 fields: Nama Lengkap*, Perusahaan*, Email*, Phone/WA*, Industri*, plus optional Email Perusahaan, Jabatan, Lokasi
- Given participant fills all 5 required fields, when they click "Lanjut", then they advance to Step 1 (Survey)
- Given participant leaves an optional field empty, when they click "Lanjut", then step advances without error
- Given participant reaches Step 2 (Checkout), when they review the form, then the submit button says "Selesai" with consistent sizing across all steps
- Given all steps are visible, when comparing Step 0, 1, 2 styling, then they use the same card, typography, and spacing patterns
- Given participant clicks "Selesai", when submission succeeds, then registration is created with status `pending` and redirect to confirmation occurs

## Design Notes

**Field mapping from Google Form reference:**

| Google Form Field | New Field Name | Required | Type |
|---|---|---|---|
| Nama Lengkap | `name` | Yes | text |
| Nama Perusahaan/Instansi | `company` | Yes | text |
| Lokasi Kantor/Pabrik | `location` | No | text |
| Jenis Industri Manufaktur | `industry` | Yes | select (11 options) |
| Jabatan | `title` | No | text |
| Email Gmail | `email` | Yes | email |
| Email Perusahaan | `secondaryEmail` | No | email |
| No. Handphone (WA) | `phone` | Yes | tel |

**Industry dropdown options (11):**
Otomotif & Suku Cadang, Elektronik & Peralatan Rumah Tangga, FMCG, Makanan & Minuman, Farmasi & Alat Kesehatan, Plastik & Kemasan, Fabrikasi Logam & Mesin Presisi, Bahan Kimia Industri, Alat Berat & Karoseri, Tekstil & Garmen, Yang lain

## Suggested Review Order

**Form fields expansion & validation**

- Expanded Step 0 from 3→8 fields (5 required + 3 optional) with industry dropdown
  [`_client.tsx:269`](../../../yorindo-app/src/app/register/[eventSlug]/form/_client.tsx#L269)

- FormData interface extended with new optional fields
  [`_client.tsx:50`](../../../yorindo-app/src/app/register/[eventSlug]/form/_client.tsx#L50)

- Validation guard checks all 5 required fields before advancing
  [`_client.tsx:390`](../../../yorindo-app/src/app/register/[eventSlug]/form/_client.tsx#L390)

**Checkout & CTA fix**

- Participant summary shows new fields in checkout review
  [`_client.tsx:460`](../../../yorindo-app/src/app/register/[eventSlug]/form/_client.tsx#L460)

- Step 2 CTA changed from "Daftar Sekarang" to "Lanjut ke Konfirmasi →"
  [`_client.tsx:481`](../../../yorindo-app/src/app/register/[eventSlug]/form/_client.tsx#L481)

- Step 3 final submit button text: "Selesai" (was "Daftar Sekarang")
  [`_client.tsx:524`](../../../yorindo-app/src/app/register/[eventSlug]/form/_client.tsx#L524)

**Backend validation alignment**

- Zod schema extended with 5 new optional fields matching frontend payload
  [`registrations.routes.ts:31`](../../../yorindo-api/src/routes/registrations.routes.ts#L31)

**Submission payload**

- Registration POST body includes new fields (undefined when optional fields are empty)
  [`_client.tsx:88`](../../../yorindo-app/src/app/register/[eventSlug]/form/_client.tsx#L88)

