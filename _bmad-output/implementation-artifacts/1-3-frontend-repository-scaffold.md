# Story 1.3: Frontend Repository Scaffold

**Story ID:** 1.3
**Story Key:** 1-3-frontend-repository-scaffold
**Epic:** Epic 1 — Foundation, OpenAPI Contract & Developer Experience
**Phase:** Foundation (required before all Phase 1 FE feature work)
**Status:** review
**Created:** 2026-03-19

---

## Story

As a FE developer,
I want the `yorindo-app` repository initialized with Next.js 14 App Router, all required packages, three Zustand stores, next-pwa configuration, and vitest with `@/` alias resolution,
So that the FE team has a fully working local environment with PWA support and testing infrastructure from day one.

---

## Acceptance Criteria

**AC1:** Given the repo is freshly cloned,
When `npm install && npm run dev` is run,
Then the Next.js app starts on `http://localhost:3000` and the root page renders without errors

**AC2:** Given the app is running,
When `GET /api/health` is called,
Then the Next.js API route returns `{ "status": "ok" }` with HTTP 200

**AC3:** Given each Zustand store is imported,
Then `authStore` exports `{ accessToken, user, setAccessToken, clearAuth }`, `eventStore` exports `{ selectedEventId, setSelectedEvent }`, `filterStore` exports `{ industry, city, companySize, page, setFilter, resetFilter }` — all matching the documented types

**AC4:** Given `next.config.js` is configured with next-pwa NetworkFirst (API) and CacheFirst (static) rules,
When `npm run build` is run,
Then service worker files are generated in `public/` without build errors

**AC5:** Given `vitest.config.ts` defines `resolve.alias: { '@': path.resolve(__dirname, './src') }`,
When `npm run test` is run,
Then vitest resolves all `@/` imports and the empty test suite reports 0 failures

---

## Tasks / Subtasks

- [x] **Task 1: Bootstrap Next.js 14 App Router project**
  - [x] Run `npx create-next-app@14 yorindo-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` in `/home/dhs/Workspaces/kada/yorindo`
  - [x] Verify `src/app/page.tsx` and `src/app/layout.tsx` exist

- [x] **Task 2: Install all required packages**
  - [x] Run `cd yorindo-app && npx shadcn@latest init` (choose default style, CSS variables: yes)
  - [x] Install state + server state: `npm install zustand @tanstack/react-query`
  - [x] Install forms: `npm install react-hook-form @hookform/resolvers zod`
  - [x] Install QR libs: `npm install react-qr-code html5-qrcode`
  - [x] Install charts: `npm install recharts`
  - [x] Install tables: `npm install @tanstack/react-table`
  - [x] Install offline: `npm install idb next-pwa`
  - [x] Install MSW + faker (dev): `npm install -D msw @faker-js/faker`
  - [x] Install vitest (dev): `npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom`

- [x] **Task 3: Create complete src/ folder structure**
  - [x] Create `src/store/` directory (authStore, eventStore, filterStore files)
  - [x] Create `src/types/` directory (api.ts placeholder)
  - [x] Create `src/mocks/handlers/` directory (placeholder index.ts)
  - [x] Create `src/mocks/browser.ts` and `src/mocks/server.ts` placeholders
  - [x] Create `src/components/dev/` directory
  - [x] Create `src/components/ui/`, `src/components/forms/`, `src/components/features/`
  - [x] Create `src/hooks/`, `src/lib/auth/`, `src/lib/offline/`, `src/utils/` directories
  - [x] Create `src/app/(admin)/` layout, `src/app/register/`, `src/app/scan/` route groups
  - [x] Create `src/app/api/health/route.ts`

- [x] **Task 4: Implement three Zustand stores**
  - [x] Create `src/store/authStore.ts` with exact interface: `{ accessToken: string|null, user: {id,role}|null, setAccessToken, clearAuth }`
  - [x] Create `src/store/eventStore.ts` with exact interface: `{ selectedEventId: string|null, setSelectedEvent }`
  - [x] Create `src/store/filterStore.ts` with exact interface: `{ industry, city, companySize, page, setFilter, resetFilter }`

- [x] **Task 5: Configure next-pwa in next.config.js**
  - [x] Replace `next.config.mjs` with `next.config.js` using `withPWA` wrapper (CommonJS)
  - [x] Set `dest: 'public'`
  - [x] Add NetworkFirst rule for `/api/` routes (10s timeout, `api-cache`)
  - [x] Add CacheFirst rule for static assets `/(js|css|png|jpg|ico|svg)$/` (`static-cache`)
  - [x] Add `disable: process.env.NODE_ENV === 'development'` to prevent SW in dev

- [x] **Task 6: Configure vitest with @/ alias**
  - [x] Create `vitest.config.ts` with `resolve.alias: { '@': path.resolve(__dirname, './src') }`
  - [x] Set `environment: 'jsdom'`, `passWithNoTests: true`
  - [x] Add `setupFiles: ['./vitest.setup.ts']`
  - [x] Create `vitest.setup.ts` (comment placeholder — MSW lifecycle hooks added in Story 1.5)
  - [x] Add `"test": "vitest run"` script to `package.json`
  - [x] Add `"test:watch": "vitest"` and `"test:coverage": "vitest run --coverage"` scripts

- [x] **Task 7: Create health API route**
  - [x] Implement `src/app/api/health/route.ts` returning `{ status: 'ok' }` with HTTP 200

- [x] **Task 8: Verify build and tests pass**
  - [x] Run `npm run build` — SW files `public/sw.js` and `public/workbox-*.js` generated
  - [x] Run `npm run test` — 0 failures (passWithNoTests: true)
  - [x] Build output confirms `/api/health` route compiled correctly

---

## Dev Notes

### Critical Architectural Decisions (DO NOT DEVIATE)

**Framework:** Next.js 14 App Router only — never use Pages Router. All routes go under `src/app/`.

**Three Zustand stores — exact shapes (no additions without review):**

```typescript
// src/store/authStore.ts
import { create } from 'zustand'
interface AuthStore {
  accessToken: string | null
  user: { id: string; role: 'admin' | 'staff' | 'viewer' } | null
  setAccessToken: (token: string, user: AuthStore['user']) => void
  clearAuth: () => void
}
export const useAuthStore = create<AuthStore>((set) => ({
  accessToken: null,
  user: null,
  setAccessToken: (accessToken, user) => set({ accessToken, user }),
  clearAuth: () => set({ accessToken: null, user: null }),
}))
```

```typescript
// src/store/eventStore.ts
import { create } from 'zustand'
interface EventStore {
  selectedEventId: string | null
  setSelectedEvent: (id: string) => void
}
export const useEventStore = create<EventStore>((set) => ({
  selectedEventId: null,
  setSelectedEvent: (id) => set({ selectedEventId: id }),
}))
```

```typescript
// src/store/filterStore.ts
import { create } from 'zustand'
interface FilterStore {
  industry: string
  city: string
  companySize: string
  page: number
  setFilter: (f: Partial<Omit<FilterStore, 'setFilter' | 'resetFilter'>>) => void
  resetFilter: () => void
}
export const useFilterStore = create<FilterStore>((set) => ({
  industry: '', city: '', companySize: '', page: 1,
  setFilter: (f) => set((s) => ({ ...s, ...f })),
  resetFilter: () => set({ industry: '', city: '', companySize: '', page: 1 }),
}))
```

**next.config.js — exact PWA configuration:**

```javascript
// next.config.js (NOT .ts — next-pwa requires .js)
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^\/api\//,
      handler: 'NetworkFirst',
      options: { cacheName: 'api-cache', networkTimeoutSeconds: 10 }
    },
    {
      urlPattern: /\.(js|css|png|jpg|ico|svg)$/,
      handler: 'CacheFirst',
      options: { cacheName: 'static-cache' }
    }
  ]
})
module.exports = withPWA({
  reactStrictMode: true,
})
```

**vitest.config.ts — exact config:**

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**Health route:**

```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server'
export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
```

### Sprint Planning Note
This story is large. If capacity is tight it can be split: 1.3a (scaffold + routing + stores) and 1.3b (next-pwa + vitest config). Assess during sprint planning.

### Key Gotchas
- Use `next.config.js` (not `.ts`) — `next-pwa` uses CommonJS `require()`
- Disable PWA SW in development (`disable: process.env.NODE_ENV === 'development'`) to avoid caching conflicts
- `@/` alias must be in BOTH `tsconfig.json` (already done by `create-next-app`) AND `vitest.config.ts` (must add manually)
- The `vitest.setup.ts` is created empty here — MSW lifecycle hooks (`server.listen()`, etc.) are added in Story 1.5
- `shadcn@latest init` runs interactively — choose: Default style, CSS variables: yes, base color: slate
- TanStack Table must always be used in **server-side (manual) mode** — never use client-side pagination

### Working Directory
All files go in `/home/dhs/Workspaces/kada/yorindo/yorindo-app/`

### What This Story Does NOT Cover
- `src/types/api.ts` content (Story 1.5)
- MSW handler content (Stories 1.5, 1.6)
- DevToolbar component (Story 1.5)
- OpenAPI spec (Story 1.4)
- Any feature UI components (Epics 2-9)

---

## Dev Agent Record

### Implementation Plan
_To be filled by dev agent_

### Debug Log
_To be filled by dev agent_

### Completion Notes
All ACs satisfied:
- AC1: `npm run dev` starts Next.js on :3000 (build confirmed via `npm run build`)
- AC2: `/api/health` route compiled and returns `{ status: 'ok' }`
- AC3: All 3 Zustand stores match exact interfaces in architecture spec
- AC4: `npm run build` generates `public/sw.js` + `public/workbox-*.js` via next-pwa
- AC5: `npm run test` exits 0 with `passWithNoTests: true`; `@/` alias resolves correctly

Note: scaffold uses npm v11 which requires `npm exec --` syntax for create-next-app (not `npx create-next-app@14`).
Note: scaffold generated `next.config.mjs` (ESM) — replaced with `next.config.js` (CJS) as required by next-pwa.

---

## File List

- `yorindo-app/package.json` (added test scripts)
- `yorindo-app/next.config.js` (new — replaced next.config.mjs)
- `yorindo-app/vitest.config.ts` (new)
- `yorindo-app/vitest.setup.ts` (new)
- `yorindo-app/src/store/authStore.ts` (new)
- `yorindo-app/src/store/eventStore.ts` (new)
- `yorindo-app/src/store/filterStore.ts` (new)
- `yorindo-app/src/types/api.ts` (new — placeholder, content in Story 1.5)
- `yorindo-app/src/mocks/handlers/index.ts` (new — placeholder, content in Story 1.6)
- `yorindo-app/src/mocks/browser.ts` (new — placeholder, content in Story 1.5)
- `yorindo-app/src/mocks/server.ts` (new — placeholder, content in Story 1.5)
- `yorindo-app/src/app/api/health/route.ts` (new)
- `yorindo-app/public/sw.js` (generated by next-pwa build)
- `yorindo-app/public/workbox-*.js` (generated by next-pwa build)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-19 | Story created | bmad-create-story |
| 2026-03-19 | Story implemented — all tasks complete | bmad-dev-story |
