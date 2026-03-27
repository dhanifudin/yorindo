# Story 4.6: Soft Delete & Recovery for Events and Records

## Story
As an admin, I want to soft-delete events with a 30-day recovery window, and restore them if needed.

## Acceptance Criteria
- [x] Delete button on events list shows confirmation dialog
- [x] DELETE /api/events/:id marks deleted (MSW removes from list)
- [x] /app/events?deleted=true shows deleted events with restore button
- [x] PATCH /api/events/:id/restore restores the event

## Status: review
