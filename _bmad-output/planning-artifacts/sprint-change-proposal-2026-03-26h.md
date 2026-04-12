# Sprint Change Proposal 2026-03-26h
# Post-Review Gaps: Landing Alignment, Login Polish, Admin Dashboard Redesign

**Date:** 2026-03-26
**Scope Classification:** Minor — all UI-only patches within Epic 10, no PRD/Architecture/logic changes
**Status:** Approved

---

## Section 1: Issue Summary

Three gaps identified after reviewing the just-completed Epic 10 stories (10.6, 10.7, 10.8) against the reference implementation at `/home/dhs/Workspaces/kada/yorindo-landing/src/`.

**Gap A — Landing page container not centered**
All `<div className="container">` blocks in `page.tsx` and `LandingHeader.tsx` lack `mx-auto`. In Tailwind v4 CSS-first mode, the `container` utility does not auto-center. On viewports wider than the container max-width, all section content sticks to the left edge. Fix: one-line addition to `globals.css`.

**Gap B — Login visual polish (3 sub-gaps in Story 10.7)**
The two-panel layout structure from 10.7 is correct. Three cosmetic details are missing vs. the reference `Login.tsx`:
1. Left-panel logo chip: reference has a circular gradient-blue icon container housing the Shield icon. Current: Shield icon placed directly without the container.
2. Right-panel "Admin Portal" badge: reference uses a small `6×6px` blue dot. Current: Shield icon used.
3. Footer note at bottom of form card: "Restricted to authorized personnel only" with flanking dots is missing entirely.

**Gap C — Admin dashboard content still uses original basic card layout**
Story 10.8 added the topbar. The dashboard content page (`AdminDashboard.tsx`) was not part of any Epic 10 story. The reference `Dashboard.tsx` shows a polished panel-based layout that differs significantly from the current basic `rounded-xl border bg-card` grid:
- Stats displayed as a single horizontal bordered strip with internal dividers
- Events list in a panel with a header bar and "Lihat Semua" link
- Row hover states and icon columns matching the reference aesthetic

---

## Section 2: Impact Analysis

**Epic Impact:** Epic 10 only. No other epics affected.

**Story Impact:**
- Story 10.6 (landing rebuild) — patch: add container centering to `globals.css`
- Story 10.7 (login redesign) — patch: 3 small JSX tweaks to `layout.tsx` and `page.tsx`
- Story 10.9 (new) — full visual redesign of `AdminDashboard.tsx`

**Artifact Conflicts:** None. PRD, Architecture, UX Design, Tech Spec — all unaffected. This is UI cosmetics only.

**Technical Impact:** Zero logic changes. No hooks, no API contracts, no MSW handlers, no auth flow, no routing.

---

## Section 3: Recommended Approach

**Direct Adjustment (Option 1)** — chosen.

Two patches to existing reviewed stories; one new story added to Epic 10. The total implementation effort is low (estimated 1–2 hours combined). No rollback needed, no MVP scope reduction.

---

## Section 4: Detailed Change Proposals

### Proposal A: Container Centering — patch to Story 10.6

**File:** `yorindo-app/src/app/globals.css`

```css
/* ADD to @layer base — after the body/html rules */
.container {
  @apply mx-auto px-4 md:px-6;
}
```

This applies globally and fixes all sections at once without touching individual files.

---

### Proposal B: Login Visual Polish — patch to Story 10.7

**File:** `src/app/login/layout.tsx` — Logo chip (left panel)

OLD:
```tsx
<div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/7 px-3 py-1.5">
  <Shield className="h-4 w-4 text-white/85" />
  <span className="text-sm font-medium text-white/85">EM . U Admin</span>
</div>
```

NEW:
```tsx
<div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/7 px-2 py-1.5 pr-3">
  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-blue-800">
    <Shield className="h-3.5 w-3.5 text-white" />
  </div>
  <span className="text-sm font-medium text-white/85">EM . U Admin</span>
</div>
```

**File:** `src/app/login/page.tsx` — Admin Portal badge (right panel)

OLD:
```tsx
<div className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
  <Shield className="h-3 w-3" />
  Admin Portal
</div>
```

NEW:
```tsx
<div className="inline-flex items-center gap-1.5 rounded-full bg-secondary border border-primary/20 px-3 py-1 text-xs font-semibold text-secondary-foreground">
  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
  Admin Portal
</div>
```

**File:** `src/app/login/page.tsx` — Footer note (add below SSO section)

```tsx
{/* Footer note */}
<div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60">
  <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
  Restricted to authorized personnel only
  <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
</div>
```

---

### Proposal C: Admin Dashboard Redesign — new Story 10.9

See Story 10.9 file: `_bmad-output/implementation-artifacts/10-9-admin-dashboard-visual-redesign.md`

**Scope:** Rewrite `AdminDashboard.tsx` visual structure only. All data hooks (`useEvents`, `useTotalContacts`, `useCurrentUser`), auth logic, routing, and MSW handlers remain unchanged.

Key visual changes:
- Stats: single horizontal `bg-card border border-border rounded-xl` strip with flex dividers
- Events list: panel with `px-4 py-3 border-b border-border` header, "Lihat Semua" link, icon-enriched rows
- Quick actions: moved inside an "Aksi Cepat" panel card with consistent styling

---

## Section 5: Implementation Handoff

**Scope:** Minor — development team direct implementation.

**Stories to implement (in order):**
1. Patch Story 10.6 — `globals.css` container fix (5 min)
2. Patch Story 10.7 — 3 login JSX tweaks (15 min)
3. Story 10.9 — AdminDashboard.tsx visual redesign (~45 min)

**Success criteria:**
- Landing page sections are horizontally centered on wide screens (≥1280px)
- Login left panel logo chip shows circular icon; badge shows blue dot; footer note visible
- Admin dashboard shows stats strip, panel-wrapped events table
- `npm run build` — 0 TypeScript errors
- `npm test` — 127/128 (pre-existing failure only)
