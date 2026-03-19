# Story 4.2: Event Lifecycle Management (State Machine)

## Story
As an admin, I want to transition events through their lifecycle (Draft → Published → Active → Completed → Archived/Cancelled) with proper guards.

## Acceptance Criteria
- [x] Event detail page shows lifecycle action buttons based on current status
- [x] Only valid transitions are shown
- [x] PATCH /api/events/:id with new status
- [x] Invalid transitions show error
- [x] Cancel requires confirmation dialog

## Status: review
