# Sprint Change Proposal — 2026-03-25
## Gmail SSO + Participant Account & Dashboard (Phase 2 Pull-Forward)

**Prepared by:** Bob (Scrum Master)
**Date:** 2026-03-25
**Status:** Approved
**Scope Classification:** Moderate — new stories added within existing epic structure; no rollback required

---

## Section 1: Issue Summary

### Trigger
New product requirement identified during Sprint 1 implementation: Participant self-service capability (Gmail SSO on registration form + personal dashboard showing tickets and registered events) is needed in MVP rather than Phase 2 Growth.

### Context
The original PRD scoped "Participant Accounts" as a Phase 2 — Growth feature, with participants treated as database records only (no login, no account). This proposal pulls the core of that capability into the current MVP sprint, scoped to Gmail SSO only (other providers remain Phase 2).

### Specific Changes Requested
1. **Gmail SSO on registration form** — pre-fills name + email; phone always required manually
2. **Participant account creation** — triggered on double opt-in confirmation (not on form submit)
3. **Participant `/app` dashboard** — upcoming events, QR tickets, self-cancellation

### Phase 1 Constraint Preserved
All new stories remain Phase 1 (FE + MSW mock). No real Google OAuth infrastructure in Phase 1. Real `next-auth` / `@auth/core` integration is Phase 2 BE work.

---

## Section 2: Impact Analysis

### Epic Impact

| Epic | Impact | Detail |
|---|---|---|
| Epic 2 (Auth) | Minor | `authStore` type update — `role` union gains `'participant'`; `name?` and `email?` added to user object |
| Epic 6 (Registration) | Additive | New story **6.8** added — Gmail SSO pre-fill + participant account creation on confirmation |
| Epic 11 (UX/Routing) | Additive | New story **11.6** added — `ParticipantDashboard` + `ParticipantShell` layout |
| All other epics | None | No changes required |

### Story Impact

| Story | Status | Change |
|---|---|---|
| 6-8 (new) | `ready-for-dev` | Gmail SSO + participant auth — new story |
| 11-6 (new) | `ready-for-dev` | Participant Dashboard — new story |
| 11-3 (existing) | `review` | No change — `page.tsx` role switch updated in Story 11.6 task |
| 6-3 (existing) | `review` | No change — confirmation page SSO call added in Story 6.8 |
| 2-1 (existing) | `review` | No change — login page participant SSO link added in Story 6.8 |

### Artifact Conflicts

| Artifact | Conflict | Resolution |
|---|---|---|
| PRD § RBAC table | `participant` row described as no-account | Updated — participant gains account, Gmail OAuth at MVP |
| PRD § Phase 2 table | "Participant Accounts" listed as Growth | Row updated to "Growth extensions" — core capability moved to MVP |
| Architecture `authStore` | `role` union missing `participant`; no `name`/`email` | Type updated; `name?` and `email?` added |
| Architecture Cross-Cutting §4 | "Three roles" / no OAuth mention | Updated to four roles; participant OAuth strategy documented |

### Technical Impact
- `authStore.ts` shape change is **additive** — existing `admin/viewer/staff` code unaffected
- `src/app/app/page.tsx` gains one branch — existing dashboard components untouched
- New `ParticipantShell` layout is independent of `AdminShell` — no coupling
- MSW handlers are additive — no existing handler modifications

---

## Section 3: Recommended Approach

**Selected: Option 1 — Direct Adjustment** (add stories within existing epic structure)

### Rationale
- No rollback needed — existing 6.1–6.7 and 11.1–11.5 stories are complete and unmodified
- Both new stories are self-contained — they depend on existing stories but don't require existing stories to change
- Phase 1 mock approach keeps the constraint clean — real OAuth deferred to Phase 2 BE
- `authStore` type change is the only cross-cutting code modification; it's additive and backwards-compatible

### Effort Estimate
- Story 6.8: **Medium** — SSO mock modal + confirmation page wiring + DevToolbar update + MSW handler
- Story 11.6: **Medium** — `ParticipantDashboard` component + `ParticipantShell` layout + MSW handler + two-tab structure

### Risk: Low
- No architectural pivot required
- Both stories can be developed independently (6.8 → 11.6 sequentially, or parallel after `authStore` update)
- Phase 1 mock isolates from real OAuth complexity

### Timeline Impact
Two additional stories added to Sprint 1. No stories deferred.

---

## Section 4: Detailed Change Proposals

### CP-1: PRD — RBAC Table, Participant Row

**OLD:**
```
| `participant` | Self only | Registration, self-cancellation, OTP recovery | No dashboard access; public web forms only |
```
*Footnote: "Participants are not accounts — they are database records created via public registration."*

**NEW:**
```
| `participant` | Self only | Registration, self-cancellation, ticket access, my-events dashboard | Gmail OAuth (MVP); WhatsApp OTP (Growth). Account linked to contact record by email. |
```
*Footnote updated:*
> "Participants are lightweight accounts linked to a contact record. At MVP, account creation is triggered by Gmail OAuth on the registration form — the OAuth email is used to look up or create the contact. Passwordless WhatsApp OTP login is Growth. Participant account requires three fields: **name** (from Gmail OAuth or manual), **email** (from Gmail OAuth, required for account), and **phone** (always manual — OAuth providers do not supply phone). Registration form pre-fills name + email via Gmail SSO but always prompts for phone. Phone remains the contact identity key (UNIQUE). Account is created on double opt-in confirmation, not on form submit."

---

### CP-2: PRD — Phase 2 Growth Table

**OLD:**
```
| Participant Accounts | Passwordless WhatsApp OTP login, profile auto-fill across events, attendance history dashboard |
```

**NEW:**
```
| Participant Accounts (Growth extensions) | WhatsApp OTP login (alternative to Gmail), Apple SSO, GitHub SSO, persistent cross-device profile, attendance history across all events, notification preference center |
```

---

### CP-3: Architecture — `authStore` Type

**OLD:**
```typescript
interface AuthStore {
  accessToken: string | null
  user: { id: string; role: 'admin' | 'staff' | 'viewer' } | null
  setAccessToken: (token: string, user: AuthStore['user']) => void
  clearAuth: () => void
}
```

**NEW:**
```typescript
interface AuthStore {
  accessToken: string | null
  user: { id: string; role: 'admin' | 'staff' | 'viewer' | 'participant'; name?: string; email?: string } | null
  setAccessToken: (token: string, user: AuthStore['user']) => void
  clearAuth: () => void
}
```

---

### CP-4: Architecture — Cross-Cutting Concern §4

**Append to existing §4 text:**
> *"Four roles at MVP: `admin`, `staff`, `viewer`, `participant`.*
>
> *Participant Auth (MVP): Gmail OAuth 2.0 on registration form pre-fills `name` + `email`. Phone is always required manually. Participant account is created on double opt-in confirmation (not on form submit) — linked to the existing contact record by email. Participant session token: same JWT shape `{ sub: contactId, role: 'participant', jti }`, 7-day expiry. Stored in `authStore` with `name` and `email` included for dashboard display without an extra `/api/users/me` call.*
>
> *Phase 1 mock: `POST /api/auth/google` MSW handler accepts `{ mockEmail, mockName }` and returns a participant token. Real Google OAuth (Authorization Code flow via `@auth/core` or `next-auth`) is Phase 2 BE work."*

---

### CP-5: New Story 6.8 — Gmail SSO Registration Pre-fill + Participant Account Creation

**Epic:** 6 | **Depends on:** 6.3 | **Phase:** Phase 1 (FE)

**Acceptance Criteria:**
- AC1: Registration form shows "Lanjutkan dengan Google" button above contact info fields. Phase 1: triggers a mock OAuth modal (inline form asking for mock name + email).
- AC2: After mock OAuth resolves, `name` and `email` fields pre-filled and read-only. Phone field remains required and editable.
- AC3: On double opt-in confirmation success, `POST /api/auth/google` called with `{ contactId, googleEmail }`. MSW returns `{ accessToken: 'mock-token-participant', user: { id: contactId, role: 'participant', name, email } }`. `authStore.setAccessToken(token, user)` called.
- AC4: Confirmation success page shows "Masuk ke Dashboard →" button → `/app`. Existing social share buttons remain.
- AC5: `/app` with `role === 'participant'` no longer redirects to `/login`.
- AC6: `/login` gains "Masuk sebagai Peserta (Google)" secondary link → mock OAuth flow → redirect to `/app`.
- AC7: MSW `POST /api/auth/google` added to `src/mocks/handlers/auth.ts`.
- AC8: `authStore` user type updated per CP-3.
- AC9: DevToolbar gains 4th mock user: `participant: { id: 'dev-participant', role: 'participant', name: 'Budi Peserta', email: 'budi@example.com' }`.
- AC10: `npm run build` passes with 0 TypeScript errors.

---

### CP-6: New Story 11.6 — Participant Dashboard

**Epic:** 11 | **Depends on:** 11.3, 6.8 | **Phase:** Phase 1 (FE)

**Acceptance Criteria:**
- AC1: `src/app/app/page.tsx` adds `role === 'participant'` branch → `<ParticipantDashboard />`.
- AC2: Greeting: *"Hai, {name}!"* from `authStore.user.name` — no extra API call.
- AC3: **Upcoming Events tab** — registrations with `status: 'approved' | 'pending' | 'waitlisted'` where `eventDate >= today`. Columns: Event Name, Date, Venue, Status badge, "Lihat Tiket" button.
- AC4: **My Tickets tab** — `status: 'approved'` only. Each card: event name, date, venue, inline QR code (`ticketToken`), status badge.
- AC5: **Cancellation** — "Batalkan" button on each upcoming approved/pending registration. Confirmation dialog → `POST /api/registrations/{id}/cancel` → remove from list + toast.
- AC6: MSW `GET /api/participants/me/registrations` added to `src/mocks/handlers/registrations.ts`. Returns 3–4 mock registrations across `approved`, `pending`, `waitlisted` statuses.
- AC7: Component at `src/components/features/dashboard/ParticipantDashboard.tsx`. TanStack Query key: `['participant', 'registrations']`.
- AC8: Skeleton loading per tab. Empty states: *"Tidak ada pendaftaran aktif."* / *"Belum ada tiket."*
- AC9: Participant users rendered in `ParticipantShell` (separate from `AdminShell`) — top bar with logo, participant name, logout only. No sidebar.
- AC10: `npm run build` passes with 0 TypeScript errors.

---

## Section 5: Implementation Handoff

**Scope Classification: Moderate**

### Handoff Plan

| Role | Responsibility |
|---|---|
| **Scrum Master (Bob)** | Update `sprint-status.yaml` with stories 6-8 and 11-6; create story files |
| **Developer (Amelia)** | Implement Story 6.8 first (authStore type + SSO mock + DevToolbar), then Story 11.6 (dashboard + shell) |
| **Product Manager** | Update PRD artifacts per CP-1 and CP-2 |
| **Architect** | Update architecture.md per CP-3 and CP-4 |

### Implementation Sequence
1. **Story 6.8** — authStore type is updated here; must complete before 11.6
2. **Story 11.6** — depends on `role: 'participant'` in authStore and MSW participant token

### Success Criteria
- [ ] Gmail SSO mock on registration form pre-fills name + email; phone still required
- [ ] Participant account created on confirmation (not on form submit)
- [ ] `/app` routes participant to `ParticipantDashboard`, admin/viewer/staff to their existing dashboards
- [ ] Participant can view upcoming events, QR tickets, and cancel a registration
- [ ] `npm run build` passes with 0 TypeScript errors
- [ ] DevToolbar includes participant mock user for local dev

---

*Generated by bmad-correct-course · 2026-03-25*
