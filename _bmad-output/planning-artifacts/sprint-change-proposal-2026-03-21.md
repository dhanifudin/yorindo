# Sprint Change Proposal
**Date:** 2026-03-21
**Project:** Yorindo
**Triggered by:** shadcn/ui initialization was skipped in Story 1.3; all FE Phase 1 stories were built with hand-crafted Tailwind instead of the mandated component library. User requested full shadcn/ui adoption + mobile-native design upgrade.

---

## Section 1: Issue Summary

### Problem Statement

The architecture document (`architecture.md`) explicitly mandated **shadcn/ui** as the component library from project inception:

> *"Component library: shadcn/ui (Radix primitives + Tailwind, TypeScript mode)"*
> *"npx shadcn@latest init"* — listed in the post-init scaffold setup (Story 1.3)

However, `npx shadcn@latest init` was **never executed**. As a result:

- `src/components/ui/` folder exists but is **completely empty** (should contain Button, Input, Card, etc.)
- `src/lib/utils.ts` is **missing** (should contain the `cn()` utility from `clsx` + `tailwind-merge`)
- `tailwind.config.ts` has no shadcn CSS variables or theme extensions
- All 404 `className=` usages across 28 TSX files use repetitive hand-crafted Tailwind strings instead of shadcn primitives

### When Discovered
Discovered during user review of the FE Phase 1 output. All 7+ FE Phase 1 stories (Epics 1–9) were implemented without the planned design system.

### Evidence

| Expected (architecture.md) | Actual State |
|---|---|
| `src/components/ui/button.tsx` | ❌ Missing |
| `src/components/ui/input.tsx` | ❌ Missing |
| `src/components/ui/card.tsx` | ❌ Missing |
| `src/lib/utils.ts` (cn utility) | ❌ Missing |
| `tailwind.config.ts` with CSS vars | ❌ Plain config, no shadcn theme |
| shadcn in dependencies | ❌ Not installed |

**Additional requirement (new):** User requests mobile-native design feel — particularly for the Scan PWA surface (`/scan`) and admin dashboard, using shadcn/ui Sheet, Sonner toast, and bottom navigation patterns.

---

## Section 2: Impact Analysis

### Epic Impact

| Epic | FE Stories Affected | Impact |
|---|---|---|
| Epic 1 (Foundation) | 1.3 (scaffold) | Original scaffold missed shadcn init — root cause |
| Epic 2 (Auth/Users) | 2.1 (login), 2.2 (users), 2.3 (route guards) | LoginForm, UserCreateForm hand-crafted |
| Epic 3 (Contacts) | 3.1 (contacts list) | ContactsTable, FilterBar, Pagination hand-crafted |
| Epic 4 (Events) | 4.1 (events) | EventCreateForm, event pages hand-crafted |
| Epic 5 (Templates) | 5.1 (templates) | TemplateForm, TemplatePreview hand-crafted |
| Epic 6 (Registration) | 6.1 (landing page) | EventLandingCard hand-crafted |
| Epic 7 (Check-in PWA) | 7.1 (PWA), 7.2 (QR scan) | Scan page, ScanResultCard, PWAInstallBanner hand-crafted |
| Epic 8 (Reports) | 8.1 (reports) | MetricCards, charts hand-crafted |
| Epic 9 (Data Rights) | 9.1 (data rights) | All data-rights pages hand-crafted |
| **NEW: Epic 10** | UI Design System | shadcn/ui init + component migration + mobile-native redesign |

### Story Impact

**Completed stories (in review) — affected but NOT blocking:**
All 11 FE Phase 1 stories in `review` status remain functionally correct. The hand-crafted Tailwind works — it just doesn't use the design system. No regression risk.

**Backlog stories — opportunity:**
All 22+ backlog stories can now be written against shadcn/ui components from the start, preventing further design debt accumulation.

### Artifact Conflicts

| Artifact | Conflict | Required Update |
|---|---|---|
| `architecture.md` | Next.js version (14 → 16), next-pwa → serwist, no shadcn/ui listed | Update tech stack table + scaffold section |
| `epics.md` | Missing Epic 10 (UI Design System) | Add Epic 10 |
| `tailwind.config.ts` | No shadcn CSS variables | shadcn init will update this |
| All FE Phase 1 story files | No shadcn/ui in Dev Notes | Superseded by Epic 10 — not individually updated |

### Technical Impact

- `shadcn@latest init` will update `tailwind.config.ts`, `globals.css`, create `src/lib/utils.ts`
- No breaking changes to existing logic, hooks, stores, or MSW handlers
- React Query, Zustand, React Hook Form, Zod remain unchanged
- 404 `className=` strings will be progressively replaced by shadcn primitives (incremental)
- Recharts, TanStack Table remain as-is (shadcn has no chart/table replacement)

---

## Section 3: Recommended Approach

### Chosen Path: Direct Adjustment + New Epic

**Classification: Moderate** — backlog reorganization needed.

**Rationale:**
1. shadcn/ui was always in scope — this is catching up, not expanding scope
2. The mobile-native design goal is a new UX enhancement — small scope addition
3. Existing FE Phase 1 stories remain valid; Epic 10 handles the design system layer
4. All backlog stories benefit immediately once foundation is in place

### Proposed New Epic 10: UI Design System & Mobile-Native Redesign

**4-story structure:**

| Story | Scope | Priority |
|---|---|---|
| **10.1** — shadcn/ui Foundation Setup | `npx shadcn@latest init`, install core components, `cn()` utility, theme tokens | Must-first |
| **10.2** — Admin Shell & Navigation Redesign | Sidebar nav, responsive layout, shadcn Card/Table/Badge across all admin pages | High |
| **10.3** — Scan PWA Mobile-Native Redesign | Bottom tab bar, full-screen camera, Sonner toasts, Sheet drawer, touch targets | High |
| **10.4** — Public Pages Redesign | Registration flow (mobile-first stepper), data rights pages, EventLandingCard | Medium |

**Effort estimate:** ~2–3 sessions total (10.1 is small; 10.2–10.4 are medium each)

**Risk:** Low — UI-only changes; zero impact on business logic, API layer, or tests (logic tests don't test CSS)

### Architecture Update Required

Update `architecture.md` tech stack table:

```
BEFORE: | Frontend framework | Next.js | 14 (App Router) | ...
AFTER:  | Frontend framework | Next.js | 16 (App Router) | ...

BEFORE: | Styling | Tailwind CSS | 3.x | Utility-first |
AFTER:  | Styling | Tailwind CSS + shadcn/ui | 3.x + Radix | Utility-first + design system |

BEFORE: (next-pwa line)
AFTER:  | PWA | serwist | 9.x | Turbopack-compatible |
```

---

## Section 4: Detailed Change Proposals

### Change 1: Add Epic 10 to `epics.md`

**File:** `_bmad-output/planning-artifacts/epics.md`

Add after Epic 9:

```markdown
## Epic 10: UI Design System & Mobile-Native Redesign

Adopt shadcn/ui (Radix primitives + Tailwind) as the project's design system (originally planned in architecture but not initialized), and redesign the three UX surfaces — Admin, Scan PWA, and Public — to deliver a mobile-native feel with consistent component usage.

> Phase 1 (FE only): All stories in this epic are frontend-only. No backend changes required.

### Story 10.1: shadcn/ui Foundation Setup

Initialize shadcn/ui CLI, configure CSS variable theming, install core components (Button, Input, Card, Badge, Select, Table, Dialog, Sheet, Sonner), and establish `src/lib/utils.ts` with `cn()` utility. Update Tailwind config to include shadcn theme extensions.

### Story 10.2: Admin Shell & Navigation Redesign

Replace hand-crafted nav and page layouts with shadcn Card, Table, Badge, Select, and Button components. Implement responsive sidebar (desktop) + bottom nav (mobile). Apply consistent spacing, typography, and color tokens across all 7 admin pages.

### Story 10.3: Scan PWA Mobile-Native Redesign

Redesign `/scan` as a full-screen mobile-native experience: bottom tab bar, full-screen QR camera viewfinder, Sonner-based scan result toasts (replacing inline result cards), Sheet drawer for event selection, large touch targets (≥44px), high-contrast scan states.

### Story 10.4: Public Pages Redesign

Redesign `/register/[eventSlug]` and `/data-rights/*` pages with mobile-first layouts, step-indicator for multi-step flows, shadcn Card for content sections, and trust-building visual hierarchy.
```

### Change 2: Add Epic 10 to `sprint-status.yaml`

**File:** `_bmad-output/implementation-artifacts/sprint-status.yaml`

Add after Epic 9 block:

```yaml
  # ─────────────────────────────────────────────
  # EPIC 10: UI Design System & Mobile-Native Redesign
  # Phase: FE only — design system adoption + UX polish
  # ─────────────────────────────────────────────
  epic-10: backlog
  10-1-shadcnui-foundation-setup: backlog
  10-2-admin-shell-navigation-redesign: backlog
  10-3-scan-pwa-mobile-native-redesign: backlog
  10-4-public-pages-redesign: backlog
  epic-10-retrospective: optional
```

### Change 3: Update `architecture.md` tech stack

Update the tech stack table to reflect current state (Next.js 16, serwist, shadcn/ui confirmed):

```
Next.js: 14 → 16
Styling row: "Tailwind CSS | 3.x | Utility-first" → "Tailwind CSS + shadcn/ui | 3.x + Radix | Design system + utility classes"
Add row: "PWA | serwist | 9.x | Turbopack-compatible service worker"
Remove: next-pwa reference in scaffold commands
```

---

## Section 5: Implementation Handoff

**Change Scope: Moderate**

| Handoff Item | Owner | Action |
|---|---|---|
| Apply Epic 10 to `epics.md` | SM / this session | Write Epic 10 section |
| Apply Epic 10 to `sprint-status.yaml` | SM / this session | Add 5 status entries |
| Update `architecture.md` | SM / this session | Patch tech stack table |
| Create Story 10.1 | `bmad-create-story` | Run next: `10-1-shadcnui-foundation-setup` |
| Implement Story 10.1 | `bmad-dev-story` | shadcn init + core components |
| Create + implement 10.2–10.4 | Subsequent sessions | Per-surface redesign |

**Success Criteria:**
- [ ] `npx shadcn@latest init` completed; `src/lib/utils.ts` exists with `cn()`
- [ ] `src/components/ui/` contains at least: button, input, card, badge, select, table, dialog, sheet, sonner
- [ ] All admin pages use shadcn Card, Table, Button, Badge primitives
- [ ] Scan PWA has bottom navigation and full-screen camera with toast feedback
- [ ] 62/62 tests continue to pass after each redesign story

---

*Sprint Change Proposal complete — Correct Course workflow, 2026-03-21*
