# Story 10.8: Admin Shell Topbar

**Story ID:** 10.8
**Story Key:** 10-8-admin-shell-topbar
**Epic:** Epic 10 — UI Design System & Mobile-Native Redesign
**Phase:** Phase 1 (FE) — UI-only, zero logic/API changes
**Status:** review
**Created:** 2026-03-26
**Sprint Change Proposal:** 2026-03-26g

---

## Story

As an admin user inside the `/app` area,
I want a topbar with quick actions and user identity,
So that I can quickly navigate to key actions and know who I'm logged in as without opening the sidebar.

> **Scope:** Add a sticky topbar to `src/components/layout/AdminShell.tsx`. Inspired by `Dashboard.tsx` in `erick-surbakti/yorindo-landing` reference. Zero changes to sidebar nav items, collapse behavior, logout logic, mobile bottom nav, or any existing routes/hooks.

---

## Acceptance Criteria

**AC1:** A sticky topbar (`h-14`, `border-b border-border`, `bg-background/95 backdrop-blur`) is rendered between the sidebar and the `<main>` content area — it spans the full width of the content area (right of the sidebar on desktop, full width on mobile).

**AC2:** Topbar contains (left to right):
- Search placeholder area: `<div>` styled as a search input (icon + "Cari atau ketik...") — static UI, no functionality, `flex-1 max-w-sm`
- Spacer: `<div className="flex-1" />`
- "Buat Event" button: `<Button asChild size="sm" className="gap-1.5"><Link href="/app/events"><Plus className="h-3.5 w-3.5" />Buat Event</Link></Button>`
- Bell icon: `<button>` with `<Bell className="h-4 w-4" />` — static, no functionality, styled like an icon button
- Avatar chip: user initials, `bg-primary text-primary-foreground`, `rounded-full`, `w-8 h-8`, shows first char of `user.id` uppercased (or first char of user email if the opaque ID is unavailable — use role initial as fallback: A/S/V/P)

**AC3:** On desktop: topbar spans the content area only (not over the sidebar). The sidebar remains fixed-left; topbar sits in the `flex-1` column.

**AC4:** On mobile: topbar spans full width (sidebar is hidden on mobile, so topbar naturally fills the screen). The existing mobile bottom nav remains unchanged.

**AC5:** The topbar does NOT appear on the `/scan` page — the scan page manages its own full-screen header. Implement by not rendering the topbar when the pathname starts with `/app/scan`.

**AC6:** Main content area `py-6` spacing is preserved (topbar height is compensated by its own `h-14` in the flex column — no additional padding adjustment needed since topbar is inside the flex column above `<main>`).

**AC7:** `npm test` — no regressions. `npm run build` — 0 TypeScript errors.

---

## Tasks / Subtasks

- [x] **Task 1: Add topbar to `AdminShell.tsx`**
  - [x] Import: `Bell`, `Plus` from `lucide-react`; `Link` from `next/link`; `Button` from `@/components/ui/button`
  - [x] Inside the `<div className="flex-1 ...">` content column, before the `<main>`, add:
    ```tsx
    {!pathname.startsWith('/app/scan') && (
      <header className="sticky top-0 z-30 h-14 flex items-center gap-3 px-4 md:px-6 border-b border-border bg-background/95 backdrop-blur">
        {/* search placeholder */}
        {/* spacer */}
        {/* Buat Event */}
        {/* Bell */}
        {/* Avatar */}
      </header>
    )}
    ```
  - [x] `pathname` is already available via `usePathname()` (already imported)

- [x] **Task 2: Search placeholder**
  - [x] `<div className="flex items-center gap-2 flex-1 max-w-sm h-8 px-3 rounded-md border border-border bg-muted/50 text-xs text-muted-foreground cursor-default">`
  - [x] `<Search className="h-3.5 w-3.5 shrink-0" />` (import `Search` from lucide-react)
  - [x] Text: `<span>Cari atau ketik...</span>`

- [x] **Task 3: "Buat Event" button**
  - [x] `<Button asChild size="sm" className="gap-1.5 shrink-0">`
  - [x] `<Link href="/app/events"><Plus className="h-3.5 w-3.5" />Buat Event</Link>`
  - [x] Only render when `user?.role === 'admin'` (staff/viewer don't create events)

- [x] **Task 4: Bell icon button**
  - [x] `<button className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted transition-colors text-muted-foreground">`
  - [x] `<Bell className="h-4 w-4" />`
  - [x] No `onClick` handler — static UI

- [x] **Task 5: Avatar chip**
  - [x] Derive display initial:
    ```tsx
    const avatarLabel = user?.role
      ? { admin: 'A', staff: 'S', viewer: 'V', participant: 'P' }[user.role] ?? '?'
      : '?'
    ```
  - [x] `<div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{avatarLabel}</div>`

- [x] **Task 6: Verify scan page exclusion**
  - [x] Confirm topbar does NOT render when navigating to `/app/scan`
  - [x] Confirm topbar renders on `/app`, `/app/events`, `/app/contacts`, `/app/users`, etc.

- [x] **Task 7: Verify**
  - [x] `npm test` — no regressions
  - [x] `npm run build` — 0 TypeScript errors
  - [x] Desktop: sidebar + topbar + content render correctly, no layout shift
  - [x] Mobile: topbar visible above content, mobile bottom nav still visible at bottom

---

## Dev Notes

> **Theme constraint (Sprint Change Proposal 2026-03-26f + 2026-03-26g):**
> Use `bg-background/95 backdrop-blur` for topbar. Avatar uses `bg-primary text-primary-foreground`. All tokens from globals.css.

### Reference
Local reference: `/home/dhs/Workspaces/kada/yorindo-landing/src/pages/Dashboard.tsx` — topbar section (lines 477–507)

### Layout structure in AdminShell after change
```
<div className="flex min-h-screen bg-background">
  <aside ...>  {/* sidebar — unchanged */}
  </aside>

  <div className="flex-1 flex flex-col ...">   {/* NEW: add flex-col */}
    <header ...>  {/* NEW: topbar (hidden on /app/scan) */}
    </header>

    <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-6">
      {children}
    </main>
  </div>

  <nav className="md:hidden ...">  {/* mobile bottom nav — unchanged */}
  </nav>
</div>
```

### Note on flex-col
The outer content `<div>` currently uses `className={cn('flex-1', ...)}`. Add `flex flex-col` to this div so the topbar and main stack vertically within it. This is a one-word addition that enables the layout.

### Search is static
The search placeholder is UI-only with no state, no handler, no `<input>`. It's a styled `<div>` that looks like a search field. Do NOT add actual search functionality — that is out of scope for this story.
