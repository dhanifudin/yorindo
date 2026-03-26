# Sprint Change Proposal — 2026-03-26 (B)

**Trigger:** Event management gaps and improvements identified via /bmad-help session
**Scope:** Moderate
**Status:** Approved (Incremental review completed 2026-03-26)

---

## Section 1: Issue Summary

During active sprint review, the stakeholder identified 8 gaps and improvements across event management, blast templates, and registration workflow. All affected stories were in `review` (not `done`), making this the optimal correction window.

**Items addressed:**
1. Event date needs `start_date` + `end_date` (data model change — currently single `date`)
2. Admin cannot edit auto-generated event slug
3. No banner/poster upload capability
4. Survey builder has no registration form preview
5. Template preview doesn't cover confirmation/rejection templates; no QR code embed variable
6. Waitlist should be disabled when `ENABLE_EXPERIMENTAL=false`
7. Admin cannot view participant survey answers from the registration review tab

---

## Section 2: Impact Analysis

### Story Status Changes

| Story | Was | Now | Change |
|-------|-----|-----|--------|
| 4-1-event-creation-with-full-configuration | `review` | `ready-for-dev` | start_date/end_date + slug editing ACs |
| 4-4-survey-template-builder | `ready-for-dev` | `ready-for-dev` | Form preview AC added (no status change) |
| 4-13-event-banner-poster-upload | — | `backlog` | New story |
| 4-10-event-pipeline-hub-registrasi-tab-approval-queue | `review` | `ready-for-dev` | Survey answers drawer AC |
| 5-1-notification-message-template-management | `review` | `ready-for-dev` | Enhanced preview + QR code variable ACs |
| 6-5-waitlist-management-auto-promotion | `review` | `ready-for-dev` | ENABLE_EXPERIMENTAL gate AC |
| 6-1-public-event-landing-page | `review` | `review` | Ripple update only (date → start_date/end_date) |

### Artifacts Updated

| Artifact | Change |
|----------|--------|
| `epics/epic-4-event-configuration-management.md` | Story 4.1: start_date/end_date + slug editing; Story 4.4: form preview AC; Story 4.10: survey drawer AC; Story 4.13: new banner/poster story |
| `epics/epic-5-invitation-blast-notifications.md` | Story 5.1: enhanced preview + `{{qr_code}}` variable AC |
| `epics/epic-6-participant-registration-approval-workflow.md` | Story 6.1: date ripple; Story 6.5: ENABLE_EXPERIMENTAL gate AC |
| `sprint-status.yaml` | 4 stories reset to `ready-for-dev`; Story 4.13 added as `backlog` |

### Technical Impact

- **Data model change:** `events.date` → `events.start_date` + `events.end_date` — all MSW mock event data, API types, and display components referencing `date` must be updated
- **New endpoint:** `GET /api/events/check-slug` for real-time slug availability check
- **New endpoint:** `POST /api/media/upload` + `GET /api/media/banners` for banner upload/gallery
- **New template variable:** `{{qr_code}}` in blast template renderer
- **Feature flag gate:** `ENABLE_EXPERIMENTAL` gates waitlist behavior in registration flow
- **No impact:** Auth, check-in, analytics, ETL epics

---

## Section 3: Recommended Approach

**Option 1 — Direct Adjustment** (selected)

All affected stories were in `review` or `ready-for-dev` — not `done`. No rollback of merged work required. Changes are additive ACs or targeted rewrites to unmerged story implementations.

**Effort:** Medium — date model change has the widest ripple (MSW mocks, types, display); all other changes are isolated
**Risk:** Low — all changes are additive or replace unmerged code
**Timeline:** Minor — 5 stories reset to `ready-for-dev`; 1 new story added to backlog

---

## Section 4: Detailed Change Proposals (all applied)

### Story 4.1 — Event Creation
- User story updated: `date` → `start_date` + `start_time` + `end_date` + `end_time`
- "Event satu hari" checkbox: when checked, `end_date` is locked to `start_date` — admin fills `end_time` only; when unchecked, both `end_date` and `end_time` are required
- Validation: `end_date` before `start_date` → error; same-day event with `end_time` ≤ `start_time` → error
- New ACs: slug inline editing with availability check (`GET /api/events/check-slug`); slug update via `PATCH`; old slug deactivates on update

### Story 4.4 — Survey Template Builder
- New AC: "Preview Formulir" button opens read-only rjsf render of fixed fields + current custom survey fields

### Story 4.13 — Event Banner / Poster Upload (new)
- Upload: `POST /api/media/upload`, JPEG/PNG/WebP ≤ 5MB, preview thumbnail in form
- Gallery reuse: modal grid of previously uploaded banners, no re-upload needed
- Stored in `UPLOADS_DIR/banners/{eventId}/`; `events.banner_url` persisted
- Graceful fallback: default placeholder if no banner set

### Story 4.10 — Registrasi Tab
- New AC: row click → expand/drawer shows all fixed fields + survey question→answer pairs; survey section hidden if no schema configured

### Story 5.1 — Template Management
- Enhanced preview AC: covers `invitation`, `confirmation`, `rejection` types with realistic sample data
- New AC: `{{qr_code}}` variable → inline base64 image (email) or attachment (WhatsApp)

### Story 6.1 — Public Landing Page
- Ripple: `date` → `start_date` + `end_date` in display AC

### Story 6.5 — Waitlist Management
- New AC: when `ENABLE_EXPERIMENTAL=false`, full-capacity registration returns HTTP 409 `EVENT_FULL`; no `waitlisted` status created; no waitlist CTA on public page

---

## Section 5: Implementation Handoff

**Scope: Moderate** — 5 story reworks, 1 new story, 1 data model change with ripple effects

### Dev Team Priority Order

1. **Story 4.1** (`ready-for-dev`) — start first; data model change (`start_date`/`end_date`) ripples to all MSW mocks and display components; unblocks accurate dates everywhere
2. **Story 4.4** (`ready-for-dev`) — form preview can be done concurrently with 4.1
3. **Story 5.1** (`ready-for-dev`) — template preview + QR variable; depends on 6.6 QR generation design
4. **Story 6.5** (`ready-for-dev`) — feature flag gate; straightforward AC addition
5. **Story 4.10** (`ready-for-dev`) — survey drawer; depends on 4.4 survey schema shape being finalized
6. **Story 4.13** (`backlog`) — new story; create story file via `bmad-create-story` before dev

### Success Criteria
- [ ] Events have `start_date` + `end_date` throughout the UI and API
- [ ] Admin can edit slug with real-time availability feedback
- [ ] Admin can upload or reuse a banner when creating/editing an event
- [ ] Survey builder shows live form preview via rjsf
- [ ] Template editor previews confirmation/rejection with sample data
- [ ] `{{qr_code}}` renders inline in template preview
- [ ] Full-capacity registration shows `EVENT_FULL` (not waitlist) when `ENABLE_EXPERIMENTAL=false`
- [ ] Registration drawer shows survey responses alongside fixed fields
- [ ] All stories pass `bmad-code-review` before moving to `done`
