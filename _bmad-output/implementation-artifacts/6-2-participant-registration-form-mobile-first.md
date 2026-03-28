# Story 6.2: Participant Registration Form (Mobile-First)

## Story
As a participant, I want to complete a registration form on mobile with phone pre-fill and multi-step flow.

## Acceptance Criteria
- [x] /register/[eventSlug]/form — multi-step form (contact info → survey → confirm)
- [x] Fixed field order: `email`, `name`, `phone`, `company_email`, `company_name`, `company_location` (LocationPicker), `position`, `industry_type`
- [ ] ~~Phone pre-fill via GET /api/contacts/lookup?phone=~~ **REMOVED 2026-03-28** — no client-side lookup; backend flags duplicate contacts (manual path only) for admin review via Story 3-5
- [x] POST /api/registrations on submit
- [x] Consent checkbox captured
- [x] Google Calendar deep link on success
- [ ] **SSO path (2026-03-28):** When SSO completes and `contactProfile` is returned (Story 6-8 AC12), pre-fill ALL fixed fields. `phone` always remains editable. All other pre-filled fields shown with "✓ Terisi dari profil" badge (locked read-only).
- [ ] **AC8 (2026-03-28 — SCP-2026-03-28-E):** Registration flow is 4 steps: contact info (1) → survey (2) → checkout (3) → confirmed (4). The checkout step (step 3) displays:
  - Event banner image at top (if `banner_url` set; fallback: gradient placeholder with event name initials)
  - Event name, date, venue summary
  - Participant summary: name, email, phone
  - Price line: hidden entirely when `event.is_paid === false`; shows **"Gratis"** badge when free and price row visible
  - CTA: `"Daftar Sekarang"` when `event.is_paid === false`; `"Bayar Sekarang"` when paid (future)
  - On CTA click: `POST /api/registrations` with `order: { subtotal: 0, discount: 0, total: 0, currency: 'IDR', payment_method: null }` for free events
  - Step progress indicator updated to show 4 steps

> **Code review note (2026-03-28):**
> - Reorder fixed fields to `email → name → phone → ...`
> - Remove phone blur/lookup handler
> - SSO path pre-fills ALL fixed fields (not just name+email) when `contactProfile` is returned from `POST /api/auth/google` (Story 6-8 AC12)
> - `phone` is the only pre-filled field that remains editable
> - Manual path: no pre-fill; backend flags duplicates post-submit for admin review (Story 3-5); SSO skips dedup entirely

## Status: review

> **Updated 2026-03-28 (SCP-2026-03-28-D):** `company_location` field replaced by `LocationPicker` (province → city cascade using wilayah.id). Submits `province_code`, `province_name`, `city_code`, `city_name` in registration payload. SSO pre-fill: if `contactProfile` has location codes, province/city shown read-only with "✓ Terisi dari profil" badge (same pattern as other pre-filled fields). `LocationPicker` component created in Story 3.1 Task 8.

---

## Tasks (Open ACs)

- [ ] **Task A: SSO pre-fill path**
  - [ ] Import `contactProfile` shape from Story 6-8 AC12 — `POST /api/auth/google` returns `{ accessToken, user, contactProfile? }` where `contactProfile` contains all fixed field values
  - [ ] When `contactProfile` is present: pre-fill all fixed fields; show "✓ Terisi dari profil" `Badge` on each locked field; `phone` field remains `readOnly={false}`; all other pre-filled fields `readOnly={true}`
  - [ ] When `contactProfile` has `province_code`/`city_code`: pass them as `defaultValue` to `LocationPicker`; render `LocationPicker` as read-only with "✓ Terisi dari profil" badge
  - [ ] **Depends on Story 6-8** — if 6-8 is not yet merged, use the MSW mock for `POST /api/auth/google` which returns a fixture `contactProfile`
  - [ ] Use RHF `setValue` to populate fields after SSO; do not re-render the entire form

- [ ] **Task B: 4-step checkout flow (AC8)**
  - [ ] Add step 3 "Checkout" between survey and confirmed. Step progress indicator shows 4 steps: `Informasi` → `Survei` → `Checkout` → `Selesai`
  - [ ] Checkout step component: `src/components/features/registration/CheckoutStep.tsx`
    - Event banner at top — use `event.banner_url` (from Story 4.13; nullable — use `GradientPlaceholder` fallback from `src/components/shared/GradientPlaceholder.tsx`)
    - Event name, date (formatted `id-ID` locale), venue
    - Participant summary: name, email, phone from RHF form values
    - Price line: `if (event.is_paid) show price; else show "Gratis" Badge` — hide price row entirely when `!event.is_paid`
    - CTA: `"Daftar Sekarang"` when `!event.is_paid`; `"Bayar Sekarang"` when paid (future)
  - [ ] On CTA click: call `POST /api/registrations` with full form data + `order: { subtotal: 0, discount: 0, total: 0, currency: 'IDR', payment_method: null }` for free events
  - [ ] **Import `GradientPlaceholder`** from `src/components/shared/GradientPlaceholder.tsx` (Story 4.13 file)
  - [ ] **Depends on Story 4.13** for `GradientPlaceholder` — if 4.13 not yet merged, create a local placeholder inline and replace when 4.13 merges

- [ ] **Task C: Update MSW registrations handler**
  - [ ] **UPDATE** (not create) `src/mocks/handlers/registrations.ts` — already exists from Story 1.6
  - [ ] `POST /api/registrations` handler: accept and store `order` object in the in-memory registration record; return it in the 201 response

- [ ] **Task D: LocationPicker integration**
  - [ ] Import `LocationPicker` from `src/components/shared/LocationPicker.tsx` (Story 3.1 Task 8 file)
  - [ ] Wire `province_code`, `province_name`, `city_code`, `city_name` into RHF schema (`z.string().nullable().optional()` for each)

## Dev Notes

### Multi-step State Pattern
Use **React Hook Form with a step index** — single `useForm` wraps all steps. Step progression via local `useState<number>(0)`. Do NOT use Zustand for step state — keep it component-local. Do NOT use URL params for steps (no page navigation between steps).

```typescript
const [step, setStep] = useState(0) // 0=contact, 1=survey, 2=checkout, 3=confirmed
const form = useForm<RegistrationFormData>({ resolver: zodResolver(schema) })
```

### Test Requirements
- Render step 3 (checkout): event banner shown when `banner_url` set; `GradientPlaceholder` shown when null
- Free event: price row hidden; CTA = "Daftar Sekarang"
- SSO path: all fields pre-filled and locked except `phone`; location picker read-only when codes present
- POST body includes `order` object
- Step progress indicator shows 4 steps
