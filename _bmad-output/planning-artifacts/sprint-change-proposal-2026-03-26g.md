# Sprint Change Proposal — 2026-03-26 (G)

**Trigger:** Epic 10 visual revamp was too shallow — only CSS color tokens changed. Structural layout, component hierarchy, and visual design were left as minimal scaffolds. Landing page and login need full structural adoption from reference. Admin shell needs a topbar layer.
**Scope:** FE only — 3 new stories added to Epic 10. Zero API, schema, or functional changes.
**Status:** Approved 2026-03-26
**Reference:** `/home/dhs/Workspaces/kada/yorindo-landing/src/`

---

## Section 1: Issue Summary

Sprint Change Proposal 2026-03-26f scoped the revamp as "CSS token changes only" and was implemented correctly. However, the actual intent was a deeper structural visual redesign:

- **Landing page (`/`)**: Current is a 77-line minimal scaffold inside `PublicShell` with a centered h1, emoji icon cards, and a plain footer. The reference has 8 full sections (sticky Header, full-viewport Hero with bg image + overlays + stats, AboutSystem, CoreModules, HowItWorks, Architecture, AccessSecurity, Footer).
- **Login page (`/login`)**: Current is a single centered card on `bg-gray-50`. The reference shows a two-panel split: dark navy left panel (grid overlay, glow blobs, copy) + white right panel (form card).
- **Admin shell**: Current `AdminShell.tsx` has only a sidebar + content area. The reference Dashboard shows a sticky topbar with search, CTA button, notification bell, and user avatar.

All utility classes (`.card-elevated`, `.icon-container`, `.section-label`, `.gradient-text`) were added to `globals.css` in CC-26f but were never applied structurally because the components weren't rebuilt.

---

## Section 2: Impact Analysis

### Epic Impact
- Epic 10 (`in-progress`): 3 new stories added (10.6, 10.7, 10.8). Existing stories 10.1–10.5 are unaffected.

### Artifact Impact
| Artifact | Impact |
|---|---|
| PRD | None — no feature or functional requirements affected |
| Architecture | None — no API, schema, or infrastructure changes |
| UX Design Spec | None — spec covers Contacts page only |
| Epic 11+ | None — changes are isolated to landing/login/admin-shell layout files |

### Files Affected
| Story | Files |
|---|---|
| 10.6 Landing | `src/app/page.tsx` (rewrite), `src/components/layout/LandingHeader.tsx` (new) |
| 10.7 Login | `src/app/login/layout.tsx` (rewrite), `src/app/login/page.tsx` (update wrapper) |
| 10.8 Topbar | `src/components/layout/AdminShell.tsx` (add topbar) |

---

## Section 3: Recommended Approach

**Direct Adjustment** — Add 3 new stories to Epic 10. No rollback needed.

**Rationale:** The existing color token work (CC-26f) is correct and remains in place. These stories build the structural layer on top of it. The changes are FE-only, isolated to layout files, and carry no regression risk on functionality.

---

## Section 4: Detailed Change Proposals

### Story 10.6 — Landing Page Full Structural Rebuild

Rewrite `src/app/page.tsx` as a full 8-section landing page, adapted from reference sections to Next.js/Yorindo context. Create `LandingHeader.tsx` as a standalone sticky nav component.

**Sections:**

| Section | Source | Key adaptations |
|---|---|---|
| LandingHeader | `Header.tsx` | next/link instead of react-router; nav items → `#overview/#system/#workflow/#access`; "Masuk" CTA → `/login` |
| Hero | `Hero.tsx` | Full-viewport; bg image (`public/hero-bg.png`) + dark + blue overlay; title "Yorindo Admin Platform"; CTA → `/login`; 3 stats inline |
| AboutSystem | `AboutSystem.tsx` | 4 `card-elevated` cards with `icon-container`; content in Indonesian |
| CoreModules | `CoreModules.tsx` | `bg-surface` section bg; 6 modules = Event, Kontak, Blast, Check-in, Laporan, YoriMind |
| HowItWorks | `HowItWorks.tsx` | 4-step flow; `step-connector` line on desktop |
| Architecture | `Architecture.tsx` | 3-node flow: Admin → Yorindo System → Output; chevron connectors |
| AccessSecurity | `AccessSecurity.tsx` | 3 cards: Role-Based Access, Admin Levels, Data (UU PDP) |
| Footer | `Footer.tsx` | Logo + nav links + `/data-rights` link + copyright |

`PublicShell` is NOT used for the landing page. `/register` and `/data-rights` continue using `PublicShell` unchanged.

### Story 10.7 — Login Page Two-Panel Visual Redesign

Update `src/app/login/layout.tsx` to a two-panel split layout. Update `src/app/login/page.tsx` to place form inside right panel. Zero changes to `LoginForm`, `MockGoogleAuthDialog`, zod schema, useAuthStore, or `handleParticipantLogin`.

**Left panel (hidden mobile / w-1/2 lg):**
- Dark navy background (`hsl(217 65% 10%)`)
- Grid overlay (subtle white lines, CSS only)
- Two glow blobs (blue, `filter: blur(80px)`)
- Logo chip: shield icon + "Yorindo Admin"
- Headline: "Secure Admin Access"
- Status bar: green pulse dot + "All systems operational"

**Right panel (full-width mobile / w-1/2 lg):**
- White/card background, flex centered
- Existing `LoginForm` + SSO button preserved inside form card

### Story 10.8 — Admin Shell Topbar

Add a sticky topbar to `AdminShell.tsx` above the `<main>` content area. Zero changes to sidebar nav items, collapse behavior, logout, mobile bottom nav, or any routes.

**Topbar layout (h-14, border-b, sticky):**
```
[Search placeholder]     [spacer]    [Buat Event]  [Bell]  [Avatar]
 "Cari atau ketik..."                → /app/events   (static)  {initials, role}
```

- Search: static UI only — no search functionality
- "Buat Event": `<Button asChild size="sm"><Link href="/app/events">Buat Event</Link></Button>`
- Bell: `<Bell className="h-4 w-4 text-muted-foreground" />` — static, no functionality
- Avatar chip: first char of `user.id` uppercased, `bg-primary text-primary-foreground`, rounded-full

---

## Section 5: Sprint Status Changes

```yaml
# Added to Epic 10:
10-6-landing-page-full-rebuild: ready-for-dev
10-7-login-page-two-panel-redesign: ready-for-dev
10-8-admin-shell-topbar: ready-for-dev
```

---

## Section 6: Implementation Handoff

**Scope classification:** Moderate

**Execution order:** 10.6 → 10.7 → 10.8 (independent; can be done sequentially)

**Dev agent:** Run `/bmad-dev-story` for each story in order.

**Success criteria:**
- Landing page matches 8-section structure of reference (`/home/dhs/Workspaces/kada/yorindo-landing/src/`)
- Login page shows two-panel on desktop; form-only on mobile (≤ 1024px)
- Admin shell shows sticky topbar on all `/app/*` routes; mobile bottom nav unchanged
- `npm test` — no regressions (all existing tests pass)
- `npm run build` — 0 TypeScript errors
