# Story 2.4: Event Access Assignment for Staff & Viewer

## Story
As a super admin, I want to assign staff and viewer accounts to specific events, so that staff can only scan check-ins for their assigned events and viewers only see analytics for their assigned events.

## Acceptance Criteria
- [x] Admin can view which events are assigned to a staff/viewer user
- [x] Admin can assign an event to a user via POST /api/users/:id/events
- [x] Admin can remove an event assignment via DELETE /api/users/:id/events/:eventId
- [x] The UI shows an "Assign Event" button on non-admin users in the users table
- [x] A dialog opens with all events listed and current assignments checked
- [x] MSW handlers for POST/DELETE /api/users/:id/events and GET /api/users/:id/events

## Tasks
- [x] Add MSW handlers for user event assignment endpoints
- [x] Create EventAssignmentDialog component
- [x] Add assignment button to UsersPage
- [x] Update api types with UserEvent type

## Dev Notes
- Phase 1 FE only — MSW mocks for all endpoints
- Assignments stored in-memory in MSW handler
- Dialog lists all available events with checkboxes

## Status: review
