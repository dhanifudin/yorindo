# Sprint Change Proposal — 2026-03-26k

**Date:** 2026-03-26
**Author:** Bob (Scrum Master)
**Scope:** Minor — Direct implementation by dev team
**Status:** Pending Approval

---

## Section 1: Issue Summary

Three defects/enhancements discovered during Phase 1 FE implementation review:

**Issue A (Bug):** `VendorForm` loses pre-populated data in edit mode. React Hook Form caches `defaultValues` on mount — when the `vendor` prop is passed, form fields render empty. Root cause: missing `reset(vendor)` call via `useEffect` when vendor prop changes.

**Issue B (Bug):** Waitlist feature (Story 6-5) is fully visible regardless of `EXPERIMENTAL_ENABLED`. The flag gates the landing page CTA copy but does NOT hide the waitlist tab in the admin approval queue or suppress waitlist actions from the admin view.

**Issue C (Enhancement):** When an event reaches `status: 'completed'`, the Event Pipeline Hub opens on Overview by default. Admins should land on the Laporan (Report) tab immediately. Additionally, Recharts components in Story 8-3 render as static — no click/hover interaction.

---

## Section 2: Impact Analysis

| Issue | Affected Epics | Affected Stories | PRD | Architecture | UX |
|-------|---------------|-----------------|-----|-------------|-----|
| A — VendorForm | Epic 4 | 4-14 (review) | No | No | No |
| B — Waitlist flag | Epic 6 | 6-5 (review) | No | No | No |
| C — Report tab + charts | Epic 4, Epic 8 | 4-7, 4-12, 8-3 (all review) | No | No | Minor |

No rollback required. No PRD scope change. All fixes contained within FE layer.

---

## Section 3: Recommended Approach

**Option 1 — Direct Adjustment** (selected)

All three issues are FE-only and self-contained. Three new stories added as `ready-for-dev`:

- **Story 4-16** — VendorForm edit pre-population fix (Epic 4)
- **Story 6-10** — Waitlist experimental flag enforcement (Epic 6)
- **Story 8-6** — Completed event report tab auto-focus + interactive charts (Epic 8)

Effort: Low. Risk: Low. Timeline impact: None.

---

## Section 4: Detailed Change Proposals

### Story 4-16: VendorForm Edit Pre-Population Fix

**Epic:** 4 — Event Configuration & Management
**Type:** Bug fix

**Story:**
As an admin editing a vendor,
I want the edit form to pre-populate with the vendor's existing data,
So that I can update specific fields without re-entering everything.

**Acceptance Criteria:**

**AC1:** Given I click Edit on an existing vendor,
When the VendorForm dialog opens,
Then all fields (name, contact_email, website, logo_url, industry, notes) are pre-filled with the vendor's current values

**AC2:** Given the form is pre-filled and I change only the `name` field,
When I submit,
Then only `name` is updated — all other fields retain their original values

**AC3:** Given I close the dialog without saving and re-open it,
When the dialog opens again,
Then it shows the original vendor values (not stale edited state)

**Dev Notes:**
`useForm` with `defaultValues` does not react to prop changes after mount. Fix: call `reset(vendor)` in a `useEffect([vendor])` when in edit mode. Alternative: pass `key={vendor.id}` to force form remount on vendor change.

---

### Story 6-10: Waitlist Experimental Flag Enforcement

**Epic:** 6 — Participant Registration & Approval Workflow
**Type:** Bug fix / Feature flag enforcement

**Story:**
As a platform operator,
I want the waitlist feature to be fully hidden when `EXPERIMENTAL_ENABLED=false`,
So that participants and admins never encounter incomplete experimental functionality in production.

**Acceptance Criteria:**

**AC1:** Given `EXPERIMENTAL_ENABLED=false`,
When an admin views the registrations page for an event,
Then the "Waitlist" tab is not rendered — tab strip shows only: Pending, Approved, Rejected, Attended

**AC2:** Given `EXPERIMENTAL_ENABLED=false`,
When an admin attempts to set a registration status to `waitlisted` via the approval queue,
Then the "Waitlist" action button/option is hidden

**AC3:** Given `EXPERIMENTAL_ENABLED=false`,
When the event landing page renders with a full-capacity event,
Then the CTA reads "Kapasitas Penuh" — consistent with existing `EventLandingCard.tsx` behavior

**AC4:** Given `EXPERIMENTAL_ENABLED=true`,
Then all waitlist functionality behaves exactly as implemented in Story 6-5 — no regression

**Dev Notes:**
Import `EXPERIMENTAL_ENABLED` from `@/lib/featureFlags`. Apply to registrations page tab strip and approval queue action buttons. AC3 is already partially implemented — verify consistency only.

---

### Story 8-6: Completed Event — Report Tab Auto-Focus & Interactive Charts

**Epic:** 8 — Analytics, Reporting & YoriMind
**Type:** Enhancement

**Story:**
As an admin reviewing a completed event,
I want to land on the Laporan tab automatically and interact with the charts,
So that I immediately see performance data without extra navigation, and can drill into specific segments.

**Acceptance Criteria:**

**AC1:** Given an event with `status: 'completed'`,
When I navigate to `/app/events/:id`,
Then the active tab defaults to "Laporan" instead of "Overview"

**AC2:** Given an event with any status other than `completed`,
When I navigate to `/app/events/:id`,
Then the default tab remains "Overview" — no regression

**AC3:** Given the Recharts funnel chart on the Laporan tab,
When I hover over a funnel segment,
Then a tooltip shows the absolute count and conversion rate for that stage

**AC4:** Given the Recharts demographic chart (industry/city breakdown),
When I click a bar or pie segment,
Then the chart highlights the selected segment and shows a detail label (count + percentage)

**AC5:** Given any chart interaction,
Then the chart responds within 100ms — no perceptible lag on typical event data volumes

**Dev Notes:**
- Tab auto-focus: In `_client.tsx`, read `event.status` and set the default tab to `'laporan'` when `status === 'completed'`
- Recharts interactivity: Add `activeIndex` state + `onClick` to `BarChart`/`PieChart`. Use `<Tooltip />` with `formatter` prop. Use `<LabelList>` for active segment. No new dependencies required.

---

## Section 5: Implementation Handoff

**Classification:** Minor — direct implementation by dev agent

| Story | Sprint Status | Assignee |
|-------|--------------|----------|
| 4-16 | ready-for-dev | 💻 Amelia — `/bmad-dev-story 4-16` |
| 6-10 | ready-for-dev | 💻 Amelia — `/bmad-dev-story 6-10` |
| 8-6  | ready-for-dev | 💻 Amelia — `/bmad-dev-story 8-6` |

**Success criteria:**
- VendorForm shows correct data on edit; submits partial updates correctly
- Waitlist tab/actions invisible when `EXPERIMENTAL_ENABLED=false`; no regression when true
- `/app/events/:id` defaults to Laporan for completed events; charts have tooltips + click interactions

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-26 | SCP created — 3 stories added (4-16, 6-10, 8-6) | bmad-correct-course |
