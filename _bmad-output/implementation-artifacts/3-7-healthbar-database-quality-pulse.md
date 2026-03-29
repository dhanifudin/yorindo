# Story 3.7: HealthBar — Database Quality Pulse

**Story ID:** 3.7
**Story Key:** 3-7-healthbar-database-quality-pulse
**Epic:** Epic 3 — Contact Database & Participant Intelligence
**Status:** review

---

## Story

As an admin,
I want to see a persistent health bar at the top of the contacts page showing duplicate count, contacts-missing-email count, and contacts-missing-phone count,
So that I immediately know what data quality tasks need attention when I arrive on the page.

> **Implementation note:** The health payload may still include `flagged` for downstream triage flows, but the visible HealthBar for this branch focuses on the three agreed operational metrics: duplicates, missing email, and missing phone.

---

## Acceptance Criteria

**AC1:** Given I am authenticated as `admin`,
When the `/app/contacts` page loads,
Then the `HealthBar` component renders above the filter bar with three stat columns: duplicate pairs count, contacts-missing-email count, and contacts-missing-phone count - each rendered as a clickable `Button` with descriptive `aria-label`.

**AC2:** Given the health data is loading,
When the page first renders,
Then `Skeleton` placeholders replace each stat value until `GET /api/contacts/health` resolves.

**AC3:** Given any health count is greater than 0,
When the HealthBar renders,
Then the stat value uses `text-destructive`; when count = 0 it uses `text-muted-foreground` and shows a success helper label.

**AC4:** Given I click the "duplicates" stat in the HealthBar,
When the TriagePanel is collapsed,
Then the TriagePanel opens in `duplicates` mode.

**AC5:** Given I click the "missing email" stat in the HealthBar,
When the stat is clicked,
Then a `missingEmail=true` query param is added to the URL and the contact table re-fetches with that filter applied.

**AC6:** Given I click the "missing phone" stat in the HealthBar,
When the stat is clicked,
Then a `missingPhone=true` query param is added to the URL and the contact table re-fetches with that filter applied.

**AC7:** Given `GET /api/contacts/health` is called,
When the mock/service responds,
Then it returns counts including `{ flagged, duplicates, missingEmail, missingPhone }` with HTTP 200.

**AC8:** Given the HealthBar container element,
Then it has `role="status"` and `aria-live="polite"` so screen readers announce count changes without interrupting the user.

---

## Tasks / Subtasks

- [x] **Task 1: Add health endpoint contract + FE type**
  - [x] Subtask 1.1: Ensure `ContactsHealth` includes `duplicates`, `missingEmail`, and `missingPhone`
  - [x] Subtask 1.2: Keep `flagged` available in the health payload for other triage flows

- [x] **Task 2: Implement HealthBar UI**
  - [x] Subtask 2.1: Render a 3-column health layout for duplicates, missing email, and missing phone
  - [x] Subtask 2.2: Show `Skeleton` placeholders while loading
  - [x] Subtask 2.3: Show destructive emphasis for non-zero counts and quiet success labels for zero counts

- [x] **Task 3: Hook stats into contact filtering**
  - [x] Subtask 3.1: Add `missingEmail` filter support to `filterStore`
  - [x] Subtask 3.2: Add `missingPhone` filter support to `filterStore`
  - [x] Subtask 3.3: Update `useContacts` to pass `missingEmail` and `missingPhone` query params
  - [x] Subtask 3.4: Update active-filter pills to display and clear both filters

- [x] **Task 4: Support mock health + missing phone coverage**
  - [x] Subtask 4.1: Update contacts MSW health handler to return `missingPhone`
  - [x] Subtask 4.2: Seed a realistic number of contacts without phones
  - [x] Subtask 4.3: Add `missingPhone=true` handling in the contacts list mock

- [x] **Task 5: Integrate with contacts page state**
  - [x] Subtask 5.1: Keep `duplicates` opening the TriagePanel
  - [x] Subtask 5.2: Route `missingEmail` clicks to URL-state filtering
  - [x] Subtask 5.3: Route `missingPhone` clicks to URL-state filtering

---

## Dev Notes

- `ContactsCommandCenter` remains the client-side coordinator for HealthBar, TriagePanel, table selection, and URL-state interactions.
- `GET /api/contacts/health` now drives a broader data-quality snapshot, but this story intentionally surfaces only the three agreed metrics in the HealthBar UI.
- `flagged` still belongs to the overall health model for broader triage flows, but it is no longer the primary visible stat in this branch.
- Flag semantics should not imply `spam` or `not-potential`; current valid review cases are low-confidence/invalid-data and duplicate workflows.

---

## Story Link

- Epic source: `/_bmad-output/planning-artifacts/epics/epic-3-contact-database-participant-intelligence.md`
