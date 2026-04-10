---
status: done
title: Fix event management — remove mock data dependency, add banner_url persistence, image upload
slug: fix-event-mgmt-banner-upload
created: 2026-04-11
baseline_commit: c8190e9b7af127795f6f3ae10e5ede5f18611281
---

<frozen-after-approval>

# Spec: Fix Event Management — Banner URL Persistence & Real Data Flows

## Problem

1. **MSW already disabled in `.env`** (`NEXT_PUBLIC_ENABLE_MOCKS=false`) and all production docker-compose files. No code change needed for (a).
2. **`bannerUrl` missing from backend**: The frontend `Event` type has `bannerUrl?: string`, but the backend domain type, PostgreSQL Event repository, and `toEventDto()` all omit it. Banner URLs only work because MSW maintains its own in-memory store.
3. **No image upload endpoint in backend**: Frontend `EventCreateForm` calls `POST /api/uploads/image` but the backend only has ETL file upload (`POST /api/etl/upload`). Need a general image upload endpoint for event banners.
4. **Event create/update routes don't accept `bannerUrl`**: The Zod schemas and handlers in `events.routes.ts` don't include banner URL fields.

## Acceptance Criteria

### AC1: Backend domain type includes bannerUrl
**Given** the Event domain type in `yorindo-api/src/types/domain.ts`
**When** I read the Event interface
**Then** it includes `bannerUrl: string | null`

### AC2: PostgreSQL Event repository maps banner_url
**Given** the PostgreSQL Event repository
**When** an event is created/updated with a bannerUrl
**Then** it is persisted to a `banner_url` column in the `events` table
**And** the `mapRow()` function maps `banner_url` → `bannerUrl`

### AC3: Database migration adds banner_url column
**Given** the events table exists
**When** the migration runs
**Then** a `banner_url TEXT` column is added (nullable)

### AC4: toEventDto includes bannerUrl
**Given** an Event entity with a bannerUrl value
**When** toEventDto() is called
**Then** the returned DTO includes `bannerUrl` with the correct value

### AC5: Event create/update routes accept bannerUrl
**Given** the event creation and update endpoints
**When** a request includes `bannerUrl` in the body
**Then** the value is validated, stored, and returned in the response

### AC6: Image upload endpoint exists
**Given** an admin user wants to upload an event banner image
**When** they POST to `/api/uploads/image` with a multipart form containing an image file
**Then** the file is saved to the uploads directory
**And** a JSON response returns `{ url: "/uploads/<filename>" }`
**And** the endpoint serves uploaded images via `/api/uploads/:filename` or static file serving

### AC7: Existing tests still pass
**Given** the full test suite
**When** `npm test` runs
**Then** all 195+ tests pass

## Implementation Plan

### [x] Task 1: Add `bannerUrl` to backend domain type
**File**: `yorindo-api/src/types/domain.ts`
**Action**: Add `bannerUrl: string | null` to the `Event` interface (after `description`, before `capacity`)

### [x] Task 2: Create database migration for banner_url column
**File**: `yorindo-api/migrations/016_banner_url.sql`
**Action**: Add `ALTER TABLE events ADD COLUMN IF NOT EXISTS banner_url TEXT;` to the migration function

### [x] Task 3: Update PostgreSQL Event repository
**File**: `yorindo-api/src/repositories/postgres/EventRepository.ts`
**Action**:
- Add `banner_url: string | null` to `EventRow` interface
- Map `bannerUrl: row.banner_url` in `mapRow()`
- Update `create()` and `update()` methods to include `banner_url` in INSERT/UPDATE queries

### [x] Task 4: Update InMemory Event repository
**File**: `yorindo-api/src/repositories/memory/EventRepository.ts`
**Action**: Ensure `bannerUrl` is included in seeded events and create/update operations

### [x] Task 5: Update `toEventDto()` in events routes
**File**: `yorindo-api/src/routes/events.routes.ts`
**Action**: Add `bannerUrl: event.bannerUrl` to the DTO return object

### [x] Task 6: Update event create/update Zod schemas and handlers
**File**: `yorindo-api/src/routes/events.routes.ts`
**Action**:
- Add `bannerUrl: z.string().url().nullable().optional()` to create/update schemas
- Pass `bannerUrl` through to repository create/update calls

### [x] Task 7: Add image upload endpoint
**File**: `yorindo-api/src/routes/uploads.routes.ts` (new file)
**Action**:
- Create `POST /api/uploads/image` endpoint using `@fastify/multipart`
- Accept image file, validate type (jpg/png/webp/gif/svg/avif), save to uploads dir with unique filename
- Return `{ url: "/uploads/<filename>" }`
- Register static file serving for `/uploads/` path via `@fastify/static`
- Register route in `server.ts`

### [x] Task 8: Update frontend type alignment
**File**: `yorindo-app/src/types/api.ts`
**Action**: Verify `CreateEventBody.bannerUrl` and `Event.bannerUrl` are correctly typed (should already be fine)

### [x] Task 9: Run tests
**Command**: `cd yorindo-api && npm test`
**Action**: Verify all tests pass

## Dependencies & Order

1. Task 1 (domain type) → prerequisite for all others
2. Task 2 (migration) → can run in parallel with Task 3
3. Task 3 (postgres repo) → depends on Task 1
4. Task 4 (memory repo) → depends on Task 1
5. Task 5 (DTO) → depends on Task 1
6. Task 6 (routes) → depends on Tasks 3, 4, 5
7. Task 7 (upload endpoint) → independent, can do in parallel
8. Task 8 (frontend types) → independent, verify only
9. Task 9 (tests) → depends on all above

## Risks

- **Memory repo faker seeding**: May need to update faker generation to include bannerUrl
- **Event clone**: Should deep-copy bannerUrl when cloning events
- **Static file serving**: Need to ensure `@fastify/static` is configured to serve from uploads dir

## Suggested Review Order

**Domain & Schema (entry point)**

- Event domain type now includes bannerUrl field
  [`domain.ts:102`](../../yorindo-api/src/types/domain.ts#L102)

- Database migration adds banner_url + payment columns
  [`016_banner_url.sql:6`](../../yorindo-api/migrations/016_banner_url.sql#L6)

**Persistence layer**

- PostgreSQL repo maps banner_url column to bannerUrl domain field
  [`EventRepository.ts:60`](../../yorindo-api/src/repositories/postgres/EventRepository.ts#L60)

- Memory repo seeds bannerUrl for every 3rd event
  [`EventRepository.ts:77`](../../yorindo-api/src/repositories/memory/EventRepository.ts#L77)

**API routes & DTO**

- Event create/update Zod schemas accept bannerUrl
  [`events.routes.ts:40`](../../yorindo-api/src/routes/events.routes.ts#L40)

- toEventDto includes bannerUrl in response
  [`events.routes.ts:196`](../../yorindo-api/src/routes/events.routes.ts#L196)

- Event create handler passes bannerUrl to repository
  [`events.routes.ts:527`](../../yorindo-api/src/routes/events.routes.ts#L527)

- Event clone copies bannerUrl from source event
  [`events.routes.ts:721`](../../yorindo-api/src/routes/events.routes.ts#L721)

**Upload endpoint (new)**

- POST /api/uploads/image handler with validation & cleanup
  [`uploads.routes.ts:32`](../../yorindo-api/src/routes/uploads.routes.ts#L32)

- Static file serving registered after OpenAPI validation
  [`server.ts:156`](../../yorindo-api/src/server.ts#L156)

**OpenAPI contract**

- Event schema includes bannerUrl property
  [`openapi.yaml:307`](../../yorindo-api/openapi.yaml#L307)

- Upload routes documented with multipart request schema
  [`openapi.yaml:6183`](../../yorindo-api/openapi.yaml#L6183)

**Tests (verified)**

- All 195 tests pass, TypeScript type-checks clean
  [npm test](../../yorindo-api/package.json#L13)
