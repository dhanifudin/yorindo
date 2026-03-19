# Epic 2: Team & Access Management

Super admin can create and manage internal user accounts (admin, staff, viewer); team members can securely log in with JWT and are automatically restricted to their role's permitted capabilities.

> **Phase 1 (FE):** Login page with form + error states (MSW auth handler); user management table + create/edit/deactivate modals; route guard middleware (Next.js middleware.ts); event assignment UI — all wired to MSW
> **Phase 2 (BE):** `POST /api/auth/login|refresh|logout`, `GET/POST/PATCH/DELETE /api/users`, `POST/DELETE /api/users/:id/events`, JWT middleware, bcrypt, Redis token blacklist, `requireEventAccess` middleware

## Story 2.1: Admin Login & JWT Authentication

As an internal team member,
I want to log in with my email and password and receive a JWT access token,
So that I can securely access the platform and all subsequent API calls are authenticated.

**Acceptance Criteria:**

**Given** a valid email and password,
**When** `POST /api/auth/login` is called,
**Then** it returns an access token (15min HS256 JWT with `{ sub, role, jti }` payload) and sets an httpOnly `refresh_token` cookie (7 days)

**Given** an invalid email or wrong password,
**When** `POST /api/auth/login` is called,
**Then** it returns HTTP 401 with `{ error: { code: 'INVALID_CREDENTIALS', ... } }` — no information about which field was wrong

**Given** a valid access token,
**When** any authenticated endpoint is called with `Authorization: Bearer {token}`,
**Then** the request proceeds and `req.user` contains `{ sub, role, jti }`

**Given** an expired or malformed access token,
**When** an authenticated endpoint is called,
**Then** it returns HTTP 401 with `{ error: { code: 'INVALID_TOKEN', ... } }`

**Given** a valid httpOnly refresh cookie,
**When** `POST /api/auth/refresh` is called,
**Then** a new 15-min access token is returned without requiring re-login

**Given** a user logs out,
**When** `POST /api/auth/logout` is called,
**Then** the JWT `jti` is blacklisted in Redis and the refresh cookie is cleared; subsequent requests with that access token return 401

**Given** the login action,
**Then** a `login` entry is written to `audit_logs` with `actor_id`, `actor_role`, `created_at`

---

## Story 2.2: User Account Management

As a super admin,
I want to create, view, edit, and deactivate internal user accounts with assigned roles,
So that I can control who has access to the platform and what they can do.

**Acceptance Criteria:**

**Given** I am authenticated as `admin`,
**When** `POST /api/users` is called with `{ email, name, role, password }`,
**Then** the user is created with a bcrypt-hashed password and the correct role; a `user.created` audit entry is written

**Given** I am authenticated as `admin`,
**When** `GET /api/users` is called,
**Then** it returns all users with their id, name, email, role, and created_at — passwords never returned

**Given** I am authenticated as `admin`,
**When** `PATCH /api/users/:id` is called with `{ role: 'viewer' }`,
**Then** the user's role is updated and a `user.role-changed` audit entry is written

**Given** I am authenticated as `admin`,
**When** `DELETE /api/users/:id` is called,
**Then** the account is deactivated (soft delete — `deleted_at` set) and a `user.deactivated` audit entry is written

**Given** I am authenticated as `staff` or `viewer`,
**When** `POST /api/users` is called,
**Then** it returns HTTP 403 with `{ error: { code: 'FORBIDDEN', ... } }`

**Given** a non-admin tries to access `/admin/users` on the FE,
**When** the route guard runs,
**Then** they are redirected to the dashboard with no flash of admin content

---

## Story 2.3: Role-Based Route Guards (Frontend)

> **Phase 1 only** — pure FE story. No BE work. Uses `authStore` (set by DevToolbar in Phase 1, set by real JWT in Phase 2).

As a platform,
I want frontend routes automatically protected based on the authenticated user's role,
So that staff cannot access admin pages and viewers cannot access write-action pages.

**Acceptance Criteria:**

**Given** a user is not authenticated (no access token in `authStore`),
**When** any `/admin/*` or `/scan/*` route is accessed,
**Then** they are redirected to `/login` immediately

**Given** a `staff` user is authenticated,
**When** they navigate to `/admin/contacts` or `/admin/events`,
**Then** they are redirected to `/scan` (their permitted surface)

**Given** a `viewer` user is authenticated,
**When** they navigate to `/admin/contacts/upload` or any PATCH/POST action page,
**Then** they are redirected to the read-only analytics pages they are assigned to

**Given** an `admin` user is authenticated,
**When** they navigate to any route,
**Then** full access is granted with no redirect

**Given** a `staff` user's access token expires mid-session,
**When** any API call returns 401,
**Then** the FE attempts silent refresh once; on refresh failure redirects to `/login` and clears `authStore`

---

## Story 2.4: Event Access Assignment for Staff & Viewer

> **Sprint Planning Note (readiness review):** Phase 2 BE implementation of this story must occur after Epic 4 Story 4.1 is complete — events must exist in the database for assignment to be meaningful. Phase 1 FE is unaffected (MSW provides fake events).

As a super admin,
I want to assign staff and viewer accounts to specific events,
So that staff can only scan check-ins for their assigned events and viewers only see analytics for their assigned events.

**Acceptance Criteria:**

**Given** I am authenticated as `admin`,
**When** `POST /api/users/:id/events` is called with `{ eventId }`,
**Then** a `user_events` row is created (user_id, event_id, granted_by, granted_at) and a `user.event-assigned` audit entry is written

**Given** a `staff` user attempts to call `POST /api/scan/verify` for an event not in their `user_events`,
**When** `requireEventAccess` middleware runs,
**Then** it returns HTTP 403 with `{ error: { code: 'EVENT_ACCESS_DENIED', ... } }`

**Given** an `admin` user calls any event-scoped endpoint,
**When** `requireEventAccess` middleware runs,
**Then** it passes immediately — admin bypasses event scope checks

**Given** I am authenticated as `admin`,
**When** `DELETE /api/users/:id/events/:eventId` is called,
**Then** the `user_events` row is deleted and access is immediately revoked

---
