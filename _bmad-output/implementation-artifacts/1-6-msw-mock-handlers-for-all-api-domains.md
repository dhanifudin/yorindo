# Story 1.6: MSW Mock Handlers for All API Domains

**Story ID:** 1.6
**Story Key:** 1-6-msw-mock-handlers-for-all-api-domains
**Epic:** Epic 1 — Foundation, OpenAPI Contract & Developer Experience
**Phase:** Phase 1 (FE) — completes the mocking foundation; all feature FE stories can begin in parallel after this
**Prerequisite:** Stories 1.3, 1.4, 1.5 must be complete
**Status:** review
**Created:** 2026-03-19

---

## Story

As a FE developer,
I want complete MSW handlers for all API domains with `@faker-js/faker` seed data,
So that every FE feature epic can be developed independently with realistic, paginated, and filterable mock responses.

---

## Acceptance Criteria

**AC1:** Given `contacts.ts` handler is active,
When `GET /api/contacts?page=1&pageSize=20` is intercepted,
Then it returns 20 contacts from a seeded pool of 247, with correct `pagination` object and 400ms simulated delay

**AC2:** Given `contacts.ts` handler and a `?industry=kesehatan` filter param,
When the request is intercepted,
Then only contacts matching that industry slug are returned

**AC3:** Given `events.ts` handler is active,
When `GET /api/events` is intercepted,
Then events in all status variants are returned (at least one each: draft, published, active, completed, cancelled); mutations (POST/PATCH) return updated state with 600ms delay

**AC4:** Given `registrations.ts` handler is active,
When `PATCH /api/registrations/:id/status` with `{ status: 'approved' }` is intercepted,
Then it returns the updated registration with `status: 'approved'` and 600ms delay

**AC5:** Given `scan.ts` handler is active,
When `POST /api/scan/verify` is intercepted with token `MOCK_INVALID`,
Then it returns HTTP 401; with `MOCK_ALREADY` returns `{ alreadyAttended: true }`; any other token returns success with seeded attendee profile

**AC6:** Given `yorimind.ts` handler is active,
When `GET /api/events/:id/yorimind` is intercepted,
Then it returns the full YoriMind output shape with realistic Indonesian-language content and 1200ms delay

**AC7:** Given an unhandled request occurs in development,
Then MSW logs a console warning (`onUnhandledRequest: 'warn'`) — does not throw

**AC8:** Given the OpenAPI spec (Story 1.4) is approved,
When all handlers are written,
Then every handler's request/response shape conforms exactly to the approved `openapi.yaml` — any deviation from spec is a story defect, not a product decision

---

## Tasks / Subtasks

- [x] **Task 1: Create contacts handler with seeded pool of 247**
  - [x] Create `src/mocks/handlers/contacts.ts`
  - [x] Generate 247 seeded contacts using `@faker-js/faker` with `faker.seed(42)` for determinism
  - [x] Support query params: `page`, `pageSize`, `industry`, `city`, `companySize`
  - [x] Implement server-side pagination returning correct `{ data, pagination }` shape
  - [x] Add 400ms delay using `await delay(400)`
  - [x] Use Indonesian-style data: phone prefix `+62`, Indonesian cities, realistic names

- [x] **Task 2: Create events handler with all status variants**
  - [x] Create `src/mocks/handlers/events.ts`
  - [x] Generate events pool with at least one of each status: `draft`, `published`, `active`, `completed`, `cancelled`
  - [x] `GET /api/events` — paginated list with status filter support
  - [x] `POST /api/events` — create new event (return it with generated id/slug), 600ms delay
  - [x] `GET /api/events/:id` — return single event by id, 404 if not found
  - [x] `PATCH /api/events/:id` — update event in memory store, return updated, 600ms delay
  - [x] Use in-memory mutable store so mutations persist within a session

- [x] **Task 3: Create registrations handler with full approval flow**
  - [x] Create `src/mocks/handlers/registrations.ts`
  - [x] `GET /api/registrations` — paginated, filterable by status and eventId
  - [x] `POST /api/registrations` — create registration with status `pending` (public endpoint)
  - [x] `GET /api/registrations/:id` — single registration lookup
  - [x] `PATCH /api/registrations/:id/status` — update status; if `approved` → generate `ticketToken`, 600ms delay
  - [x] Include all status variants in seeded data: `pending`, `confirmed`, `approved`, `rejected`, `waitlisted`, `attended`, `cancelled`

- [x] **Task 4: Create auth handler (always-succeeds stubs)**
  - [x] Create `src/mocks/handlers/auth.ts`
  - [x] `POST /api/auth/login` — always returns `{ accessToken: 'mock-token', user: { id: 'mock-user', role: 'admin' } }`, 300ms delay
  - [x] `POST /api/auth/refresh` — always returns fresh accessToken, 200ms delay
  - [x] `POST /api/auth/logout` — always returns 204, 200ms delay

- [x] **Task 5: Create scan handler with MOCK_INVALID and MOCK_ALREADY tokens**
  - [x] Create `src/mocks/handlers/scan.ts`
  - [x] `POST /api/scan/verify`:
    - Token `MOCK_INVALID` → HTTP 401 `{ error: { code: 'INVALID_TICKET', message: 'Invalid or expired ticket', details: [] } }`
    - Token `MOCK_ALREADY` → HTTP 200 `{ status: 'already_attended', message: 'Registration already marked as attended' }`
    - Any other token → HTTP 200 `{ status: 'success', registration: { id, contactName, eventName } }` with Faker data
  - [x] Add 200ms delay

- [x] **Task 6: Create yorimind handler with realistic Indonesian content**
  - [x] Create `src/mocks/handlers/yorimind.ts`
  - [x] `GET /api/events/:id/yorimind` — returns full YoriMindResult shape, 1200ms delay
  - [x] Use realistic Indonesian-language analysis content
  - [x] Include at least 2 root_causes, 3 recommendations, 5 tracked_metrics

- [x] **Task 7: Update handlers/index.ts to export all handlers**
  - [x] Import and spread all handler arrays in `src/mocks/handlers/index.ts`
  - [x] Export `handlers` combining all 6 domain handlers

- [x] **Task 8: Write vitest tests for key handler behaviors**
  - [x] Test contacts pagination (page 1 returns 20, correct totalPages for 247)
  - [x] Test contacts filtering by industry
  - [x] Test registrations PATCH status → approved sets ticketToken
  - [x] Test scan MOCK_INVALID → 401
  - [x] Test scan MOCK_ALREADY → already_attended response

---

## Dev Notes

### Working Directory
All files go in `/home/dhs/Workspaces/kada/yorindo/yorindo-app/src/mocks/handlers/`

### MSW 2.x API (CRITICAL — DO NOT use deprecated v1 API)

```typescript
import { http, HttpResponse, delay } from 'msw'
// Use http.get(), http.post(), http.patch() — not rest.get()
// Use HttpResponse.json() — not ctx.json()
// Use delay() from 'msw' — not ctx.delay()
```

### Contacts Handler Pattern

```typescript
// src/mocks/handlers/contacts.ts
import { http, HttpResponse, delay } from 'msw'
import { faker } from '@faker-js/faker'
import type { Contact, PaginatedResponse } from '@/types/api'

faker.seed(42)

const INDONESIAN_CITIES = ['Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang', 'Makassar', 'Yogyakarta', 'Palembang', 'Tangerang', 'Depok']
const INDUSTRIES = ['teknologi', 'kesehatan', 'manufaktur', 'keuangan', 'pendidikan', 'retail', 'properti', 'otomotif', 'energi', 'telekomunikasi']
const COMPANY_SIZES = ['micro', 'small', 'medium', 'large', 'enterprise']

const contactsPool: Contact[] = Array.from({ length: 247 }, (_, i) => ({
  id: faker.string.uuid(),
  name: faker.person.fullName(),
  phone: `+62${faker.string.numeric(10)}`,
  email: faker.internet.email(),
  industryId: INDUSTRIES[Math.floor(Math.random() * INDUSTRIES.length)],
  jobTitleId: faker.helpers.arrayElement(['direktur', 'manager', 'staff', 'supervisor']),
  city: INDONESIAN_CITIES[Math.floor(Math.random() * INDONESIAN_CITIES.length)],
  companySize: COMPANY_SIZES[Math.floor(Math.random() * COMPANY_SIZES.length)],
  completenessScore: parseFloat((Math.random() * 0.5 + 0.5).toFixed(2)),
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
}))

export const contactHandlers = [
  http.get('/api/contacts', async ({ request }) => {
    await delay(400)
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') ?? '1')
    const pageSize = parseInt(url.searchParams.get('pageSize') ?? '20')
    const industry = url.searchParams.get('industry') ?? ''
    const city = url.searchParams.get('city') ?? ''
    const companySize = url.searchParams.get('companySize') ?? ''

    let filtered = contactsPool
    if (industry) filtered = filtered.filter(c => c.industryId === industry)
    if (city) filtered = filtered.filter(c => c.city.toLowerCase() === city.toLowerCase())
    if (companySize) filtered = filtered.filter(c => c.companySize === companySize)

    const total = filtered.length
    const start = (page - 1) * pageSize
    const data = filtered.slice(start, start + pageSize)

    const response: PaginatedResponse<Contact> = {
      data,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    }
    return HttpResponse.json(response)
  }),
]
```

### Events Handler — In-Memory Mutable Store Pattern

```typescript
// src/mocks/handlers/events.ts
import { http, HttpResponse, delay } from 'msw'
import { faker } from '@faker-js/faker'
import type { Event } from '@/types/api'

// Seeded mutable store — mutations persist within session
let eventsStore: Event[] = [
  { id: faker.string.uuid(), name: 'Seminar ERP Jakarta', slug: 'seminar-erp-jakarta', description: '...', status: 'published', eventDate: '2026-04-15T02:00:00.000Z', timezone: 'Asia/Jakarta', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: faker.string.uuid(), name: 'Workshop AI Surabaya', slug: 'workshop-ai-surabaya', description: '...', status: 'draft', eventDate: '2026-05-01T02:00:00.000Z', timezone: 'Asia/Jakarta', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: faker.string.uuid(), name: 'Forum Kesehatan Digital', slug: 'forum-kesehatan-digital', description: '...', status: 'active', eventDate: '2026-03-20T02:00:00.000Z', timezone: 'Asia/Jakarta', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: faker.string.uuid(), name: 'Konferensi Manufaktur 2025', slug: 'konferensi-manufaktur-2025', description: '...', status: 'completed', eventDate: '2025-11-10T02:00:00.000Z', timezone: 'Asia/Jakarta', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: faker.string.uuid(), name: 'Summit Properti Bali', slug: 'summit-properti-bali', description: '...', status: 'cancelled', eventDate: '2026-02-28T02:00:00.000Z', timezone: 'Asia/Jakarta', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
]

export const eventHandlers = [
  http.get('/api/events', async () => {
    await delay(400)
    return HttpResponse.json({ data: eventsStore, pagination: { page: 1, pageSize: 50, total: eventsStore.length, totalPages: 1 } })
  }),
  http.get('/api/events/:id', async ({ params }) => {
    await delay(300)
    const event = eventsStore.find(e => e.id === params.id)
    if (!event) return HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Event not found', details: [] } }, { status: 404 })
    return HttpResponse.json(event)
  }),
  http.post('/api/events', async ({ request }) => {
    await delay(600)
    const body = await request.json() as Partial<Event>
    const newEvent: Event = { id: faker.string.uuid(), slug: faker.helpers.slugify(body.name ?? 'new-event'), status: 'draft', description: '', timezone: 'Asia/Jakarta', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...body } as Event
    eventsStore.push(newEvent)
    return HttpResponse.json(newEvent, { status: 201 })
  }),
  http.patch('/api/events/:id', async ({ params, request }) => {
    await delay(600)
    const body = await request.json() as Partial<Event>
    const idx = eventsStore.findIndex(e => e.id === params.id)
    if (idx === -1) return HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Event not found', details: [] } }, { status: 404 })
    eventsStore[idx] = { ...eventsStore[idx], ...body, updatedAt: new Date().toISOString() }
    return HttpResponse.json(eventsStore[idx])
  }),
]
```

### YoriMind Handler — Indonesian Language Content

```typescript
// src/mocks/handlers/yorimind.ts
import { http, HttpResponse, delay } from 'msw'
import type { YoriMindResult } from '@/types/api'

export const yorimindHandlers = [
  http.get('/api/events/:id/yorimind', async () => {
    await delay(1200)
    const result: YoriMindResult = {
      analysis: 'Event menunjukkan tingkat minat awal yang kuat dengan 85% tingkat pendaftaran. Namun, tingkat konversi menurun pada pertengahan minggu kedua, kemungkinan karena persaingan dengan acara sejenis di Surabaya.',
      root_causes: [
        'Pengumuman acara pesaing yang bertepatan dengan periode pendaftaran',
        'Masalah pengiriman email pada hari ke-3 kampanye blast',
      ],
      recommendations: [
        { action: 'Tingkatkan frekuensi follow-up email pada H-7 dan H-3', impact: 'Estimasi peningkatan konversi 15-20%', priority: 'high' },
        { action: 'Tambahkan segmentasi peserta berdasarkan industri untuk personalisasi konten', impact: 'Estimasi peningkatan engagement 25%', priority: 'high' },
        { action: 'Pertimbangkan early-bird pricing untuk batch berikutnya', impact: 'Estimasi percepatan pendaftaran 30%', priority: 'medium' },
      ],
      summary: 'Performa keseluruhan: Baik (78/100). Peluang utama: optimalkan timing email dan personalisasi segmentasi industri.',
      tracked_metrics: ['conversion_rate', 'attendee_retention', 'industry_mix', 'email_open_rate', 'registration_velocity'],
    }
    return HttpResponse.json(result)
  }),
]
```

### Scan Handler — Exact Token Behavior

```typescript
// src/mocks/handlers/scan.ts
import { http, HttpResponse, delay } from 'msw'
import { faker } from '@faker-js/faker'

export const scanHandlers = [
  http.post('/api/scan/verify', async ({ request }) => {
    await delay(200)
    const body = await request.json() as { token: string }

    if (body.token === 'MOCK_INVALID') {
      return HttpResponse.json(
        { error: { code: 'INVALID_TICKET', message: 'Invalid or expired ticket', details: [] } },
        { status: 401 }
      )
    }

    if (body.token === 'MOCK_ALREADY') {
      return HttpResponse.json({
        status: 'already_attended',
        message: 'Peserta sudah melakukan check-in sebelumnya',
      })
    }

    return HttpResponse.json({
      status: 'success',
      registration: {
        id: faker.string.uuid(),
        contactName: faker.person.fullName(),
        eventName: 'Seminar ERP Jakarta',
      },
    })
  }),
]
```

### handlers/index.ts Final Export

```typescript
// src/mocks/handlers/index.ts
import { contactHandlers } from './contacts'
import { eventHandlers } from './events'
import { registrationHandlers } from './registrations'
import { authHandlers } from './auth'
import { scanHandlers } from './scan'
import { yorimindHandlers } from './yorimind'

export const handlers = [
  ...contactHandlers,
  ...eventHandlers,
  ...registrationHandlers,
  ...authHandlers,
  ...scanHandlers,
  ...yorimindHandlers,
]
```

### Auth Handler (always-succeeds stubs)

```typescript
// src/mocks/handlers/auth.ts
import { http, HttpResponse, delay } from 'msw'

export const authHandlers = [
  http.post('/api/auth/login', async () => {
    await delay(300)
    return HttpResponse.json({ accessToken: 'mock-access-token', user: { id: 'mock-user', role: 'admin' } })
  }),
  http.post('/api/auth/refresh', async () => {
    await delay(200)
    return HttpResponse.json({ accessToken: 'mock-access-token-refreshed', user: { id: 'mock-user', role: 'admin' } })
  }),
  http.post('/api/auth/logout', async () => {
    await delay(200)
    return new HttpResponse(null, { status: 204 })
  }),
]
```

### Delay Values (per spec)
| Handler | Delay |
|---------|-------|
| contacts GET | 400ms |
| events GET/GET:id | 400ms / 300ms |
| events POST/PATCH | 600ms |
| registrations PATCH | 600ms |
| auth login | 300ms |
| auth refresh/logout | 200ms |
| scan verify | 200ms |
| yorimind GET | 1200ms |

### Key Anti-Patterns to Avoid
- **DO NOT** use `rest.get()` from MSW v1 — use `http.get()` from MSW 2.x
- **DO NOT** use `ctx.json()` — use `HttpResponse.json()`
- **DO NOT** hard-code 20 contacts — use the seeded pool with slicing for correct pagination
- **DO NOT** make filtering case-sensitive in ways that break the spec — normalize to lowercase
- **DO NOT** forget `faker.seed(42)` on the contacts pool — deterministic data prevents flaky tests
- **DO NOT** use `Math.random()` for IDs — use `faker.string.uuid()`
- **DO NOT** create handlers with different URL patterns than the openapi.yaml spec — AC8 requires conformance

### Registrations Handler Key Detail
When status is updated to `'approved'`, generate a `ticketToken`:
```typescript
if (body.status === 'approved') {
  updatedReg.ticketToken = `ticket-${faker.string.alphanumeric(20)}`
}
```

### Testing Note
Vitest tests should use the `server` from `src/mocks/server.ts` (already configured in vitest.setup.ts from Story 1.5). Use `server.use()` to override specific handlers per test for error scenarios.

---

## Dev Agent Record

### Implementation Plan
_To be filled by dev agent_

### Debug Log
_To be filled by dev agent_

### Completion Notes
All ACs satisfied:
- AC1: `GET /api/contacts?page=1&pageSize=20` returns 20 contacts from 247-item pool with correct pagination object and 400ms delay ✅
- AC2: `?industry=teknologi` filter tested — only matching contacts returned ✅
- AC3: Events store has all 5 status variants (draft, published, active, completed, cancelled); mutations return updated state with 600ms delay ✅
- AC4: `PATCH /api/registrations/:id/status` with `{status:'approved'}` returns approved registration with generated ticketToken ✅
- AC5: `MOCK_INVALID` → 401, `MOCK_ALREADY` → already_attended, any other token → success ✅
- AC6: YoriMind handler returns full YoriMindResult with Indonesian content and 1200ms delay ✅
- AC7: MSW configured with `onUnhandledRequest: 'warn'` (in vitest.setup.ts) — does not throw ✅
- AC8: All handler shapes conform to openapi.yaml — ApiError format, PaginatedResponse format, exact status enums ✅

Test results: 23/23 tests pass across 3 test files. Build succeeds.

---

## File List

- `yorindo-app/src/mocks/handlers/index.ts` (updated — exports all 6 handler arrays)
- `yorindo-app/src/mocks/handlers/contacts.ts` (new — 247-item seeded pool, pagination, filtering)
- `yorindo-app/src/mocks/handlers/events.ts` (new — in-memory store, all 5 statuses, CRUD)
- `yorindo-app/src/mocks/handlers/registrations.ts` (new — approval flow, ticketToken generation)
- `yorindo-app/src/mocks/handlers/auth.ts` (new — always-succeeds stubs)
- `yorindo-app/src/mocks/handlers/scan.ts` (new — MOCK_INVALID/MOCK_ALREADY token handling)
- `yorindo-app/src/mocks/handlers/yorimind.ts` (new — Indonesian content, 1200ms delay)
- `yorindo-app/src/mocks/handlers/handlers.test.ts` (new — 10 integration tests)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-19 | Story created | bmad-create-story |
| 2026-03-19 | All handlers implemented — 23/23 tests pass, build succeeds | bmad-dev-story |
