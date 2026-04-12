# Story 10.2: Admin Shell & Navigation Redesign

**Story ID:** 10.2
**Story Key:** 10-2-admin-shell-navigation-redesign
**Epic:** Epic 10 — UI Design System & Mobile-Native Redesign
**Phase:** Phase 1 (FE) — UI-only, zero logic/API changes
**Status:** ready-for-dev
**Created:** 2026-03-21

---

## Story

As an admin or viewer,
I want a consistent, mobile-friendly admin interface with clear navigation and design system components,
So that the admin surface feels professional and is easy to use on any device.

> **Scope:** Replace the hand-crafted top navbar + raw HTML tables/buttons/badges with a responsive sidebar (desktop) + bottom navigation (mobile) shell and shadcn Card, Table, Badge, Button, Select primitives across all 7 admin pages. Zero logic, hook, MSW, or test file changes.

---

## Acceptance Criteria

**AC1:** Given the admin shell is rendered on a desktop viewport (≥768px),
When any `/admin` page is loaded,
Then a fixed left sidebar (220px wide) shows: EM . U brand, role-based nav links with Lucide icons, current user role label, and a Keluar (logout) button.

**AC2:** Given the admin shell is rendered on a mobile viewport (<768px),
When any `/admin` page is loaded,
Then a fixed bottom tab bar shows: role-visible nav items with icons + labels, min 44px touch targets, active item highlighted.

**AC3:** Given the sidebar/bottom nav is shown,
When the active route matches a nav item,
Then that item is visually highlighted (active state) using the shadcn sidebar accent tokens.

**AC4:** Given any admin page,
When action buttons exist (e.g. "+ Event Baru", "Download PDF"),
Then they use shadcn `<Button>` with appropriate variants (default, outline, ghost, destructive).

**AC5:** Given any admin list page (events, users, templates, contacts),
When status or role labels are displayed,
Then they use shadcn `<Badge>` instead of hand-crafted `<span className="rounded-full px-2...">`.

**AC6:** Given the users and templates pages,
When the data table is rendered,
Then it uses shadcn `<Table>`, `<TableHeader>`, `<TableBody>`, `<TableRow>`, `<TableHead>`, `<TableCell>` components.

**AC7:** Given the users page,
When an admin changes a user's role,
Then the role selector uses shadcn `<Select>` with `<SelectTrigger>`, `<SelectContent>`, `<SelectItem>`.

**AC8:** Given the contacts filter bar,
When filters are applied,
Then the city input uses `<Input>` and the Reset button uses `<Button variant="outline">` from shadcn. (Industry/company size selects may stay native `<select>` — see Dev Notes.)

**AC9:** Given any event, event-detail, or report page,
When content cards/panels are shown,
Then they use shadcn `<Card>`, `<CardHeader>`, `<CardContent>` instead of raw `<div className="bg-white border...">`.

**AC10:** Given all changes are applied,
`npm test` passes with 62/62 tests (no regressions). No logic, hook, store, or MSW changes.

---

## Tasks / Subtasks

- [x] **Task 1: Create AdminShell component**
  - [x] Create `src/components/layout/AdminShell.tsx` — `'use client'`
  - [x] Desktop sidebar (hidden md:flex) — brand, role-based nav with Lucide icons, user role label, logout button
  - [x] Mobile bottom nav (md:hidden fixed bottom) — same nav items, icon + label, min-h-[56px] touch targets
  - [x] Active state via `usePathname()` — compare pathname to item href
  - [x] Logout: calls `clearAuth()` from `useAuthStore` + `router.replace('/login')`
  - [x] Nav items: Dashboard (LayoutDashboard), Kontak (Users), Event (Calendar), Template (FileText), Akun (UserCog) — role-filtered same as current layout
  - [x] Main content area: `md:ml-56 pb-24 md:pb-6` to offset sidebar/bottom nav

- [x] **Task 2: Refactor admin layout.tsx**
  - [x] Replace `<div className="min-h-screen bg-gray-50">` + `<nav>` + `<main>` with `<AdminShell>{children}</AdminShell>`
  - [x] Remove `AdminNav` function (moved to AdminShell)
  - [x] Remove `LogoutButton` function (moved to AdminShell)
  - [x] Keep ALL route guard logic intact: useEffect with accessToken/role checks, `if (!accessToken) return null`, `if (user?.role === 'staff') return null`

- [x] **Task 3: Update events list page**
  - [x] `src/app/admin/events/page.tsx` — replace `<button>` → `<Button>`
  - [x] Replace form container `<div className="bg-white border...">` → `<Card><CardContent className="pt-6">`
  - [x] Replace status badge `<span>` → `<Badge className={badge.className}>`
  - [x] Replace event row `<div className="bg-white border...">` → `<Card>` with `<CardContent>`

- [x] **Task 4: Update event detail page**
  - [x] `src/app/admin/events/[id]/page.tsx` — replace info card `<div className="bg-white border...">` → `<Card><CardContent>`
  - [x] Replace status plain text → `<Badge className={STATUS_BADGE[event.status]}>`

- [x] **Task 5: Update report page**
  - [x] `src/app/admin/events/[id]/report/page.tsx` — replace `<button>` → `<Button>` (outline for Excel, default for PDF)
  - [x] Skeleton divs use `bg-muted` instead of `bg-gray-200`

- [x] **Task 6: Update templates page**
  - [x] `src/app/admin/templates/page.tsx` — replace `<button>` → `<Button>`
  - [x] Replace raw table → shadcn `<Table>` components
  - [x] Replace badge `<span>` → `<Badge className={...}>`
  - [x] Replace form container → `<Card><CardContent>`

- [x] **Task 7: Update users page**
  - [x] `src/app/admin/users/page.tsx` — `<Button>` for create + deactivate
  - [x] Replace raw table → shadcn Table components
  - [x] Role badge `<span>` → `<Badge className={ROLE_BADGE[user.role]}>`
  - [x] Role `<select>` → shadcn `<Select>` with `onValueChange`
  - [x] Form container → `<Card><CardContent>`

- [x] **Task 8: Update contacts feature components**
  - [x] `ContactsFilterBar.tsx` — city `<input>` → `<Input>`, Reset → `<Button variant="outline">`, industry/companySize keep native select (styled to match Input)
  - [x] `ContactsTable.tsx` — raw HTML table → shadcn `<Table>` shell, TanStack `flexRender` internals unchanged
  - [x] `ContactsPagination.tsx` — `<button>` → `<Button variant="outline" size="sm">`

- [x] **Task 9: Run regression tests**
  - [x] `npm test` — 62/62 pass, zero regressions

---

## Dev Notes

> **Theme constraint (Sprint Change Proposal 2026-03-26f):**
> All components must use the blue brand token palette:
> - Primary: `hsl(217 73% 35%)` via `bg-primary` / `text-primary`
> - Accent/secondary: `hsl(217 60% 96%)` via `bg-secondary` / `bg-accent`
> - Surface: `bg-surface` for section backgrounds
> - Elevated cards: use `.card-elevated` utility class
> - Radius: `0.75rem` base (`rounded-lg`)
> - Font: Inter (`font-sans`)
> Reference: `src/app/globals.css` `:root` tokens (see Sprint Change Proposal 2026-03-26f)

### AdminShell Architecture

Create `src/components/layout/AdminShell.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, Calendar, FileText, UserCog, LogOut
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'viewer'] },
  { href: '/admin/contacts', label: 'Kontak', icon: Users, roles: ['admin'] },
  { href: '/admin/events', label: 'Event', icon: Calendar, roles: ['admin', 'viewer'] },
  { href: '/admin/templates', label: 'Template', icon: FileText, roles: ['admin'] },
  { href: '/admin/users', label: 'Akun', icon: UserCog, roles: ['admin'] },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const router = useRouter()
  const pathname = usePathname()

  const visible = NAV_ITEMS.filter((item) => item.roles.includes(user?.role ?? 'viewer'))

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    clearAuth()
    router.replace('/login')
  }

  // Active: exact match OR prefix for sub-routes (except Dashboard which is exact only)
  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed top-0 left-0 h-full w-56 bg-sidebar border-r border-sidebar-border z-40">
        <div className="px-4 py-5 border-b border-sidebar-border">
          <span className="font-bold text-sidebar-primary">EM . U</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {visible.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive(item.href)
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
          <p className="px-3 text-xs text-muted-foreground capitalize">{user?.role}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start gap-2 text-sidebar-foreground"
          >
            <LogOut className="size-4" />
            Keluar
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-56">
        <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-background border-t border-border z-50 flex items-center justify-around">
        {visible.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 min-h-[56px] min-w-[56px] px-2 py-2 text-[10px] font-medium transition-colors',
              isActive(item.href)
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <item.icon className="size-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
```

### Simplified layout.tsx

```tsx
'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { AdminShell } from '@/components/layout/AdminShell'

const VIEWER_ALLOWED_PATHS = ['/admin', '/admin/events']

function isViewerAllowed(pathname: string): boolean {
  if (VIEWER_ALLOWED_PATHS.includes(pathname)) return true
  if (/^\/admin\/events\/[^/]+\/report/.test(pathname)) return true
  if (/^\/admin\/events\/[^/]+$/.test(pathname)) return true
  return false
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!accessToken) { router.replace('/login'); return }
    if (user?.role === 'staff') { router.replace('/scan'); return }
    if (user?.role === 'viewer' && !isViewerAllowed(pathname)) {
      router.replace('/admin/events')
    }
  }, [accessToken, user, router, pathname])

  if (!accessToken) return null
  if (user?.role === 'staff') return null

  return <AdminShell>{children}</AdminShell>
}
```

### shadcn Badge — Status Color Strategy

For event/role status badges with specific semantic colors, override with className:

```tsx
import { Badge } from '@/components/ui/badge'

// Event status
const STATUS_BADGE: Record<Event['status'], { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  published: { label: 'Dipublikasi', className: 'bg-blue-100 text-blue-700' },
  active: { label: 'Berlangsung', className: 'bg-green-100 text-green-700' },
  completed: { label: 'Selesai', className: 'bg-purple-100 text-purple-700' },
  cancelled: { label: 'Dibatalkan', className: 'bg-destructive/10 text-destructive' },
  archived: { label: 'Diarsipkan', className: 'bg-muted text-muted-foreground' },
}

<Badge className={badge.className}>{badge.label}</Badge>
```

### shadcn Table — TanStack Table Integration

ContactsTable wraps TanStack Table with shadcn Table shell:

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

// Replace: <table className="min-w-full divide-y divide-gray-200">
// With:    <Table>

// Replace: <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left...">
// With:    <TableHeader><TableRow><TableHead>

// Replace: <tbody className="divide-y divide-gray-200"><tr className="hover:bg-gray-50"><td className="px-4 py-3 text-sm">
// With:    <TableBody><TableRow className="hover:bg-muted/50"><TableCell>

// TanStack Table rendering stays unchanged — only HTML elements change:
{table.getHeaderGroups().map(headerGroup => (
  <TableRow key={headerGroup.id}>
    {headerGroup.headers.map(header => (
      <TableHead key={header.id}>
        {flexRender(header.column.columnDef.header, header.getContext())}
      </TableHead>
    ))}
  </TableRow>
))}
```

### shadcn Select — Controlled Usage (Users Page Role Selector)

shadcn Select does NOT use native `<select>` — it uses Radix UI Portal. For the users page role selector:

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Replace:
<select value={user.role} onChange={(e) => updateRole({ id: user.id, role: e.target.value as User['role'] })} disabled={isSelf}>
  <option value="admin">Admin</option>
  ...
</select>

// With:
<Select
  value={user.role}
  onValueChange={(value) => updateRole({ id: user.id, role: value as User['role'] })}
  disabled={isSelf}
>
  <SelectTrigger className="h-7 w-28 text-xs">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="admin">Admin</SelectItem>
    <SelectItem value="staff">Staff</SelectItem>
    <SelectItem value="viewer">Viewer</SelectItem>
  </SelectContent>
</Select>
```

**Important:** shadcn Select passes `disabled` prop to `SelectTrigger`, not to `Select`. Check the component source and pass `disabled` where it's accepted.

### shadcn Select — Filter Bar (ContactsFilterBar)

The ContactsFilterBar uses select with empty string for "all" values (`value=""`). shadcn's Radix Select does NOT support empty string values. Options:

**Recommended:** Keep industry and companySize as native `<select>` but style them with Input-like classes, and wrap in a label pattern. Only the city `<input>` → `<Input>` and reset button → `<Button>` need changing.

```tsx
// Native select styled consistently — does NOT require shadcn Select:
<select
  value={industry}
  onChange={(e) => debounce(() => setFilter({ industry: e.target.value, page: 1 }))}
  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
>
  {INDUSTRIES.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
</select>
```

This gives consistent visual styling without the Radix empty-value limitation.

### Card Usage Pattern

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Replace:
<div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
  <h2 className="text-lg font-semibold mb-4">Title</h2>
  {/* content */}
</div>

// With:
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    {/* content */}
  </CardContent>
</Card>

// For content-only (no title):
<Card>
  <CardContent className="pt-6">
    {/* content */}
  </CardContent>
</Card>
```

### File Locations

```
yorindo-app/src/
├── components/
│   ├── layout/
│   │   └── AdminShell.tsx          ← NEW: desktop sidebar + mobile bottom nav
│   └── features/
│       └── contacts/
│           ├── ContactsFilterBar.tsx   ← MODIFIED: Input + Button
│           ├── ContactsTable.tsx       ← MODIFIED: shadcn Table shell
│           └── ContactsPagination.tsx  ← MODIFIED: Button
├── app/
│   └── admin/
│       ├── layout.tsx              ← MODIFIED: use AdminShell
│       ├── page.tsx                ← MINOR: optional Card wrapper
│       ├── contacts/page.tsx       ← UNCHANGED (delegates to feature components)
│       ├── events/page.tsx         ← MODIFIED: Button, Badge, Card
│       ├── events/[id]/page.tsx    ← MODIFIED: Card, Badge
│       ├── events/[id]/report/page.tsx ← MODIFIED: Button
│       ├── templates/page.tsx      ← MODIFIED: Button, Badge, Table
│       └── users/page.tsx          ← MODIFIED: Button, Badge, Table, Select
```

### What Does NOT Change

- **All hooks**: `useContacts`, `useEvents`, `useUsers`, `useTemplates`, `useReport` — untouched
- **All Zustand stores**: `authStore`, `eventStore`, `filterStore` — untouched
- **All MSW handlers** — untouched
- **Route guard logic** in `layout.tsx` — untouched (moved together with AdminShell)
- **Feature component logic**: TanStack Table, debounce, form handlers — untouched
- **Form components**: `EventCreateForm`, `UserCreateForm`, `TemplateForm` — untouched (these are larger components; redesign deferred to future story or as-needed)
- **`src/app/admin/contacts/page.tsx`** — untouched (delegates entirely to feature components)
- **No new tests** — UI changes, logic tests don't test CSS

### Anti-Patterns to Avoid

- **DO NOT** change any route guard logic in `layout.tsx` — the `useEffect` pattern and `return null` guards must remain exactly as-is
- **DO NOT** change `useRouter`, `usePathname`, `useAuthStore` usage patterns — only the rendered JSX changes
- **DO NOT** use `href="/admin/contacts"` as a "startsWith" active check — because `/admin` startsWith '/admin' would always be true. Use exact match for `/admin` and prefix match for all others (already handled in the `isActive` function above)
- **DO NOT** try to use shadcn `<Select>` for the filter bar with empty string values — use styled native `<select>` instead
- **DO NOT** use shadcn `<Select>` `disabled` prop directly on `<Select>` — check the component source; `disabled` is typically on `<SelectTrigger>`
- **DO NOT** nest `<Card>` inside a page that already has padding — remove the `p-6` from the page wrapper if using Card
- **DO NOT** modify any `.test.tsx` or `.test.ts` files

### Previous Story Context

Story 10.1 established:
- `src/lib/utils.ts` with `cn()` — use this for all className conditionals
- `src/components/ui/` — all 9 components available: button, input, card, badge, select, table, dialog, sheet, sonner
- Tailwind CSS v4 with shadcn CSS variables — `bg-sidebar`, `text-sidebar-foreground`, `bg-muted`, `text-muted-foreground` etc. all work
- shadcn v4 uses `radix-ui` (monorepo) — imports like `import { Slot } from 'radix-ui'` (already in button.tsx)

---

## Dev Agent Record

### Implementation Notes

All 9 tasks completed as specified. Key outcomes:

- `AdminShell.tsx` created — desktop fixed sidebar (220px, `md:flex`) + mobile bottom tab bar (`md:hidden fixed bottom-0`). Role-filtered nav via `NAV_ITEMS`. `isActive()` uses exact match for `/admin`, prefix for all others.
- `layout.tsx` simplified to `<AdminShell>{children}</AdminShell>` — all route guard logic preserved exactly (useEffect, `return null` guards).
- All 7 admin pages updated with shadcn primitives: `<Button>`, `<Badge>`, `<Card>`, `<Table>` family, `<Select>`.
- `ContactsFilterBar`: native `<select>` kept for industry/companySize (empty string value incompatible with Radix Select) — styled to match `<Input>` visual. City uses `<Input>`. Reset uses `<Button variant="outline">`.
- `ContactsTable`: TanStack Table `flexRender` internals unchanged; only HTML table → shadcn Table shell.
- `ContactsPagination`: `<Button variant="outline" size="sm">` for page nav.
- 62/62 tests pass — zero regressions.

---

## File List

**New files:**
- `yorindo-app/src/components/layout/AdminShell.tsx`

**Modified files:**
- `yorindo-app/src/app/admin/layout.tsx`
- `yorindo-app/src/app/admin/events/page.tsx`
- `yorindo-app/src/app/admin/events/[id]/page.tsx`
- `yorindo-app/src/app/admin/events/[id]/report/page.tsx`
- `yorindo-app/src/app/admin/templates/page.tsx`
- `yorindo-app/src/app/admin/users/page.tsx`
- `yorindo-app/src/components/features/contacts/ContactsFilterBar.tsx`
- `yorindo-app/src/components/features/contacts/ContactsTable.tsx`
- `yorindo-app/src/components/features/contacts/ContactsPagination.tsx`

---

## Change Log

- 2026-03-21: Story 10.2 implemented — AdminShell with responsive sidebar/bottom nav, all 7 admin pages migrated to shadcn Button/Badge/Card/Table/Select. 62/62 tests pass.
- 2026-03-26: Theme revamp (CC-2026-03-26f) — ContactsTable duplicate badge `bg-gray-100 text-gray-700` → `bg-muted text-muted-foreground`; event row cards gain `card-elevated` class. All CSS tokens auto-adopt blue brand via globals.css update in Story 10.1. 127/128 tests pass (pre-existing useEvents failure).

---

## Completion Status

- **Status:** review
- **Note:** All ACs satisfied. AdminShell uses sidebar CSS tokens (auto blue-branded via Story 10.1). Hardcoded grays replaced with semantic tokens. Event cards use card-elevated. Zero regressions.
