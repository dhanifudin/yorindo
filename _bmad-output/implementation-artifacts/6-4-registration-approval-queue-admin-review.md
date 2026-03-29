# Story 6.4: Registration Approval Queue & Admin Review

## Story
As an admin, I want to review pending registrations and approve or reject them.

> **Updated 2026-03-28** — Waitlist action removed. Approval actions simplified to approve / reject only. Status filter tabs: `pending / approved / rejected` (no waitlist tab).

## Acceptance Criteria
- [x] `/app/events/:id/registrations` shows pending queue
- [x] Approve/reject action buttons per row (no waitlist button)
- [x] `PATCH /api/registrations/:id/status` with `{ status: 'approved' | 'rejected' | 'pending' }` (requeue from rejected)
- [x] TanStack Table with status filter tabs: `pending / approved / rejected`
- [x] On approve: if approving fills event quota, registration form is auto-closed (`events.registration_closed = true`) — see Story 6.1
- [x] On reject: rejection notification blast job enqueued
- [x] Manual requeue: `PATCH` with `{ status: 'pending' }` from `rejected` re-enters the approval queue

## Status: review
