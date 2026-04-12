# Sprint Change Proposal — 2026-03-31

**Project:** EM . U
**Prepared by:** Bob (Scrum Master) via Correct Course workflow
**Date:** 2026-03-31
**Status:** Approved

---

## Section 1: Issue Summary

**Problem Statement:**
The current ActionToolbar blast entry point (Story 3.9) navigates to `/app/blasts/new` when the admin clicks "Blast Segmen". Additionally, the archived tech spec for row-based bulk selection (`tech-spec-contacts-bulk-selection-flag-blast-archived-2026-03-22`) also targeted `/app/blasts/new` as its blast destination.

The required behavior is an **inline popup modal** (shadcn `Dialog`) that opens directly on the `/app/contacts` page, keeping the admin in the contacts workspace. The blast form inside the modal allows the admin to:
1. Select the target event
2. Choose channel (WhatsApp / Email)
3. Choose between a pre-built template or a custom message
4. Review recipient count
5. Submit the blast

**Discovery context:** Identified during pre-implementation review via `/bmad-help` session on 2026-03-31 before any modal vs. navigation implementation work began. Story 3.9 is in `review` status; no code implementing the `/app/blasts/new` navigation from the contacts page has been shipped yet.

---

## Section 2: Impact Analysis

### Epic Impact
| Epic | Impact |
|---|---|
| Epic 3 — Contact Database | Story 3.9 AC5 updated; new Story 3.13 added |
| Epic 5 — Invitation Blast | No changes; `/app/blasts/new` (Story 5.2) remains the blast composer for Events pipeline entry only |
| All other epics | No impact |

### Story Impact
| Story | Change |
|---|---|
| 3.9 ActionToolbar | AC5 updated (modal, not navigate); AC8–11 added (row-selection path + priority rules) |
| 3.13 (new) | Inline Blast Modal component — full spec added to Epic 3 |
| 5.2 Segmented Blast Config | No change — remains the full-page blast composer accessed via Events pipeline |

### Artifact Conflicts Resolved
| Artifact | Change |
|---|---|
| `epic-3-contact-database-participant-intelligence.md` | Story 3.9 AC5 updated; Story 3.13 added |
| `tech-spec-contacts-bulk-selection-flag-blast-archived-2026-03-22.md` | Status updated to `superseded`; notes added pointing to Stories 3.9 and 3.13 |
| `ux-design-specification.md` | ActionToolbar interaction description updated; 2026-03-31 note added |

### Technical Impact
- Phase 1 FE only — all new work uses MSW handlers; no backend changes
- Reuses existing `POST /api/events/:id/blast` MSW handler (Story 5.2)
- Reuses existing `GET /api/templates` MSW handler (Story 5.1)
- New component: `BlastModal.tsx` (shadcn `Dialog` + React Hook Form + Zod)

---

## Section 3: Recommended Approach

**Selected Path: Option 1 — Direct Adjustment**

Update existing Story 3.9 ACs and add Story 3.13. No rollback, no MVP scope reduction needed.

**Rationale:**
- Story 3.9 is in `review` — no navigation-to-`/app/blasts/new` code has been merged yet, so there is nothing to undo
- The inline modal is strictly better UX (no context switch) and adds no backend complexity in Phase 1
- The archived spec's row-selection and bulk-flag patterns remain valid — they are absorbed into Story 3.9, not discarded
- The modal form reuses two already-mocked APIs (blast + templates), keeping implementation effort low

**Effort:** Medium (new `BlastModal` component with form + MSW wiring)
**Risk:** Low (additive change; existing segment blast logic in ActionToolbar is preserved)
**Timeline impact:** Minimal — adds one story (3.13) to the sprint backlog

---

## Section 4: Detailed Change Proposals

### CP1 — Story 3.9 AC5 (Approved)
**Story:** 3.9 ActionToolbar — Segment Blast Entry Point

OLD:
> Clicking "Blast Segmen · N kontak →" navigates to `/app/blasts/new?segment=teknologi,jakarta&count=18`

NEW:
> Clicking "Blast Segmen · N kontak →" opens an inline `BlastModal` `Dialog` pre-filled with segment source (filter params) and recipient count; no navigation to `/app/blasts/new`

---

### CP2 — Story 3.9 AC8–11 Added (Approved)
**Story:** 3.9 ActionToolbar — Segment Blast Entry Point

Added four new ACs covering:
- AC8: ActionToolbar shows bulk flag buttons + "Blast N kontak →" when rows are selected
- AC9: "Blast N kontak →" opens `BlastModal` pre-filled with selectedIds
- AC10: "× Batalkan" clears selection and collapses toolbar
- AC11: Row-selection takes priority over segment mode when both are active

---

### CP3 — Story 3.13 Added (Approved)
**Epic:** 3 — Contact Database & Participant Intelligence

New story with full AC set for `BlastModal`:
- shadcn `Dialog` with event selector, channel RadioGroup, Template/Custom Tabs, recipient badge
- `POST /api/events/:eventId/blast` MSW submission (202 response)
- Escape/outside-click closes and resets form
- Tab content preserved when switching between Template and Custom

---

### CP4 — Archived Spec Superseded (Approved)
**File:** `tech-spec-contacts-bulk-selection-flag-blast-archived-2026-03-22.md`

Status updated from `in-progress` to `superseded`. Notes added pointing to Stories 3.9 and 3.13 as the canonical implementation target. MSW handler patterns in the archived spec remain valid reference material for dev agents.

---

### CP5 — UX Spec ActionToolbar Section Updated (Approved)
**File:** `ux-design-specification.md`

ActionToolbar interaction description updated to reflect inline modal pattern. 2026-03-31 note added clarifying modal-only behavior on contacts page and that `/app/blasts/new` is Events pipeline only.

---

## Section 5: Implementation Handoff

**Scope Classification:** Minor — direct implementation by dev team

**Next Steps:**
1. Run `/bmad-create-story` for Story 3.13 to produce a full implementation-ready story file
2. Run `/bmad-dev-story` targeting the updated Story 3.9 (row-selection ACs) 
3. Run `/bmad-dev-story` targeting Story 3.13 (`BlastModal`)

**Success Criteria:**
- `ActionToolbar` opens `BlastModal` on blast button click (both segment and selection modes)
- No navigation to `/app/blasts/new` from the contacts page
- Row checkbox selection triggers ActionToolbar with bulk flag + blast buttons
- `BlastModal` submits to `POST /api/events/:eventId/blast` MSW handler and shows success toast
- Archived spec is marked superseded and won't confuse future dev agents
