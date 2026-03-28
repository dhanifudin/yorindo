# Story BE-3.2: Backend - Excel/CSV Upload & ETL Job Trigger (Phase 2)

## Goal
Implement the Fastify API endpoints for uploading Excel/CSV files and triggering the BullMQ ETL job, along with the polling endpoint for job status. This represents the Phase 2 (Backend) implementation of Story 3.2.

## Acceptance Criteria

**AC1:** `POST /api/etl/upload` endpoint
- Accepts `multipart/form-data` containing a single file field.
- Validates file type to allow only `.xlsx` or `.csv`. Rejects unsupported types with HTTP 400 (`{ error: { code: 'INVALID_FILE_TYPE' } }`).
- Validates file size (limit to 10MB). Rejects excessively large files with HTTP 400 (`{ error: { code: 'FILE_TOO_LARGE' } }`).
- Requires `admin` authentication (use existing Role/Auth middleware).
- Saves the uploaded file to a temporary storage directory (`uploads`).
- Enqueues a job in the `etl` BullMQ queue with the saved file's path and the uploader's user ID.
- Returns HTTP 202 with `{ jobId, status: 'queued' }`.

**AC2:** `GET /api/etl/jobs/:jobId` endpoint
- Requires `admin` authentication.
- Queries BullMQ for the given `jobId` in the `etl` queue.
- Returns the standard job status: `queued`, `processing`, `completed`, or `failed`, along with job progress.
- Returns HTTP 404 if the job cannot be found in the queue.

**AC3:** ETL Queue Worker Stub
- Initialize the BullMQ Worker for the `etl` queue in a dedicated worker file (e.g., `src/workers/etl.worker.ts`).
- For Story BE-3.2, the worker should simply stub the processing: it reads the job data, logs the file path, and marks the job as completed. (Full parsing, AI normalization, and upsert logic is deferred to Story 3.3).

## Developer Context & Guardrails

### Tech Stack Constraints
- **Framework:** Fastify 4.x. Use `@fastify/multipart` **v7.x** (not v8+ — v8 requires Fastify 5). Ensure limits are passed to the plugin during registration to guard against payload exhaustion.
- **Queue:** BullMQ via `IQueueService` from `container.ts` — `container.queueService.enqueue('etl', { filePath, uploadedBy })`. Do NOT import `etlQueue` directly from `lib/queue.ts`.
- **Storage:** Use `src/lib/storage.ts` — `saveFile(buffer, filename)` returns the stored path. Do not use `fs.promises` directly in the route.
- **Validation:** Standardized error responses: `{ error: { code: string, message: string, details: [] } }` (matches `ApiError` schema in OpenAPI spec).

### Architecture Compliance
- Keep route declarations lean (e.g., `src/routes/etl.ts`).
- Business logic (saving files, enqueuing jobs) should reside in a service class (e.g., `EtlService`), conforming to the Service Adapter pattern injected via `src/container.ts`.
- **`EtlService` already exists** — Story 3.3 owns `src/services/etl.service.ts`. This story does NOT create a new EtlService. The upload route calls `etlQueue` to enqueue a job; Story 3.3's worker processes it.
- **Interface-first DI** — do NOT import `etlQueue` directly from `src/lib/queue.ts`. Use `container.queueService.enqueue('etl', { filePath, uploadedBy })` via `IQueueService`. This ensures the queue is mockable in tests.
- **File storage** — use `src/lib/storage.ts` (already scaffolded in Story 1.1) for saving uploaded files. Do not use `fs.promises` directly in route handlers.
- **CUID2** — any generated IDs (e.g., tracking upload records) must use `createId()` from `@paralleldrive/cuid2`. The `jobId` returned in the 202 response comes from BullMQ job ID, not generated manually.

### Anti-Patterns to Avoid
- DO NOT keep the file wholly in memory (use streaming if possible, though `@fastify/multipart` file buffers up to the limit are acceptable for MVP).
- DO NOT use MongoDB for logging uploads. (MongoDB was removed from the stack on 2026-03-26; any `raw_uploads` logging if implemented should use PostgreSQL JSONB, but that is covered in 3.3).

## Testing Requirements
- Vitest tests covering the `POST /api/etl/upload` and `GET /api/etl/jobs/:jobId` endpoints.
- Use `form-data` to simulate a file upload in tests.
- Mock the BullMQ `Queue.add` and `Job.fromId` methods to prevent actual Redis connections during CI tests.
- Explicitly test the file type rejecting and file size limit enforcing scenarios.

## Tasks / Subtasks

- [ ] **Task 1: Create ETL upload route** (`src/routes/etl.ts`)
  - [ ] Subtask 1.1: Register `@fastify/multipart` v7.x with limits: `fileSize: 10 * 1024 * 1024` (10MB), `files: 1`
  - [ ] Subtask 1.2: `POST /api/etl/upload` — require `admin` role via auth middleware
  - [ ] Subtask 1.3: Extract file from multipart; validate mimetype (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` for xlsx, `text/csv`) and extension (`.xlsx`, `.csv`). Reject with 400 `INVALID_FILE_TYPE` if invalid.
  - [ ] Subtask 1.4: Reject files > 10MB with 400 `FILE_TOO_LARGE`
  - [ ] Subtask 1.5: Save file via `storage.saveFile(buffer, filename)` — returns `filePath`
  - [ ] Subtask 1.6: Enqueue job: `container.queueService.enqueue('etl', { filePath, uploadedBy: req.user.id, eventId: body.eventId ?? null, uploadSource: body.uploadSource ?? 'etl_import' })`
    - `eventId` (optional): the event this upload belongs to. Required for on-site imports; null for historical ETL imports.
    - `uploadSource`: `'etl_import'` (default, historical contacts) | `'onsite_import'` (walk-in at a specific event)
  - [ ] Subtask 1.7: Return 202 `{ jobId, status: 'queued' }` — `jobId` comes from BullMQ job ID

- [ ] **Task 2: Create ETL job status route**
  - [ ] Subtask 2.1: `GET /api/etl/jobs/:jobId` — require `admin` role
  - [ ] Subtask 2.2: Query BullMQ for job status via `container.queueService.getStatus(jobId)`
  - [ ] Subtask 2.3: Return `{ jobId, status, progress }` or 404 if not found

- [ ] **Task 3: Register routes in Fastify app**
  - [ ] Subtask 3.1: Register `etl.routes.ts` in `src/server.ts` under `/api` prefix

- [ ] **Task 4: Write vitest tests**
  - [ ] Subtask 4.1: Valid xlsx upload → 202 with jobId
  - [ ] Subtask 4.2: Invalid file type → 400 INVALID_FILE_TYPE
  - [ ] Subtask 4.3: File > 10MB → 400 FILE_TOO_LARGE
  - [ ] Subtask 4.4: `GET /api/etl/jobs/:jobId` → returns status from mock queue
  - [ ] Subtask 4.5: `GET /api/etl/jobs/nonexistent` → 404
  - [ ] Mock `container.queueService` in all tests — no real Redis connections

## Status
ready-for-dev
