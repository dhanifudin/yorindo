---
stepsCompleted: [1, 2]
status: in-progress
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
feature: 'registration-form-revamp'
---

# UX Design Specification — Registration Form Revamp

**Author:** Dian
**Date:** 2026-04-07

---

## Executive Summary

### Project Vision

Transform the event registration form (`/register/[event-slug]/form`) from a visually inconsistent, disjointed experience into a cohesive **multi-step wizard** that guides participants through contact information, event-specific survey questions, and checkout completion with a single, clear call-to-action ("Selesai").

### Target Users

**Primary:** B2B professionals in Indonesia registering for manufacturing, technology, and industry-focused events (e.g., "Konferensi Kesehatan"). They are mid-to-senior level managers, engineers, and decision-makers filling out forms on desktop and mobile browsers.

**Secondary:** Event admins who configure registration forms via the survey builder (JSONB schema stored in `registration_survey_schema` on the events table).

### Key Design Challenges

1. **Visual inconsistency across sections** — "Informasi Kontak", "Survei", and "Checkout" currently have different styling, button sizes, and layout patterns. The form feels like three separate pages stitched together.

2. **Missing contact fields** — The current form doesn't capture all required participant information from the Google Form reference (missing: company location, industry type dropdown, corporate email, Gmail).

3. **Survey section theming mismatch** — Survey questions rendered with different component styles than the contact info section, breaking visual continuity.

4. **Incorrect final CTA** — The checkout section displays "Daftar Sekarang" (Register Now) instead of "Selesai" (Finish/Done), confusing the user at the final step.

5. **Event-specific survey fields** — Survey questions vary per event (stored as JSONB), so the form must dynamically render survey components from the event's schema rather than hardcoding fields.

### Design Opportunities

1. **Wizard pattern with progress indicator** — Clear step progression (1 of 3 → 2 of 3 → 3 of 3) gives users confidence in scope and reduces form abandonment anxiety.

2. **Sectioned single-page form** — Using a step-based wizard instead of separate page routes creates a contained, focused experience. Users know exactly what's coming next.

3. **Reusable survey renderer** — Since survey questions are JSONB-driven per event, the survey section becomes a dynamic form renderer that adapts to any event's assessment questions.

4. **Checkout as confirmation, not friction** — Since events are currently free, the checkout step serves as a final review/confirmation rather than a payment gateway. This reduces cognitive load and makes "Selesai" the natural conclusion.

---

## Core User Experience

### Defining Experience

**"Fill out your info, answer event-specific questions, confirm, and done."**

The registration form's core loop is linear and intentional: each step has a clear purpose, visible progress, and a single action that advances the user. No ambiguity, no parallel paths.

**Step 1 — Informasi Kontak (8 fields):**
The participant enters their identity — name, company, location, industry, title, emails, phone. All fields are required. The industry field uses a dropdown with 11 manufacturing industry options.

**Step 2 — Survei (event-specific questions):**
Dynamic questions rendered from the event's JSONB survey schema. Question types include multiple choice, checkboxes, rating scales, and text responses. The number and content of questions vary per event.

**Step 3 — Checkout / Selesai (confirmation):**
Summary of entered information + event details + payment info (informational for free events). Single CTA: **"Selesai"** which submits the registration.

### Platform Strategy

**Platform:** Web-first, responsive. Desktop is primary (B2B admins filling forms at work). Mobile must be fully functional — many participants will register from their phone via WhatsApp invitation links.

**Input model:** Touch-friendly on mobile (large tap targets, proper input types). Keyboard-friendly on desktop (tab navigation between fields).

**Wizard navigation:** Forward-only by default. Previous step button available for correction. No skip/step-jumping.

### Effortless Interactions

| Interaction | How we make it effortless |
|---|---|
| **Step progress** | Numbered steps (1 of 3) + visual progress bar. Always visible above the form. |
| **Field validation** | Inline per-field validation on blur. Step-level validation prevents advancing until all required fields are filled. Error summary shown at top of step. |
| **Industry dropdown** | Scrollable select with 11 options. On mobile, native OS picker. |
| **Survey rendering** | Consistent card-based question layout. Each question has clear label, input type, and required indicator. |
| **Checkout summary** | Grouped review of contact info + event info. "Edit" links that take you back to the relevant step. |
| **Final submission** | Single "Selesai" button. Loading state on submit. Success confirmation toast + redirect to registration confirmation page. |

### Critical Success Moments

1. **First impression** — Participant lands on the form, sees "Step 1 of 3: Informasi Kontak", progress bar at ~33%, clean layout matching the app's shadcn/ui theme. They know exactly what to do.

2. **Industry field** — Participant clicks the industry dropdown, sees 11 familiar Indonesian manufacturing categories. Finds their match instantly. No typing errors.

3. **Survey step** — Participant reaches Step 2, sees questions matching the event's assessment (same theme/style as Step 1). No jarring visual shift. Each question is scannable with clear radio/checkbox/text inputs.

4. **Checkout review** — Participant reviews their info, sees a clean summary. "Edit" links work. "Selesai" is prominent. They click it → loading → toast "Pendaftaran berhasil!" → redirect to confirmation.

5. **Mobile experience** — Participant opens registration link from WhatsApp on their phone. Form fits the screen. Inputs are touch-friendly. Keyboard types (email keyboard for email fields, number keyboard for phone). No horizontal scrolling.

---

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

**1. Typeform (typeform.com) — Conversational form builder**
- Solves: Making long forms feel digestible and engaging
- Standout pattern: **One question at a time** with keyboard navigation. Our multi-step wizard borrows the "one section at a time" mental model but groups related questions (not one-at-a-time)
- Anti-pattern to avoid: Typeform's single-question flow is too slow for 8+ field contact sections. We group fields into steps.

**2. Google Forms — Multi-section form with section breaks**
- Solves: Structured data collection with section navigation and progress indication
- Standout pattern: **Section headers + progress dots** at the top. Users always know which section they're on and how many remain
- Pattern to adopt: Required field indicator (*) + inline validation on submit
- Anti-pattern to avoid: Google Forms' lack of step validation — users can skip ahead even with empty required fields

**3. JotForm — Conditional logic form builder**
- Solves: Dynamic form rendering based on schema/config
- Standout pattern: **Question type renderer** — text, radio, checkbox, dropdown, scale all render with consistent card styling. This is exactly our Step 2 (survey) requirement
- Pattern to adopt: Each question rendered in a card with label, required indicator, and type-appropriate input

**4. Shopify Checkout — Multi-step checkout flow**
- Solves: Complex checkout reduced to Information → Shipping → Payment → Review
- Standout pattern: **Progress sidebar** showing completed/current/upcoming steps with checkmarks. Our wizard progress bar should follow this pattern
- Pattern to adopt: Review step shows summary with edit links back to specific steps

### Transferable UX Patterns

**Navigation Patterns:**
- **Google Forms' section breaks** → Our step headers with progress indicator
- **Shopify's progress sidebar** → Our horizontal progress bar with step labels (completed/current/upcoming)

**Interaction Patterns:**
- **Typeform's keyboard navigation** → Enter/Tab advances on desktop. On mobile, "Lanjut" button is prominent and fixed at bottom.
- **JotForm's question cards** → Each survey question in a card with consistent padding, label typography, and input styling
- **Shopify's review+edit** → Checkout step summary with "Ubah" (Change) links next to each section

**Visual Patterns:**
- **shadcn/ui Card + Badge** → Step progress uses Card for the form container, Badge for step numbers
- **shadcn/ui Progress** → Linear progress bar (not percentage, just step visualization)
- **shadcn/ui RadioGroup / Checkbox / Select / Input** → Consistent form inputs across all steps

### Anti-Patterns to Avoid

1. **Multi-page navigation** — Each step should NOT navigate to a new URL. Use client-side step state to keep the experience contained.

2. **Losing data on step change** — Form state must persist between steps (in React state or form context). Users should not re-enter data when going back and forth.

3. **Inconsistent required indicators** — All required fields must have a visible `*` or "Wajib diisi" label. No silent validation failures.

4. **Submit button ambiguity** — The final step must clearly say "Selesai" (not "Daftar", "Kirim", or "Bayar"). The action matches the mental model of "I'm done filling this out."

5. **No mobile optimization** — Form inputs must use proper `type` attributes (`email`, `tel`, `text`) so mobile keyboards adapt appropriately.

---

## Design System Foundation

### Design System Choice

**shadcn/ui + Tailwind CSS** — existing design system throughout the Yorindo app. Components already installed: Card, Button, Input, Select, Label, RadioGroup, Checkbox, Progress, Badge, Sheet, Tabs.

### Implementation Approach

| Component need | shadcn/ui solution |
|---|---|
| Wizard container | Custom component with step state management |
| Step progress bar | `Progress` component with step labels + checkmarks |
| Contact info fields | `Input`, `Select`, `Label` — all existing components |
| Survey renderer | Dynamic component map: `Input` (text), `RadioGroup` (multiple choice), `Checkbox` (checkboxes), `Select` (dropdown), `Slider` (rating scale) |
| Checkout summary | `Card` with grouped sections + `Button` (edit links) |
| Final CTA | `Button` with `size="lg"` and full width, text "Selesai" |
| Step navigation | `Button` variant="outline" (Kembali) + `Button` variant="default" (Lanjut) |

### Customization Strategy

**Design tokens — none new needed.** All existing tokens suffice:
- Primary action: `bg-primary text-primary-foreground`
- Secondary action: `bg-secondary text-secondary-foreground`
- Error state: `text-destructive`
- Required indicator: `text-destructive text-sm`

**New patterns:**
- Step progress with labels (not in existing codebase)
- Dynamic survey question renderer (new component based on JSONB schema)
- Checkout summary with edit links (new layout pattern)

**No new dependencies needed.**

---

## Defining Core Experience

### Core User Flow

```
Landing (/register/[event-slug]/form)
  └── Step 1: Informasi Kontak
        ├── Nama Lengkap* (text)
        ├── Nama Perusahaan/Instansi* (text)
        ├── Lokasi Kantor/Pabrik* (text)
        ├── Jenis Industri Manufaktur* (select: 11 options)
        ├── Jabatan* (text)
        ├── Email Gmail* (email)
        ├── Email Perusahaan* (email)
        └── No. Handphone (WA)* (tel)
        └── [Lanjut] (validates all fields)

  └── Step 2: Survei (dynamic from event JSONB schema)
        ├── Question 1* (type: radio | checkbox | text | scale)
        ├── Question 2*
        ├── Question N*
        └── [Kembali] [Lanjut]

  └── Step 3: Checkout / Selesai
        ├── Review: Contact info summary [Ubah]
        ├── Review: Event details
        ├── Review: Payment info (informational for free events)
        └── [Kembali] [Selesai] (submits registration)

  └── Success → Toast "Pendaftaran berhasil!" → Redirect to confirmation
```

### User Mental Model

Participants currently expect: "I click a registration link → I fill out my info → I get a confirmation." They don't think in "sections" — they think in "one form."

The wizard pattern works because it **chunks cognitive load** without breaking this mental model. The participant doesn't see "three forms" — they see "one registration, presented step by step."

Confusion points to address:
- **"Can I go back and change my answers?"** — Yes. Previous step button is always available on steps 2 and 3. Data persists between steps.
- **"What happens when I click Selesai?"** — Their registration is submitted. A confirmation toast appears, and they're redirected to a confirmation page (or stay on page with success state).
- **"Do I have to pay?"** — For free events, payment section shows "Gratis" or "Tidak ada biaya." No payment fields appear.

### Success Criteria

1. **Step 1 completion rate ≥ 80%** — Most drop-off happens at contact info. If fields are clear and validation is helpful, completion should be high.

2. **Zero validation confusion** — Required field errors must be specific ("Email perusahaan wajib diisi" not "Field is required").

3. **Survey rendering matches theme** — Step 2 survey questions use the exact same card styling, typography, and input components as Step 1. No visual discontinuity.

4. **"Selesai" is unambiguous** — The final CTA text, size, and position match the participant's expectation of "I'm done, submit my registration."

5. **Mobile form factor** — All inputs use correct `type` attributes. The form fits within viewport without horizontal scroll. "Lanjut" button is always visible (sticky at bottom on mobile).

---

## User Journey Map

### Journey: B2B Professional Registers for an Event

| Stage | User Action | Thought | Feeling | Design Response |
|---|---|---|---|---|
| **Landing** | Opens `/register/konferensi-kesehatan/form` from WhatsApp link | "Is this the right form? How long will it take?" | Cautious, time-aware | Step progress shows "1 of 3" immediately. Event name and date visible at top. |
| **Step 1** | Fills 8 contact fields | "Do I need both emails? What industry should I pick?" | Focused, slightly uncertain | Clear labels with `*` for required. Industry dropdown has descriptive options. |
| **Validation** | Misses a required field, clicks "Lanjut" | "What did I miss?" | Mildly frustrated | Inline error on the specific field. Error summary at top. |
| **Step 2** | Sees survey questions | "Oh, these are the assessment questions from the event description" | Familiar, engaged | Questions rendered in consistent cards. Matches event's theme. |
| **Step 3** | Reviews information | "Looks correct. I can edit if needed." | Confident | Summary with edit links. "Selesai" is prominent. |
| **Submission** | Clicks "Selesai" | "Done!" | Relieved, accomplished | Loading spinner → success toast → redirect to confirmation page. |

### Edge Cases

| Scenario | User Experience | Design Response |
|---|---|---|
| **Closes browser mid-form** | Loses progress (no auto-save, out of scope) | Not mitigated — confirmed out of scope |
| **Invalid industry selection** | Validation blocks advancement | Dropdown only allows valid options; no free-text edge case |
| **Survey question type unknown** | Renderer falls back to text input | Graceful degradation: unknown question types render as text field |
| **Free event with no payment info** | Checkout shows "Gratis" | Payment section is informational, not interactive |
| **Mobile with small screen** | Form scrolls vertically, button sticky at bottom | Responsive layout with `sticky bottom-0` action bar |
