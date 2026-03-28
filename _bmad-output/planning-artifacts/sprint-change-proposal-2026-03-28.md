# Sprint Change Proposal — 2026-03-28

**Project:** Yorindo
**Date:** 2026-03-28
**Author:** Bob (Scrum Master)
**Scope:** Moderate
**Status:** Approved

---

## Section 1: Issue Summary

**Trigger:** Post-meeting product decisions introduced 8 improvements across event management, participant registration, and AI-assisted workflows.

**Discovered via:** Stakeholder meeting review — `/bmad-help` session 2026-03-28.

| # | Improvement | Type | Status |
|---|---|---|---|
| A | Paid/free event toggle | New requirement | → Story 4-1 |
| B | Dual surveys (registration + post-event) + full GForms parity + response dashboard | Scope expansion | → Story 4-4 re-opened |
| C | Multi-criteria audience targeting + AI recommendation | Scope expansion | → Story 4-5 |
| D | SSO login OR manual fill for registration | Already implemented in 6-8 | ✓ No change |
| E | Participant status simplified: no waitlist, no cancel | Breaking change | → 6-5, 6-7 retired; 6-10 cancelled |
| F | Auto-close registration when quota reached | Behaviour change | → Story 6-1 |
| G | YoriMind merged into Laporan tab | Already done in 4.12 | ✓ No change |
| H | AI recommendation for blast targeting | Scope expansion | → Story 5-2 |

---

## Section 2: Impact Analysis

### 2.1 Sprint Story Status Changes

| Story | Before | After | Action |
|---|---|---|---|
| 4-4 Survey Template Builder | done | ready-for-dev | Re-open — major scope expansion |
| 6-5 Waitlist Management | review | retired | Revert implementation |
| 6-7 Self-Cancellation | review | retired | Revert implementation |
| 6-10 Waitlist Flag Enforcement | ready-for-dev | cancelled | Do not implement |
| 4-1 Event Creation | review | review | Story file AC update needed |
| 4-5 Target Criteria | review | review | Story file AC update needed |
| 4-10 Registrasi Tab | review | review | Story file AC update needed |
| 4-11 Konfirmasi Tab | review | review | Story file AC update needed |
| 5-2 Blast Config | review | review | Story file AC update needed |
| 6-1 Landing Page | review | review | Story file AC update needed |
| 6-2 Registration Form | review | review | Minor AC alignment with 6-8 pattern |
| 6-4 Approval Queue | review | review | Story file AC update needed |
| 1-2 DB Schema Migrations | in-progress | in-progress | New migration tasks added to scope |

### 2.2 Database Schema Changes (Story 1-2 addendum)

**`events` table:**
- Add: `is_paid BOOL DEFAULT FALSE`
- Add: `price DECIMAL(12,2) NULLABLE`
- Add: `payment_method VARCHAR(50) NULLABLE`
- Add: `registration_closed BOOL DEFAULT FALSE`
- Add: `post_survey_enabled BOOL DEFAULT FALSE`
- Add: `post_survey_schema JSONB NULLABLE`
- Rename: `survey_schema` → `registration_survey_schema`

**`registrations` table:**
- Update `status` enum: remove `waitlisted`, remove `cancelled`; values become `provisional | pending | approved | rejected`
- Add: `attendance_status ENUM('attended','no_show') NULLABLE`

**New table `survey_responses`:**
```sql
CREATE TABLE survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  registration_id UUID NOT NULL REFERENCES registrations(id),
  survey_type VARCHAR(20) NOT NULL CHECK (survey_type IN ('registration','post_event')),
  responses JSONB NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.3 New API Endpoints (OpenAPI Story 1-4 addendum)

| Endpoint | Purpose |
|---|---|
| `PUT /api/events/:id/survey/registration` | Save registration survey schema |
| `PUT /api/events/:id/survey/post-event` | Save post-event survey schema |
| `GET /api/events/:id/survey/:type` | Load survey schema by type |
| `GET /api/events/:id/survey/responses?type=registration\|post-event` | Survey responses list |
| `GET /api/events/:id/survey/responses/download?type=...&format=xlsx` | Export responses |
| `POST /api/events/:id/audience-recommend` | AI target criteria recommendation |

### 2.4 New Service Interface (Architecture)

```typescript
interface ITargetRecommendationService {
  recommend(eventSnapshot: EventSnapshot): Promise<TargetRecommendation[]>
}
```
Provider resolved via `TARGET_RECOMMENDATION_AI_PROVIDER` env var — same adapter pattern as `IYoriMindService`.

### 2.5 PRD Alignment

No core PRD goals change. Improvements reinforce existing intent:
- "post-event WhatsApp survey delivery" in Lead Intelligence Suite → now formalized as post-event survey
- "premium tier" pricing concept → now formalized as paid/free toggle
- "AI-powered participant scoring" → extended to audience recommendation

---

## Section 3: Recommended Approach

**Option 1 — Direct Adjustment (selected)**

- Re-open Story 4-4 with expanded scope; write new story file
- Retire 6-5 and 6-7: revert implementations, update codebase to remove waitlisted/cancelled status
- Cancel 6-10: remove from sprint before any work begins
- Update all `review` story files with new ACs before final code review approval
- Add schema migration and OpenAPI entries to in-progress foundation stories

**Effort:** Medium | **Risk:** Medium
**Timeline impact:** ~3–5 points rework (6-5/6-7 revert) + ~8–10 points new 4-4 scope

---

## Section 4: Detailed Change Proposals

### 4.1 Story 4-4 — Re-open and Expand

**Story: 4-4 Survey Template Builder → Survey Template Builder & Response Dashboard**

Current implementation: single survey, 3 field types (text, single-choice, multi-choice), single `PUT /api/events/:id/survey` endpoint.

Required scope:
- **Dual survey tabs**: Survei Registrasi (always active) + Survei Post-Event (toggle `post_survey_enabled`)
- **11 field types** (full Google Forms parity, no file upload): text, textarea, radio, select, checkboxes, range, grid_radio, grid_checkbox, date, time, section
- **Separate API endpoints** per survey type: `PUT/GET /api/events/:id/survey/registration` and `PUT/GET /api/events/:id/survey/post-event`
- **Unified preview modal** accessible from both event form and survey builder; tabbed (Formulir Registrasi + Survei Post-Event)
- **Survey response dashboard** at `/app/events/:id/survey-responses`: aggregate charts per question, individual response table, Excel export

Status change: `done` → `ready-for-dev`

### 4.2 Stories 6-5 and 6-7 — Retire

**Revert actions required in codebase:**

```
- Remove waitlisted and cancelled from registrations.status enum
- Remove waitlist auto-promotion logic (WaitlistService or equivalent)
- Remove POST /api/registrations/:id/cancel endpoint and route
- Remove self-cancellation link generation in ticket delivery
- Remove "Daftar Tunggu" / waitlist UI from Konfirmasi tab (already done in epic file)
- Remove 6-5 and 6-7 story files from active tracking
```

Replacement behaviour (already in epic files):
- `registrations.status`: `provisional | pending | approved | rejected`
- `registrations.attendance_status`: `attended | no_show` (NULL until check-in)
- When approved count = `events.capacity`: set `events.registration_closed = true`

### 4.3 Story 6-10 — Cancel

Remove `6-10-waitlist-experimental-flag-enforcement` entry from sprint-status.yaml.
Delete story file (or mark with `# CANCELLED` header).

### 4.4 Story 1-2 — Schema Migration Addendum

Add a new migration file (e.g., `005_meeting_improvements_2026_03_28.sql`) covering all schema changes in Section 2.2. This migration must land before any Phase 2 BE work on Epics 4, 5, 6.

### 4.5 Story 6-2 — SSO AC Alignment

Epic AC updated to match Story 6-8 implementation pattern:
- SSO is an optional "Lanjutkan dengan Google" button shown above the manual form fields
- Clicking it pre-fills name + email; phone always manual
- Manual path is the default — no separate mode/tab required

OLD epic AC: "Two entry options are shown: Masuk dengan SSO (button) and Isi Manual"
NEW epic AC: "A 'Lanjutkan dengan Google' button is shown above the manual fields; SSO pre-fills name + email; participant still enters phone manually; SSO is optional — skipping it uses the full manual path"

Story 6-8 implementation is correct as-is.

### 4.6 All Other Review Stories — AC Sync Required

Before code review is approved for each, the story file AC must reflect the epic file changes made 2026-03-28:

| Story File | AC to Add/Change |
|---|---|
| `4-1-event-creation-with-full-configuration.md` | Paid/free toggle; Preview Formulir button |
| `4-5-event-capacity-target-criteria-with-audience-preview.md` | Multiple criteria types; AI recommendation mode |
| `4-10-event-pipeline-hub-registrasi-tab-approval-queue.md` | Status = pending/approved/rejected + attendance_status column |
| `4-11-event-pipeline-hub-konfirmasi-tab.md` | Two stat cards only (remove Daftar Tunggu) |
| `5-2-segmented-blast-configuration-audience-targeting.md` | Manual + AI recommendation targeting mode tabs |
| `6-1-public-event-landing-page.md` | Auto-close form when approved count = capacity |
| `6-4-registration-approval-queue-admin-review.md` | Approve/reject only; no waitlist action |

---

## Section 5: Implementation Handoff

**Scope: Moderate**

| Role | Responsibility |
|---|---|
| **Dev (Amelia)** | (1) Revert 6-5 + 6-7 implementations; (2) Update all review story files with new ACs; (3) Re-implement 4-4 with expanded scope; (4) Add migration in 1-2; (5) Update OpenAPI spec in 1-4 |
| **SM (Bob)** | Update sprint-status.yaml per this proposal |
| **Architect** | Update architecture.md: ITargetRecommendationService interface, schema changes, new API endpoints |

**Success criteria:**
- [ ] 6-5 and 6-7 implementations reverted from codebase; `waitlisted` and `cancelled` status values removed
- [ ] 6-10 removed from sprint; story file archived
- [ ] Story 4-4 re-opened with new story file covering full dual-survey + response dashboard scope
- [ ] All `review` story files updated with 2026-03-28 ACs before final approval
- [ ] Migration 005 adds all new columns and `survey_responses` table
- [ ] OpenAPI spec updated with 6 new endpoints
- [ ] `architecture.md` updated with `ITargetRecommendationService` and schema changes
