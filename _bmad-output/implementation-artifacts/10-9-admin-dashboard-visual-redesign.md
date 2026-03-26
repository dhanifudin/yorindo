# Story 10.9: Admin Dashboard Visual Redesign

**Story ID:** 10.9
**Story Key:** 10-9-admin-dashboard-visual-redesign
**Epic:** Epic 10 — UI Design System & Mobile-Native Redesign
**Phase:** Phase 1 (FE) — UI-only, zero logic/API changes
**Status:** review
**Created:** 2026-03-26
**Sprint Change Proposal:** 2026-03-26h

---

## Story

As an admin user on the `/app` dashboard,
I want a polished panel-based layout that feels like a real management tool,
So that key metrics and recent events are presented in a structured, professional way.

> **Scope:** Rewrite the visual structure of `src/components/features/dashboard/AdminDashboard.tsx`. Adopted from `Dashboard.tsx` in `erick-surbakti/yorindo-landing` reference (locally at `/home/dhs/Workspaces/kada/yorindo-landing/src/pages/Dashboard.tsx`). Zero changes to `useEvents`, `useTotalContacts`, `useCurrentUser`, `useAuthStore`, `formatIndonesianDate`, `Badge`, `Skeleton`, MSW handlers, or routing.

---

## Acceptance Criteria

**AC1:** Stats displayed as a **single horizontal strip card** (not four separate cards):
- Outer wrapper: `bg-card border border-border rounded-xl overflow-hidden mb-6`
- Four stat pills in a flex row, each separated by a `border-r border-border` (last one no border)
- Each pill: icon (muted-foreground) + value (bold) + label (text-muted-foreground text-xs)
- Icons: `Calendar` (Total Event), `Zap` (Event Aktif), `Users` (Total Kontak), `Clock` (Registrasi Pending)
- On mobile (< sm): `grid grid-cols-2` with border separators

**AC2:** Greeting section preserved but upgraded:
- Date line: `text-xs text-muted-foreground` (unchanged behavior)
- Greeting: `text-2xl font-bold tracking-tight` (unchanged behavior)
- Skeleton fallback preserved during loading

**AC3:** Recent Events displayed as a **panel card**:
- Outer: `bg-card border border-border rounded-xl overflow-hidden`
- Header: `flex items-center justify-between px-4 py-3 border-b border-border`
  - Left: title "Event Terbaru" (`text-[15px] font-bold`)
  - Right: "Lihat Semua" link → `/app/events` (`text-xs text-muted-foreground hover:text-foreground`)
- Table rows: `hover:bg-muted/30 transition-colors cursor-pointer`
- Each row: small `icon-container h-7 w-7` with `CalendarDays` icon + event name column
- Status badge + date column preserved (same Badge variants)
- Skeleton fallback preserved

**AC4:** Quick Actions displayed as a **panel card**:
- Outer: `bg-card border border-border rounded-xl overflow-hidden`
- Header: `px-4 py-3 border-b border-border` with "Aksi Cepat" title
- Body: `px-4 py-4 flex flex-wrap gap-3` with the same 3 Button links preserved

**AC5:** `npm test` — no regressions. `npm run build` — 0 TypeScript errors.

---

## Tasks / Subtasks

- [x] **Task 1: Rewrite stats strip**
  - [x] Replace 4-card grid with single `bg-card border border-border rounded-xl overflow-hidden` wrapper
  - [x] Import `Calendar, Zap, Clock` from lucide-react (Users already imported)
  - [x] Flex row of 4 stat pills with `border-r border-border` separators, `px-6 py-4`
  - [x] Each pill: `<icon className="h-4 w-4 text-muted-foreground mb-2">` + value + label
  - [x] Skeleton fallback: `<Skeleton className="h-20 rounded-xl" />` (single)
  - [x] Mobile: `grid grid-cols-2` with `[&>*:nth-child(2)]:border-r-0 [&>*:nth-child(3)]:border-b-0 [&>*:nth-child(4)]:border-b-0`

- [x] **Task 2: Rewrite events panel**
  - [x] Import `CalendarDays` from lucide-react
  - [x] Wrap table in `bg-card border border-border rounded-xl overflow-hidden`
  - [x] Add panel header with "Event Terbaru" + `<Link href="/app/events">` "Lihat Semua"
  - [x] Add `hover:bg-muted/30 transition-colors` to table rows
  - [x] Add `icon-container h-7 w-7` with `CalendarDays` icon in first column
  - [x] Keep all existing columns (Nama, Status, Tanggal) and Badge logic

- [x] **Task 3: Rewrite quick actions panel**
  - [x] Wrap in `bg-card border border-border rounded-xl overflow-hidden`
  - [x] Add panel header `px-4 py-3 border-b border-border` with "Aksi Cepat"
  - [x] Move button row inside `px-4 py-4`
  - [x] Keep all 3 existing Button + Link elements unchanged

- [x] **Task 4: Update StatCard helper or remove it**
  - [x] Replace/remove the `StatCard` function component — now inlined as stat pills
  - [x] Ensure no TypeScript errors from removing it

- [x] **Task 5: Verify**
  - [x] `npm test` — no regressions
  - [x] `npm run build` — 0 TypeScript errors
  - [x] Dashboard shows stats strip, events panel, quick actions panel
  - [x] Skeleton states still render during loading

---

## Dev Notes

> **Theme constraint:** Use `bg-card`, `border-border`, `text-muted-foreground`, `icon-container` utility class throughout. No hardcoded colors.

### Reference
Local reference: `/home/dhs/Workspaces/kada/yorindo-landing/src/pages/Dashboard.tsx` — stats strip (`.stats-strip`, `.stat-pill`) and panel (`.panel`, `.panel-header`) CSS classes.

### Stats strip structure
```tsx
<div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
  <div className="grid grid-cols-2 sm:flex sm:flex-row divide-y sm:divide-y-0 divide-x divide-border">
    {STAT_PILLS.map((pill, i) => (
      <div key={pill.label} className="flex items-center gap-3 px-6 py-4 flex-1">
        <pill.icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <div>
          <div className="text-base font-bold text-foreground">{pill.value}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{pill.label}</div>
        </div>
      </div>
    ))}
  </div>
</div>
```

### Panel header pattern
```tsx
<div className="bg-card border border-border rounded-xl overflow-hidden">
  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
    <span className="text-[15px] font-bold text-foreground">Panel Title</span>
    <Link href="..." className="text-xs text-muted-foreground hover:text-foreground transition-colors">
      Lihat Semua
    </Link>
  </div>
  {/* content */}
</div>
```

### Mobile grid divide trick
Use `divide-x divide-y divide-border` on a `grid grid-cols-2 sm:flex` container to get internal borders on both axes without explicit border classes on each child.
