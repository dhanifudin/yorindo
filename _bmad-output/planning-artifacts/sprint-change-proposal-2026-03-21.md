# Sprint Change Proposal
**Project:** EM . U
**Date:** 2026-03-21
**Prepared by:** Sam (Scrum Master)
**Status:** Approved

---

## Section 1: Issue Summary

### Problem Statement

The EM . U frontend Phase 1 implementation (all stories currently in `review`) was built against the original specification, which treated the application as a single-role admin tool with:
- `/` redirecting directly to `/login` (no public entry point)
- A single admin dashboard experience regardless of role
- All authenticated routes under `/admin/*` and `/scan`
- Tables rendering all columns regardless of viewport
- The QR scan picker listing all system events for all roles

The product vision has evolved to require a **role-differentiated, mobile-friendly application** with a proper public presence and staff-specific check-in tooling.

### Discovery Context

Identified by stakeholder (Dian) after Phase 1 FE review. No defect in existing implementation — the original spec was faithfully implemented. This is additive scope driven by evolving product requirements.

### Evidence

- `sprint-status.yaml`: All Phase 1 FE stories in `review` — confirms implementation matches *original spec*, not a defect
- Story 2.3 (Route Guards): Only protects routes, does not personalize dashboard content
- Story 7.2 (QR Scan): No assignment or date filter in acceptance criteria
- Epic 10 stories: No responsive table requirement
- No landing page story exists in any epic
- Architecture doc: No role-specific UX differentiation specified

---

## Section 2: Impact Analysis

### Epic Impact

| Epic | Impact Type | Details |
|---|---|---|
| Epic 2 — Team & Access | AC Amendment | Story 2.3 post-login redirect updated to `/app` for all roles |
| Epic 7 — Check-in PWA | AC Amendment | Stories 7.1 + 7.2 event source updated to assigned-events endpoint |
| Epic 10 — UI Design System | New Story Added | Story 10.5 (Responsive Tables) added |
| **Epic 11 — NEW** | New Epic | 4 new stories: routing migration, landing page, role dashboards, staff scan |

### Story Impact

| Story | Change Type |
|---|---|
| 2.3 — Role-Based Route Guards | AC Amendment: single `/app` redirect for all roles |
| 7.1 — PWA Offline Sync | AC Amendment: sync only assigned active events for staff |
| 7.2 — QR Code Scan | AC Amendment: event picker filtered to assigned+active+today for staff |
| 10.2 — Admin Shell Navigation | AC Amendment: sidebar items differentiated by role |
| **10.5 — NEW** | New Story: responsive table redesign |
| **11.1 — NEW** | New Story: routing migration `/admin/*` + `/scan` → `/app/*` |
| **11.2 — NEW** | New Story: public landing page at `/` |
| **11.3 — NEW** | New Story: role-based personalized dashboards |
| **11.4 — NEW** | New Story: staff check-in dashboard + assigned event scan filter |

### Artifact Conflicts

| Artifact | Conflict | Resolution |
|---|---|---|
| PRD | Silent on role-differentiated dashboard UX | No change needed — stories fill the gap |
| Architecture | References `/admin` paths in FE routing section | Architecture doc note: FE routes migrated to `/app/*` |
| sprint-status.yaml | Missing Epic 11 and Story 10.5 | Updated in this proposal |
| GitHub Actions deploy | `generateStaticParams` page wrappers use `/admin` paths | Updated as part of Story 11.1 implementation |

### Technical Impact

- **Routing migration** (11.1): Mechanical refactor — move `src/app/admin/` + `src/app/scan/` into `src/app/app/`. Update all `href` strings, `router.push/replace` calls, `generateStaticParams` wrappers, and authStore redirects. No API or MSW changes.
- **New MSW mock**: `GET /api/users/me/assigned-events` needed for Stories 11.3 and 11.4
- **No backend work**: All changes are FE-only; Phase 2 BE will implement the real `/api/users/me/assigned-events` endpoint

---

## Section 3: Recommended Approach

**Option 1 — Direct Adjustment** ✅ Selected

Add Epic 11 (4 stories) and Story 10.5, amend ACs on 4 existing stories. No rollback of completed work. Existing Phase 1 implementation remains valid.

**Rationale:**
- Existing work is correct per original spec — no reason to discard it
- New stories are additive, not conflicting
- Story 11.1 (routing migration) is a mechanical refactor with low risk
- All new stories are FE-only, consistent with current Phase 1 approach
- Effort is Medium overall; individual stories are Low–Medium each
- Risk is Low: no architecture changes, no API changes, no data model changes

**Sequencing constraint:**
Story 11.1 must be implemented and reviewed before 11.2, 11.3, 11.4 begin.
Story 11.3 must complete before 11.4 begins.
Story 10.5 can run in parallel after 11.1 is complete.

---

## Section 4: Detailed Change Proposals

### 4.1 New Epic

#### Epic 11 — UX Experience & Routing Revamp
```
Phase: FE-only (no backend changes required)
Goal: Establish a cohesive, role-differentiated application experience
      with proper public entry point and staff-specific tools.
Stories: 11.1, 11.2, 11.3, 11.4
```

---

### 4.2 New Stories

#### Story 11.1 — App Routing Migration (`/admin/*` + `/scan` → `/app/*`)
```
Epic: 11 | Phase: FE-only | Priority: FIRST (blocks 11.2, 11.3, 11.4)

Route mapping:
  /admin           → /app
  /admin/events    → /app/events
  /admin/events/[id]               → /app/events/[id]
  /admin/events/[id]/registrations → /app/events/[id]/registrations
  /admin/events/[id]/report        → /app/events/[id]/report
  /admin/contacts                  → /app/contacts
  /admin/contacts/upload           → /app/contacts/upload
  /admin/contacts/flagged          → /app/contacts/flagged
  /admin/contacts/duplicates       → /app/contacts/duplicates
  /admin/blast                     → /app/blast
  /admin/templates                 → /app/templates
  /admin/suppression               → /app/suppression
  /admin/users                     → /app/users
  /scan                            → /app/scan

Unchanged (public):
  /login, /register/*, /data-rights/*, /tickets/*, /vendor-report/*

Acceptance Criteria:
  - All authenticated page files moved to src/app/app/* directory
  - AuthGuard: unauthenticated /app/* → /login
  - Role guards redirect to /app (not /admin)
  - All <Link> hrefs and router.push/replace updated to /app paths
  - Admin shell sidebar nav links updated
  - generateStaticParams server wrapper pages updated
  - authStore post-login redirect updated to /app
  - GitHub Actions deploy workflow updated accordingly

Technical notes:
  - Use src/app/app/ literal directory since /app IS the desired URL prefix
  - No API route changes, no MSW handler changes
```

#### Story 11.2 — Public Landing Page at `/`
```
Epic: 11 | Phase: FE-only | Depends on: 11.1

Acceptance Criteria:
  - / renders a static public landing page (no auth required)
  - Uses PublicShell layout component (already exists)
  - Hero section: product name, tagline, brief description
  - Two CTAs: "Masuk" → /login | "Daftar Event" → placeholder
  - Features section: 3–4 highlight cards
  - Footer: copyright, link to /data-rights
  - Fully static (SSG), no API calls
  - Responsive: mobile and desktop
  - Consistent with established shadcn/ui design tokens

MSW: None required (static page)
```

#### Story 11.3 — Role-Based Personalized Dashboards
```
Epic: 11 | Phase: FE-only | Depends on: 11.1

Role experiences:

  ADMIN:
  - "Selamat datang, {name}" + today's date
  - Quick stats: total events, active events, total contacts,
    pending registrations
  - Recent events table (last 5, with status badge)
  - Quick links: Create Event, Upload Contacts, View Reports
  - Full sidebar navigation

  VIEWER:
  - "Selamat datang, {name}"
  - Read-only stats row (same as admin)
  - Recent events table (no action buttons)
  - Sidebar: no destructive actions (no Create/Upload/Users)

  STAFF:
  - "Selamat datang, {name} — Hari ini: {tanggal}"
  - Assigned events widget: active events assigned to this staff today
  - Each event card: name, time, check-in count, "Mulai Scan" CTA
    → /app/scan?eventId={id}
  - Empty state: "Tidak ada event hari ini"
  - Minimal sidebar (Dashboard + Scan only)

Acceptance Criteria:
  - /app reads user.role from authStore
  - Renders AdminDashboard | ViewerDashboard | StaffDashboard
  - Components in src/components/features/dashboard/
  - Stats via existing hooks (useEvents, useContacts, etc.)
  - StaffDashboard: GET /api/users/me/assigned-events,
    client-filtered by status='active' + date=today
  - Loading skeletons on all data sections
  - Unknown role → redirect to /login

MSW additions:
  - GET /api/users/me/assigned-events → array of assigned events
    (use existing event fixtures, filter to active)
```

#### Story 11.4 — Staff Check-in Dashboard & Assigned Event Scan Filter
```
Epic: 11 | Phase: FE-only | Depends on: 11.1, 11.3

Acceptance Criteria — Scan Event Picker:
  - GET /api/users/me/assigned-events replaces GET /api/events
    as event source for /app/scan (staff role only)
  - Filter: status='active' AND eventDate=today (in event timezone)
  - Empty result: "Tidak ada event aktif hari ini", scan disabled
  - Single match: auto-select, skip picker sheet
  - Multiple matches: show picker with filtered list only
  - Admin/Viewer: unaffected, use full event list

Acceptance Criteria — In-Session Stats Panel:
  - Compact stats bar above scanner viewport when event selected:
      Checked-in: {count} / {capacity}
      Progress bar
      Last scan: {contactName} — {timeAgo}
  - Refreshed every 10 seconds via existing
    GET /api/events/:id/attendance-stats
  - Stats bar collapses on scroll to maximise scanner area

MSW: GET /api/users/me/assigned-events (added in 11.3)
     Ensure at least one active+today event in staff fixture
```

---

### 4.3 New Story in Existing Epic

#### Story 10.5 — Responsive Table Redesign
```
Epic: 10 | Phase: FE-only | Depends on: 11.1

Affected tables & visible columns:

  /app/events:
    Desktop: Name | Status | Date | Capacity | Actions
    Mobile:  Name | Status | Actions

  /app/events/[id]/registrations:
    Desktop: Name | Email | Status | Registered At | Actions
    Mobile:  Name | Status | Actions

  /app/contacts:
    Desktop: Name | Email | Phone | Industry | Status | Actions
    Mobile:  Name | Industry | Actions

  /app/contacts/flagged:
    Desktop: Name | Field | Current | Suggested | Actions
    Mobile:  Name | Field | Actions

  /app/contacts/duplicates:
    Desktop: Record A | Record B | Similarity | Actions
    Mobile:  Record A | Actions

  /app/users:
    Desktop: Name | Email | Role | Last Login | Actions
    Mobile:  Name | Role | Actions

  /app/templates:
    Desktop: Name | Channel | Type | Updated At | Actions
    Mobile:  Name | Channel | Actions

Acceptance Criteria:
  - hidden md:table-cell for secondary columns
  - No horizontal overflow on mobile
  - Actions column always visible
  - Row tap on mobile → Sheet (bottom drawer) with full details
  - Empty states and loading skeletons unchanged
  - Display-layer only, no data fetching changes
```

---

### 4.4 AC Amendments to Existing Stories

#### Story 2.3 — Role-Based Route Guards
```
Section: Acceptance Criteria — Post-login redirect

OLD: Admin/Viewer → /admin | Staff → /scan
NEW: All roles → /app
     Single destination for all authenticated users.
     Dashboard content personalized per role (Story 11.3).
     Unauthenticated /app/* → /login.
```

#### Story 7.1 — PWA Offline Participant Data Sync
```
Section: Acceptance Criteria — Event source for sync

OLD: Sync participant data for the selected event
NEW: Staff role: sync only for GET /api/users/me/assigned-events
     filtered by status='active' and eventDate=today.
     Empty: "Tidak ada event untuk disinkronkan hari ini".
     Admin role: unaffected, syncs selected event as before.
```

#### Story 7.2 — QR Code Scan Check-in
```
Section: Acceptance Criteria — Event source for scanner

OLD: Staff selects from all available events
NEW: Staff event picker uses GET /api/users/me/assigned-events
     filtered by status='active' and eventDate=today.
     Auto-select if exactly one match.
     Full implementation detail in Story 11.4.
```

#### Story 10.2 — Admin Shell Navigation Redesign
```
Section: Acceptance Criteria — Sidebar items by role

OLD: Sidebar shows all navigation items for all authenticated users
NEW: Admin: full sidebar
     Viewer: read-only sidebar (no Users, Blast, Templates, Suppression)
     Staff: minimal sidebar (Dashboard + Scan only)
     Role read from authStore at render time.
     Route prefix updated from /admin/* to /app/* per Story 11.1.
```

---

## Section 5: Implementation Handoff

### Change Scope Classification: **Moderate**

New epic + 5 new stories + 4 AC amendments. Requires backlog update and story creation before development begins.

### Handoff Plan

| Role | Responsibility |
|---|---|
| Scrum Master | Update sprint-status.yaml, create story files for 10.5, 11.1–11.4 |
| Developer | Implement in sequence: 11.1 → 11.2 + 10.5 → 11.3 → 11.4 |
| Product Owner | Review story files before implementation begins |

### Implementation Sequence

```
1. Create story files: 10.5, 11.1, 11.2, 11.3, 11.4
2. Implement 11.1 (routing migration) — MUST BE FIRST
3. Implement 11.2 (landing page) + 10.5 (tables) — parallel after 11.1
4. Implement 11.3 (role dashboards) — after 11.1
5. Implement 11.4 (staff scan) — after 11.3
6. Amend story files: 2.3, 7.1, 7.2, 10.2 with new AC
```

### Success Criteria

- [ ] All authenticated routes accessible under `/app/*`
- [ ] `/` renders public landing page (no auth required)
- [ ] Admin, Viewer, Staff each see role-appropriate dashboard at `/app`
- [ ] Staff scan picker shows only their assigned active events for today
- [ ] All admin tables render without horizontal overflow on mobile
- [ ] Existing Phase 1 stories (in review) remain valid post-migration

---

*Sprint Change Proposal approved by Dian on 2026-03-21*
