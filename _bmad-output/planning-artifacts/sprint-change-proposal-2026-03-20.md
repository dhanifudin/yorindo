# Sprint Change Proposal
**Project:** EM . U
**Date:** 2026-03-20
**Prepared by:** Sam (Scrum Master)
**Status:** Approved
**Supersedes:** None (additive to sprint-change-proposal-2026-03-21)

---

## Section 1: Issue Summary

### Problem Statement

After completing Stories 11.1–11.4 and deploying to GitHub Pages, stakeholder review identified 10 functional gaps and UX improvements that fall outside existing story acceptance criteria. Additionally, code review of Stories 3.4, 3.5, 4.2, 10.5, and 11.4 surfaced 4 intent gaps where implemented behavior doesn't match the evolving product vision.

### Discovery Context

- **Source:** Stakeholder (Dian) post-deployment review + automated code review
- **Phase:** Phase 1 FE (MSW mocks) — all changes remain FE-only
- **Severity:** No defects — these are scope additions and UX direction changes

### Change Trigger Items

| # | Description | Category |
|---|-------------|----------|
| 1 | Logout should redirect to `/` | Bug — **Already Fixed** |
| 2 | Revamp tables into card-based design | UX direction change |
| 3 | Manual contact flagging (spam, not-potential) + auto-merge duplicates | New requirement |
| 4 | Sort events by date, add filtering, link templates at creation | Enhancement |
| 5 | Event lifecycle auto-transitions (except cancellation) | Spec gap |
| 6 | Staff dashboard event statistics | **Already Done** (11.3/11.4) |
| 7 | Split events into upcoming/history | New requirement |
| 8 | Viewer dashboard event statistics + audience insights | Enhancement (partially done in 11.3) |
| 9 | Event banner support | New requirement |
| 10 | Social media OG sharing (WhatsApp, Facebook) | New requirement |

### Code Review Findings (F1–F4)

| ID | Type | Description | Maps to |
|----|------|-------------|---------|
| F1 | intent_gap | Story 3.4 lacks manual flagging categories (spam, not-potential) | Item #3 |
| F2 | intent_gap | Story 4.2 lifecycle transitions are manual-only, no auto-transition | Item #5 |
| F3 | intent_gap | Story 11.3 ViewerDashboard lacks deep event statistics + audience insights | Item #8 |
| F4 | bad_spec | Story 10.5 uses responsive tables but stakeholder prefers card-based design | Item #2 |

---

## Section 2: Impact Analysis

### Epic Impact

| Epic | Impact Type | Details |
|------|-------------|---------|
| Epic 3 — Contacts | AC Amendment | Story 3.4: add manual flagging categories; Story 3.5: add auto-detection notification badge |
| Epic 4 — Events | AC Amendment + New Story | Story 4.1: template linking; Story 4.2: auto lifecycle; New Story 4.7: event banner |
| Epic 5 — Blast | AC Amendment | Story 5.1: template type categorization (blast/confirmation/rejection) |
| Epic 6 — Registration | New Story | Story 6.8: social OG meta tags for event landing pages |
| Epic 10 — UI Design | Story Revision | Story 10.5: pivot from responsive tables to card-based design |
| Epic 11 — UX | AC Amendment + New Story | Story 11.3: viewer dashboard enhancement; New Story 11.5: event list filtering + upcoming/history split |

### Story Impact Summary

| Story | Change Type | Scope |
|-------|-------------|-------|
| 3.4 — Flagged Records Review | AC Amendment | Add manual flag action with categories (spam, not-potential, invalid-data) |
| 3.5 — Duplicate Detection & Merge | AC Amendment | Add notification badge on Contacts nav item when duplicates detected |
| 4.1 — Event Creation | AC Amendment | Template picker for blast/confirmation/rejection during event setup |
| 4.2 — Event Lifecycle | AC Amendment | Auto-transition rules (draft→published→active→completed), cancel remains manual |
| 5.1 — Template Management | AC Amendment | Template type field: blast, confirmation, rejection |
| 10.5 — Responsive Table Redesign | **Revision** | Pivot to card-based list design on mobile (replaces hidden-column approach) |
| 11.3 — Role Dashboards | AC Amendment | Viewer: add event funnel stats, audience demographic charts |
| **4.7 — NEW** | New Story | Event banner image upload + display |
| **6.8 — NEW** | New Story | Social OG meta tags for event landing pages |
| **11.5 — NEW** | New Story | Event list filtering + upcoming/history split |

### Artifact Conflicts

| Artifact | Conflict | Resolution |
|----------|----------|------------|
| PRD | FR1 (event management) doesn't mention banner images | Add banner to event configuration FRs |
| PRD | No FR for social sharing / OG tags | Add as part of FR22 (public landing page) |
| Architecture | No image upload infrastructure defined | Phase 1: URL-only field; Phase 2: file upload to local storage |
| sprint-status.yaml | Missing stories 4.7, 6.8, 11.5 | Add after approval |

### Technical Impact

- **All changes remain FE-only** — consistent with Phase 1 approach
- **MSW additions needed:** template type field in handlers, banner URL in event fixtures, OG meta tag rendering
- **No backend work, no API contract changes** — new fields are additive to existing OpenAPI types
- **Image upload deferred to Phase 2** — Phase 1 uses URL input for banner

---

## Section 3: Recommended Approach

**Option 1 — Direct Adjustment** ✅ Selected

Amend ACs on 7 existing stories, revise Story 10.5 scope, and add 3 new stories. No rollback needed. All changes are additive and FE-only.

**Rationale:**
- All existing implementations are correct per original spec — no work is invalidated
- Story 10.5 direction change (table → card) is a design pivot, not a technical failure — the responsive table code already written can be replaced
- Auto lifecycle logic (4.2) is UI-only in Phase 1 — mock the transitions, real state machine in Phase 2 BE
- New stories (4.7, 6.8, 11.5) are independent and can be implemented in parallel
- Effort: Medium overall; individual changes are Low each
- Risk: Low — no architecture changes, no API contract changes

**Sequencing:**
- AC amendments can be implemented immediately (independent of each other)
- Story 10.5 revision: implement after current review cycle completes
- New stories: implement after AC amendments are done
- Story 11.5 (filtering + split) depends on 4.2 AC amendment (auto lifecycle provides status data)

---

## Section 4: Detailed Change Proposals

### 4.1 AC Amendments

#### Story 3.4 — Flagged Records Review & Resolution

```
Section: Acceptance Criteria — Flag actions

OLD:
- Admin reviews AI-flagged records and resolves each flag
- Resolution options: accept suggestion, reject, edit manually

NEW:
- Admin reviews AI-flagged records and resolves each flag
- Resolution options: accept suggestion, reject, edit manually
- Admin can manually flag any contact from the contacts table
- Manual flag categories: "spam", "not-potential", "invalid-data", "duplicate"
- Flagged contacts display category badge in contacts list
- Bulk flag action available from contacts table (select multiple → flag)
- Filter contacts list by flag status: all, flagged, unflagged

Rationale: Stakeholder needs manual quality control beyond AI-detected issues.
Manual flagging enables proactive database hygiene.
```

#### Story 3.5 — Duplicate Profile Detection & Merge

```
Section: Acceptance Criteria — Duplicate notification

OLD:
- Duplicate pairs displayed with similarity score
- Admin can merge, dismiss, or review each pair

NEW:
- Duplicate pairs displayed with similarity score
- Admin can merge, dismiss, or review each pair
- Navigation badge on "Kontak" sidebar item shows unresolved duplicate count
- Badge updates reactively when duplicates are resolved or new ones detected
- Auto-merge option for exact matches (same phone + same email)

Rationale: Duplicates should surface proactively rather than requiring
admin to navigate to the duplicates page to discover them.
```

#### Story 4.1 — Event Creation with Full Configuration

```
Section: Acceptance Criteria — Template linking

OLD:
- Event creation form with name, date, location, capacity, description, timezone

NEW:
- Event creation form with name, date, location, capacity, description, timezone
- Template picker section: select templates for each notification type:
  - Blast (invitation) template
  - Confirmation (approved registration) template
  - Rejection (declined registration) template
- Templates filtered by type from GET /api/templates?type={type}
- Optional: admin can create event without templates (link later)
- Selected template IDs stored with event configuration

Rationale: Templates are always needed for event operations. Linking them
at creation reduces setup steps and prevents "event published without
templates" scenarios.
```

#### Story 4.2 — Event Lifecycle Management (State Machine)

```
Section: Acceptance Criteria — Auto transitions

OLD:
- Manual status transitions via dropdown: draft → published → active → completed
- Cancellation available from any state
- Status change requires confirmation dialog

NEW:
- Manual status transitions remain available for all states
- Auto-transition rules (Phase 1: client-side timer/check):
  - draft → published: manual only (admin publishes when ready)
  - published → active: auto on event date (when eventDate <= now)
  - active → completed: auto when eventDate + duration has passed
  - cancelled: manual only (requires confirmation dialog)
- Auto-transition indicator: upcoming transitions shown on event detail
  - "Akan aktif otomatis pada {eventDate}"
  - "Akan selesai otomatis pada {eventDate + duration}"
- Admin can override: manually transition at any time
- Phase 1 implementation: useEffect timer that checks transitions
  on page load and every 60 seconds

Rationale: Manual lifecycle management is error-prone for multi-city
operations. Auto-transitions ensure events go live on schedule without
admin intervention, while preserving manual override capability.
```

#### Story 5.1 — Notification Message Template Management

```
Section: Acceptance Criteria — Template categorization

OLD:
- Template CRUD with name, channel (whatsapp/email), subject, body
- Variable placeholder support: {{name}}, {{eventName}}, etc.

NEW:
- Template CRUD with name, channel (whatsapp/email), subject, body
- Template type field: "blast" | "confirmation" | "rejection"
- Type displayed as badge on template list
- Filter templates by type
- Variable placeholder support: {{name}}, {{eventName}}, etc.

Rationale: Templates serve distinct purposes in the event workflow.
Type categorization enables the template picker in event creation (4.1)
and helps admins locate the right template quickly.
```

#### Story 10.5 — Responsive Table Redesign → **Card-Based List Redesign**

```
Section: Full revision — design approach change

OLD:
- Desktop: full table with all columns
- Mobile: hide secondary columns via hidden md:table-cell
- Row tap on mobile → Sheet (bottom drawer) with full details

NEW (Card-Based Design):
- Desktop: retain table layout for data-dense views
- Mobile: replace table rows with card components
  - Each card shows primary info (name, status badge, key metric)
  - Secondary info as smaller text below primary
  - Action buttons inline on card (not in separate column)
  - Tap card → Sheet (bottom drawer) with full details
- Breakpoint: md (768px) — table above, cards below

Affected views and card layouts:

  /app/events (mobile card):
    Primary: Event name + Status badge
    Secondary: Date · Capacity
    Action: Tap → detail sheet

  /app/events/[id]/registrations (mobile card):
    Primary: Participant name + Status badge
    Secondary: Registered date
    Action: Tap → detail sheet

  /app/contacts (mobile card):
    Primary: Contact name + Flag badge (if flagged)
    Secondary: Phone · Industry
    Action: Tap → detail sheet

  /app/users (mobile card):
    Primary: User name + Role badge
    Secondary: Email
    Action: Tap → detail sheet

  /app/templates (mobile card):
    Primary: Template name + Type badge
    Secondary: Channel · Updated date
    Action: Tap → detail sheet

Acceptance Criteria:
  - CardListItem shared component for consistent card rendering
  - Desktop table layout preserved (no changes above md breakpoint)
  - Cards render without horizontal overflow
  - Loading skeletons for card layout
  - Empty states unchanged
  - Display-layer only, no data fetching changes

Rationale: Card-based design provides better information hierarchy on
mobile than hidden columns. Users can scan cards quickly and tap for
details, matching mobile-native interaction patterns.
```

#### Story 11.3 — Role-Based Personalized Dashboards

```
Section: Acceptance Criteria — Viewer dashboard enhancement

OLD:
  VIEWER:
  - "Selamat datang, {name}"
  - Read-only stats row (same as admin)
  - Recent events table (no action buttons)

NEW:
  VIEWER:
  - "Selamat datang, {name}"
  - Read-only stats row (total events, active events, total contacts,
    total registrations)
  - Event funnel card: registrations → approved → attended
    (bar chart or horizontal stacked bar)
  - Audience demographics card: top 5 industries from contact database
    (horizontal bar chart)
  - Recent events table with attendance rate column
  - All data from existing API endpoints (useEvents, useContacts)
  - Charts use CSS-only rendering (no chart library in Phase 1)

Rationale: Viewers need actionable insights, not just raw counts.
Funnel visualization and demographic breakdown enable data-driven
event planning decisions.
```

---

### 4.2 New Stories

#### Story 4.7 — Event Banner Image Support

```
Epic: 4 | Phase: FE-only | Priority: Low
Depends on: None

Acceptance Criteria:
  - Event creation/edit form includes "Banner" section
  - Phase 1: URL input field for banner image
    (Phase 2 will add file upload to local storage)
  - Banner preview below URL input (img tag with fallback)
  - Banner displayed on:
    - Event detail page (/app/events/[id]) — full width
    - Event landing page (/register/[slug]) — hero section
    - Event cards on dashboard — thumbnail
  - Banner URL stored as bannerUrl field on Event type
  - Default placeholder banner when no URL provided
  - Image aspect ratio: 16:9 recommended, enforced via CSS object-fit

MSW: Add bannerUrl field to event fixtures (2-3 events with sample URLs)

Technical notes:
  - Add bannerUrl to Event type in src/types/api.ts
  - No file upload in Phase 1 — URL-only
  - next/image with unoptimized={true} for external URLs in static export
```

#### Story 6.8 — Social OG Meta Tags for Event Pages

```
Epic: 6 | Phase: FE-only | Priority: Low
Depends on: 6.1 (public event landing page), 4.7 (banner)

Acceptance Criteria:
  - Event landing pages (/register/[slug]) include Open Graph meta tags:
    - og:title = event name
    - og:description = event description (truncated to 200 chars)
    - og:image = event banner URL (or default EM . U banner)
    - og:url = canonical URL
    - og:type = "website"
  - WhatsApp-specific: og:image dimensions ≥ 300x200
  - Facebook: fb:app_id not required for basic sharing
  - Twitter card meta tags: summary_large_image
  - Meta tags rendered via Next.js Metadata API (generateMetadata)
  - Preview: admin can see OG preview card on event detail page

Constraints:
  - Static export (output: 'export') limits dynamic meta tags
  - Phase 1: generateMetadata with static params from MSW fixtures
  - Phase 2: real API data via generateMetadata server-side

MSW: No additional handlers needed (uses existing event data)

Technical notes:
  - Next.js metadata export in page.tsx for /register/[slug]
  - OG preview component: fetch og tags and render preview card
```

#### Story 11.5 — Event List Filtering & Upcoming/History Split

```
Epic: 11 | Phase: FE-only | Priority: Medium
Depends on: 11.1 (routing)

Acceptance Criteria:
  - /app/events page has tab navigation: "Mendatang" | "Riwayat"
  - Mendatang (Upcoming): events with status draft/published/active,
    sorted by eventDate ascending (soonest first)
  - Riwayat (History): events with status completed/cancelled/archived,
    sorted by eventDate descending (most recent first)
  - Default tab: Mendatang
  - Filter controls (within each tab):
    - Status filter: multi-select chips matching tab's valid statuses
    - Date range: start date → end date picker
    - Search: text search on event name (client-side filter)
  - Filter state preserved in URL search params (?tab=history&status=completed)
  - Event count badge on each tab: "Mendatang (5)" | "Riwayat (12)"
  - Empty state per tab: "Tidak ada event mendatang" / "Belum ada riwayat event"
  - Mobile: filters collapse into a filter sheet (bottom drawer)

MSW: No additional handlers (client-side filtering of existing events data)

Technical notes:
  - useSearchParams for filter state persistence
  - Client-side filtering in Phase 1 (server-side in Phase 2)
  - Reuse existing useEvents() hook data
  - Status grouping: upcoming = [draft, published, active],
    history = [completed, cancelled, archived]
```

---

### 4.3 PRD Amendments

```
Section: FR1 — Event Configuration

OLD:
- Admin can create, edit, and delete events with full configuration

NEW:
- Admin can create, edit, and delete events with full configuration
- Event configuration includes optional banner image (URL in Phase 1,
  file upload in Phase 2)
- Event creation includes template picker for blast, confirmation,
  and rejection notification templates

Section: FR22 — Public Event Landing Page

OLD:
- Event landing page with registration form

NEW:
- Event landing page with registration form
- Landing page includes Open Graph meta tags for social media sharing
  (WhatsApp, Facebook, Twitter)
- Event banner displayed as hero image on landing page
```

---

## Section 5: Implementation Handoff

### Change Scope Classification: **Moderate**

7 AC amendments + 1 story revision + 3 new stories. Requires backlog update, story file creation/revision, and sprint-status.yaml update.

### Handoff Plan

| Role | Responsibility |
|------|---------------|
| Scrum Master | Update sprint-status.yaml, create story files for 4.7, 6.8, 11.5, revise 10.5 story file |
| Developer | Implement AC amendments first, then new stories |
| Product Owner | Review revised story files before implementation |

### Implementation Sequence

```
Phase A — AC Amendments (can be parallelized):
  1. Story 3.4: manual contact flagging categories
  2. Story 3.5: duplicate notification badge
  3. Story 4.1: template linking at event creation
  4. Story 4.2: auto lifecycle transitions
  5. Story 5.1: template type categorization
  6. Story 11.3: viewer dashboard enhancement

Phase B — Story Revision:
  7. Story 10.5: pivot to card-based mobile design

Phase C — New Stories (can be parallelized):
  8. Story 11.5: event filtering + upcoming/history split
  9. Story 4.7: event banner support
  10. Story 6.8: social OG meta tags
```

### Success Criteria

- [ ] Contacts can be manually flagged with category (spam, not-potential, invalid-data)
- [ ] Duplicate count badge appears on Contacts nav item
- [ ] Event creation form includes template picker (blast/confirmation/rejection)
- [ ] Events auto-transition published→active→completed based on date
- [ ] Templates have type field (blast, confirmation, rejection)
- [ ] Mobile views use card-based layout below md breakpoint
- [ ] Viewer dashboard shows funnel chart and audience demographics
- [ ] Events page splits into Mendatang/Riwayat tabs with filters
- [ ] Events support banner image URL
- [ ] Event landing pages include OG meta tags for social sharing

---

*Sprint Change Proposal approved by Dian on 2026-03-20.*
