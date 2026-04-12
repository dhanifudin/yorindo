# Story 10.6: Landing Page Full Structural Rebuild

**Story ID:** 10.6
**Story Key:** 10-6-landing-page-full-rebuild
**Epic:** Epic 10 — UI Design System & Mobile-Native Redesign
**Phase:** Phase 1 (FE) — UI-only, zero logic/API changes
**Status:** review
**Created:** 2026-03-26
**Sprint Change Proposal:** 2026-03-26g

---

## Story

As a visitor to the EM . U platform,
I want a professional, structured landing page that communicates what EM . U does,
So that I understand the platform before logging in.

> **Scope:** Rebuild `src/app/page.tsx` as an 8-section full-page layout adopted from `erick-surbakti/yorindo-landing` reference (locally at `/home/dhs/Workspaces/kada/yorindo-landing/src/`). Create `LandingHeader.tsx` as a sticky nav. Content adapted to EM . U app (Indonesian language, correct routes). Zero changes to `PublicShell`, `/register`, `/data-rights`, hooks, MSW handlers, or any existing functionality.

---

## Acceptance Criteria

**AC1:** The landing page (`/`) no longer uses `PublicShell`. It renders a full-width layout with no `max-w-xl` container constraint at the page level.

**AC2:** A sticky `LandingHeader` is rendered at the top:
- Logo: EM . U logo image (or pill with shield icon + "EM . U" text + "Communication" subtitle)
- Nav links: "Overview", "Sistem", "Workflow", "Akses" — anchor scroll to matching section IDs
- "Masuk" button → `/login` (using shadcn `Button`)
- Mobile: hamburger menu that toggles a dropdown nav

**AC3:** Hero section:
- Full-viewport (`min-h-[70vh]` or `py-24 md:py-36`)
- Background: `public/hero-bg.png` (copy from reference `src/assets/hero-bg.png`) with dark overlay + blue overlay (`hsl(217 73% 35% / 0.45)`)
- Title: `h1` "EM . U Admin Platform" — large, bold, white; "Platform" span with blue gradient
- Subtitle: descriptive text in white/80
- CTA: gradient blue `Button` → `/login`
- 3 inline stats: "6 Core Modules", "24/7 System Uptime", "Secure Role-Based"
- Section ID: `id="overview"`

**AC4:** AboutSystem section:
- `section-label` pill: "Tentang Sistem"
- `h2` with `gradient-text` span
- 4 cards using `.card-elevated`, `.icon-container` with lucide icons (not emoji): CalendarCheck, Ticket/TicketCheck, Monitor, Target
- Bottom accent line on hover (`group-hover:bg-primary/40`)
- Content in Indonesian matching actual EM . U features

**AC5:** CoreModules section:
- Background: `bg-surface`
- `section-label` pill: "Modul Utama"
- 6 module cards in 3-col grid (lg) / 2-col (sm): Event Management, Database Kontak, Blast & Notifikasi, Check-in QR, Laporan & Analitik, YoriMind AI
- Each card: `.card-elevated`, `.icon-container`, `Badge` variant="secondary" with category label
- Section ID: `id="sistem"`

**AC6:** HowItWorks section:
- `section-label` pill: "Workflow"
- 4-step flow: "Input Data" → "Kelola & Monitor" → "Eksekusi" → "Analisis Hasil"
- Each step: icon in `h-[72px] w-[72px] rounded-2xl bg-card border-2 border-primary/20`, step number in `font-mono text-xs text-primary`, title, description
- Desktop connector: `<div className="hidden md:block absolute top-[52px] left-[12%] right-[12%] step-connector" />`
- Section ID: `id="workflow"`

**AC7:** Architecture section:
- Background: `bg-surface`
- 3-node horizontal flow: Admin → EM . U System → Output (Events · Kontak · Laporan)
- Nodes connected by `ChevronRight` icon with short line segment
- On mobile: vertical flow with rotated chevron
- Each node: `.card-elevated`, `.icon-container`

**AC8:** AccessSecurity section:
- `section-label` pill: "Keamanan"
- 3 cards centered (max-w-4xl): Role-Based Access (ShieldCheck), Kontrol Admin (Lock), Pengelolaan Data UU PDP (KeyRound)
- Section ID: `id="akses"`

**AC9:** Footer:
- Logo + "EM . U Communication" wordmark
- Nav links: Overview, Sistem, Workflow, Akses (anchor links)
- Separator
- Copyright + "Hak Data Anda" → `/data-rights` link (preserved from original)

**AC10:** `npm test` — no regressions. `npm run build` — 0 TypeScript errors.

---

## Tasks / Subtasks

- [x] **Task 1: Copy hero background image**
  - [x] Copy `/home/dhs/Workspaces/kada/yorindo-landing/src/assets/hero-bg.png` → `src/app/public/hero-bg.png` (Next.js `public/` folder at `yorindo-app/public/hero-bg.png`)
  - [x] Verify image is accessible at `/hero-bg.png` in dev server

- [x] **Task 2: Create `LandingHeader` component**
  - [x] Create `src/components/layout/LandingHeader.tsx`
  - [x] Sticky, `backdrop-blur-xl`, `border-b border-border/60`, `z-50`
  - [x] Logo: shield icon pill + "EM . U" bold + "Communication" subtitle text
  - [x] Desktop nav: anchor links (Overview, Sistem, Workflow, Akses, Keamanan)
  - [x] "Masuk" → `<Button asChild size="sm"><Link href="/login">Masuk</Link></Button>`
  - [x] Mobile: `useState` hamburger toggle, dropdown nav below header

- [x] **Task 3: Rebuild `src/app/page.tsx`**
  - [x] Remove `PublicShell` wrapper — use `<div className="min-h-screen bg-background">` directly
  - [x] Import and render `LandingHeader` at top

- [x] **Task 4: Hero section**
  - [x] `<section id="overview" className="relative overflow-hidden">`
  - [x] `<div className="absolute inset-0">` with `<Image src="/hero-bg.png" fill className="object-cover" alt="" />`
  - [x] Dark overlay: `<div className="absolute inset-0 bg-black/60" />`
  - [x] Blue overlay: inline style with gradient
  - [x] Content: `max-w-2xl`, white text, `h1` with gradient span, subtitle, CTA Button, stats row

- [x] **Task 5: AboutSystem section**
  - [x] `<section className="py-20 md:py-28">` — white background
  - [x] Centered heading block with `section-label`, `gradient-text` span
  - [x] 4-card grid using `card-elevated`, `icon-container`, lucide icons, bottom accent hover line
  - [x] Content: Manajemen Event (CalendarCheck), Sistem Tiket (TicketCheck), Database Kontak (Users), Operasional (Target)

- [x] **Task 6: CoreModules section**
  - [x] `<section id="sistem" className="py-20 md:py-28 bg-surface">`
  - [x] 6-module 3-col grid with `card-elevated`, `icon-container`, `Badge variant="secondary"`
  - [x] Modules: Event, Kontak, Blast, Check-in, Laporan, YoriMind

- [x] **Task 7: HowItWorks section**
  - [x] `<section id="workflow" className="py-20 md:py-28">`
  - [x] Relative container with `step-connector` absolutely positioned line (added to globals.css)
  - [x] 4-col grid of step cards with STEP 01–04 labels

- [x] **Task 8: Architecture section**
  - [x] `<section className="py-20 md:py-28 bg-surface">`
  - [x] 3-node horizontal/vertical flow with ChevronRight connectors

- [x] **Task 9: AccessSecurity section**
  - [x] `<section id="akses" className="py-20 md:py-28">`
  - [x] 3 centered cards: ShieldCheck, Lock, KeyRound

- [x] **Task 10: Footer**
  - [x] Logo + nav anchor links + Separator + copyright + `/data-rights` link

- [x] **Task 11: Verify**
  - [x] `npm test` — 127/128 pass (1 pre-existing failure in useEvents.test.ts)
  - [x] `npm run build` — compiled successfully, 0 TypeScript errors

- [x] **Task 12: Patch — Container centering (Sprint Change Proposal 2026-03-26h)**
  - [x] Add `.container { @apply mx-auto px-4 md:px-6; }` to `globals.css @layer base`
  - [x] Verify all landing sections are horizontally centered on wide screens (≥1280px)
  - [x] `npm run build` — 0 TypeScript errors

---

## Dev Notes

> **Theme constraint (Sprint Change Proposal 2026-03-26f + 2026-03-26g):**
> Use globals.css utility classes: `.card-elevated`, `.icon-container`, `.section-label`, `.gradient-text`, `.step-connector`
> Use design tokens: `bg-surface`, `bg-primary`, `text-primary`, `text-muted-foreground`, `border-border`

### Reference
Local reference: `/home/dhs/Workspaces/kada/yorindo-landing/src/sections/`

### next/image for Hero
```tsx
import Image from 'next/image'
// Inside the absolute inset-0 div:
<Image src="/hero-bg.png" alt="" fill className="object-cover" priority />
```

### LandingHeader mobile pattern
```tsx
const [mobileOpen, setMobileOpen] = useState(false)
// Toggle with Menu / X icons from lucide-react
// Dropdown: conditional render below header bar
```

### Step connector (globals.css already has `.step-connector`)
```tsx
<div className="relative">
  <div className="hidden md:block absolute top-[52px] left-[12%] right-[12%] step-connector" />
  <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6">
    {/* step cards */}
  </div>
</div>
```
