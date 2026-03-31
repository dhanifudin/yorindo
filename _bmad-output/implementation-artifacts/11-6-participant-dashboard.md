# Story 11.6 — Participant Dashboard

**Story ID:** 11.6
**Story Key:** 11-6-participant-dashboard
**Epic:** Epic 11 — UX Experience & Routing Revamp
**Phase:** Phase 1 (FE) — MSW addition + new dashboard + new shell layout
**Status:** review
**Created:** 2026-03-25

---

## Story

As a logged-in participant,
I want to see a personal dashboard showing my event registrations and QR tickets,
So that I can track my upcoming events and access my tickets without contacting the organizer.

> **Depends on:** Story 11.3 (role-based dashboard routing at `src/app/app/page.tsx`), Story 6.8 (participant `authStore` shape with `name` + `email`, MSW participant token).
> **Current implementation note (2026-03-30):** The active runtime still includes legacy `waitlisted` and `cancelled` statuses and an implemented cancellation path. This artifact should reflect current runtime behavior unless/until Epic 6 status cleanup is completed in code.
> **Sprint Change Proposal:** 2026-03-25, CP-6.

---

## Acceptance Criteria

**AC1:** `src/app/app/page.tsx` adds `role === 'participant'` branch → renders `<ParticipantDashboard />`. Existing `admin`, `viewer`, `staff` branches and the null-role redirect remain unchanged.

**AC2:** Greeting: *"Hai, {name}!"* where `name` comes from `authStore.user.name` — no extra API call. If `name` is undefined/empty, fall back to `authStore.user.email`.

**AC3:** **Upcoming Events tab** ("Mendatang") — fetches `GET /api/participants/me/registrations` and displays registrations with the statuses currently used by the runtime (`approved`, `pending`, `waitlisted`, and current cancellation handling where present) where relevant to the participant dashboard experience.

**AC4:** **My Tickets tab** ("Tiket Saya") — same endpoint; filters to the current approved-ticket flow. Each entry renders as a card with the current runtime ticket display behavior.

**AC5:** Cancellation flow remains part of the current runtime implementation and should be documented as such until the codebase is migrated off the legacy cancellation path.

**AC6:** MSW handler `GET /api/participants/me/registrations` exists in `src/mocks/handlers/registrations.ts`. It returns participant registration objects spanning the statuses currently used in the runtime.
```ts
{
  id: string
  eventId: string
  eventName: string
  eventDate: string   // ISO date, eventDate >= today for "Mendatang" items
  venue: string
  status: 'approved' | 'pending' | 'waitlisted' | 'cancelled'
  ticketToken: string // only meaningful when status === 'approved'
}
```

**AC7:** Component lives at `src/components/features/dashboard/ParticipantDashboard.tsx`. TanStack Query key: `['participant', 'registrations']`. Two tabs use shadcn/ui `<Tabs>` / `<TabsList>` / `<TabsTrigger>` / `<TabsContent>`.

**AC8:** Skeleton loading state while data is fetching — render `<Skeleton />` placeholders that match the shape of each tab's content. Empty states: *"Tidak ada pendaftaran aktif."* (Mendatang tab) and *"Belum ada tiket."* (Tiket Saya tab).

**AC9:** Participant users are wrapped in `ParticipantShell` (not `AdminShell`). `ParticipantShell` is a new standalone layout at `src/components/layout/ParticipantShell.tsx` with:
- Top bar: Yorindo logo (left), participant name from `authStore.user.name` (center or right), logout button (far right).
- No sidebar, no mobile bottom nav.
- Main content area centered, max-w-2xl, px-4, py-6.

`src/app/app/layout.tsx` must detect `role === 'participant'` and render `<ParticipantShell>` instead of `<AdminShell>`. The participant route guard (redirect to `/app` for any path outside `/app`) added in Story 6.8 must remain in place.

**AC10:** `npm run build` passes with 0 TypeScript errors.

**AC11 (2026-03-28 — participant profile page):** `/account/profile` page exists within `ParticipantShell`. Shows all fixed profile fields (`email` read-only, `name`, `phone`, `company_email`, `company_name`, `company_location`, `position`, `industry_type`) in an editable form. On save: `PATCH /api/contacts/:id` is called with updated fields; on success toast "Profil diperbarui" and `profile_updated_at` is refreshed in the response. Navigation link to "/account/profile" appears in `ParticipantShell` top bar as "Profil Saya".

MSW handler: `PATCH /api/contacts/:id` already exists — update it to accept participant profile fields and return the updated contact with `profile_updated_at: new Date().toISOString()`.

**AC12 (2026-03-28 — profile staleness reminder):** When participant loads the dashboard (`/app`), the FE calls `GET /api/participants/me/profile` to retrieve the contact record including `profile_updated_at`.

Staleness conditions (either triggers the reminder):
- `profile_updated_at` is `null` (never updated by participant — may have outdated imported data)
- `profile_updated_at` is older than **180 days** from today

When stale: render a non-dismissible amber banner at the top of the dashboard:
> "Profil Anda mungkin sudah tidak akurat. Perbarui informasi seperti jabatan atau perusahaan agar tetap relevan. **[Perbarui Profil →]**"

The banner links to `/account/profile`. It disappears immediately after a successful `PATCH /api/contacts/:id` (query invalidation of `['participant', 'profile']`).

MSW handler: `GET /api/participants/me/profile` (new) returns the mock contact object for `contact-001` with `profile_updated_at: null` by default (triggers the reminder in dev). Add to `src/mocks/handlers/registrations.ts` or a new `src/mocks/handlers/participants.ts`.

> **Phase 2 BE note:** cron job (`node-cron`) sends a WhatsApp/email reminder to participants whose `profile_updated_at` is null or > 180 days, once per month. Reminder uses the event notification channel configured in `contacts.notification_channel`. This is a Phase 2 concern — Phase 1 covers only the in-app banner.

> **Code review note (2026-03-28):** Add "Profil Saya" link to `ParticipantShell` top bar. Create `/account/profile` page. Add `GET /api/participants/me/profile` MSW handler returning `contact-001` with `profile_updated_at: null`. Implement staleness check in dashboard mount.

---

## Tasks / Subtasks

- [x] **Task 1 — MSW handlers (AC: 6)**
  - [x] `GET /api/participants/me/registrations` exists and reflects the current participant-registration runtime states
  - [x] Verify handlers are exported from `src/mocks/handlers/index.ts`

- [x] **Task 2 — ParticipantShell layout (AC: 9)**
  - [x] Create `src/components/layout/ParticipantShell.tsx`
  - [x] Top bar: logo text "Yorindo" (left), `authStore.user.name` (right of logo or centered), logout `<Button variant="ghost">` (far right)
  - [x] No sidebar, no mobile nav
  - [x] Main: `<main className="max-w-2xl mx-auto px-4 py-6">{children}</main>`
  - [x] Logout calls `clearAuth()` + `router.replace('/')`

- [x] **Task 3 — Wire ParticipantShell into app layout (AC: 9)**
  - [x] In `src/app/app/layout.tsx`, read `user.role` from `useAuthStore`
  - [x] If `role === 'participant'`, render `<ParticipantShell>{children}</ParticipantShell>`
  - [x] Otherwise render existing `<AdminShell>{children}</AdminShell>`

- [x] **Task 4 — ParticipantDashboard component (AC: 1–4, 7, 8)**
  - [x] Create `src/components/features/dashboard/ParticipantDashboard.tsx`
  - [x] Read `user.name` and `user.email` from `useAuthStore` for greeting (AC2)
  - [x] `useQuery` with key `['participant', 'registrations']` → `GET /api/participants/me/registrations` (AC7)
  - [x] Skeleton state: placeholder rows matching tab content shape (AC8)
  - [x] Two shadcn Tabs: "Mendatang" and "Tiket Saya" (AC3, AC4)
- [x] Mendatang tab reflects the current participant-registration runtime behavior and active statuses
  - [x] Tiket Saya tab: filter approved only, render inline QR with `react-qr-code` `<QRCode value={ticketToken} size={160} />` (AC4)
  - [x] Status badge: color-coded (approved=default/green, pending=secondary/yellow)
  - [x] Empty states per tab (AC8)

- [x] **Task 5 — Wire ParticipantDashboard into page.tsx (AC: 1)**
  - [x] In `src/app/app/page.tsx`, add `role === 'participant'` branch → `<ParticipantDashboard />` — already implemented in Story 11.3 placeholder; AC1 satisfied
  - [x] Ensure existing admin/viewer/staff/null-role branches are unchanged

- [x] **Task 6 — TypeScript check (AC: 10)**
  - [x] Run `npm run build` in `yorindo-app/` — ✓ Compiled successfully in 8.9s, 0 TypeScript errors

- [ ] **Task 7 — Participant profile page (AC: 11)**
  - [ ] Create `src/app/app/account/profile/page.tsx` within `ParticipantShell`
  - [ ] Render editable form: `email` (read-only), `name`, `phone`, `company_email`, `company_name`, `company_location`, `position`, `industry_type`
  - [ ] On save: `PATCH /api/contacts/:id` with updated fields
  - [ ] On success: toast "Profil diperbarui"; invalidate `['participant', 'profile']` query
  - [ ] Add "Profil Saya" navigation link to `ParticipantShell` top bar pointing to `/account/profile`
  - [ ] Update `PATCH /api/contacts/:id` MSW handler to return updated contact with `profile_updated_at: new Date().toISOString()`

- [ ] **Task 8 — Profile MSW handler (AC: 12)**
  - [ ] Add `GET /api/participants/me/profile` handler to `src/mocks/handlers/participants.ts` (create file if absent) or `registrations.ts`
  - [ ] Returns mock contact object for `contact-001` with `profile_updated_at: null` (triggers staleness reminder in dev)
  - [ ] Ensure handler is exported from `src/mocks/handlers/index.ts`

- [ ] **Task 9 — Staleness reminder banner (AC: 12)**
  - [ ] In `ParticipantDashboard.tsx`, add `useQuery` with key `['participant', 'profile']` → `GET /api/participants/me/profile`
  - [ ] Staleness check: `profile_updated_at === null` OR `profile_updated_at` older than 180 days from today
  - [ ] When stale: render non-dismissible amber banner at top of dashboard: "Profil Anda mungkin sudah tidak akurat. Perbarui informasi seperti jabatan atau perusahaan agar tetap relevan. **[Perbarui Profil →]**" (link to `/account/profile`)
  - [ ] Banner disappears after successful `PATCH /api/contacts/:id` (invalidate `['participant', 'profile']`)

---

## Dev Notes

### Key Patterns from Previous Stories

**Greeting pattern (11.3):** Other dashboards use `useCurrentUser()` hook + `GET /api/users/me`. Participant dashboard skips this — name is already in `authStore.user.name` from the SSO flow (Story 6.8). No extra API call needed per AC2.

**Shell switching (11.3):** `src/app/app/layout.tsx` currently wraps all `/app/**` routes in `<AdminShell>`. This story adds a conditional branch for `role === 'participant'` → `<ParticipantShell>`. Read the current layout before modifying.

**Skeleton (11.3):** `src/components/ui/skeleton.tsx` exists. Use `<Skeleton className="h-4 w-full" />` patterns already in the codebase.

**QR Code:** `react-qr-code` is already a project dependency. Import: `import QRCode from 'react-qr-code'`. Render: `<QRCode value={ticketToken} size={128} />`.

**Cancel pattern (6.7):** Self-cancellation story (6.7) used `AlertDialog` + `useMutation`. Follow the same pattern.

**MSW registrations handler:** Check `src/mocks/handlers/registrations.ts` first — `POST /api/registrations/:id/cancel` may already exist from Story 6.7. Add only what's missing.

**Date today filter:** Use `new Date().toISOString().split('T')[0]` as today's date string for filtering `eventDate >= today`. Or use `src/lib/dateUtils.ts` utilities added in Story 11.3 (`isToday`, `formatIndonesianDate`, `formatEventTime`).

**Tab state:** No URL state needed for participant tabs (unlike events page in 11.5). Simple `useState` for active tab is sufficient.

### File Checklist

| Action | File |
|--------|------|
| NEW | `src/components/layout/ParticipantShell.tsx` |
| NEW | `src/components/features/dashboard/ParticipantDashboard.tsx` |
| MODIFY | `src/app/app/layout.tsx` — add participant shell branch |
| MODIFY | `src/app/app/page.tsx` — add participant dashboard branch |
| MODIFY | `src/mocks/handlers/registrations.ts` — add GET + POST stubs |

---

## Dev Agent Record

### Completion Notes

- **MSW**: Added `GET /api/participants/me/registrations` with 4 fixed-data mock registrations (2× approved, 1× pending, 1× waitlisted) to `registrations.ts`. `POST /api/registrations/:id/cancel` already existed from Story 6.7 — reused as-is.
- **ParticipantShell**: Standalone top-bar layout (no sidebar, no mobile nav). Logo left, participant name + logout button right. Logout calls `clearAuth()` + `router.replace('/')`.
- **App layout**: Added `role === 'participant'` guard in `layout.tsx` — renders `<ParticipantShell>` instead of `<AdminShell>`. `PWAInstallBanner` is correctly excluded for participants.
- **ParticipantDashboard**: Replaced placeholder with full implementation. Two shadcn `<Tabs>`: "Mendatang" (upcoming, approved/pending/waitlisted filtered by `eventDate >= today`, sorted asc) and "Tiket Saya" (approved only, inline QR via `react-qr-code`). Cancellation uses `AlertDialog` + `useMutation` → invalidates query on success. Skeleton loading and empty states per tab.
- **page.tsx**: `role === 'participant'` branch was already present from Story 11.3 placeholder — no change needed.
- **Build**: `npm run build` passed with 0 TypeScript errors (pre-existing `themeColor` metadata warnings are unrelated).

### File List

- NEW: `src/components/layout/ParticipantShell.tsx`
- MODIFIED: `src/components/features/dashboard/ParticipantDashboard.tsx` (replaced placeholder)
- MODIFIED: `src/app/app/layout.tsx` (added ParticipantShell branch)
- MODIFIED: `src/mocks/handlers/registrations.ts` (added GET /api/participants/me/registrations + PARTICIPANT_REGISTRATIONS mock data)
