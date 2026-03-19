# Story 1.5: FE Type Definitions, MSW Foundation & DevToolbar

**Story ID:** 1.5
**Story Key:** 1-5-fe-type-definitions-msw-foundation-devtoolbar
**Epic:** Epic 1 — Foundation, OpenAPI Contract & Developer Experience
**Phase:** Phase 1 (FE) — blocks all FE feature stories
**Prerequisite:** Story 1.3 (FE scaffold) and Story 1.4 (OpenAPI spec) must be complete
**Status:** review
**Created:** 2026-03-19

---

## Story

As a FE developer,
I want FE-owned TypeScript type definitions from the OpenAPI spec, MSW browser and server worker setup, and the DevToolbar role switcher,
So that the FE team can develop type-safely against a mock API with role switching — no BE required.

---

## Acceptance Criteria

**AC1:** Given `src/types/api.ts` exists,
Then it exports TypeScript interfaces for: `Contact`, `Event`, `Registration`, `User`, `ScanResult`, `YoriMindResult`, `ApiError`, `PaginatedResponse<T>`, and all mutation body types

**AC2:** Given the app runs in `NODE_ENV=development`,
When `src/app/layout.tsx` loads,
Then the MSW service worker starts and the browser console logs `[MSW] Mocking enabled`

**AC3:** Given `vitest.setup.ts` imports `src/mocks/server.ts`,
When any test runs,
Then `server.listen({ onUnhandledRequest: 'warn' })` is active before the test, `server.resetHandlers()` runs after each test, `server.close()` runs after all tests

**AC4:** Given the app renders in `NODE_ENV=development`,
Then `<DevToolbar />` is visible in the bottom-right corner with three role buttons: `admin | staff | viewer`

**AC5:** Given the `staff` button is clicked,
When `useAuthStore().user` is read,
Then it returns `{ id: 'dev-staff', role: 'staff' }` and the staff button is visually active

**AC6:** Given `NODE_ENV=production`,
When `<DevToolbar />` renders,
Then it returns `null` immediately — no toolbar, no DOM output

---

## Tasks / Subtasks

- [x] **Task 1: Create src/types/api.ts with all TypeScript interfaces**
  - [x] Export `Contact` interface
  - [x] Export `Event` interface
  - [x] Export `Registration` interface
  - [x] Export `User` interface
  - [x] Export `ScanResult` interface
  - [x] Export `YoriMindResult` interface
  - [x] Export `ApiError` interface
  - [x] Export `PaginatedResponse<T>` generic interface
  - [x] Export `Industry` and `JobTitle` lookup interfaces
  - [x] Export all mutation body types (LoginBody, CreateEventBody, UpdateRegistrationStatusBody, ScanVerifyBody, CreateRegistrationBody, CreateUserBody)

- [x] **Task 2: Set up MSW browser worker**
  - [x] Create `src/mocks/handlers/index.ts` exporting empty `handlers` array (handlers populated in Story 1.6)
  - [x] Create `src/mocks/browser.ts` with `setupWorker(...handlers)`
  - [x] Run `npx msw init public/ --save` to generate the service worker file in `public/mockServiceWorker.js`

- [x] **Task 3: Set up MSW server (Node/Vitest)**
  - [x] Create `src/mocks/server.ts` with `setupServer(...handlers)`

- [x] **Task 4: Integrate MSW into Next.js root layout (dev only)**
  - [x] Update `src/app/layout.tsx` to conditionally start MSW worker in development
  - [x] Use dynamic import to prevent MSW from bundling in production

- [x] **Task 5: Update vitest.setup.ts with MSW lifecycle hooks**
  - [x] Import `server` from `@/mocks/server`
  - [x] Add `beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))`
  - [x] Add `afterEach(() => server.resetHandlers())`
  - [x] Add `afterAll(() => server.close())`

- [x] **Task 6: Create DevToolbar component**
  - [x] Create `src/components/dev/DevToolbar.tsx`
  - [x] Return `null` immediately if `NODE_ENV !== 'development'`
  - [x] Render fixed bottom-right toolbar with 3 role buttons
  - [x] Use `useAuthStore().setAccessToken` on click with mock user objects
  - [x] Show active role visually (different background/bold)
  - [x] Add `<DevToolbar />` to `src/app/layout.tsx`

- [x] **Task 7: Write vitest tests for types and DevToolbar**
  - [x] `src/types/api.test.ts` — type-only compile test (ensure all interfaces are importable)
  - [x] `src/components/dev/DevToolbar.test.tsx` — renders null in production, renders 3 buttons in dev, clicking staff sets user correctly

---

## Dev Notes

### Working Directory
All files go in `/home/dhs/Workspaces/kada/yorindo/yorindo-app/src/`

### Prerequisite: Story 1.3 scaffold must exist
This story builds on the scaffold from Story 1.3. The `src/store/authStore.ts` already exists.

### Exact TypeScript Interfaces for src/types/api.ts

```typescript
// src/types/api.ts
// FE-owned types — derived from openapi.yaml (Story 1.4). BE adopts these when ready.

export interface Contact {
  id: string
  name: string
  phone: string
  email: string
  industryId: string
  jobTitleId: string
  city: string
  companySize: string
  completenessScore: number  // 0.0–1.0, computed by GPT-4o in ETL
  createdAt: string
  updatedAt: string
}

export interface Event {
  id: string
  name: string
  slug: string
  description: string
  status: 'draft' | 'published' | 'active' | 'completed' | 'cancelled' | 'archived'
  eventDate: string  // ISO 8601 UTC
  timezone: 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura'
  capacity?: number
  targetCriteria?: Record<string, unknown>
  surveySchema?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface Registration {
  id: string
  contactId: string
  eventId: string
  status: 'pending' | 'confirmed' | 'approved' | 'rejected' | 'waitlisted' | 'attended' | 'cancelled'
  ticketToken: string | null
  surveyAnswers: Record<string, unknown>
  attendedAt: string | null
  createdAt: string
}

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'staff' | 'viewer'
  createdAt: string
  updatedAt: string
}

export interface ScanResult {
  status: 'success' | 'already_attended' | 'invalid'
  registration?: {
    id: string
    contactName: string
    eventName: string
  }
  message?: string
}

export interface YoriMindResult {
  analysis: string
  root_causes: string[]
  recommendations: Array<{
    action: string
    impact: string
    priority: 'high' | 'medium' | 'low'
  }>
  summary: string
  tracked_metrics: string[]
}

export interface ApiError {
  error: {
    code: string
    message: string
    details: Array<{ field: string; message: string }>
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface Industry {
  id: string
  slug: string
  name: string
}

export interface JobTitle {
  id: string
  slug: string
  name: string
}

// Mutation body types
export interface LoginBody {
  email: string
  password: string
}

export interface CreateEventBody {
  name: string
  description?: string
  eventDate: string
  timezone: Event['timezone']
  capacity?: number
}

export interface UpdateRegistrationStatusBody {
  status: Registration['status']
}

export interface ScanVerifyBody {
  token: string
}

export interface CreateRegistrationBody {
  eventId: string
  name: string
  email: string
  phone: string
  surveyAnswers?: Record<string, unknown>
}

export interface CreateUserBody {
  email: string
  name: string
  role: User['role']
  password: string
}
```

### MSW browser.ts (exact code)

```typescript
// src/mocks/browser.ts
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)
```

### MSW server.ts (exact code)

```typescript
// src/mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

### MSW handlers/index.ts initial stub

```typescript
// src/mocks/handlers/index.ts
// Handlers populated in Story 1.6
export const handlers: never[] = []
```

### Root layout MSW integration (dev-only)

```typescript
// src/app/layout.tsx addition
// Add BEFORE the component — top-level async initialization
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const { worker } = await import('@/mocks/browser')
  worker.start({ onUnhandledRequest: 'warn' })
}
```

**Alternative (cleaner for Next.js App Router):**
Create `src/components/dev/MSWProvider.tsx` as a client component:

```typescript
// src/components/dev/MSWProvider.tsx
'use client'
import { useEffect, useState } from 'react'

export function MSWProvider({ children }: { children: React.ReactNode }) {
  const [mswReady, setMswReady] = useState(process.env.NODE_ENV !== 'development')

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      import('@/mocks/browser').then(({ worker }) =>
        worker.start({ onUnhandledRequest: 'warn' })
      ).then(() => setMswReady(true))
    }
  }, [])

  if (!mswReady) return null
  return <>{children}</>
}
```

Use `<MSWProvider>` to wrap children in `layout.tsx`. This ensures MSW is ready before any requests fire.

### vitest.setup.ts (exact code after update)

```typescript
// vitest.setup.ts
import '@testing-library/jest-dom'
import { server } from '@/mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

Note: `@testing-library/jest-dom` must be installed for matchers: `npm install -D @testing-library/jest-dom`

### DevToolbar (exact code)

```typescript
// src/components/dev/DevToolbar.tsx
'use client'
import { useAuthStore } from '@/store/authStore'

const MOCK_USERS = {
  admin:  { id: 'dev-admin',  role: 'admin'  as const },
  staff:  { id: 'dev-staff',  role: 'staff'  as const },
  viewer: { id: 'dev-viewer', role: 'viewer' as const },
}

export function DevToolbar() {
  if (process.env.NODE_ENV !== 'development') return null
  const { user, setAccessToken } = useAuthStore()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex gap-2 rounded border border-yellow-400 bg-yellow-100 p-2 text-xs shadow-lg">
      <span className="font-bold text-yellow-800">DEV:</span>
      {(['admin', 'staff', 'viewer'] as const).map((role) => (
        <button
          key={role}
          className={`rounded px-2 py-1 ${
            user?.role === role
              ? 'bg-yellow-400 font-bold text-yellow-900'
              : 'bg-white text-gray-700 hover:bg-yellow-50'
          }`}
          onClick={() => setAccessToken('dev-token', MOCK_USERS[role])}
        >
          {role}
        </button>
      ))}
    </div>
  )
}
```

### MSW Service Worker Generation
Run this command in `yorindo-app/` to copy the SW file into `public/`:
```bash
npx msw init public/ --save
```
This adds `"msw": { "workerDirectory": ["public"] }` to `package.json` and creates `public/mockServiceWorker.js`.

### Key Anti-Patterns to Avoid
- **DO NOT** import MSW in server components — MSW uses browser/Node APIs. Always use client components or dynamic imports.
- **DO NOT** include `@testing-library/jest-dom` in production — it's dev-only.
- **DO NOT** export DevToolbar from a server component — it uses `useAuthStore` (client state).
- **DO NOT** add `'use client'` to `src/types/api.ts` — it's pure TypeScript types, no client directive needed.
- **DO NOT** generate types from the openapi.yaml automatically (e.g. with openapi-typescript) — FE owns and maintains `src/types/api.ts` manually as agreed.

### MSW Version Note
Use MSW 2.x API:
- `setupWorker` from `'msw/browser'` (not `'msw'`)
- `setupServer` from `'msw/node'` (not `'msw/lib/node'`)
- `http.get()`, `http.post()` (not `rest.get()`)
- `HttpResponse.json()` (not `ctx.json()`)

---

## Dev Agent Record

### Implementation Plan
_To be filled by dev agent_

### Debug Log
_To be filled by dev agent_

### Completion Notes
All ACs satisfied:
- AC1: `src/types/api.ts` exports Contact, Event, Registration, User, ScanResult, YoriMindResult, ApiError, PaginatedResponse<T>, Industry, JobTitle, and all mutation bodies
- AC2: MSWProvider in layout.tsx starts worker in dev with `onUnhandledRequest: 'warn'`; console logs `[MSW] Mocking enabled`
- AC3: `vitest.setup.ts` has `server.listen()`, `server.resetHandlers()`, `server.close()` lifecycle hooks
- AC4: DevToolbar renders in bottom-right with admin|staff|viewer buttons (in dev env)
- AC5: Clicking role button calls `setAccessToken('dev-token', { id: 'dev-staff', role: 'staff' })`; active role visually highlighted
- AC6: `DevToolbar` returns `null` immediately when `NODE_ENV !== 'development'`

Implementation notes:
- Added `globals: true` and `@vitejs/plugin-react` to `vitest.config.ts` for JSX support and global test APIs
- Added `@testing-library/jest-dom` import to `vitest.setup.ts`
- Created `MSWProvider` client component for dev-only MSW initialization in App Router
- Excluded test files from `tsconfig.json` to prevent Next.js type-checking them
- MSW SW file: `public/mockServiceWorker.js` (generated by `msw init`)

---

## File List

- `yorindo-app/src/types/api.ts` (updated — full type definitions)
- `yorindo-app/src/mocks/handlers/index.ts` (updated — empty handlers stub)
- `yorindo-app/src/mocks/browser.ts` (updated — setupWorker)
- `yorindo-app/src/mocks/server.ts` (updated — setupServer)
- `yorindo-app/src/components/dev/MSWProvider.tsx` (new)
- `yorindo-app/src/components/dev/DevToolbar.tsx` (new)
- `yorindo-app/src/app/layout.tsx` (updated — MSWProvider + DevToolbar)
- `yorindo-app/vitest.setup.ts` (updated — MSW lifecycle hooks)
- `yorindo-app/vitest.config.ts` (updated — globals, react plugin)
- `yorindo-app/tsconfig.json` (updated — exclude test files)
- `yorindo-app/package.json` (updated — msw.workerDirectory)
- `yorindo-app/public/mockServiceWorker.js` (new — generated by msw init)
- `yorindo-app/src/types/api.test.ts` (new — 9 type tests)
- `yorindo-app/src/components/dev/DevToolbar.test.tsx` (new — 4 tests)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-19 | Story created | bmad-create-story |
| 2026-03-19 | All tasks implemented — 13/13 tests pass, build succeeds | bmad-dev-story |
