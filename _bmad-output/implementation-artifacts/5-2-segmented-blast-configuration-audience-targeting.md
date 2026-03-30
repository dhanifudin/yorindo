# Story 5.2: Segmented Blast Configuration & Audience Targeting

## Story
As an admin, I want to configure a segmented invitation blast with the current implemented filter and audience preview flow.

## Acceptance Criteria
- [x] Event blast config UI exists in the current event workspace flow
- [x] Template selector, channel selector
- [x] Audience filter fields with live count preview
- [x] POST /api/events/:id/blast fires blast job
- [ ] **Later-spec follow-up:** `LocationPicker` province/city targeting and the richer criteria model are not fully aligned in current code yet

> **Current implementation note (2026-03-30):** The current code still uses the simpler blast targeting form. Manual-vs-AI tabs and richer location/criteria targeting remain follow-up work.

## Status: review
