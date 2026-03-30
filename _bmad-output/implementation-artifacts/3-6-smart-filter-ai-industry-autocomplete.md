# Story 3.6: Smart Filter — AI Industry Autocomplete

**Story ID:** 3.6
**Story Key:** 3-6-smart-filter-ai-industry-autocomplete
**Epic:** Epic 3 — Contact Database & Participant Intelligence
**Status:** review

---

## Story

As an admin,
I want to type a free-form industry term in the contact filter and have it automatically mapped to a canonical industry slug,
So that I don't need to know exact industry taxonomy values to filter contacts accurately.

> **Phase 1 FE scope:** AI-assisted industry input with 500ms debounce, optimistic matched-slug application, and silent fallback to the standard dropdown. Wired to MSW smart-filter handlers.
>
> **Phase 2 BE scope:** `GET /api/contacts/industry-suggestions` backed by `ISmartFilterService`, with provider selection controlled by `SMART_FILTER_AI_PROVIDER`.

---

## Acceptance Criteria

**AC1:** Given I type `rumah sakit` in the industry filter input,
When 500ms elapses,
Then `GET /api/contacts/industry-suggestions?q=rumah+sakit` is called and no request is sent before the debounce window completes.

**AC2:** Given the AI smart filter service returns a match with confidence `>= 0.6`,
When the response is received,
Then the matched canonical slug is applied automatically and the contact list refreshes with that industry filter.

**AC3:** Given the AI smart filter service returns confidence `< 0.6`,
When the response is received,
Then the UI falls back to the standard industry dropdown and does not auto-apply an uncertain slug.

**AC4:** Given the smart filter API call fails or times out,
When the error occurs,
Then the UI silently falls back to the standard dropdown with no blocking error shown to the user.

**AC5:** Given the FE uses MSW in Phase 1,
When the smart filter endpoint is called,
Then the handler returns deterministic canonical slug suggestions and fallback states so the feature can be validated without a real AI provider.

---

## Tasks / Subtasks

- [x] **Task 1: Add smart filter FE interaction**
  - [x] Subtask 1.1: Create debounced industry input behavior in the contacts filter bar
  - [x] Subtask 1.2: Trigger smart-filter lookup after 500ms idle time
  - [x] Subtask 1.3: Apply canonical slug automatically when confidence is high enough

- [x] **Task 2: Implement fallback UX**
  - [x] Subtask 2.1: Show the regular industry dropdown when confidence is low
  - [x] Subtask 2.2: Preserve silent fallback behavior on API failure or timeout
  - [x] Subtask 2.3: Avoid noisy toasts/errors for expected smart-filter fallback cases

- [x] **Task 3: Add Phase 1 MSW coverage**
  - [x] Subtask 3.1: Add MSW handler for `GET /api/contacts/industry-suggestions`
  - [x] Subtask 3.2: Return deterministic high-confidence and fallback responses for test terms
  - [x] Subtask 3.3: Cover failed lookup behavior in handler tests where relevant

- [ ] **Task 4: Add Phase 2 BE contract support**
  - [ ] Subtask 4.1: Add `ISmartFilterService` interface if not already present
  - [ ] Subtask 4.2: Add `MockSmartFilterService` adapter
  - [ ] Subtask 4.3: Register smart filter service resolution in `container.ts` using `SMART_FILTER_AI_PROVIDER`
  - [ ] Subtask 4.4: Implement `GET /api/contacts/industry-suggestions` in the API

- [x] **Task 5: Test the behavior**
  - [x] Subtask 5.1: Verify debounce behavior
  - [x] Subtask 5.2: Verify high-confidence slug application
  - [x] Subtask 5.3: Verify low-confidence fallback
  - [x] Subtask 5.4: Verify API failure fallback

---

## Notes

- Use generic AI-provider wording only; do not couple the story to a specific vendor or model name.
- The contract-driving service name is `ISmartFilterService`.
- Provider selection should be controlled through `SMART_FILTER_AI_PROVIDER`.
- This story should align with the updated Epic 3 wording and the sprint change proposal that removed vendor-specific AI references.

---

## Story Link

- Epic source: `/_bmad-output/planning-artifacts/epics/epic-3-contact-database-participant-intelligence.md`
- Change note: `/_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-22.md`
