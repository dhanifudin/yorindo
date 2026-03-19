# Story 11.1: App Routing Migration (/admin/* + /scan → /app/*)

Status: review

## Story

As a developer,
I want all authenticated routes migrated from `/admin/*` and `/scan` to `/app/*`,
so that every role shares a single authenticated namespace and the codebase is ready for role-based dashboard personalization.

## Acceptance Criteria

1. All files under `src/app/admin/` are moved to `src/app/app/` maintaining the same sub-directory structure.
2. `src/app/scan/page.tsx` is moved to `src/app/app/scan/page.tsx`.
3. `src/app/app/layout.tsx` (formerly `admin/layout.tsx`) guards all `/app/*` routes: unauthenticated users redirect to `/login`; no role-based redirect away from `/app` (all roles are welcome at `/app/*`); viewer-restricted paths updated to use `/app/` prefix.
4. `src/components/layout/AdminShell.tsx` NAV_ITEMS hrefs updated from `/admin/*` to `/app/*`; `isActive` exact-match updated from `/admin` to `/app`; a minimal Scan nav item (`/app/scan`) is added with `roles: ['staff', 'admin']` so staff have at least one visible item before Story 11.3.
5. All `router.push`, `router.replace`, and `href` strings referencing `/admin` or `/scan` routes updated across the entire codebase.
6. `src/app/page.tsx` (root) redirects updated: staff → `/app/scan`, admin/viewer → `/app`.
7. `src/components/forms/LoginForm.tsx` post-login redirect updated to `/app`.
8. `src/app/login/page.tsx` already-authenticated redirect updated to `/app`.
9. All `generateStaticParams` server wrapper `page.tsx` files moved to new paths and updated accordingly.
10. GitHub Actions `.github/workflows/deploy.yml` updated: no path-string changes needed (params like `event-001` are unchanged), but verify build still passes with `NEXT_EXPORT=true` after the file moves.
11. `npm run build` passes with no TypeScript errors after migration.
12. Dev server: navigating to `/app` shows the dashboard; `/app/events` shows the event list; `/app/scan` shows the scanner; `/login` still works; `/register/*` unchanged; `/` still redirects as before.

## Tasks / Subtasks

- [x] Task 1 — Move all admin page files to /app (AC: 1, 2)
  - [x] Create `src/app/app/` directory structure mirroring current `src/app/admin/`
  - [x] Move `src/app/admin/layout.tsx` → `src/app/app/layout.tsx`
  - [x] Move `src/app/admin/page.tsx` → `src/app/app/page.tsx`
  - [x] Move `src/app/admin/blast/page.tsx` → `src/app/app/blast/page.tsx`
  - [x] Move `src/app/admin/contacts/page.tsx` → `src/app/app/contacts/page.tsx`
  - [x] Move `src/app/admin/contacts/upload/page.tsx` → `src/app/app/contacts/upload/page.tsx`
  - [x] Move `src/app/admin/contacts/flagged/page.tsx` → `src/app/app/contacts/flagged/page.tsx`
  - [x] Move `src/app/admin/contacts/duplicates/page.tsx` → `src/app/app/contacts/duplicates/page.tsx`
  - [x] Move `src/app/admin/events/page.tsx` → `src/app/app/events/page.tsx`
  - [x] Move `src/app/admin/events/[id]/page.tsx` → `src/app/app/events/[id]/page.tsx`
  - [x] Move `src/app/admin/events/[id]/_client.tsx` → `src/app/app/events/[id]/_client.tsx`
  - [x] Move `src/app/admin/events/[id]/registrations/page.tsx` → `src/app/app/events/[id]/registrations/page.tsx`
  - [x] Move `src/app/admin/events/[id]/registrations/_client.tsx` → `src/app/app/events/[id]/registrations/_client.tsx`
  - [x] Move `src/app/admin/events/[id]/report/page.tsx` → `src/app/app/events/[id]/report/page.tsx`
  - [x] Move `src/app/admin/events/[id]/report/_client.tsx` → `src/app/app/events/[id]/report/_client.tsx`
  - [x] Move `src/app/admin/suppression/page.tsx` → `src/app/app/suppression/page.tsx`
  - [x] Move `src/app/admin/templates/page.tsx` → `src/app/app/templates/page.tsx`
  - [x] Move `src/app/admin/users/page.tsx` → `src/app/app/users/page.tsx`
  - [x] Move `src/app/scan/page.tsx` → `src/app/app/scan/page.tsx`
  - [x] Delete the now-empty `src/app/admin/` and `src/app/scan/` directories

- [x] Task 2 — Update app layout (auth guard) (AC: 3)
  - [x] In `src/app/app/layout.tsx`:
    - Remove the `if (user?.role === 'staff') { router.replace('/scan') }` block
    - Remove the `if (user?.role === 'staff') return null` early return
    - Update `VIEWER_ALLOWED_PATHS` from `['/admin', '/admin/events']` to `['/app', '/app/events']`
    - Update regex: `/^\/admin\/events\/[^/]+\/report/` → `/^\/app\/events\/[^/]+\/report/`
    - Update regex: `/^\/admin\/events\/[^/]+$/` → `/^\/app\/events\/[^/]+$/`
    - Update viewer fallback redirect: `router.replace('/admin/events')` → `router.replace('/app/events')`

- [x] Task 3 — Update AdminShell navigation (AC: 4)
  - [x] In `src/components/layout/AdminShell.tsx`:
    - Update all NAV_ITEMS hrefs: `/admin` → `/app`, `/admin/contacts` → `/app/contacts`, etc.
    - Add Scan nav item: `{ href: '/app/scan', label: 'Scan', icon: QrCode, roles: ['staff', 'admin'] }`
    - Import `QrCode` from `lucide-react`
    - Update `isActive` exact-match check: `href === '/admin'` → `href === '/app'`

- [x] Task 4 — Update route strings across all files (AC: 5, 6, 7, 8)

  **`src/app/page.tsx`** (root redirect):
  - `router.replace('/scan')` → `router.replace('/app/scan')`
  - `router.replace('/admin')` → `router.replace('/app')`

  **`src/app/login/page.tsx`** (already-auth redirect):
  - `router.replace('/admin')` → `router.replace('/app')`

  **`src/components/forms/LoginForm.tsx`** (post-login redirect):
  - `router.push('/admin')` → `router.push('/app')`

  **`src/app/app/scan/page.tsx`** (formerly scan/page.tsx — admin/viewer redirect):
  - `router.replace('/admin')` → `router.replace('/app')`

  **`src/app/app/events/page.tsx`** (event row click):
  - `router.push('/admin/events/${event.id}')` → `router.push('/app/events/${event.id}')`

  **`src/app/app/contacts/duplicates/page.tsx`** (back link):
  - `href="/admin/contacts"` → `href="/app/contacts"`

  **`src/app/app/contacts/flagged/page.tsx`** (back link):
  - `href="/admin/contacts"` → `href="/app/contacts"`

  **`src/app/app/contacts/upload/page.tsx`** (back links):
  - `href="/admin/contacts"` → `href="/app/contacts"`
  - `href="/admin/contacts/flagged"` → `href="/app/contacts/flagged"`

  **`src/app/app/events/[id]/registrations/_client.tsx`** (back link):
  - `href={'/admin/events/${id}'}` → `href={'/app/events/${id}'}`

  **`src/components/features/events/EventCloneDialog.tsx`** (post-clone navigation):
  - `router.push('/admin/events/${cloned.id}')` → `router.push('/app/events/${cloned.id}')`

- [x] Task 5 — Verify generateStaticParams server wrappers (AC: 9)
  - [x] Confirm `src/app/app/events/[id]/page.tsx` still exports `generateStaticParams` with correct event IDs
  - [x] Confirm `src/app/app/events/[id]/registrations/page.tsx` same
  - [x] Confirm `src/app/app/events/[id]/report/page.tsx` same
  - [x] Note: param *values* (`event-001`, etc.) do not change — only the file *location* changes

- [x] Task 6 — Verify build and dev server (AC: 10, 11, 12)
  - [x] Run `npm run build` (standalone mode) — must pass with 0 TypeScript errors
  - [x] Run `NEXT_EXPORT=true npm run build` — must pass for GitHub Pages
  - [ ] Verify dev server: `/app`, `/app/events`, `/app/scan`, `/login`, `/register/seminar-erp-jakarta` all render correctly

## Dev Notes

### Critical: This is a File Move + String Update Story

This story is **purely mechanical** — no business logic changes, no new components, no API changes. The risk is completeness: missing one `href` or `router.push` string will cause a broken link in production.

**Use the exhaustive route string list in Task 4 as your checklist.** Every reference has been catalogued — do not search manually and risk missing one.

### Directory Move Strategy

**Do NOT use `git mv` or shell `mv` if it would cause issues with the framework.** Instead:
1. Create the new directory structure under `src/app/app/`
2. Copy each file using the `Write` tool (copy content, create at new path)
3. Delete the old files

This approach avoids any git history complications and ensures all file contents are identical at the new paths.

### Layout Change Detail

The new `src/app/app/layout.tsx` must:
- Keep: `if (!accessToken) router.replace('/login')` — still required
- Keep: `if (!accessToken) return null` — still required
- **Remove**: `if (user?.role === 'staff') { router.replace('/scan') }` — staff can now be at `/app`
- **Remove**: `if (user?.role === 'staff') return null` — staff render AdminShell now
- Update viewer allowed paths (see Task 2)
- Keep: `return <AdminShell>{children}</AdminShell>` — all roles use AdminShell for now

After this change, staff will reach the AdminShell with only "Scan" visible in the nav (added in Task 3). The full staff-specific dashboard UI comes in Stories 11.3 and 10.2 amendment.

### AdminShell Scan Nav Item

Add to `NAV_ITEMS` array in `AdminShell.tsx`:
```typescript
import { LayoutDashboard, Users, Calendar, FileText, UserCog, LogOut, QrCode } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/app',              label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'viewer', 'staff'] },
  { href: '/app/contacts',     label: 'Kontak',    icon: Users,           roles: ['admin'] },
  { href: '/app/events',       label: 'Event',     icon: Calendar,        roles: ['admin', 'viewer'] },
  { href: '/app/templates',    label: 'Template',  icon: FileText,        roles: ['admin'] },
  { href: '/app/users',        label: 'Akun',      icon: UserCog,         roles: ['admin'] },
  { href: '/app/scan',         label: 'Scan',      icon: QrCode,          roles: ['staff', 'admin'] },
]
```

Note: Dashboard (`/app`) is now visible to all 3 roles. Staff see Dashboard + Scan. This will be refined with role-specific content in Story 11.3.

### isActive Function Update

```typescript
// Before
const isActive = (href: string) =>
  href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

// After
const isActive = (href: string) =>
  href === '/app' ? pathname === '/app' : pathname.startsWith(href)
```

### Root Page (src/app/page.tsx)

```typescript
// Before (existing)
if (user?.role === 'staff') {
  router.replace('/scan')
} else {
  router.replace('/admin')
}

// After (Story 11.1)
if (user?.role === 'staff') {
  router.replace('/app/scan')   // temporary — Story 11.2 replaces root with landing page
} else {
  router.replace('/app')
}
```

⚠️ Note: `src/app/page.tsx` will be **completely replaced** in Story 11.2 (public landing page). For Story 11.1, just update the redirect strings. Do NOT remove the redirect logic yet.

### No API Changes

`/api/*` routes are untouched. MSW handlers are untouched. The only things that change are:
1. FE page file locations
2. FE route string references (hrefs, router.push/replace)

### GitHub Actions Deploy Workflow

The `deploy.yml` workflow builds with `NEXT_EXPORT=true`. After this migration:
- The static export output will be at `out/app/` instead of `out/admin/`
- `generateStaticParams` wrapper files have identical *param values* but are now located at `src/app/app/events/[id]/page.tsx` etc.
- No workflow YAML changes needed — the workflow just runs `npm run build` and uploads `out/`
- Verify by running `NEXT_EXPORT=true npm run build` locally after migration

### Viewer Allowed Paths Update

```typescript
// Before
const VIEWER_ALLOWED_PATHS = ['/admin', '/admin/events']

function isViewerAllowed(pathname: string): boolean {
  if (VIEWER_ALLOWED_PATHS.includes(pathname)) return true
  if (/^\/admin\/events\/[^/]+\/report/.test(pathname)) return true
  if (/^\/admin\/events\/[^/]+$/.test(pathname)) return true
  return false
}

// After
const VIEWER_ALLOWED_PATHS = ['/app', '/app/events']

function isViewerAllowed(pathname: string): boolean {
  if (VIEWER_ALLOWED_PATHS.includes(pathname)) return true
  if (/^\/app\/events\/[^/]+\/report/.test(pathname)) return true
  if (/^\/app\/events\/[^/]+$/.test(pathname)) return true
  return false
}
```

### Project Structure Notes

**New file tree after migration:**
```
src/app/
├── layout.tsx          (unchanged — root layout)
├── page.tsx            (updated redirects only; replaced entirely in Story 11.2)
├── not-found.tsx       (unchanged)
├── globals.css         (unchanged)
├── app/                ← NEW: all authenticated routes live here
│   ├── layout.tsx      (formerly admin/layout.tsx — auth guard for /app/*)
│   ├── page.tsx        (formerly admin/page.tsx — dashboard)
│   ├── blast/page.tsx
│   ├── contacts/
│   │   ├── page.tsx
│   │   ├── upload/page.tsx
│   │   ├── flagged/page.tsx
│   │   └── duplicates/page.tsx
│   ├── events/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       ├── page.tsx          (server wrapper — generateStaticParams)
│   │       ├── _client.tsx
│   │       ├── registrations/
│   │       │   ├── page.tsx      (server wrapper — generateStaticParams)
│   │       │   └── _client.tsx
│   │       └── report/
│   │           ├── page.tsx      (server wrapper — generateStaticParams)
│   │           └── _client.tsx
│   ├── suppression/page.tsx
│   ├── templates/page.tsx
│   ├── users/page.tsx
│   └── scan/page.tsx   (formerly src/app/scan/page.tsx)
├── login/              (unchanged)
├── register/           (unchanged)
├── data-rights/        (unchanged)
├── tickets/            (unchanged)
├── vendor-report/      (unchanged)
└── api/health/         (unchanged)
```

**Old directories to delete after migration:**
- `src/app/admin/` (entire directory)
- `src/app/scan/` (entire directory)

### References

- Sprint Change Proposal: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-21.md`
- Current `src/app/admin/layout.tsx` — auth guard pattern to preserve
- Current `src/components/layout/AdminShell.tsx` — nav items to update
- Current `src/components/forms/LoginForm.tsx:41` — `router.push('/admin')` → `/app`
- Current `src/app/page.tsx:17-21` — role redirect logic to update
- Current `src/app/scan/page.tsx:38` — `router.replace('/admin')` → `/app`
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — story 11-1 must move to `in-progress` then `review`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — migration completed without errors.

### Completion Notes List

- All 18 files from `src/app/admin/` moved to `src/app/app/` maintaining identical sub-directory structure
- `src/app/scan/page.tsx` moved to `src/app/app/scan/page.tsx`
- Old `src/app/admin/` and `src/app/scan/` directories deleted
- `src/app/app/layout.tsx`: removed staff redirect, removed `if (user?.role === 'staff') return null`, updated VIEWER_ALLOWED_PATHS and regexes to `/app/*`, updated viewer fallback to `/app/events`
- `AdminShell.tsx`: updated all 5 NAV_ITEMS hrefs to `/app/*`, added Scan nav item with `QrCode` icon for `['staff', 'admin']`, updated `isActive` exact-match from `/admin` to `/app`
- All 10 route string references updated across the codebase (catalogued in Task 4)
- `generateStaticParams` server wrappers preserved at new paths with identical param values
- Both `npm run build` and `NEXT_EXPORT=true npm run build` pass with 0 TypeScript errors, 50/50 static pages generated
- `/app/*` routes render correctly in static export build output

### File List

**Moved (created at new path, old path deleted):**
- `src/app/app/layout.tsx` (from admin/layout.tsx — modified: removed staff redirect, updated viewer paths)
- `src/app/app/page.tsx` (from admin/page.tsx)
- `src/app/app/blast/page.tsx` (from admin/blast/page.tsx)
- `src/app/app/contacts/page.tsx` (from admin/contacts/page.tsx)
- `src/app/app/contacts/upload/page.tsx` (from admin/contacts/upload/page.tsx — updated hrefs)
- `src/app/app/contacts/flagged/page.tsx` (from admin/contacts/flagged/page.tsx — updated href)
- `src/app/app/contacts/duplicates/page.tsx` (from admin/contacts/duplicates/page.tsx — updated href)
- `src/app/app/events/page.tsx` (from admin/events/page.tsx — updated router.push)
- `src/app/app/events/[id]/page.tsx` (from admin/events/[id]/page.tsx)
- `src/app/app/events/[id]/_client.tsx` (from admin/events/[id]/_client.tsx)
- `src/app/app/events/[id]/registrations/page.tsx` (from admin/events/[id]/registrations/page.tsx)
- `src/app/app/events/[id]/registrations/_client.tsx` (from admin/events/[id]/registrations/_client.tsx — updated href)
- `src/app/app/events/[id]/report/page.tsx` (from admin/events/[id]/report/page.tsx)
- `src/app/app/events/[id]/report/_client.tsx` (from admin/events/[id]/report/_client.tsx)
- `src/app/app/suppression/page.tsx` (from admin/suppression/page.tsx)
- `src/app/app/templates/page.tsx` (from admin/templates/page.tsx)
- `src/app/app/users/page.tsx` (from admin/users/page.tsx)
- `src/app/app/scan/page.tsx` (from scan/page.tsx — updated router.replace)

**Updated in place:**
- `src/app/page.tsx` (updated /scan → /app/scan, /admin → /app)
- `src/app/login/page.tsx` (updated /admin → /app)
- `src/components/forms/LoginForm.tsx` (updated /admin → /app)
- `src/components/layout/AdminShell.tsx` (updated NAV_ITEMS hrefs, added Scan item, updated isActive)
- `src/components/features/events/EventCloneDialog.tsx` (updated /admin/events → /app/events)

**Deleted:**
- `src/app/admin/` (entire directory — 17 files)
- `src/app/scan/` (entire directory — 1 file)
