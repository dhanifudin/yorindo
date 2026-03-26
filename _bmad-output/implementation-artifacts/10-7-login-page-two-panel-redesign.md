# Story 10.7: Login Page Two-Panel Visual Redesign

**Story ID:** 10.7
**Story Key:** 10-7-login-page-two-panel-redesign
**Epic:** Epic 10 — UI Design System & Mobile-Native Redesign
**Phase:** Phase 1 (FE) — UI-only, zero logic/API changes
**Status:** review
**Created:** 2026-03-26
**Sprint Change Proposal:** 2026-03-26g

---

## Story

As an admin user arriving at the login page,
I want a professional two-panel layout that signals this is a secure, enterprise admin platform,
So that I feel confident I'm in the right place before entering my credentials.

> **Scope:** Redesign `src/app/login/layout.tsx` (two-panel split container) and update `src/app/login/page.tsx` (right panel content). Adopted from `Login.tsx` in `erick-surbakti/yorindo-landing` reference. Zero changes to `LoginForm`, `MockGoogleAuthDialog`, zod schema, useAuthStore, `handleParticipantLogin`, or any existing auth logic.

---

## Acceptance Criteria

**AC1:** On desktop (≥ 1024px / `lg` breakpoint):
- Left panel occupies half the screen (`w-1/2`)
- Right panel occupies half the screen (`w-1/2`)
- Both panels fill `min-h-screen`

**AC2:** On mobile (< 1024px):
- Left panel is hidden (`hidden lg:flex`)
- Right panel fills full width — form remains fully functional

**AC3:** Left panel visual:
- Dark navy background: `hsl(217 65% 10%)` (or `#0c1929`)
- Grid overlay: subtle white `1px` lines every `48px` via `background-image` CSS
- Two glow blobs: absolutely positioned, `border-radius: 50%`, `filter: blur(80px)`, `opacity: 0.25`
  - Blob 1: `420×420px`, `hsl(217 73% 35%)` (brand blue), top-left
  - Blob 2: `300×300px`, `hsl(200 80% 55%)` (light blue), bottom-right
- Logo chip (top): pill with `Shield` icon + "Yorindo Admin" text (white/85, semi-transparent bg)
- Center copy:
  - Small label: "Centralized Operations" (uppercase, tracked, white/35)
  - Headline: "Secure Admin" / "Access" — large, white, bold
  - Body: descriptive text, white/50
- Bottom: status bar with green pulse dot + "All systems operational · Internal use only"

**AC4:** Right panel visual:
- Background: `hsl(220 14% 96%)` (`bg-muted`) or white
- Flex column centered — the form card sits in the middle
- Form card: `bg-card`, `rounded-2xl`, `shadow-sm`, `p-8 md:p-10`, `max-w-[420px]`
- "Admin Portal" badge chip above the form title: `bg-secondary text-secondary-foreground`, shield icon

**AC5:** All existing form functionality preserved:
- `<LoginForm />` renders inside the right panel card — no changes to LoginForm
- `MockGoogleAuthDialog` and "Masuk sebagai Peserta" button still render when `ssoEnabled`
- `useAuthStore`, `handleParticipantLogin`, redirect logic — unchanged

**AC6:** `npm test` — no regressions. `npm run build` — 0 TypeScript errors.

---

## Tasks / Subtasks

- [x] **Task 1: Rewrite `src/app/login/layout.tsx`**
  - [x] Replace `<div className="min-h-screen flex items-center justify-center bg-gray-50">` with two-panel flex container
  - [x] Left panel: `hidden lg:flex w-1/2 flex-col justify-between p-12 relative overflow-hidden`
  - [x] Apply dark navy bg via inline style or Tailwind arbitrary value: `style={{ background: 'hsl(217 65% 10%)' }}`
  - [x] Right panel: `w-full lg:w-1/2 flex items-center justify-center p-6 bg-muted/40`
  - [x] `{children}` renders inside right panel

- [x] **Task 2: Left panel — Grid overlay**
  - [x] Absolutely positioned `<div>` with CSS `background-image` grid:
    ```css
    backgroundImage: `
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
    `,
    backgroundSize: '48px 48px'
    ```

- [x] **Task 3: Left panel — Glow blobs**
  - [x] Two `<div>` elements, absolutely positioned, `rounded-full`, `blur-[80px]`, `opacity-25`
  - [x] Blob 1: `w-[420px] h-[420px]`, `bg-primary/60`, `top-[-80px] left-[-80px]`
  - [x] Blob 2: `w-[300px] h-[300px]`, `bg-sky-400/40`, `bottom-[80px] right-[-60px]`

- [x] **Task 4: Left panel — Logo chip (top section)**
  - [x] `<div className="relative z-10 flex items-center gap-2 ...">`
  - [x] Pill with `Shield` icon (from lucide-react) + "Yorindo Admin" text
  - [x] Styles: `bg-white/7 border border-white/12 rounded-full px-3 py-1.5 text-sm text-white/85`

- [x] **Task 5: Left panel — Center copy (middle section)**
  - [x] Small label: uppercase, `text-white/35`, `tracking-widest`, `text-xs`
  - [x] Headline: "Secure Admin" + line break + italic "Access" in `text-white/50`; large font (`text-4xl md:text-5xl font-bold text-white`)
  - [x] Body: `text-white/50 text-sm leading-relaxed`

- [x] **Task 6: Left panel — Status bar (bottom section)**
  - [x] Green pulse dot: `w-[7px] h-[7px] rounded-full bg-green-400`; animate with `animate-pulse`
  - [x] Text: "All systems operational · Internal use only", `text-white/35 text-xs`

- [x] **Task 7: Update `src/app/login/page.tsx` — right panel wrapper**
  - [x] Wrap existing content in a form card: `<div className="w-full max-w-[420px] bg-card rounded-2xl shadow-sm p-8 md:p-10">`
  - [x] Add "Admin Portal" badge chip above the current "Yorindo" / "Admin Portal" header:
    - `<div className="inline-flex items-center gap-1.5 bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-xs font-semibold mb-6">`
    - `<Shield className="h-3 w-3" /> Admin Portal`
  - [x] Keep existing: logo text, `LoginForm`, SSO button (if `ssoEnabled`)
  - [x] Remove old className from the existing wrapping div (now layout.tsx handles the outer shell)

- [x] **Task 8: Verify**
  - [x] `npm test` — no regressions
  - [x] `npm run build` — 0 TypeScript errors
  - [x] Desktop (1280px): two panels visible, left panel readable
  - [x] Mobile (375px): left panel hidden, form fully accessible

- [x] **Task 9: Patch — Visual polish (Sprint Change Proposal 2026-03-26h)**
  - [x] `layout.tsx` logo chip: add circular `bg-gradient-to-br from-blue-600 to-blue-800` icon container wrapping Shield icon
  - [x] `page.tsx` Admin Portal badge: replace `<Shield>` icon with `<div className="w-1.5 h-1.5 rounded-full bg-primary" />`
  - [x] `page.tsx` footer note: add "Restricted to authorized personnel only" with flanking dots below SSO section
  - [x] `npm run build` — 0 TypeScript errors

---

## Dev Notes

> **Theme constraint (Sprint Change Proposal 2026-03-26f + 2026-03-26g):**
> Left panel uses custom dark navy (not from theme tokens). Right panel uses `bg-muted/40` and `bg-card`. Form card uses shadcn tokens throughout.

### Reference
Local reference: `/home/dhs/Workspaces/kada/yorindo-landing/src/pages/Login.tsx`

### Layout structure
```tsx
// layout.tsx
export default function LoginLayout({ children }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — hidden on mobile */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 relative overflow-hidden"
           style={{ background: 'hsl(217 65% 10%)' }}>
        {/* grid overlay, blobs, logo chip, copy, status */}
      </div>
      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-muted/30">
        {children}
      </div>
    </div>
  )
}
```

### Glow blob pattern
```tsx
{/* Blob 1 */}
<div className="absolute rounded-full blur-[80px] opacity-25 w-[420px] h-[420px] bg-primary/60 -top-20 -left-20 pointer-events-none" />
{/* Blob 2 */}
<div className="absolute rounded-full blur-[80px] opacity-25 w-[300px] h-[300px] bg-sky-400/40 bottom-20 -right-16 pointer-events-none" />
```

### Important: layout.tsx is a Server Component
Do NOT add `'use client'` to `layout.tsx`. All state (`useState`) lives in `page.tsx` which already has `'use client'`.
