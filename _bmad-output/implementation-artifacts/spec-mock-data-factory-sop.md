---
title: 'Mock Data Factory SOP'
slug: 'spec-mock-data-factory-sop'
created: '2026-03-28'
status: 'approved'
scope: 'FE (MSW handlers) + BE (in-memory repositories)'
applies_to: 'All stories that create or modify data model types'
---

# SOP: Mock Data Factory Pattern

**Scope:** `yorindo-app` (FE / MSW) and `yorindo-api` (BE / in-memory repositories)
**Trigger:** Applies whenever a story adds, removes, or renames a field on any domain type.
**Authority:** Approved 2026-03-28 — team decision in party mode session.

---

## Problem This Solves

When requirements change, type definitions in `api.ts` (FE) and `domain.ts` (BE) are updated — but MSW handlers and in-memory repository seeds are often raw inline objects that TypeScript cannot validate. The result:

- Field renames silently produce wrong mock data (e.g. `survey_schema` → `registrationSurveySchema`)
- Removed enum values remain in seeds (e.g. `status: 'waitlisted'` after waitlist removal)
- New required fields are missing from seeds, causing runtime errors only
- Drift is discovered at "why is this chart empty?" time, not at compile time

**This SOP makes drift a compile error, not a runtime surprise.**

---

## Rule 1 — Factory-First (No Raw Inline Objects)

**Never** write raw object literals in handler files or in-memory repository seeds. Always construct mock objects through a typed factory function.

```typescript
// ❌ WRONG — TypeScript cannot validate this
const event = { id: 'event-001', name: 'Test', status: 'draft' }

// ✅ CORRECT — TypeScript enforces the full type
const event = createMockEvent({ id: 'event-001', name: 'Test', status: 'draft' })
```

---

## Rule 2 — Factory Signature Standard

Every factory takes `Partial<T>` and returns a fully-typed `T` with safe defaults:

```typescript
export function createMockX(overrides: Partial<X> = {}): X {
  return {
    // ALL fields — required and optional — with safe defaults
    ...overrides,
  }
}
```

When type `X` gains a new required field → `createMockX` fails to compile until the default is added.
When type `X` removes a field → `createMockX` fails to compile on the stale field.
When a field is renamed → compile error at every callsite in seeds.

---

## Rule 3 — Mandatory Story Task

Any story that adds, removes, or renames a field on a domain type **must** include this explicit task:

```markdown
- [ ] Update mock factory defaults and seed data:
      FE: src/mocks/factories/<domain>Factory.ts + src/mocks/seeds/<domain>.seed.ts
      BE: yorindo-api/src/mocks/factories/<domain>Factory.ts + src/repositories/memory/<Domain>Repository.ts
```

This task is non-optional. It is checked at code review.

---

## Rule 4 — Review Gate

A story **cannot** move from `in-progress` to `review` if its type changes cause compile errors in factory files.

`tsc --noEmit` must pass in both `yorindo-app` and `yorindo-api` before the story is marked for review. Factory files are included in this check.

---

## File Structure

### FE — `yorindo-app`

```
src/mocks/
  factories/                          ← typed factory functions
    eventFactory.ts
    registrationFactory.ts
    contactFactory.ts
    surveyResponseFactory.ts
    userFactory.ts
    vendorFactory.ts
  seeds/                              ← typed seed arrays — imported by handlers AND tests
    events.seed.ts                    ← Event[]
    registrations.seed.ts             ← Registration[]
    contacts.seed.ts                  ← Contact[] (seeded pool of 247)
    users.seed.ts                     ← User[]
    vendors.seed.ts                   ← Vendor[]
    surveyResponses.seed.ts           ← SurveyResponseRecord[]
  handlers/                           ← import from seeds/, never inline objects
    events.ts
    contacts.ts
    registrations.ts
    surveys.ts
    ...
```

### BE — `yorindo-api`

```
src/mocks/
  factories/                          ← typed factory functions (mirrors FE factories)
    eventFactory.ts
    registrationFactory.ts
    contactFactory.ts
    surveyResponseFactory.ts
    userFactory.ts
repositories/
  memory/                             ← import from src/mocks/factories/
    EventRepository.ts
    RegistrationRepository.ts
    ContactRepository.ts
    SurveyRepository.ts
    ...
```

---

## Factory Implementation Reference

### FE Factory — `src/mocks/factories/eventFactory.ts`

```typescript
import type { Event } from '@/types/api'
import { createId } from '@paralleldrive/cuid2'

export function createMockEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: createId(),
    name: 'Mock Event',
    slug: 'mock-event',
    status: 'draft',
    eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    timezone: 'Asia/Jakarta',
    venue: 'Jakarta Convention Center',
    capacity: 100,
    approvalMode: 'manual',
    notificationChannel: 'whatsapp',
    scanFormat: 'qr',
    is_paid: false,
    price: 0,
    payment_method: null,
    registration_closed: false,
    registrationSurveySchema: null,
    postSurveySchema: null,
    postSurveyEnabled: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}
```

### FE Factory — `src/mocks/factories/registrationFactory.ts`

```typescript
import type { Registration } from '@/types/api'
import { createId } from '@paralleldrive/cuid2'

export function createMockRegistration(overrides: Partial<Registration> = {}): Registration {
  return {
    id: createId(),
    eventId: 'event-001',
    contactId: 'contact-001',
    status: 'pending',           // valid values: provisional | pending | approved | rejected
    attendance_status: null,     // valid values: attended | no_show | null
    ticket_token: null,
    submittedAt: new Date().toISOString(),
    ...overrides,
  }
}
```

### FE Seed File — `src/mocks/seeds/events.seed.ts`

```typescript
import type { Event } from '@/types/api'
import { createMockEvent } from '../factories/eventFactory'

export const eventSeeds: Event[] = [
  createMockEvent({ id: 'event-001', name: 'Tech Summit Jakarta 2026', status: 'published', slug: 'tech-summit-jakarta-2026' }),
  createMockEvent({ id: 'event-002', name: 'Health Innovation Forum',  status: 'active',    slug: 'health-innovation-forum' }),
  createMockEvent({ id: 'event-003', name: 'FinTech Workshop Series',  status: 'draft',     slug: 'fintech-workshop-series' }),
  createMockEvent({ id: 'event-004', name: 'Retail Connect 2025',      status: 'completed', slug: 'retail-connect-2025' }),
  createMockEvent({ id: 'event-005', name: 'Manufaktur Webinar',       status: 'cancelled', slug: 'manufaktur-webinar' }),
]
```

### BE Factory — `yorindo-api/src/mocks/factories/eventFactory.ts`

```typescript
import type { Event } from '@/types/domain'

let counter = 0
export function createMockEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: crypto.randomUUID(),
    name: 'Mock Event',
    slug: `mock-event-${++counter}`,
    status: 'draft',
    eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    timezone: 'Asia/Jakarta',
    venue: 'Jakarta Convention Center',
    capacity: 100,
    approvalMode: 'manual',
    notificationChannel: 'whatsapp',
    scanFormat: 'qr',
    isPaid: false,
    price: 0,
    paymentMethod: null,
    registrationClosed: false,
    registrationSurveySchema: null,
    postSurveySchema: null,
    postSurveyEnabled: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}
```

### BE In-Memory Repository — seed from factory

```typescript
// yorindo-api/src/repositories/memory/EventRepository.ts
import type { IEventRepository } from '@/interfaces/repositories/IEventRepository'
import type { Event } from '@/types/domain'
import { createMockEvent } from '@/mocks/factories/eventFactory'

const SEEDS: Event[] = [
  createMockEvent({ id: 'event-001', name: 'Tech Summit Jakarta 2026', status: 'published' }),
  createMockEvent({ id: 'event-002', name: 'Health Innovation Forum',  status: 'active'    }),
  createMockEvent({ id: 'event-003', name: 'FinTech Workshop Series',  status: 'draft'     }),
  createMockEvent({ id: 'event-004', name: 'Retail Connect 2025',      status: 'completed' }),
  createMockEvent({ id: 'event-005', name: 'Manufaktur Webinar',       status: 'cancelled' }),
]

export class InMemoryEventRepository implements IEventRepository {
  private store: Event[] = [...SEEDS]
  // ...methods
}
```

---

## Enum Safety Rule

Status enums are the most dangerous drift vector. **Always** define the enum union in the type first, then reference it in the factory default. Never hardcode a status string anywhere except the factory default.

```typescript
// api.ts / domain.ts — source of truth
type RegistrationStatus = 'provisional' | 'pending' | 'approved' | 'rejected'
type AttendanceStatus = 'attended' | 'no_show' | null

// factory — references the type, not the string
export function createMockRegistration(overrides: Partial<Registration> = {}): Registration {
  return {
    status: 'pending' satisfies RegistrationStatus,   // compile error if 'pending' removed from union
    attendance_status: null satisfies AttendanceStatus,
    ...overrides,
  }
}
```

Using `satisfies` (TypeScript 4.9+) makes the default itself type-checked against the union, not just the overall return type.

---

## Handler Import Pattern

MSW handler files import from seeds, never construct their own data:

```typescript
// src/mocks/handlers/events.ts
import { eventSeeds } from '../seeds/events.seed'

let eventsStore = [...eventSeeds]   // mutable copy for the session

export const eventsHandlers = [
  http.get('/api/events', () => {
    return HttpResponse.json({ events: eventsStore, total: eventsStore.length })
  }),
  // ...
]
```

---

## Seed ID Consistency

FE seed IDs and BE seed IDs **must match** for the same logical entities. Both repos use the same fixed IDs (`event-001` through `event-005`, etc.) so that cross-layer integration tests and E2E tests can reference the same records.

| Entity | ID Range | Count |
|--------|----------|-------|
| events | `event-001` … `event-005` | 5 |
| registrations | `reg-001` … `reg-010` | 10 |
| contacts (named seeds) | `contact-001` … `contact-010` | 10 |
| contacts (faker pool) | generated | 247 |
| users | `user-001` … `user-005` | 5 |
| vendors | `vendor-001` … `vendor-005` | 5 |

---

## When Requirements Change — Checklist

When a story changes a domain type:

```
[ ] 1. Update the type in api.ts (FE) and/or domain.ts (BE)
[ ] 2. Fix compile errors in factory files — add/remove/rename fields and defaults
[ ] 3. Update seed files — verify no seed overrides a now-removed field
[ ] 4. Run tsc --noEmit in both repos — must pass before continuing
[ ] 5. Run vitest — existing tests must still pass
[ ] 6. Update story file with: "Factory and seed files updated for <field change>"
```

---

## Current Migration Needed (2026-03-28)

The following changes from Sprint Change Proposal 2026-03-28 require factory/seed updates in the **next dev cycle**:

| Change | Affected Files |
|--------|----------------|
| `registrations.status` — remove `waitlisted`, `cancelled` | `registrationFactory.ts`, `registrations.seed.ts`, `RegistrationRepository.ts` |
| `registrations.attendance_status` added | `registrationFactory.ts`, `registrations.seed.ts`, `RegistrationRepository.ts` |
| `events.survey_schema` → `registrationSurveySchema` | `eventFactory.ts`, `events.seed.ts`, `EventRepository.ts` |
| `events.is_paid`, `price`, `payment_method` added | `eventFactory.ts`, `events.seed.ts`, `EventRepository.ts` |
| `events.registration_closed` added | `eventFactory.ts`, `events.seed.ts`, `EventRepository.ts` |
| `events.postSurveyEnabled`, `postSurveySchema` added | `eventFactory.ts`, `events.seed.ts`, `EventRepository.ts` |
| New `survey_responses` table | New `surveyResponseFactory.ts`, `surveyResponses.seed.ts`, `InMemorySurveyResponseRepository.ts` |

These must be completed as part of Story 4-4 (survey builder) and Story 1-2 (schema migrations) implementation.

---

## References

- Story 1.6: MSW mock handlers foundation — `1-6-msw-mock-handlers-for-all-api-domains.md`
- Story 1.8: In-memory repository scaffold — `1-8-service-adapter-scaffold-in-memory-repository-scaffold.md`
- Sprint Change Proposal 2026-03-28: schema changes — `sprint-change-proposal-2026-03-28.md`
