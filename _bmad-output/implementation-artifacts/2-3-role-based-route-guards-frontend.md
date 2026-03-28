# Story 2.3: Role-Based Route Guards (Frontend)

**Story ID:** 2.3
**Story Key:** 2-3-role-based-route-guards-frontend
**Epic:** Epic 2 — Team & Access Management
**Status:** review

---

## Story

As a platform,
I want frontend routes automatically protected based on the authenticated user's role,
So that staff cannot access admin pages and viewers cannot access write-action pages.

> **Implementation note:** The current implementation uses a client-side guard in `src/app/app/layout.tsx`, not `middleware.ts`.

---

## Acceptance Criteria

- [x] Unauthenticated users accessing `/app/*` are redirected to `/login`
- [x] `staff` users attempting to access admin workspaces are redirected to `/app/scan`
- [x] `viewer` users attempting to access write-oriented pages are redirected to `/app/events`
- [x] Restricted `/app` content does not flash before redirect because unauthorized layouts render `null`
- [x] Authenticated app requests retry once through `POST /api/auth/refresh` on `401`
- [x] If refresh fails, the FE clears `authStore` and redirects to `/login`

---

## Implemented In

- `yorindo-app/src/app/app/layout.tsx`
- `yorindo-app/src/store/authStore.ts`

---

## Notes

- This story is aligned to the implemented client-side guard model.
- Viewer event visibility is assignment-scoped on the backend, so redirect targets land on assigned-only event data.
