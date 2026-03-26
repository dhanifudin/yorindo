# Story 1.8: Service Adapter Scaffold & In-Memory Repository Scaffold

## Story

**As a** BE developer,
**I want** all repository interfaces, in-memory implementations, service adapter interfaces, and mock service implementations scaffolded,
**So that** all BE feature stories can be implemented in Phase 1 without any dependency on PostgreSQL, Redis, Brevo, Everpro, or external AI APIs.

## Status

review

## Context

This is the Phase 1 BE gate — it must be completed before any BE feature story (Epics 2–9 Phase 1) can begin. It builds directly on Story 1.1's scaffold (directory structure and container.ts skeleton). Story 1.2 provides the PostgreSQL schema that these interfaces must mirror.

The Sprint Change Proposal v2 (concurrent FE+BE mock-first) requires that all BE feature code in Phase 1 uses only in-memory repositories and mock service adapters. This story creates those artifacts. Feature stories import `IContactRepository` from the interface, receive a concrete `InMemoryContactRepository` via `container.ts`, and never know the difference.

The five roles in the system are: `super_admin`, `event_admin`, `staff`, `vendor_client`, `participant`. Interfaces must reflect this. The BullMQ four named queues: `otp` > `emergency-blast` > `transactional` > `marketing`.

## Acceptance Criteria

**AC1:** Given `src/interfaces/repositories/` is inspected,
Then TypeScript interfaces exist for: `IContactRepository`, `IEventRepository`, `IRegistrationRepository`, `IUserRepository`, `ISurveyRepository`, `IFlaggedRecordsRepository`, `ISuppressionRepository` — each with method signatures matching the OpenAPI spec

**AC2:** Given `src/interfaces/services/` is inspected,
Then TypeScript interfaces exist for: `IEmailService`, `IWhatsAppService`, `IEtlNormalizationService`, `IYoriMindService`, `IQueueService`, `IOtpService`

**AC3:** Given `src/repositories/memory/` is inspected,
Then in-memory implementations exist for all seven repository interfaces; each stores data in a local `Map` or array; all CRUD operations function correctly without a database connection

**AC4:** Given `src/services/adapters/mock/` is inspected,
Then mock implementations exist for all six service interfaces; each implementation makes no network calls; returns deterministic fixture data (seeded with `faker.seed(42)` or hardcoded fixtures); records calls for test assertion (e.g., `MockEmailService.getSentEmails()`)

**AC5:** Given `src/container.ts` exists,
When `REPOSITORY_IMPL=memory` (default),
Then all DI bindings resolve to in-memory implementations

**AC6:** Given `src/container.ts` exists,
When `SERVICE_IMPL=mock` (default),
Then all DI bindings resolve to mock service adapters

**AC7:** Given the scaffold is complete,
When `npm test` is run,
Then unit tests for all in-memory repositories pass (CRUD operations verified); unit tests for all mock service adapters pass (call recording verified)

**AC8:** Given any BE feature story in Epics 2–9 is implemented in Phase 1,
Then its route handlers, services, and workers import only the interface types — never concrete repository or adapter class names — and receive implementations via `src/container.ts`

## Dev Notes

### Tech Stack (Authoritative)

- **Language:** TypeScript 5.x strict mode
- **Testing:** Vitest
- **Faker:** `@faker-js/faker` for seeded deterministic data in mock adapters
- **No real DB calls** — all in-memory implementations must work without any running database

### File Locations

```
yorindo-api/src/
  interfaces/
    repositories/
      IContactRepository.ts
      IEventRepository.ts
      IRegistrationRepository.ts
      IUserRepository.ts
      ISurveyRepository.ts
      IFlaggedRecordsRepository.ts
      ISuppressionRepository.ts
    services/
      IEmailService.ts
      IWhatsAppService.ts
      IEtlNormalizationService.ts
      IYoriMindService.ts
      IQueueService.ts
      IOtpService.ts
  repositories/
    memory/
      ContactRepository.ts        ← InMemoryContactRepository
      EventRepository.ts          ← InMemoryEventRepository
      RegistrationRepository.ts   ← InMemoryRegistrationRepository
      UserRepository.ts           ← InMemoryUserRepository
      SurveyRepository.ts         ← InMemorySurveyRepository (JSONB shape — stored in events.survey_schema)
      FlaggedRecordsRepository.ts ← InMemoryFlaggedRecordsRepository
      SuppressionRepository.ts    ← InMemorySuppressionRepository
    postgres/                     ← Empty — Phase 2 only
  services/
    adapters/
      mock/
        EmailService.ts           ← MockEmailService
        WhatsAppService.ts        ← MockWhatsAppService
        EtlNormalizationService.ts← MockEtlNormalizationService
        YoriMindService.ts        ← MockYoriMindService
        QueueService.ts           ← MockQueueService
        OtpService.ts             ← MockOtpService
      real/                       ← Empty — Phase 2 only
  container.ts                    ← Updated to wire all repositories and services
  types/
    domain.ts                     ← Domain entity types (Contact, Event, Registration, etc.)
```

### Architecture Constraints (MUST FOLLOW)

1. **Interface-first** — Feature code imports only from `interfaces/`. Never imports concrete class.
2. **DI via container.ts** — `container.ts` is the ONLY place where interface → concrete mapping happens.
3. **No network calls in mock/in-memory** — Mock services must return hardcoded or faker-seeded data only.
4. **Call recording** — Mock services must record all calls so tests can assert on them (e.g., `getSentEmails()`, `getEnqueuedJobs()`).
5. **Faker seed** — Use `faker.seed(42)` in all in-memory repositories for deterministic test data.
6. **UUID primary keys** — In-memory repos must generate UUIDs using `crypto.randomUUID()`.

### Repository Interface Pattern

```typescript
// src/interfaces/repositories/IContactRepository.ts

export interface PaginationParams {
  page: number
  pageSize: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}

export interface ContactFilters {
  industry?: string
  city?: string
  companySize?: string
  missingEmail?: boolean
}

export interface IContactRepository {
  findAll(params: PaginationParams, filters?: ContactFilters): Promise<{ data: Contact[]; total: number }>
  findById(id: string): Promise<Contact | null>
  findByPhone(phone: string): Promise<Contact | null>
  upsert(data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact>
  update(id: string, data: Partial<Contact>): Promise<Contact | null>
  softDelete(id: string): Promise<void>
  countHealth(): Promise<{ flagged: number; duplicates: number; missingEmail: number }>
  findFacets(): Promise<FacetResult>
}
```

### In-Memory Repository Pattern

```typescript
// src/repositories/memory/ContactRepository.ts
import type { IContactRepository } from '../../interfaces/repositories/IContactRepository.js'
import type { Contact } from '../../types/domain.js'
import { faker } from '@faker-js/faker'

faker.seed(42)

export class InMemoryContactRepository implements IContactRepository {
  private contacts: Map<string, Contact> = new Map()

  constructor() {
    // Seed with deterministic data
    this._seed()
  }

  private _seed() {
    for (let i = 0; i < 50; i++) {
      const contact: Contact = {
        id: crypto.randomUUID(),
        name: faker.person.fullName(),
        phone: `+628${faker.number.int({ min: 10000000, max: 99999999 })}`,
        // ...
      }
      this.contacts.set(contact.id, contact)
    }
  }

  async findAll(params, filters) {
    let data = Array.from(this.contacts.values())
    // apply filters
    if (filters?.city) data = data.filter(c => c.city === filters.city)
    // apply pagination
    const start = (params.page - 1) * params.pageSize
    return { data: data.slice(start, start + params.pageSize), total: data.length }
  }

  async findById(id: string) {
    return this.contacts.get(id) ?? null
  }

  async upsert(data) {
    const existing = Array.from(this.contacts.values()).find(c => c.phone === data.phone)
    if (existing) {
      const updated = { ...existing, ...data, updatedAt: new Date().toISOString() }
      this.contacts.set(existing.id, updated)
      return updated
    }
    const contact = { id: crypto.randomUUID(), ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    this.contacts.set(contact.id, contact)
    return contact
  }
  // ... other methods
}
```

### Service Adapter Interface Pattern

```typescript
// src/interfaces/services/IEmailService.ts
export interface EmailPayload {
  to: string
  subject: string
  body: string
  templateId?: string
  variables?: Record<string, string>
}

export interface IEmailService {
  send(payload: EmailPayload): Promise<{ messageId: string }>
  sendBatch(payloads: EmailPayload[]): Promise<{ sent: number; failed: number }>
}
```

### Mock Service Adapter Pattern

```typescript
// src/services/adapters/mock/EmailService.ts
import type { IEmailService, EmailPayload } from '../../../interfaces/services/IEmailService.js'

export class MockEmailService implements IEmailService {
  private sentEmails: Array<{ payload: EmailPayload; sentAt: string }> = []

  async send(payload: EmailPayload) {
    this.sentEmails.push({ payload, sentAt: new Date().toISOString() })
    return { messageId: `mock-${crypto.randomUUID()}` }
  }

  async sendBatch(payloads: EmailPayload[]) {
    for (const p of payloads) await this.send(p)
    return { sent: payloads.length, failed: 0 }
  }

  // For test assertion
  getSentEmails() { return [...this.sentEmails] }
  reset() { this.sentEmails = [] }
}
```

### Complete Repository Interface Signatures

**IEventRepository:**
```typescript
interface IEventRepository {
  findAll(params: PaginationParams, filters?: EventFilters): Promise<{ data: Event[]; total: number }>
  findById(id: string): Promise<Event | null>
  findBySlug(slug: string): Promise<Event | null>
  create(data: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event>
  update(id: string, data: Partial<Event>): Promise<Event | null>
  softDelete(id: string): Promise<void>
  restore(id: string): Promise<void>
  getOverviewMetrics(eventId: string): Promise<EventOverviewMetrics>
  getUpcomingUncontacted(): Promise<UpcomingUncontactedResult | null>
}
```

**IRegistrationRepository:**
```typescript
interface IRegistrationRepository {
  findByEvent(eventId: string, params: PaginationParams, filters?: RegistrationFilters): Promise<{ data: Registration[]; total: number }>
  findById(id: string): Promise<Registration | null>
  create(data: Omit<Registration, 'id' | 'createdAt'>): Promise<Registration>
  updateStatus(id: string, status: Registration['status']): Promise<Registration | null>
  bulkApprove(ids: string[]): Promise<{ approved: number }>
  getConfirmationStats(eventId: string): Promise<ConfirmationStats>
  getBlastHistory(eventId: string): Promise<BlastHistoryEntry[]>
}
```

**IUserRepository:**
```typescript
interface IUserRepository {
  findAll(params: PaginationParams): Promise<{ data: User[]; total: number }>
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>
  update(id: string, data: Partial<User>): Promise<User | null>
  delete(id: string): Promise<void>
  assignEvent(userId: string, eventId: string, grantedById: string): Promise<void>
  getAssignedEvents(userId: string): Promise<string[]>
}
```

**ISurveyRepository (PostgreSQL JSONB — `events.survey_schema` column):**
```typescript
interface ISurveyRepository {
  findByEventId(eventId: string): Promise<SurveySchema | null>
  upsert(eventId: string, schema: SurveySchema): Promise<SurveySchema>
  saveResponse(registrationId: string, answers: Record<string, unknown>): Promise<void>
  getResponsesByEvent(eventId: string): Promise<SurveyResponse[]>
}
```

**IFlaggedRecordsRepository:**
```typescript
interface IFlaggedRecordsRepository {
  findAll(params: PaginationParams, status?: 'pending' | 'resolved' | 'discarded'): Promise<{ data: FlaggedRecord[]; total: number }>
  findById(id: string): Promise<FlaggedRecord | null>
  create(data: Omit<FlaggedRecord, 'id' | 'createdAt'>): Promise<FlaggedRecord>
  resolve(id: string, resolvedData: Partial<Contact>, resolvedById: string): Promise<void>
  discard(id: string, resolvedById: string): Promise<void>
}
```

**ISuppressionRepository:**
```typescript
interface ISuppressionRepository {
  isSuppressed(phone: string): Promise<boolean>
  suppress(contactId: string, reason: string): Promise<void>
  findAll(params: PaginationParams): Promise<{ data: SuppressionRecord[]; total: number }>
}
```

### IQueueService (wraps BullMQ in real, in-memory in mock)

```typescript
interface IQueueService {
  enqueue(queueName: 'otp' | 'emergency-blast' | 'transactional' | 'marketing', job: object, opts?: { delay?: number; priority?: number }): Promise<string>
  getStatus(jobId: string): Promise<'queued' | 'processing' | 'completed' | 'failed'>
}
```

Mock records enqueued jobs: `getEnqueuedJobs(): Array<{ queueName, job, jobId }>`.

### container.ts (full wiring)

```typescript
// src/container.ts
import type { IContactRepository } from './interfaces/repositories/IContactRepository.js'
import type { IEventRepository } from './interfaces/repositories/IEventRepository.js'
// ... all interface imports

const REPO = process.env.REPOSITORY_IMPL || 'memory'
const SVC = process.env.SERVICE_IMPL || 'mock'

function loadRepo<T>(memoryPath: string, postgresPath: string): T {
  if (REPO === 'memory') {
    const mod = require(memoryPath)
    const ClassName = Object.keys(mod).find(k => k.startsWith('InMemory'))!
    return new mod[ClassName]() as T
  }
  if (REPO === 'postgres') {
    const mod = require(postgresPath)
    const ClassName = Object.keys(mod).find(k => k.startsWith('Postgres'))!
    return new mod[ClassName]() as T
  }
  throw new Error(`Unknown REPOSITORY_IMPL: ${REPO}`)
}

export const contactRepository: IContactRepository = loadRepo(
  './repositories/memory/ContactRepository.js',
  './repositories/postgres/ContactRepository.js'
)
// ... repeat for all repos

export const emailService: IEmailService = /* similar pattern for SVC */
```

### Anti-Patterns (NEVER DO)

- NEVER make real HTTP calls in mock service adapters
- NEVER use real database connections in in-memory repositories
- NEVER import concrete classes in feature code — only import interfaces
- NEVER bypass container.ts to instantiate a repository or service directly in a route handler
- NEVER add business logic to in-memory repositories — they store and retrieve only
- NEVER use `any` types — TypeScript strict mode, all parameters fully typed

### Test Requirements

- Unit test per repository: create, findById, findAll with pagination, update, delete
- Unit test per mock service adapter: call recording, getSentEmails/getEnqueuedJobs
- All tests run without Docker/database (`npm test` — pure in-memory)
- `faker.seed(42)` ensures deterministic test data across all test runs

### Dependencies

- Prerequisite: Story 1.1 (directory structure, package.json, tsconfig.json)
- Prerequisite: Story 1.2 (schema — interfaces must mirror column structure)
- Packages: `@faker-js/faker` (install as devDependency if not already)

## Tasks / Subtasks

- [ ] Task 1: Define domain types in `src/types/domain.ts`
  - [ ] Subtask 1.1: Contact, Event, Registration, User, FlaggedRecord, SurveySchema, SurveyResponse
  - [ ] Subtask 1.2: All status enums and lookup types

- [ ] Task 2: Create all 7 repository interfaces in `src/interfaces/repositories/`
  - [ ] Subtask 2.1: IContactRepository (findAll, findById, findByPhone, upsert, update, softDelete, countHealth, findFacets)
  - [ ] Subtask 2.2: IEventRepository (findAll, findById, findBySlug, create, update, softDelete, restore, getOverviewMetrics, getUpcomingUncontacted)
  - [ ] Subtask 2.3: IRegistrationRepository (findByEvent, findById, create, updateStatus, bulkApprove, getConfirmationStats, getBlastHistory)
  - [ ] Subtask 2.4: IUserRepository (findAll, findById, findByEmail, create, update, delete, assignEvent, getAssignedEvents)
  - [ ] Subtask 2.5: ISurveyRepository (findByEventId, upsert, saveResponse, getResponsesByEvent)
  - [ ] Subtask 2.6: IFlaggedRecordsRepository (findAll, findById, create, resolve, discard)
  - [ ] Subtask 2.7: ISuppressionRepository (isSuppressed, suppress, findAll)

- [ ] Task 3: Create all 6 service interfaces in `src/interfaces/services/`
  - [ ] Subtask 3.1: IEmailService (send, sendBatch)
  - [ ] Subtask 3.2: IWhatsAppService (send, sendBatch)
  - [ ] Subtask 3.3: IEtlNormalizationService (normalizeBatch — accepts raw rows, returns NormalizedRow[])
  - [ ] Subtask 3.4: IYoriMindService (analyze — accepts snapshot JSON, returns YoriMindResult)
  - [ ] Subtask 3.5: IQueueService (enqueue, getStatus)
  - [ ] Subtask 3.6: IOtpService (send, verify — placeholder; unused after KTP decision but interface remains)

- [ ] Task 4: Implement 7 in-memory repositories in `src/repositories/memory/`
  - [ ] Subtask 4.1: InMemoryContactRepository — Map-backed, faker.seed(42) seed data (50 contacts)
  - [ ] Subtask 4.2: InMemoryEventRepository — faker-seeded (5 events, varied statuses)
  - [ ] Subtask 4.3: InMemoryRegistrationRepository — faker-seeded (20 registrations across events)
  - [ ] Subtask 4.4: InMemoryUserRepository — hardcoded (admin + staff from seed.ts)
  - [ ] Subtask 4.5: InMemorySurveyRepository — Map-backed by eventId
  - [ ] Subtask 4.6: InMemoryFlaggedRecordsRepository — faker-seeded (10 pending flagged records)
  - [ ] Subtask 4.7: InMemorySuppressionRepository — empty Map by default

- [ ] Task 5: Implement 6 mock service adapters in `src/services/adapters/mock/`
  - [ ] Subtask 5.1: MockEmailService — records calls, getSentEmails(), reset()
  - [ ] Subtask 5.2: MockWhatsAppService — records calls, getSentMessages(), reset()
  - [ ] Subtask 5.3: MockEtlNormalizationService — returns deterministic normalized rows (confidence >= 0.7 for 80% of rows, < 0.7 for 20%)
  - [ ] Subtask 5.4: MockYoriMindService — returns hardcoded YoriMindResult in Indonesian
  - [ ] Subtask 5.5: MockQueueService — records enqueued jobs, getEnqueuedJobs(), reset()
  - [ ] Subtask 5.6: MockOtpService — records sends, always returns success verify

- [ ] Task 6: Update `src/container.ts` with full wiring
  - [ ] Subtask 6.1: Wire all 7 repositories via REPOSITORY_IMPL env var
  - [ ] Subtask 6.2: Wire all 6 services via SERVICE_IMPL env var
  - [ ] Subtask 6.3: Verify all exports typed to interface, not concrete class

- [ ] Task 7: Write unit tests
  - [ ] Subtask 7.1: Test all in-memory repository CRUD operations
  - [ ] Subtask 7.2: Test all mock service adapter call recording
  - [ ] Subtask 7.3: Run `npm test` — all pass without Docker running

## Dev Agent Record

### Implementation Plan

1. Create `src/types/domain.ts` with all domain entity types mirroring the PostgreSQL schema
2. Create 7 repository interfaces in `src/interfaces/repositories/`
3. Create 6 service interfaces in `src/interfaces/services/`
4. Implement 7 in-memory repositories in `src/repositories/memory/` (faker.seed(42), Map-backed)
5. Implement 6 mock service adapters in `src/services/adapters/mock/` (call recording, no network calls)
6. Rewrite `src/container.ts` with full DI wiring (all 7 repos + 6 services, typed to interface)
7. Write unit tests for all repos and services
8. Install `@faker-js/faker` as devDependency

### Debug Log

- ESM modules don't support `require()` — used direct static imports in container.ts instead of lazy dynamic require pattern shown in spec
- `faker.seed(42)` applied at module level in each in-memory repo for deterministic data

### Completion Notes

- 47 tests pass, 2 skipped (DB integration tests from Story 1.2 that require DATABASE_URL)
- All tests run without any running database or external service
- MockEtlNormalizationService uses djb2 hash for deterministic confidence scores (consistent with Story 4.10 spec)
- container.ts exports all typed to interface, never to concrete class — AC8 satisfied

## File List

- `src/types/domain.ts`
- `src/interfaces/repositories/IContactRepository.ts`
- `src/interfaces/repositories/IEventRepository.ts`
- `src/interfaces/repositories/IRegistrationRepository.ts`
- `src/interfaces/repositories/IUserRepository.ts`
- `src/interfaces/repositories/ISurveyRepository.ts`
- `src/interfaces/repositories/IFlaggedRecordsRepository.ts`
- `src/interfaces/repositories/ISuppressionRepository.ts`
- `src/interfaces/services/IEmailService.ts`
- `src/interfaces/services/IWhatsAppService.ts`
- `src/interfaces/services/IEtlNormalizationService.ts`
- `src/interfaces/services/IYoriMindService.ts`
- `src/interfaces/services/IQueueService.ts`
- `src/interfaces/services/IOtpService.ts`
- `src/repositories/memory/ContactRepository.ts`
- `src/repositories/memory/EventRepository.ts`
- `src/repositories/memory/RegistrationRepository.ts`
- `src/repositories/memory/UserRepository.ts`
- `src/repositories/memory/SurveyRepository.ts`
- `src/repositories/memory/FlaggedRecordsRepository.ts`
- `src/repositories/memory/SuppressionRepository.ts`
- `src/services/adapters/mock/EmailService.ts`
- `src/services/adapters/mock/WhatsAppService.ts`
- `src/services/adapters/mock/EtlNormalizationService.ts`
- `src/services/adapters/mock/YoriMindService.ts`
- `src/services/adapters/mock/QueueService.ts`
- `src/services/adapters/mock/OtpService.ts`
- `src/container.ts` (updated)
- `src/tests/repositories.test.ts`
- `src/tests/services.test.ts`

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-22 | Story created (BE Foundation — Phase 1 gate) | bmad-context-engine |
