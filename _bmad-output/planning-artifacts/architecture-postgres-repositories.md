---
title: 'PostgreSQL Repository Implementation Architecture'
slug: 'architecture-postgres-repositories'
created: '2026-04-02'
status: 'complete'
project_name: 'yorindo'
user_name: 'Dian'
date: '2026-04-02'
parent_document: '_bmad-output/planning-artifacts/architecture.md'
---

# PostgreSQL Repository Implementation Architecture

> **Purpose:** Define the implementation strategy for all 13 PostgreSQL repository implementations in `yorindo-api/src/repositories/postgres/`. This document supplements the parent Architecture Decision Document (section: Repository Pattern Expanded).
>
> **Scope:** Raw SQL via `pg.Pool` — no ORM. All repositories implement their existing interfaces in `src/interfaces/repositories/`.

---

## 1. Shared Infrastructure

### 1.1 Base Repository Class

All PostgreSQL repositories extend a shared `BasePostgresRepository` that provides common utilities:

```typescript
// src/repositories/postgres/BasePostgresRepository.ts
import { Pool, QueryResult, QueryResultRow } from 'pg'
import { createId } from '@paralleldrive/cuid2'

export abstract class BasePostgresRepository {
  protected constructor(protected readonly pool: Pool) {}

  /** Generate CUID2-format IDs for all entities */
  protected generateId(): string {
    return createId()
  }

  /** Execute a query and return rows */
  protected async query<T extends QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params)
  }

  /** Execute a query within a transaction context */
  protected async queryTx<T extends QueryResultRow>(
    client: PoolClient,
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    return client.query<T>(text, params)
  }

  /** Map a pg row to a domain type — must be implemented by each repository */
  protected abstract mapRow(row: QueryResultRow): unknown

  /** Handle PostgreSQL error codes */
  protected handlePgError(err: unknown): Error {
    if (typeof err === 'object' && err !== null && 'code' in err) {
      const pgErr = err as { code: string; constraint?: string; detail?: string }
      switch (pgErr.code) {
        case '23505': // unique_violation
          return new UniqueViolationError(pgErr.constraint ?? 'unknown', pgErr.detail)
        case '23503': // foreign_key_violation
          return new ForeignKeyViolationError(pgErr.constraint ?? 'unknown')
        case '23502': // not_null_violation
          return new NotNullViolationError(pgErr.detail ?? 'not null constraint')
        case '42703': // undefined_column
          return new Error(`Database schema error: ${pgErr.detail}`)
        default:
          return new Error(`Database error: ${pgErr.code}`)
      }
    }
    return err instanceof Error ? err : new Error(String(err))
  }
}

// Domain-specific error types
export class UniqueViolationError extends Error {
  constructor(public constraint: string, detail?: string) {
    super(`Unique constraint violation: ${constraint}`)
    this.name = 'UniqueViolationError'
  }
}

export class ForeignKeyViolationError extends Error {
  constructor(public constraint: string) {
    super(`Foreign key constraint violation: ${constraint}`)
    this.name = 'ForeignKeyViolationError'
  }
}

export class NotNullViolationError extends Error {
  constructor(detail: string) {
    super(`Not null constraint violation: ${detail}`)
    this.name = 'NotNullViolationError'
  }
}
```

### 1.2 Pagination Strategy

**Decision: OFFSET/LIMIT with COUNT(*)** — cursor-based pagination is overkill for admin dashboards with <500K rows. All paginated repositories use the same pattern:

```typescript
// Standard pagination query pattern (used by all repos with findAll)
const COUNT_QUERY = 'SELECT COUNT(*) as total FROM contacts WHERE ...'
const DATA_QUERY  = 'SELECT * FROM contacts WHERE ... ORDER BY $1 $2 LIMIT $3 OFFSET $4'

// Implementation pattern:
async findAll(params: PaginationParams, filters?: ContactFilters) {
  const { page, pageSize, sortBy = 'created_at', sortDir = 'desc' } = params
  const offset = (page - 1) * pageSize

  // Build WHERE clause dynamically from filters
  const { where, values } = this.buildWhereClause(filters)

  // Run count and data queries in parallel (separate connections from pool)
  const [countResult, dataResult] = await Promise.all([
    this.query<{ total: string }>(
      `SELECT COUNT(*) as total FROM contacts WHERE ${where}`,
      values
    ),
    this.query<ContactRow>(
      `SELECT * FROM contacts WHERE ${where} ORDER BY ${sortBy} ${sortDir} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, pageSize, offset]
    ),
  ])

  return {
    data: dataResult.rows.map(row => this.mapRow(row)),
    total: parseInt(countResult.rows[0].total, 10),
  }
}
```

**Why parallel queries:** `COUNT(*)` and data queries use separate pool connections — no transaction needed. This is faster than sequential and safe because the count is an approximation anyway (rows may change between the two queries).

### 1.3 Type Safety Approach

**Decision: Manual row mapping with Zod validation on write paths only.**

- **Read paths (SELECT):** Manual `mapRow()` functions cast `pg.ResultRow` to domain types. This is fast and avoids runtime validation overhead on every row.
- **Write paths (INSERT/UPDATE):** Zod schemas validate input before SQL execution. This catches type errors at the boundary before they hit the database.

```typescript
// Example: ContactRepository mapRow
protected mapRow(row: QueryResultRow): Contact {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    industryId: row.industry_id,
    jobTitleId: row.job_title_id,
    city: row.city,
    company: row.company,
    companySize: row.company_size,
    source: row.source,
    completenessScore: Number(row.completeness_score),
    consentStatus: row.consent_status,
    flagCategory: row.flag_category,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
```

**Column naming convention:** Database uses `snake_case`, domain types use `camelCase`. The `mapRow()` function is the translation layer.

---

## 2. Repository Implementation Details

### 2.1 ContactRepository (Most Complex — 16 methods)

**Tables:** `contacts`, `industries`, `job_titles` (joins for facets)

| Method | SQL Pattern | Transaction | Notes |
|--------|------------|-------------|-------|
| `findAll` | `SELECT + COUNT` with dynamic WHERE | No | Parallel queries, OFFSET/LIMIT |
| `findById` | `SELECT * WHERE id = $1 AND deleted_at IS NULL` | No | Soft-delete filter |
| `findByPhone` | `SELECT * WHERE phone = $1 AND deleted_at IS NULL` | No | Phone must be normalized (E.164) before query |
| `findDuplicates` | `SELECT phone, COUNT(*), array_agg(id) FROM contacts GROUP BY phone HAVING COUNT(*) > 1` | No | Pagination on result set |
| `dismissDuplicate` | `UPDATE contacts SET flag_category = NULL WHERE id = $1` | No | Clears flag |
| `mergeDuplicate` | Multi-step: read both, merge fields, update primary, soft-delete duplicate | **Yes** | Service-level merge logic, repo provides transaction wrapper |
| `upsert` | `INSERT ... ON CONFLICT (phone) DO UPDATE SET ... RETURNING *` | No | Conflict on normalized phone |
| `update` | `UPDATE contacts SET ... WHERE id = $1 RETURNING *` | No | Partial update |
| `softDelete` | `UPDATE contacts SET deleted_at = NOW() WHERE id = $1` | No | Soft delete |
| `countHealth` | 4 separate `COUNT(*)` queries | No | Run in parallel with `Promise.all` |
| `findFacets` | `SELECT industry_id, COUNT(*) FROM contacts GROUP BY industry_id` (×3 for industry, city, companySize) | No | 3 parallel queries |
| `anonymize` | `UPDATE contacts SET name = 'Anonymized', email = NULL, phone = $2 WHERE id = $1` | No | GDPR erasure |
| `existsByPhoneHash` | `SELECT EXISTS(SELECT 1 FROM suppression_records WHERE hashed_phone = $1)` | No | Returns boolean |

**Key SQL patterns:**
```sql
-- Dynamic WHERE clause builder (shared pattern across repos)
-- Filters are optional, so we build WHERE + params array dynamically
function buildWhereClause(filters?: ContactFilters): { where: string; values: unknown[] } {
  const conditions: string[] = ['deleted_at IS NULL']  -- always exclude soft-deleted
  const values: unknown[] = []
  let paramIndex = 1

  if (filters?.industry) {
    conditions.push(`industry_id = $${paramIndex++}`)
    values.push(filters.industry)
  }
  if (filters?.search) {
    conditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`)
    values.push(`%${filters.search}%`)
    paramIndex++
  }
  // ... more filters

  return { where: conditions.join(' AND '), values }
}
```

### 2.2 EventRepository (10 methods)

**Tables:** `events`, `user_events` (for assigned events)

| Method | SQL Pattern | Transaction | Notes |
|--------|------------|-------------|-------|
| `findAll` | `SELECT + COUNT` with status/city/search filters | No | Exclude soft-deleted by default |
| `findById` | `SELECT * WHERE id = $1` | No | Include soft-deleted |
| `findBySlug` | `SELECT * WHERE slug = $1 AND deleted_at IS NULL AND status IN ('published', 'active')` | No | Public-facing lookup |
| `create` | `INSERT INTO events ... RETURNING *` | No | Generate slug from name |
| `update` | `UPDATE events SET ... WHERE id = $1 RETURNING *` | No | Partial update |
| `softDelete` | `UPDATE events SET deleted_at = NOW() WHERE id = $1` | No | Soft delete |
| `restore` | `UPDATE events SET deleted_at = NULL WHERE id = $1` | No | Undo soft delete |
| `getOverviewMetrics` | Multi-table query: registrations, blast history, attendance | No | Aggregate query for dashboard |
| `getUpcomingUncontacted` | `SELECT e.* FROM events e LEFT JOIN registrations r ON ... WHERE r.id IS NULL AND e.start_date > NOW()` | No | Finds events with no registrations |

**Key consideration:** Event has JSONB columns (`target_criteria`, `registration_survey_schema`, `post_survey_schema`). Use `::jsonb` casting on insert, `row.target_criteria::json` on read.

### 2.3 RegistrationRepository (10 methods)

**Tables:** `registrations`, `contacts` (join for contact details)

| Method | SQL Pattern | Transaction | Notes |
|--------|------------|-------------|-------|
| `findAll` | `SELECT + COUNT` with status/aiScore filters | No | Joins contacts for name/email/phone |
| `findByEvent` | `SELECT * WHERE event_id = $1` with pagination | No | Most common query pattern |
| `findById` | `SELECT * WHERE id = $1` | No | |
| `findByTicketToken` | `SELECT * WHERE ticket_token = $1` | No | Index on ticket_token |
| `create` | `INSERT INTO registrations ... RETURNING *` | No | Generate ticket_token |
| `update` | `UPDATE registrations SET ... WHERE id = $1 RETURNING *` | No | |
| `updateStatus` | `UPDATE registrations SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *` | No | Single-field update |
| `bulkApprove` | `UPDATE registrations SET status = 'approved', approved_at = NOW() WHERE id = ANY($1)` | **Yes** | Batch update in transaction |
| `getConfirmationStats` | `SELECT status, COUNT(*) FROM registrations WHERE event_id = $1 GROUP BY status` | No | Aggregate for confirmation page |
| `getBlastHistory` | `SELECT ... FROM blast_logs WHERE event_id = $1 ORDER BY sent_at DESC` | No | Blast history entries |

**Key SQL pattern — bulk operations:**
```sql
-- Bulk approve using PostgreSQL array parameter
UPDATE registrations
SET status = 'approved', approved_at = NOW(), updated_at = NOW()
WHERE id = ANY($1::text[])
RETURNING id, status
```

### 2.4 UserRepository (10 methods)

**Tables:** `users`, `user_events` (junction table)

| Method | SQL Pattern | Transaction | Notes |
|--------|------------|-------------|-------|
| `findAll` | `SELECT + COUNT FROM users WHERE deleted_at IS NULL` | No | Exclude deleted |
| `findById` | `SELECT * FROM users WHERE id = $1` | No | Active only |
| `findByIdIncludingDeleted` | `SELECT * FROM users WHERE id = $1` | No | No soft-delete filter |
| `findByEmail` | `SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL` | No | Login lookup |
| `create` | `INSERT INTO users ... RETURNING *` | No | Password already hashed |
| `update` | `UPDATE users SET ... WHERE id = $1 RETURNING *` | No | |
| `delete` | `UPDATE users SET deleted_at = NOW() WHERE id = $1` | No | Soft delete |
| `assignEvent` | `INSERT INTO user_events (user_id, event_id, granted_by_id, granted_at) VALUES (...) RETURNING *` | No | Junction table insert |
| `getAssignedEvents` | `SELECT event_id FROM user_events WHERE user_id = $1` | No | Returns array of IDs |
| `revokeEvent` | `DELETE FROM user_events WHERE user_id = $1 AND event_id = $2` | No | Junction table delete |

### 2.5 VendorRepository (5 methods)

**Tables:** `vendors`

| Method | SQL Pattern | Transaction | Notes |
|--------|------------|-------------|-------|
| `findAll` | `SELECT + COUNT` with OFFSET/LIMIT | No | Simple pagination |
| `findById` | `SELECT * WHERE id = $1` | No | |
| `create` | `INSERT INTO vendors ... RETURNING *` | No | |
| `update` | `UPDATE vendors SET ... WHERE id = $1 RETURNING *` | No | |
| `delete` | `DELETE FROM vendors WHERE id = $1` | No | Hard delete (no soft delete for vendors) |

### 2.6 EventSponsorRepository (5 methods)

**Tables:** `event_sponsors`

| Method | SQL Pattern | Transaction | Notes |
|--------|------------|-------------|-------|
| `findByEvent` | `SELECT * FROM event_sponsors WHERE event_id = $1 ORDER BY display_order` | No | Ordered by display_order |
| `countByVendor` | `SELECT COUNT(*) FROM event_sponsors WHERE vendor_id = $1` | No | |
| `create` | `INSERT INTO event_sponsors ... RETURNING *` | No | |
| `update` | `UPDATE event_sponsors SET ... WHERE event_id = $1 AND vendor_id = $2 RETURNING *` | No | Composite key |
| `delete` | `DELETE FROM event_sponsors WHERE event_id = $1 AND vendor_id = $2` | No | Composite key |

### 2.7 TemplateRepository (5 methods)

**Tables:** `templates`

| Method | SQL Pattern | Transaction | Notes |
|--------|------------|-------------|-------|
| `create` | `INSERT INTO templates ... RETURNING *` | No | |
| `findById` | `SELECT * WHERE id = $1` | No | |
| `findAll` | `SELECT * FROM templates ORDER BY created_at DESC` | No | No pagination needed (small dataset) |
| `update` | `UPDATE templates SET ... WHERE id = $1 RETURNING *` | No | |
| `delete` | `DELETE FROM templates WHERE id = $1` | No | Hard delete |

### 2.8 SurveyRepository (4 methods)

**Tables:** `survey_schemas` (or JSONB columns on `events` table — see note below)

| Method | SQL Pattern | Transaction | Notes |
|--------|------------|-------------|-------|
| `findByEventId` | `SELECT registration_survey_schema FROM events WHERE id = $1` | No | Reads JSONB column |
| `upsert` | `UPDATE events SET registration_survey_schema = $2::jsonb WHERE id = $1 RETURNING registration_survey_schema` | No | Upsert into JSONB column |
| `saveResponse` | `INSERT INTO survey_responses (registration_id, answers) VALUES ($1, $2::jsonb)` | No | Answers stored as JSONB |
| `getResponsesByEvent` | `SELECT sr.* FROM survey_responses sr JOIN registrations r ON sr.registration_id = r.id WHERE r.event_id = $1` | No | Join through registrations |

**Architecture note:** Survey schemas are stored as JSONB columns on the `events` table (`registration_survey_schema`, `post_survey_schema`), not in a separate table. Survey responses are in the `survey_responses` table.

### 2.9 SuppressionRepository (4 methods)

**Tables:** `consent_records`

| Method | SQL Pattern | Transaction | Notes |
|--------|------------|-------------|-------|
| `isSuppressed` | `SELECT EXISTS(SELECT 1 FROM consent_records WHERE phone = $1 OR email = $2)` | No | Fast existence check |
| `suppress` | `INSERT INTO consent_records (contact_id, phone, email, reason, created_at) VALUES (...) RETURNING *` | No | |
| `remove` | `DELETE FROM consent_records WHERE id = $1` | No | Hard delete |
| `findAll` | `SELECT + COUNT` with pagination | No | |

### 2.10 FlaggedRecordsRepository (5 methods)

**Tables:** `flagged_records`, `contacts`

| Method | SQL Pattern | Transaction | Notes |
|--------|------------|-------------|-------|
| `findAll` | `SELECT + COUNT` with status filter | No | Joins contacts for context |
| `findById` | `SELECT * FROM flagged_records WHERE id = $1` | No | |
| `create` | `INSERT INTO flagged_records ... RETURNING *` | No | Created by ETL worker |
| `resolve` | Multi-step: update flagged_record status, update contact data | **Yes** | Transaction: update both tables |
| `discard` | `UPDATE flagged_records SET status = 'discarded', resolved_by_id = $2 WHERE id = $1` | No | |

**Transaction pattern for `resolve`:**
```typescript
async resolve(id: EntityId, resolvedData: Partial<Contact>, resolvedById: EntityId) {
  const client = await this.pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      'UPDATE flagged_records SET status = $1, resolved_by_id = $2, resolved_at = NOW() WHERE id = $3',
      ['resolved', resolvedById, id]
    )
    await client.query(
      'UPDATE contacts SET name = COALESCE($1, name), email = COALESCE($2, email) WHERE id = $3',
      [resolvedData.name, resolvedData.email, resolvedData.id]
    )
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw this.handlePgError(err)
  } finally {
    client.release()
  }
}
```

### 2.11 RawUploadRepository (3 methods)

**Tables:** `raw_uploads`

| Method | SQL Pattern | Transaction | Notes |
|--------|------------|-------------|-------|
| `create` | `INSERT INTO raw_uploads ... RETURNING *` | No | Track file upload |
| `findById` | `SELECT * WHERE id = $1` | No | |
| `update` | `UPDATE raw_uploads SET ... WHERE id = $1 RETURNING *` | No | Update processing status |

### 2.12 AuditLogRepository (2 methods)

**Tables:** `audit_logs`

| Method | SQL Pattern | Transaction | Notes |
|--------|------------|-------------|-------|
| `create` | `INSERT INTO audit_logs ... RETURNING *` | No | Append-only — no update/delete |
| `findAllByTarget` | `SELECT * FROM audit_logs WHERE target_id = $1 ORDER BY created_at DESC` | No | Chronological audit trail |

**Architecture note:** Audit logs are append-only. No update or delete methods exist. The table should have `GRANT INSERT, SELECT` only — no UPDATE/DELETE permissions.

---

## 3. Transaction Boundary Rules

### 3.1 When to Use Transactions

| Scenario | Transaction Required | Reason |
|----------|---------------------|--------|
| Single-row INSERT/UPDATE/DELETE | **No** | Single statement is atomic in PostgreSQL |
| Multi-row UPDATE (bulkApprove) | **Yes** | All rows must succeed or none |
| Read-then-write (resolve flagged record) | **Yes** | Consistency between two tables |
| Merge duplicate contacts | **Yes** | Read primary, read duplicate, update primary, delete duplicate |
| Event creation with sponsors | **Yes** | Insert event, then insert sponsors — all or nothing |

### 3.2 Transaction Pattern

```typescript
// Standard transaction pattern for multi-step operations
async someMultiStepOperation(...) {
  const client = await this.pool.connect()
  try {
    await client.query('BEGIN')

    // Step 1
    await client.query('...', [...])
    // Step 2
    await client.query('...', [...])

    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw this.handlePgError(err)
  } finally {
    client.release()
  }
}
```

**Critical:** Always `client.release()` in `finally` block to prevent connection leaks.

---

## 4. Error Handling Conventions

### 4.1 Error Code Mapping

| PostgreSQL Code | Domain Error | HTTP Status |
|-----------------|-------------|-------------|
| `23505` (unique_violation) | `ConflictError` | 409 |
| `23503` (foreign_key_violation) | `BadRequestError` | 400 |
| `23502` (not_null_violation) | `BadRequestError` | 400 |
| `42703` (undefined_column) | `InternalServerError` | 500 |
| `08006` (connection_failure) | `ServiceUnavailableError` | 503 |
| `57014` (query_cancelled) | `TimeoutError` | 504 |

### 4.2 Route Handler Error Handling

Repositories throw domain-specific errors. Route handlers catch and map to HTTP responses:

```typescript
// Route handler pattern
fastify.put('/api/contacts', async (request, reply) => {
  try {
    const contact = await contactRepo.upsert(request.body)
    return reply.code(201).send(contact)
  } catch (err) {
    if (err instanceof UniqueViolationError) {
      return reply.code(409).send({ error: { code: 'CONFLICT', message: err.message } })
    }
    if (err instanceof ForeignKeyViolationError) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: err.message } })
    }
    // Generic fallback
    request.log.error(err)
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
  }
})
```

---

## 5. Index Strategy

Repositories depend on these indexes (defined in migration `004_indexes.sql`):

| Table | Index | Supports |
|-------|-------|----------|
| `contacts` | `(phone)` | `findByPhone`, `upsertByPhone` conflict detection |
| `contacts` | `(industry_id, city, company_size)` | Filtered `findAll` queries |
| `contacts` | `(deleted_at)` | Soft-delete exclusion in all queries |
| `contacts` | `(flag_category)` | `countHealth`, filtered `findAll` |
| `registrations` | `(event_id, status)` | `findByEvent` with status filter |
| `registrations` | `(ticket_token)` | `findByTicketToken` |
| `registrations` | `(contact_id)` | Contact history lookup |
| `users` | `(email)` | `findByEmail` login lookup |
| `user_events` | `(user_id, event_id)` | `getAssignedEvents`, `assignEvent` uniqueness |
| `events` | `(slug)` | `findBySlug` |
| `events` | `(status, deleted_at, start_date)` | `getUpcomingUncontacted` |
| `consent_records` | `(phone, email)` | `isSuppressed` lookup |

---

## 6. Testing Strategy

### 6.1 Unit Tests (per repository)

Each repository has its own test file: `src/tests/repositories/PostgresContactRepository.test.ts`

```typescript
// Test pattern:
describe('PostgresContactRepository', () => {
  let repo: PostgresContactRepository
  let pool: Pool

  beforeAll(async () => {
    pool = getTestPool()  // Separate test database
    repo = new PostgresContactRepository(pool)
  })

  beforeEach(async () => {
    await pool.query('DELETE FROM contacts')  // Clean slate
    await seedIndustries(pool)                 // Required foreign keys
  })

  afterAll(async () => {
    await pool.end()
  })

  it('should find all contacts with pagination', async () => {
    // Arrange: seed data
    await repo.upsert({ name: 'John', phone: '+6281234567890', ... })

    // Act
    const result = await repo.findAll({ page: 1, pageSize: 10 })

    // Assert
    expect(result.data).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(result.data[0].name).toBe('John')
  })
})
```

### 6.2 Test Database

- Separate `yorindo_test` database created by CI pipeline
- All migrations run before test suite: `npx tsx scripts/migrate.ts --env test`
- Each test truncates its target tables in `beforeEach`
- No testcontainers needed — use the same PostgreSQL instance with a different database name

### 6.3 Integration Tests

Integration tests verify the full request flow: route → service → repository → database → response.

```typescript
// Integration test pattern
describe('POST /api/contacts (integration)', () => {
  it('should create a contact and return 201', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/contacts',
      payload: { name: 'Jane', phone: '+6281234567891', email: 'jane@test.com' },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.name).toBe('Jane')

    // Verify in database
    const dbContact = await contactRepo.findById(body.id)
    expect(dbContact).not.toBeNull()
  })
})
```

---

## 7. Implementation Order

Recommended implementation sequence (easiest to most complex):

| Priority | Repository | Methods | Complexity | Rationale |
|----------|-----------|---------|------------|-----------|
| 1 | `AuditLogRepository` | 2 | Trivial | Append-only, no updates, simplest to implement |
| 2 | `RawUploadRepository` | 3 | Simple | Basic CRUD, no complex queries |
| 3 | `TemplateRepository` | 5 | Simple | Basic CRUD, no pagination needed |
| 4 | `VendorRepository` | 5 | Simple | Basic CRUD with pagination |
| 5 | `EventSponsorRepository` | 5 | Simple | Composite key operations |
| 6 | `UserRepository` | 10 | Medium | Junction table for event assignments |
| 7 | `SuppressionRepository` | 4 | Medium | Existence checks, simple CRUD |
| 8 | `SurveyRepository` | 4 | Medium | JSONB column operations |
| 9 | `FlaggedRecordsRepository` | 5 | Medium | Transaction for resolve operation |
| 10 | `EventRepository` | 10 | Medium-Hard | JSONB columns, soft delete, aggregate metrics |
| 11 | `RegistrationRepository` | 10 | Hard | Joins, bulk operations, ticket token |
| 12 | `ContactRepository` | 16 | Hardest | Most methods, merge logic, facets, duplicates |

---

## 8. File Structure

```
src/repositories/postgres/
├── BasePostgresRepository.ts       # Shared base class with error handling
├── ContactRepository.ts            # 16 methods — most complex
├── EventRepository.ts              # 10 methods
├── RegistrationRepository.ts       # 10 methods
├── UserRepository.ts               # 10 methods
├── VendorRepository.ts             # 5 methods
├── EventSponsorRepository.ts       # 5 methods
├── TemplateRepository.ts           # 5 methods
├── SurveyRepository.ts             # 4 methods
├── SuppressionRepository.ts        # 4 methods
├── FlaggedRecordsRepository.ts     # 5 methods
├── RawUploadRepository.ts          # 3 methods
└── AuditLogRepository.ts           # 2 methods — simplest
```

---

## 9. DI Container Update

When all PostgreSQL repositories are implemented, update `container.ts`:

```typescript
// src/container.ts
const impl = process.env.REPOSITORY_IMPL ?? 'memory'
const pool = impl === 'postgres' ? getPool() : null

export const contactRepo: IContactRepository =
  impl === 'postgres'
    ? new PostgresContactRepository(pool!)
    : new InMemoryContactRepository()

// ... repeat for all 12 repositories
```

**Dual-repository strategy (permanent):**

Memory repositories are **never removed**. They serve two permanent purposes:
1. **Fast unit tests** — in-memory operations are orders of magnitude faster than database round-trips
2. **Zero-dependency development** — new developers can run `npm test` without a running PostgreSQL instance

```typescript
// src/container.ts
const impl = process.env.REPOSITORY_IMPL ?? 'memory'
const pool = impl === 'postgres' ? getPool() : null

export const contactRepo: IContactRepository =
  impl === 'postgres'
    ? new PostgresContactRepository(pool!)
    : new InMemoryContactRepository()

// ... repeat for all 12 repositories
```

**Repository selection strategy:**

| Context | `REPOSITORY_IMPL` | Reason |
|---------|-------------------|--------|
| Unit tests | `memory` (default) | Fast — no database connection overhead |
| Integration tests | `postgres` (test DB) | Validates real SQL queries and migrations |
| Local development | `memory` (default) | No PostgreSQL needed to start coding |
| Staging | `postgres` | Matches production environment |
| Production | `postgres` | Real data persistence |

**Test layering:**

```
Unit tests (fast)          → InMemory repositories  → Run on every commit
Integration tests (slower) → PostgreSQL repositories → Run on PR + CI nightly
E2E tests (slowest)        → Full stack + MSW        → Run on release
```

**Memory repository maintenance:**

When PostgreSQL repositories are implemented, memory repositories should be kept in sync:
- When a new method is added to an interface, implement it in **both** `postgres/` and `memory/`
- Unit tests should pass against **both** implementations (swap via `REPOSITORY_IMPL`)
- Memory implementations are "good enough" approximations — they don't need to replicate PostgreSQL-specific behavior (constraint violations, transaction isolation)

---

## Appendix A: Phone Number Normalization

All phone queries and inserts must use E.164 format. The repository layer is responsible for normalization:

```typescript
// In ContactRepository
private normalizePhone(phone: string): string {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '')
  // Add Indonesia country code if missing
  if (digits.startsWith('0')) {
    digits = '62' + digits.slice(1)
  } else if (!digits.startsWith('62') && digits.length === 10) {
    digits = '62' + digits
  }
  return `+${digits}`
}
```

## Appendix B: Soft Delete Convention

All repositories that support soft delete must:
1. Exclude soft-deleted records by default in `findAll` and `findById`
2. Provide explicit methods for including deleted records where needed (e.g., `findByIdIncludingDeleted`)
3. Use `deleted_at IS NULL` as the standard filter condition
4. Never hard-delete unless explicitly required (e.g., GDPR anonymization)
