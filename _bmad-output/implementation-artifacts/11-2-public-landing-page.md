# Story 11.2: Public Landing Page at `/`

Status: review

## Story

As a prospective user or event participant,
I want to see a public landing page at `/`,
so that I can learn about EM . U and navigate to login or event registration.

## Acceptance Criteria

1. `/` renders a fully static public landing page — no authentication required, no API calls.
2. The landing page uses `PublicShell` layout component (already at `src/components/layout/PublicShell.tsx`).
3. Hero section includes: product name "EM . U", a tagline, and a brief description.
4. Two CTAs in the hero: "Masuk" (`<Link href="/login">`) and "Daftar Event" (placeholder, rendered as a disabled/styled element or `href="#"`).
5. Features section contains 3–4 highlight cards describing product capabilities.
6. Footer includes: copyright text and a link to `/data-rights`.
7. Page is fully responsive: renders correctly on mobile (375px) and desktop (1280px).
8. Consistent with existing shadcn/ui design tokens (CSS variables from `globals.css`).
9. `src/app/page.tsx` is completely replaced — the old redirect logic (`useRouter`, `useAuthStore`) is removed entirely.
10. `npm run build` passes with 0 TypeScript errors; `/` is rendered as a static page in the build output.

## Tasks / Subtasks

- [x] Task 1 — Replace `src/app/page.tsx` with static landing page (AC: 1, 2, 3, 4, 5, 6, 7, 8, 9)
  - [x] Remove `'use client'`, `useRouter`, `useAuthStore` entirely from the file
  - [x] Export a default server component (no `'use client'` directive)
  - [x] Wrap content with `<PublicShell className="max-w-4xl">` for wider landing page layout
  - [x] Implement Hero section (product name, tagline, description, two CTA buttons)
  - [x] Implement Features section (3–4 highlight cards using `Card` / `CardContent`)
  - [x] Implement Footer (copyright + `/data-rights` link)
  - [x] Verify mobile and desktop layout with Tailwind responsive classes

- [x] Task 2 — Verify build (AC: 10)
  - [x] Run `npm run build` — must pass with 0 TypeScript errors
  - [x] Confirm `/` appears as `○ (Static)` in build output (`┌ ○ /`)
  - [x] Run `NEXT_EXPORT=true npm run build` — must also pass

## Dev Notes

### Critical: `src/app/page.tsx` Must Be Completely Replaced

The current `src/app/page.tsx` (updated in Story 11.1) is a `'use client'` redirect component:
```tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

export default function RootPage() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const router = useRouter()

  useEffect(() => {
    if (!accessToken) { router.replace('/login'); return }
    if (user?.role === 'staff') { router.replace('/app/scan') }
    else { router.replace('/app') }
  }, [accessToken, user, router])

  return null
}
```

**This entire file must be replaced.** The redirect logic is no longer needed — `/` is now a public landing page. Authenticated users who navigate to `/` will just see the landing page (they can click "Masuk" to go to `/login` which redirects to `/app` if already logged in).

### Layout: PublicShell with Wide Override

`PublicShell` (at `src/components/layout/PublicShell.tsx`) accepts a `className` prop:
```tsx
export function PublicShell({ children, className }: PublicShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className={cn('max-w-xl mx-auto px-4 py-8', className)}>
        {children}
      </div>
    </div>
  )
}
```

The default `max-w-xl` (512px) is too narrow for a landing page. Use:
```tsx
<PublicShell className="max-w-4xl">
  {/* landing page content */}
</PublicShell>
```

This gives 896px max-width, suitable for a multi-section landing page.

### Static Server Component — No `'use client'`

Since the page has no interactivity that requires client state, implement it as a pure server component:
```tsx
// src/app/page.tsx — NO 'use client' directive
import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function LandingPage() {
  return (
    <PublicShell className="max-w-4xl">
      {/* sections */}
    </PublicShell>
  )
}
```

This ensures Next.js renders it as `○ (Static)` in build output — no JS bundle overhead.

### Content Structure (Indonesian)

All user-facing copy should be in Indonesian, consistent with the rest of the app.

**Hero section:**
- Product name: **EM . U**
- Tagline: e.g., "Platform Manajemen Event Profesional"
- Description: 1-2 sentences about what EM . U does
- CTAs:
  - Primary: `<Button asChild><Link href="/login">Masuk</Link></Button>`
  - Secondary: `<Button variant="outline" disabled>Daftar Event</Button>` (placeholder — no URL yet)

**Features section (3–4 cards):**
- Event management (Manajemen Event)
- Contact/participant database (Database Kontak & Peserta)
- QR code check-in (Check-in QR Code)
- Analytics & reporting (Analitik & Laporan)

**Footer:**
```tsx
<footer className="mt-16 pt-8 border-t border-border text-center text-sm text-muted-foreground">
  <p>© {new Date().getFullYear()} EM . U. All rights reserved.</p>
  <Link href="/data-rights" className="underline hover:text-foreground mt-1 inline-block">
    Hak Data Anda
  </Link>
</footer>
```

### "Daftar Event" CTA — Placeholder Treatment

There is no public event listing page yet. The "Daftar Event" CTA should be rendered as a visually secondary button but non-functional. Options:
1. `<Button variant="outline" disabled>Daftar Event</Button>` — simplest
2. `<Button variant="outline" asChild><Link href="#">Daftar Event</Link></Button>` — if disabled styling looks wrong

Use option 1 (disabled) to clearly communicate this feature is coming. Do NOT link to a non-existent page.

### Responsive Layout

Use Tailwind responsive prefixes:
- Hero CTAs: stacked on mobile (`flex-col`), side-by-side on sm+ (`sm:flex-row`)
- Features cards: 1 column mobile, 2 columns sm+, 4 columns md+

Example:
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
```

### Build Output Expectation

After replacing `page.tsx` with a static server component, the build should show:
```
○ /          ← (Static) prerendered as static content
```

If it shows `λ` or `●`, there's an issue — ensure no `useClient`/`useRouter`/`useState` in the file.

### Design Tokens Reference

From `src/app/globals.css`:
- Background: `bg-background`, `bg-muted`
- Text: `text-foreground`, `text-muted-foreground`
- Border: `border-border`
- Primary: `bg-primary`, `text-primary-foreground`
- Destructive: `bg-destructive`
- Font: `font-sans` (Geist)
- Radius: `rounded-md`, `rounded-lg`, `rounded-xl`

### File Change Summary

Only one file changes:
- **Replace**: `src/app/page.tsx` — complete rewrite from redirect component to static landing page

No new components, no new directories, no dependencies.

### Previous Story Reference (11.1)

Story 11.1 completed the routing migration. Key outcomes:
- All authenticated routes now under `/app/*`
- `src/app/login/page.tsx` redirects authenticated users to `/app`
- `src/components/forms/LoginForm.tsx` redirects to `/app` after login
- The old `src/app/page.tsx` redirected to `/app/scan` (staff) or `/app` (others) — this is now being replaced

### References

- Sprint Change Proposal: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-21.md` — Story 11.2 AC
- Previous story: `_bmad-output/implementation-artifacts/11-1-app-routing-migration.md`
- `src/components/layout/PublicShell.tsx` — existing layout shell
- `src/app/data-rights/layout.tsx` — example of PublicShell usage pattern
- `src/app/data-rights/page.tsx` — example of Indonesian-language public page content style
- `src/components/ui/` — Button, Card, CardContent available
- `src/app/globals.css` — design tokens

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation completed cleanly.

### Completion Notes List

- `src/app/page.tsx` completely replaced: dropped `'use client'`, `useRouter`, `useAuthStore`; now a pure static server component
- `PublicShell className="max-w-4xl"` used for wider landing layout (896px max-width)
- Hero: product name, tagline, 2-sentence description, "Masuk" → `/login` CTA, "Daftar Event" disabled placeholder
- Features: 4 cards — Manajemen Event, Database Kontak & Peserta, Check-in QR Code, Analitik & Laporan
- Footer: copyright + `/data-rights` link
- Build: `○ /` confirmed static; both `npm run build` and `NEXT_EXPORT=true npm run build` pass with 0 TypeScript errors

### File List

**Updated:**
- `src/app/page.tsx` — completely replaced with static landing page server component
