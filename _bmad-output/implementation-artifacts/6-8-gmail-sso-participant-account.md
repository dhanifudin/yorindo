# Story 6.8: Gmail SSO Registration Pre-fill + Participant Account Creation

**Story ID:** 6.8
**Story Key:** 6-8-gmail-sso-participant-account
**Epic:** Epic 6 — Participant Registration & Approval Workflow
**Phase:** Phase 1 (FE) — MSW mock OAuth + participant session
**Status:** review
**Created:** 2026-03-25

---

## Story

As a participant,
I want to register faster using my Google account so I don't have to manually type my name and email,
And after my registration is confirmed I can log in to see my tickets and upcoming events.

> **Depends on:** Story 6.3 (double opt-in confirmation flow — `GET /api/registrations/confirm/:token` already exists)
> **Blocks:** Story 11.6 (Participant Dashboard — requires `role: 'participant'` in authStore and `mock-token-participant` token)

---

## Acceptance Criteria

**AC1:** Registration form (`/register/[eventSlug]/form`) contact info step (step 0) shows a "Lanjutkan dengan Google" button above the phone/name/email fields. Clicking it opens a Dialog (Phase 1 mock OAuth modal) with pre-filled test name + email fields.

**AC2:** Inside the mock OAuth Dialog: user sees pre-filled `mockName: 'Budi Peserta'` and `mockEmail: 'budi.peserta@gmail.com'` (editable for testing flexibility). A "Masuk dengan Google" confirm button calls `POST /api/auth/google-mock` (Phase 1 mock endpoint). On success: Dialog closes, name + email fields in the form are pre-filled and shown as read-only (locked), a green "✓ Terisi dari Google" badge appears next to each locked field, and phone field remains editable and required.

**AC3:** Phone field is never pre-filled or locked by SSO — participant must always manually enter phone. The "Lanjut →" button on step 0 requires all three fields (name, email, phone) regardless of SSO status.

**AC4:** On double opt-in confirmation success (`/register/confirm/[token]`), the page auto-calls `POST /api/auth/google` with `{ contactId, participantEmail, participantName }` (sourced from the confirm response). MSW returns `{ accessToken: 'mock-token-participant', user: { id: contactId, role: 'participant', name: participantName, email: participantEmail } }`. `authStore.setAccessToken(token, user)` is called immediately.

**AC5:** Confirmation success page — after participant account is created (AC4) — shows a new "Masuk ke Dashboard →" button that navigates to `/app`. Existing WhatsApp share and "Salin Link" buttons remain. "Masuk ke Dashboard →" is shown only after participant auth succeeds; if `POST /api/auth/google` fails, show a soft error toast and omit the button (non-blocking).

**AC6:** `/app` (`src/app/app/page.tsx`) updated: adds `role === 'participant'` branch → `<ParticipantDashboard />`. Unknown role still redirects to `/login`. Existing `admin/viewer/staff` branches unchanged.

**AC7:** `/login` page gains a secondary "Masuk sebagai Peserta" link below the main login form. Clicking it opens the same mock OAuth Dialog. On success, calls `POST /api/auth/google` and redirects to `/app`.

**AC8 — authStore type update:**
```typescript
interface AuthStore {
  accessToken: string | null
  user: { id: string; role: 'admin' | 'staff' | 'viewer' | 'participant'; name?: string; email?: string } | null
  setAccessToken: (token: string, user: AuthStore['user']) => void
  clearAuth: () => void
}
```
This is a **breaking change** to the store shape — all existing consumers of `user.role` must still compile. Since the union only expands and no existing code depends on exhaustive checks, this is safe.

**AC9 — DevToolbar** gains a 4th mock user: `participant: { id: 'dev-participant', role: 'participant' as const, name: 'Budi Peserta', email: 'budi.peserta@gmail.com' }`. Button label: "participant". Uses `setAccessToken('dev-token', MOCK_USERS.participant)`.

**AC10 — MSW handlers:**
- `POST /api/auth/google-mock` added to `src/mocks/handlers/auth.ts` — accepts `{ mockName, mockEmail }`, returns `{ name: mockName, email: mockEmail }` (just the pre-fill data, no session yet — session is created on confirm)
- `POST /api/auth/google` added to `src/mocks/handlers/auth.ts` — accepts `{ contactId, participantEmail, participantName }`, returns `{ accessToken: 'mock-token-participant', user: { id: contactId ?? 'contact-001', role: 'participant', name: participantName, email: participantEmail } }`
- `GET /api/registrations/confirm/:token` MSW handler in `src/mocks/handlers/registrations.ts` updated to include `contactId: 'contact-001'` and `participantEmail: 'budi.santoso@email.com'` in the `registration` object

**AC11:** `npm run build` passes with 0 TypeScript errors.

---

## Tasks / Subtasks

- [x] **Task 1 — Update `authStore` type (AC: 8)**
  - [x] Edit `src/store/authStore.ts` — add `'participant'` to role union; add `name?: string; email?: string` to user object
  - [x] Verify all existing usages still compile: `src/app/app/page.tsx`, `src/components/layout/AdminShell.tsx`, `src/app/app/scan/page.tsx`, `src/components/dev/DevToolbar.tsx`

- [x] **Task 2 — Create `MockGoogleAuthDialog` component (AC: 1, 2)**
  - [x] Create `src/components/auth/MockGoogleAuthDialog.tsx`
  - [x] Uses shadcn `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`
  - [x] Props: `open: boolean`, `onOpenChange: (v: boolean) => void`, `onSuccess: (name: string, email: string) => void`
  - [x] Internal state: `mockName` (default: `'Budi Peserta'`), `mockEmail` (default: `'budi.peserta@gmail.com'`), `isLoading`
  - [x] On "Masuk dengan Google" button: call `POST /api/auth/google-mock` with `{ mockName, mockEmail }`, on success call `onSuccess(name, email)` and close
  - [x] On error: show inline error message inside dialog
  - [x] "Batal" button / close X closes dialog without calling onSuccess
  - [x] In the Dialog, add a small disclaimer: `"Mode pengembangan — simulasi Google OAuth"` in `text-xs text-muted-foreground`

- [x] **Task 3 — Update registration form step 0 (AC: 1, 2, 3)**
  - [x] Edit `src/app/register/[eventSlug]/form/_client.tsx`
  - [x] Add state: `ssoFilled: boolean` (default `false`)
  - [x] Add `MockGoogleAuthDialog` — controlled by `showSsoDialog` state
  - [x] Add "Lanjutkan dengan Google" button above the phone field in step 0
  - [x] `onSuccess` callback: `setForm(p => ({ ...p, name, email }))`, `setSsoFilled(true)`
  - [x] When `ssoFilled`, render name + email inputs with `readOnly` + green ✓ Google badge
  - [x] Phone field is never affected by SSO — always editable

- [x] **Task 4 — Update confirm page to create participant account (AC: 4, 5)**
  - [x] Edit `src/app/register/confirm/[token]/_client.tsx`
  - [x] Add `useAuthStore`, `useRouter`, `useState`, `useEffect` imports
  - [x] Add state: `participantAuthDone: boolean`
  - [x] `useEffect` auto-calls `POST /api/auth/google` when `data` resolves; silent fail on error
  - [x] On auth success: `setAccessToken(authData.accessToken, authData.user)`, `setParticipantAuthDone(true)`
  - [x] "Masuk ke Dashboard →" button shown only when `participantAuthDone === true`
  - [x] Updated `ConfirmResult` interface to include `contactId` and `participantEmail`

- [x] **Task 5 — Update `/login` page (AC: 7)**
  - [x] Edit `src/app/login/page.tsx`
  - [x] Add `MockGoogleAuthDialog` controlled by `showSsoDialog` state
  - [x] Add "Masuk sebagai Peserta (Google)" link below `<LoginForm />`
  - [x] `handleParticipantLogin` calls `POST /api/auth/google`, sets authStore; existing `useEffect` redirect fires automatically

- [x] **Task 6 — Update `src/app/app/page.tsx` (AC: 6)**
  - [x] Created `src/components/features/dashboard/ParticipantDashboard.tsx` (placeholder)
  - [x] Added `role === 'participant'` branch → `<ParticipantDashboard />` in `app/app/page.tsx`

- [x] **Task 7 — Update DevToolbar (AC: 9)**
  - [x] Added `participant` to `MOCK_USERS` with `name` and `email`
  - [x] Updated roles array to include `'participant'`

- [x] **Task 8 — Add MSW handlers (AC: 10)**
  - [x] Added `POST /api/auth/google-mock` to `src/mocks/handlers/auth.ts`
  - [x] Added `POST /api/auth/google` to `src/mocks/handlers/auth.ts`
  - [x] Updated `GET /api/registrations/confirm/:token` in `registrations.ts` to include `contactId` + `participantEmail`
  - [x] Also added `participant` to `ROLE_BADGE` in `users/page.tsx` (required by exhaustive Record type)

- [x] **Task 9 — Verify build (AC: 11)**
  - [x] `npm run build` — 0 TypeScript errors, 51 static pages generated successfully

---

## Dev Notes

### `authStore` Type Change

The store is defined at `src/store/authStore.ts`. Change is **additive**:

```typescript
// BEFORE
user: { id: string; role: 'admin' | 'staff' | 'viewer' } | null

// AFTER
user: { id: string; role: 'admin' | 'staff' | 'viewer' | 'participant'; name?: string; email?: string } | null
```

Existing code that does `user.role === 'admin'` etc. still compiles. Code that does exhaustive switch on role without a default will get a TypeScript error — fix by adding a `participant` case or a `default` fallback. Check `AdminShell.tsx` NAV_ITEMS filter specifically.

### `MockGoogleAuthDialog` — Phase 1 Simulation

This dialog simulates the Google OAuth popup experience in development. It should look Google-branded enough to be recognizable but clearly labeled as mock:

```tsx
// src/components/auth/MockGoogleAuthDialog.tsx
'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface MockGoogleAuthDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: (name: string, email: string) => void
}

export function MockGoogleAuthDialog({ open, onOpenChange, onSuccess }: MockGoogleAuthDialogProps) {
  const [mockName, setMockName] = useState('Budi Peserta')
  const [mockEmail, setMockEmail] = useState('budi.peserta@gmail.com')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/google-mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mockName, mockEmail }),
      })
      if (!res.ok) throw new Error('Gagal')
      const { name, email } = await res.json()
      onSuccess(name, email)
      onOpenChange(false)
    } catch {
      setError('Gagal menghubungi server mock')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Masuk dengan Google
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-xs text-muted-foreground bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
            Mode pengembangan — simulasi Google OAuth
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="mock-name">Nama</Label>
            <Input id="mock-name" value={mockName} onChange={(e) => setMockName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mock-email">Email Google</Label>
            <Input id="mock-email" type="email" value={mockEmail} onChange={(e) => setMockEmail(e.target.value)} />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Batal</Button>
          <Button onClick={handleSubmit} disabled={isLoading || !mockName || !mockEmail}>
            {isLoading ? 'Memproses...' : 'Masuk dengan Google'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### MSW Handlers to Add (`src/mocks/handlers/auth.ts`)

```typescript
// Add to authHandlers array:

http.post('/api/auth/google-mock', async ({ request }) => {
  await delay(300)
  const body = await request.json() as { mockName?: string; mockEmail?: string }
  return HttpResponse.json({
    name: body.mockName ?? 'Budi Peserta',
    email: body.mockEmail ?? 'budi.peserta@gmail.com',
  })
}),

http.post('/api/auth/google', async ({ request }) => {
  await delay(400)
  const body = await request.json() as { contactId?: string; participantEmail?: string; participantName?: string }
  return HttpResponse.json({
    accessToken: 'mock-token-participant',
    user: {
      id: body.contactId ?? 'contact-001',
      role: 'participant' as const,
      name: body.participantName ?? 'Budi Santoso',
      email: body.participantEmail ?? 'budi.santoso@email.com',
    },
  })
}),
```

### MSW Confirm Handler Update (`src/mocks/handlers/registrations.ts`)

The existing `GET /api/registrations/confirm/:token` success response must include `contactId` and `participantEmail`:

```typescript
// BEFORE
return HttpResponse.json({
  message: 'Registrasi berhasil dikonfirmasi',
  registration: {
    id: faker.string.uuid(),
    status: 'pending',
    eventName: 'Seminar ERP Jakarta',
    eventSlug: 'seminar-erp-jakarta',
    participantName: 'Budi Santoso',
  },
})

// AFTER
return HttpResponse.json({
  message: 'Registrasi berhasil dikonfirmasi',
  registration: {
    id: faker.string.uuid(),
    status: 'pending',
    eventName: 'Seminar ERP Jakarta',
    eventSlug: 'seminar-erp-jakarta',
    participantName: 'Budi Santoso',
    contactId: 'contact-001',            // ← new
    participantEmail: 'budi.santoso@email.com',  // ← new
  },
})
```

Also update the `ConfirmResult` interface in `src/app/register/confirm/[token]/_client.tsx`:
```typescript
interface ConfirmResult {
  message: string
  registration: {
    id: string
    status: string
    eventName: string
    eventSlug: string
    participantName: string
    contactId: string        // ← new
    participantEmail: string // ← new
  }
}
```

### Confirm Page — Auto-Auth Pattern

Use a `useEffect` that runs when `data` first resolves to auto-create the participant session. This avoids making it a user action (they shouldn't have to click "create account"):

```tsx
// In confirm page success branch
const { setAccessToken } = useAuthStore()
const router = useRouter()
const [participantAuthDone, setParticipantAuthDone] = useState(false)

useEffect(() => {
  if (!data?.registration || participantAuthDone) return
  const createAccount = async () => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: data.registration.contactId,
          participantEmail: data.registration.participantEmail,
          participantName: data.registration.participantName,
        }),
      })
      if (!res.ok) return // non-blocking — don't show error
      const authData = await res.json()
      setAccessToken(authData.accessToken, authData.user)
      setParticipantAuthDone(true)
    } catch {
      // Silent fail — participant auth is a UX enhancement, not a blocker
    }
  }
  createAccount()
}, [data, participantAuthDone, setAccessToken])
```

### Registration Form — SSO Pre-fill State

Track whether SSO has filled the fields:

```tsx
const [ssoFilled, setSsoFilled] = useState(false)
const [showSsoDialog, setShowSsoDialog] = useState(false)

// In MockGoogleAuthDialog onSuccess:
const handleSsoSuccess = (name: string, email: string) => {
  setForm((p) => ({ ...p, name, email }))
  setSsoFilled(true)
}
```

When `ssoFilled` is `true`, render name and email with visual lock indicators. Phone field is always editable regardless.

### AdminShell NAV_ITEMS Filter

`src/components/layout/AdminShell.tsx` likely filters nav items by role. After adding `'participant'` to the union, check if there's an exhaustive role check. Participant users get `ParticipantShell` (Story 11.6) — they never render `AdminShell`. But if `AdminShell` has a type guard like:

```typescript
// If this pattern exists, it will now trigger exhaustive check warning:
const role: 'admin' | 'staff' | 'viewer' = user.role // ← type error after adding participant
```

Fix by widening or adding a guard: `if (user.role === 'participant') return null`.

### DevToolbar — Participant Button Width

The toolbar currently renders `['admin', 'staff', 'viewer']`. Adding `'participant'` makes it 4 buttons — they all fit within the existing `flex flex-col gap-1` layout. No layout change needed.

### `app/app/page.tsx` — Participant Routing

The current page already has `router.replace('/login')` as the final fallback for unknown roles. Insert `participant` branch before it:

```tsx
if (user.role === 'admin') return <AdminDashboard />
if (user.role === 'viewer') return <ViewerDashboard />
if (user.role === 'staff') return <StaffDashboard />
if (user.role === 'participant') return <ParticipantDashboard />  // ← add this

router.replace('/login')
return null
```

### Login Page — Participant SSO Link

The login page at `src/app/login/page.tsx` is `'use client'`. Add state for the dialog and the participant auth mutation:

```tsx
const [showSsoDialog, setShowSsoDialog] = useState(false)

// Handler after SSO mock resolves:
const handleParticipantLogin = async (name: string, email: string) => {
  const res = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participantEmail: email, participantName: name }),
  })
  if (!res.ok) { toast.error('Login gagal'); return }
  const data = await res.json()
  setAccessToken(data.accessToken, data.user)
  // router.replace('/app') will trigger from the useEffect already in the page
}
```

The existing `useEffect(() => { if (accessToken) router.replace('/app') }, [accessToken, router])` in the login page will automatically redirect once `setAccessToken` is called — no additional navigation needed.

### File Change Summary

**New files:**
- `src/components/auth/MockGoogleAuthDialog.tsx`
- `src/components/features/dashboard/ParticipantDashboard.tsx` (placeholder only — full impl in Story 11.6)

**Modified files:**
- `src/store/authStore.ts` — role union + name/email fields
- `src/app/register/[eventSlug]/form/_client.tsx` — SSO button + dialog + ssoFilled state
- `src/app/register/confirm/[token]/_client.tsx` — auto participant account creation + "Masuk ke Dashboard" button
- `src/app/login/page.tsx` — "Masuk sebagai Peserta" link + dialog
- `src/app/app/page.tsx` — participant role branch
- `src/components/dev/DevToolbar.tsx` — participant mock user
- `src/mocks/handlers/auth.ts` — two new handlers
- `src/mocks/handlers/registrations.ts` — confirm handler adds contactId + participantEmail

### References

- Sprint Change Proposal: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-25.md`
- `src/store/authStore.ts` — current store shape (no `participant`, no `name`/`email`)
- `src/mocks/handlers/auth.ts` — existing auth handlers pattern
- `src/mocks/handlers/registrations.ts` — confirm handler at line ~183
- `src/app/register/[eventSlug]/form/_client.tsx` — full registration form (step 0 contact info)
- `src/app/register/confirm/[token]/_client.tsx` — confirm page (success/error states, social share)
- `src/components/dev/DevToolbar.tsx` — current 3 mock users
- `src/app/app/page.tsx` — current role switch (admin/viewer/staff)
- `src/app/login/page.tsx` — current login page (client component, has redirect effect)
- `src/components/ui/dialog.tsx` — Dialog component available

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- Build fail 1: `ROLE_BADGE` in `users/page.tsx` uses `Record<User['role'], string>` — adding `'participant'` to the User type made the existing record incomplete. Fixed by adding `participant: 'bg-purple-100 text-purple-700'`.

### Completion Notes List
- `authStore` type expanded additively: `'participant'` added to role union; `name?` and `email?` added for dashboard greeting without extra API call
- `src/types/api.ts` User type also updated to include `'participant'` (keeps types in sync)
- `MockGoogleAuthDialog` created at `src/components/auth/` — reusable across registration form and login page
- Registration form: SSO button + divider + locked name/email fields with "✓ Google" badge; phone always editable
- Confirm page: auto-creates participant session via `useEffect` on query resolve; "Masuk ke Dashboard →" shown only after auth succeeds; social share buttons preserved
- Login page: secondary "Masuk sebagai Peserta (Google)" link leverages existing `useEffect` redirect
- `ParticipantDashboard` placeholder created — full impl in Story 11.6
- `app/app/page.tsx` routes `participant` role to `ParticipantDashboard`
- DevToolbar: 4th mock user `participant` with `name` and `email` fields
- Two new MSW handlers: `POST /api/auth/google-mock` (pre-fill data only) + `POST /api/auth/google` (session creation)
- Confirm MSW handler updated: `contactId: 'contact-001'` + `participantEmail: 'budi.santoso@email.com'` added to response
- `npm run build` passes: 0 TypeScript errors, 51/51 static pages

### File List

**New files:**
- `src/components/auth/MockGoogleAuthDialog.tsx`
- `src/components/features/dashboard/ParticipantDashboard.tsx` (placeholder)

**Modified files:**
- `src/store/authStore.ts` — role union + name?/email? fields
- `src/types/api.ts` — User.role union updated
- `src/app/register/[eventSlug]/form/_client.tsx` — SSO button, dialog, ssoFilled state
- `src/app/register/confirm/[token]/_client.tsx` — auto participant auth, dashboard button, ConfirmResult type
- `src/app/login/page.tsx` — participant SSO link
- `src/app/app/page.tsx` — participant role branch
- `src/components/dev/DevToolbar.tsx` — participant mock user
- `src/mocks/handlers/auth.ts` — google-mock + google handlers
- `src/mocks/handlers/registrations.ts` — confirm handler updated
- `src/app/app/users/page.tsx` — ROLE_BADGE participant entry
