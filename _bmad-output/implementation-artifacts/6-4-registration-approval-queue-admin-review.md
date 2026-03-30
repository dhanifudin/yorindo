# Story 6.4: Registration Approval Queue & Admin Review

## Story
As an admin, I want to review pending registrations and approve or reject them.

> **Current implementation note (2026-03-30):** The runtime still includes legacy waitlist/cancel flows. This artifact tracks the target direction, but the codebase has not fully converged yet.

## Acceptance Criteria
- [x] `/app/events/:id/registrations` shows pending queue
- [x] Approve/reject action buttons per row exist
- [x] `PATCH /api/registrations/:id/status` with `{ status: 'approved' | 'rejected' | 'pending' }` (requeue from rejected)
- [x] TanStack Table with status filtering exists; current runtime still includes additional legacy statuses
- [ ] Full later-spec side effects (auto-close on quota fill, rejection notification enqueue, strict simplified status tabs) are not fully aligned in runtime yet

## Status: review
