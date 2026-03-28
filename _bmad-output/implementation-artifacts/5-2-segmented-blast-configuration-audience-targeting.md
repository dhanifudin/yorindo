# Story 5.2: Segmented Blast Configuration & Audience Targeting

## Story
As an admin, I want to configure a segmented invitation blast with industry/city/jobTitle filters and an audience preview.

## Acceptance Criteria
- [x] /app/blast page with blast config form
- [x] Template selector, channel selector
- [x] Audience filter fields with live count preview
- [x] POST /api/events/:id/blast fires blast job
- [ ] **AC5 (2026-03-28):** Given the audience filter section renders, then a `LocationPicker` component is shown for province + city targeting; selecting province/city adds `province_code`/`city_code` to the blast job filters; audience preview count updates to reflect location filter; both filters are optional (null = any location)

> **Updated 2026-03-28 (SCP-2026-03-28-D):** AC5 added — location-based audience targeting via LocationPicker (reused from Story 3.1 Task 8).

## Status: review
