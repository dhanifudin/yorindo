# Sprint Change Proposal — 2026-03-26 (F)

**Trigger:** UI theme revamp — adopt blue brand design tokens from `erick-surbakti/yorindo-landing` reference into `yorindo-app`. No feature changes.
**Scope:** Design system only — `globals.css`, `layout.tsx`, Epic 10 story resets
**Status:** Approved (Incremental review completed 2026-03-26)
**Reference:** https://github.com/erick-surbakti/yorindo-landing

---

## Section 1: Issue Summary

The current `yorindo-app` uses the default shadcn/ui neutral palette — fully achromatic (grayscale oklch values, no brand color). The `yorindo-landing` reference establishes a blue brand identity:

- **Primary brand color:** `hsl(217 73% 35%)` (#184A9A — deep blue)
- **Font:** Inter (vs current Geist)
- **Radius:** `0.75rem` (vs current `0.625rem`)
- **Additional tokens:** `--surface`, `--surface-foreground`, `--hero-bg`
- **Utility classes:** `.card-elevated`, `.gradient-text`, `.section-label`, `.icon-container`

All changes are purely visual (CSS variables, font, utility classes). Zero feature, route, API, or data changes.

---

## Section 2: Impact Analysis

### Artifact Changes

| File | Change |
|---|---|
| `src/app/globals.css` | Replace oklch neutral palette with HSL blue brand tokens; add `--surface` tokens; update radius; add utility classes |
| `src/app/layout.tsx` | Replace Geist with Inter from `next/font/google`; remove unused local font declarations |
| Epic 10 story files (10-1 through 10-5) | Theme constraint note added to Dev Notes section |
| `sprint-status.yaml` | Epic 10 stories reset: `review` → `ready-for-dev` |

### Story Status Changes

| Story | Was | Now | Reason |
|---|---|---|---|
| `10-1-shadcnui-foundation-setup` | `review` | `ready-for-dev` | Design baseline changed — re-implement against blue brand |
| `10-2-admin-shell-navigation-redesign` | `review` | `ready-for-dev` | Cascades from 10-1 |
| `10-3-scan-pwa-mobile-native-redesign` | `review` | `ready-for-dev` | Cascades from 10-1 |
| `10-4-public-pages-redesign` | `review` | `ready-for-dev` | Cascades from 10-1 |
| `10-5-responsive-table-redesign` | `review` | `ready-for-dev` | Cascades from 10-1 |

### No Impact On

- PRD (no functional requirements affected)
- Architecture (no API, schema, or infrastructure changes)
- All other epics (2–9, 11, 12) — shadcn token swap is transparent to component consumers

---

## Section 3: Detailed Change Proposals

### Change 1: `src/app/globals.css` — Blue brand color tokens

Replace `:root` oklch neutral values with HSL blue brand palette from reference:

```css
/* BEFORE (achromatic oklch) */
--primary: oklch(0.205 0 0);        /* near-black */
--secondary: oklch(0.97 0 0);       /* light gray */
--accent: oklch(0.97 0 0);          /* light gray */
--ring: oklch(0.708 0 0);           /* gray ring */
--radius: 0.625rem;
--sidebar-primary: oklch(0.205 0 0); /* black */

/* AFTER (HSL blue brand) */
--primary: hsl(217 73% 35%);          /* brand blue #184A9A */
--primary-foreground: hsl(0 0% 100%);
--secondary: hsl(217 60% 96%);        /* soft blue tint */
--secondary-foreground: hsl(217 60% 25%);
--accent: hsl(217 60% 94%);           /* light blue accent */
--accent-foreground: hsl(217 60% 25%);
--muted: hsl(220 14% 96%);
--muted-foreground: hsl(220 9% 46%);
--border: hsl(220 13% 91%);
--input: hsl(220 13% 91%);
--ring: hsl(217 73% 35%);             /* ring = brand blue */
--radius: 0.75rem;
--surface: hsl(217 30% 97.5%);        /* new token */
--surface-foreground: hsl(210 24% 10%);
--sidebar: hsl(0 0% 98%);
--sidebar-primary: hsl(217 73% 35%);  /* brand blue */
--sidebar-accent: hsl(217 60% 96%);
--sidebar-accent-foreground: hsl(217 60% 25%);
--sidebar-border: hsl(220 13% 91%);
--sidebar-ring: hsl(217 73% 35%);
```

Add to `@theme inline` block:
```css
--color-surface: var(--surface);
--color-surface-foreground: var(--surface-foreground);
```

Add to `@layer components`:
```css
.card-elevated {
  @apply shadow-sm transition-all duration-200;
}
.card-elevated:hover {
  @apply shadow-md -translate-y-0.5;
}
.gradient-text {
  @apply bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent;
}
.section-label {
  @apply inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground;
}
.icon-container {
  @apply flex items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 p-2;
}
```

### Change 2: `src/app/layout.tsx` — Inter font

```typescript
/* BEFORE */
import { Geist } from "next/font/google";
const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

/* AFTER */
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
```

Remove unused local font declarations (`geistSans`, `geistMono`, `localFont` import). Update `<html>` className to use `inter.variable`.

---

## Section 4: Implementation Handoff

**Scope:** Moderate — Epic 10 stories reset, design system re-execution required.

**Dev Story execution order:**
1. Story 10-1 (`shadcnui-foundation-setup`) — apply `globals.css` and `layout.tsx` changes first
2. Stories 10-2 through 10-5 — re-implement against new blue brand tokens

**Success criteria:**
- `bg-primary` renders as `hsl(217 73% 35%)` (#184A9A) across all components
- Font renders as Inter (verify via browser devtools computed styles)
- `border-radius` on buttons/cards is `0.75rem`
- `.card-elevated` utility available and working
- `bg-surface` resolves as `hsl(217 30% 97.5%)`
