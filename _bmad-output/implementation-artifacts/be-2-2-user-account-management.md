# Story BE-2.2: User Account Management (Phase 2 Backend)

## Story
As a super admin,
I want to create, view, edit, and deactivate internal user accounts with assigned roles,
So that I can control who has access to the platform and what they can do.

## Context
This is the **Phase 2 Backend** implementation for Story 2.2. The Phase 1 frontend mock UI is already built and tested against MSW handlers. This story builds the real Fastify API routes backed by PostgreSQL (`IUserRepository`). It includes password hashing (`bcrypt`), JWT role guards (`admin` only), soft deletes, and adding structured entries to the `audit_logs` table (`IAuditLogRepository`).

## Acceptance Criteria

**AC1:** Given I am authenticated as `admin`,
When `POST /api/users` is called with `{ email, name, role, password }`,
Then the user is created with a bcrypt-hashed password and the correct role; a `user.created` audit entry is written.

**AC2:** Given I am authenticated as `admin`,
When `GET /api/users` is called,
Then it returns all active users with their `id`, `name`, `email`, `role`, and `created_at` — passwords never returned.

**AC3:** Given I am authenticated as `admin`,
When `PATCH /api/users/:id` is called with `{ role: 'viewer' }`,
Then the user's role is updated and a `user.role-changed` audit entry is written.

**AC4:** Given I am authenticated as `admin`,
When `DELETE /api/users/:id` is called,
Then the account is deactivated (soft delete — `deleted_at` set) and a `user.deactivated` audit entry is written.

**AC5:** Given I am authenticated as `staff` or `viewer` (or unauthenticated),
When any `POST /api/users` or other modifying endpoints are called,
Then it returns HTTP 403 with `{ error: { code: 'FORBIDDEN', ... } }` or HTTP 401 if unauthenticated.

## Tasks / Subtasks

- [ ] **Task 1: Set up the routing and types**
  - [ ] Create `src/routes/users.routes.ts`
  - [ ] Register `/api/users` prefix routing in the main Fastify server or via plugin.
  - [ ] Define Zod schemas for `POST` body (email, password, name, role), `PATCH` body, and `GET` querystring (pagination, though optional for now).

- [ ] **Task 2: Implement Role Guards**
  - [ ] Create or update the existing auth middleware to require `admin` role explicitly. E.g., `preHandler: [requireAuth, requireAdmin]` or similar, so only admins can hit the `users` endpoints.

- [ ] **Task 3: Implement `POST /api/users`**
  - [ ] Validate request body with Zod schema.
  - [ ] Ensure email does not already exist. If it does, throw a conflict error.
  - [ ] Hash password using `bcrypt`.
  - [ ] Save user via `userRepository`.
  - [ ] Write `user.created` to `AuditLogRepository` including `actor_id` (the admin creating it) and `target_id` (the new user).

- [ ] **Task 4: Implement `GET /api/users`**
  - [ ] Fetch users via `userRepository` (ensure soft-deleted users are omitted).
  - [ ] Map the results to securely strip out the `passwordHash` field before sending the JSON response.

- [ ] **Task 5: Implement `PATCH /api/users/:id`**
  - [ ] Validate request body (e.g., role updates, name updates).
  - [ ] Update user via `userRepository`.
  - [ ] Write `user.role-changed` or general update to `AuditLogRepository`.

- [ ] **Task 6: Implement `DELETE /api/users/:id`**
  - [ ] Set `deletedAt` for soft-deletion via `userRepository`.
  - [ ] Write `user.deactivated` to `AuditLogRepository`.

- [ ] **Task 7: Write Vitest API Tests**
  - [ ] Test that `GET /api/users` excludes passwords.
  - [ ] Test `POST`, `PATCH`, and `DELETE` endpoints.
  - [ ] Test role guards (e.g., a query using a staff token should successfully fail with 403).
  - [ ] Verify audit logs are created after updates.

## Dev Notes
- **Repository Pattern:** Always use `userRepo` and `auditRepo` injected from the `container.ts`. Do not write raw SQL inside the route file.
- **Transactions:** If combining a user insert + an audit log insert, ideally they should be in a transaction if your DB layer supports it, otherwise run them sequentially and log errors if the audit insertion fails.
- **Passwords:** Verify that the `UserRepository` interface returns users with passwords in a way that doesn't accidentally leak them to the client. You should explicitly strip out `passwordHash` inside the route or a DTO layer.

## Dev Agent Record
### Implementation Plan
### Debug Log
### Completion Notes

## File List
- `src/routes/users.routes.ts`
- `src/tests/users.routes.test.ts`

## Status: review
## Change Log
| Date | Change | Author |
|------|--------|--------|
| 2026-03-27 | Created BE Phase 2 Story context | bmad-create-story |
| 2026-03-27 | Implemented routing, tests, and updated sprint status | bmad-dev-story |
