# yorindo-app

Frontend application for **Yorindo — Registration Management & Participant Intelligence Platform**.

Built with Next.js 14 (App Router) + TypeScript. Part of the KADA Program by Yorindo Communication.

---

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **The app runs fully without a backend.** All API calls are intercepted by MSW (Mock Service Worker) in development. See [API Mocking](#api-mocking) below.

---

## Project Structure

```
src/
  app/                    Next.js App Router pages
    (admin)/              Admin dashboard (auth-gated)
    register/[eventSlug]/ Public registration form
    scan/                 Check-in PWA (staff only)
    api/                  Next.js API route handlers
  components/
    ui/                   shadcn/ui base components
    forms/                Form components
    features/             Feature-specific composites
    dev/                  Dev-only tools (DevToolbar)
  store/                  Zustand global state (3 stores)
  hooks/                  Custom React hooks
  lib/
    auth/                 JWT decode, role checks
    offline/              IndexedDB scan queue (idb)
  mocks/                  MSW mock handlers (dev/test only)
    handlers/             One file per API domain
    browser.ts            Browser worker setup
    server.ts             Node setup for Vitest
  types/
    api.ts                API contract type definitions
  utils/                  Pure utility functions
```

---

## API Mocking

**Context:** The backend (`yorindo-api`) is developed by a separate team and may not be available during frontend development. To keep both teams unblocked, this app uses **MSW (Mock Service Worker)** to intercept all API calls in the browser and return realistic fake responses.

### How it works

```
Your component calls fetch('/api/contacts?page=1')
          ↓
MSW Service Worker intercepts (runs in browser, before network)
          ↓
Matches handler in src/mocks/handlers/contacts.ts
          ↓
Returns fake paginated response with realistic data
          ↓
React Query receives it — identical to a real API response
```

No changes to application code. No special flags in components. MSW is **transparent**.

### Enabling / disabling

MSW only starts when `NODE_ENV=development`. It never runs in production.

```bash
# .env.development (MSW active)
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000

# .env.production (MSW disabled — real API used)
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.yorindo.app
```

### Mock handlers

Each file in `src/mocks/handlers/` covers one API domain:

| File | Endpoints covered | Notes |
|---|---|---|
| `contacts.ts` | `GET /api/contacts` | Paginated, filterable by industry/city. 247 fake contacts seeded with Faker. |
| `events.ts` | `GET/POST /api/events`, `GET /api/events/:id` | Full CRUD with status transitions. |
| `registrations.ts` | `GET/POST /api/registrations`, `PATCH /api/registrations/:id/status` | Approval flow — all status states. |
| `auth.ts` | `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout` | Stub — use DevToolbar instead (see below). |
| `scan.ts` | `POST /api/scan/verify` | Three states: success, already-attended, invalid token. |
| `yorimind.ts` | `GET /api/events/:id/yorimind` | Full AI output shape with realistic Indonesian content. |

### Adding a new handler

```typescript
// src/mocks/handlers/your-domain.ts
import { http, HttpResponse, delay } from 'msw'

export const yourHandlers = [
  http.get('/api/your-endpoint', async ({ request }) => {
    await delay(300)                         // always add realistic delay
    return HttpResponse.json({ data: [] })
  }),
]
```

Then register it in `src/mocks/browser.ts`:

```typescript
import { yourHandlers } from './handlers/your-domain'
export const handlers = [...existingHandlers, ...yourHandlers]
```

### Simulating error states

Override a handler inside a specific test or temporarily in `browser.ts`:

```typescript
import { http, HttpResponse } from 'msw'

// In a Vitest test:
server.use(
  http.get('/api/contacts', () =>
    HttpResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Server error', details: [] } },
      { status: 500 }
    )
  )
)
```

### Scan handler test tokens

The scan handler (`/api/scan/verify`) responds differently based on token value:

| Token value | Response |
|---|---|
| `MOCK_INVALID` | 401 — invalid/expired token |
| `MOCK_ALREADY` | 200 — `{ alreadyAttended: true }` |
| anything else | 200 — success with attendee profile |

Use these in manual testing by QR-encoding the string directly.

### Network delay

All handlers include `await delay(Xms)` to simulate realistic latency:

- Contacts list: 400ms
- Single resource: 200ms
- Mutations: 600ms
- YoriMind: 1200ms (AI feels slow — intentional)

This ensures loading states, skeleton loaders, and `isPending` UX are properly exercised during development.

---

## Role Switcher (DevToolbar)

While the backend auth system is being finalized, the app includes a **DevToolbar** component for instant role switching — no login flow required.

A yellow toolbar appears in the bottom-right corner **in development only**:

```
DEV:  [admin]  [staff]  [viewer]
```

Click any role to switch. The active role determines:
- Which routes are accessible (route guards read from `authStore`)
- Which UI elements are visible (admin-only buttons, viewer-only read mode)
- What the API receives as the authenticated user context in MSW handlers

**The DevToolbar does not appear in production.** The `NODE_ENV` check is inside the component itself.

To test the full login flow locally, use the auth MSW handler (`POST /api/auth/login`) with any email/password combination — it always succeeds and returns a fake token.

---

## State Management

Three Zustand stores — do not add more without architectural review:

| Store | File | What it holds |
|---|---|---|
| `authStore` | `store/authStore.ts` | `accessToken`, `user: { id, role }` |
| `eventStore` | `store/eventStore.ts` | `selectedEventId` (shared across admin tabs) |
| `filterStore` | `store/filterStore.ts` | Contacts filter state — persists across navigation |

Server state (API data) is managed by **React Query**, not Zustand. Zustand is for UI state only.

---

## Switching to Real API (When Backend is Ready)

1. Update `.env.production`:
   ```bash
   NEXT_PUBLIC_API_URL=https://api.yorindo.app
   ```

2. Delete `src/mocks/` directory (optional — MSW won't run in production anyway)

3. Verify `src/types/api.ts` matches the actual backend response shapes

No other changes needed. React Query hooks, fetch calls, and component logic are identical between mock and real API.

---

## Offline Scan (PWA)

The `/scan` route is a Progressive Web App designed for check-in staff at events. It works offline via:

- **next-pwa** — NetworkFirst for API calls, CacheFirst for static assets
- **idb** — IndexedDB wrapper storing the scan queue when offline
- **html5-qrcode** — Camera access for QR scanning, cross-browser

When offline:
1. Scan is stored in IndexedDB via `lib/offline/scanQueue.ts`
2. On reconnect, `flushScanQueue()` syncs pending scans to `POST /api/scan/verify`
3. Conflicts (already-attended) are surfaced after sync, not discarded

To install as PWA locally: open `/scan` in Chrome → address bar → Install button.

---

## Testing

```bash
npm run test          # Vitest unit tests
npm run test:coverage # Coverage report
```

MSW runs in Node mode during Vitest via `src/mocks/server.ts`. Handlers are shared between browser and test environments — mocks stay consistent.

```typescript
// vitest.setup.ts — already configured
import { server } from '@/mocks/server'
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())   // isolates each test
afterAll(() => server.close())
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API base URL |
| `NEXT_PUBLIC_ANTHROPIC_API_KEY` | No | Smart Filter AI (claude-haiku) — only if using the `/api/smart-filter` Next.js route |
| `NODE_ENV` | Auto | `development` enables MSW + DevToolbar |

Copy `.env.example` to `.env.local` and fill in values.

---

## Tech Stack

| Concern | Library |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5.x (strict mode) |
| Styling | Tailwind CSS 3.x + shadcn/ui |
| Server state | TanStack Query v5 |
| Data tables | TanStack Table v8 (server-side pagination) |
| Global state | Zustand 4.x |
| Forms | React Hook Form + Zod |
| Charts | Recharts 2.x |
| QR generate | react-qr-code |
| QR scan | html5-qrcode |
| Offline | next-pwa + idb |
| API mocking | MSW + @faker-js/faker (dev only) |
| Testing | Vitest + Testing Library |
