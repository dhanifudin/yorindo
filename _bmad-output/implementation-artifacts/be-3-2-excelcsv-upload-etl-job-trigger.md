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
- **Framework:** Fastify 4.x. Use `@fastify/multipart` for parsing incoming files. Ensure limits are passed to the plugin during registration to guard against payload exhaustion.
- **Queue:** BullMQ. Import the pre-configured `etlQueue` from `src/lib/queue.ts`.
- **Storage Node:** Save files securely using standard Node APIs (`fs.promises` or `src/lib/storage.ts`) inside an `uploads` directory in the app root or `/app/uploads` in Docker.
- **Validation:** Standardized error responses using the `FastifyError` object format.

### Architecture Compliance
- Keep route declarations lean (e.g., `src/routes/etl.ts`).
- Business logic (saving files, enqueuing jobs) should reside in a service class (e.g., `EtlService`), conforming to the Service Adapter pattern injected via `src/container.ts`.

### Anti-Patterns to Avoid
- DO NOT keep the file wholly in memory (use streaming if possible, though `@fastify/multipart` file buffers up to the limit are acceptable for MVP).
- DO NOT use MongoDB for logging uploads. (MongoDB was removed from the stack on 2026-03-26; any `raw_uploads` logging if implemented should use PostgreSQL JSONB, but that is covered in 3.3).

## Testing Requirements
- Vitest tests covering the `POST /api/etl/upload` and `GET /api/etl/jobs/:jobId` endpoints.
- Use `form-data` to simulate a file upload in tests.
- Mock the BullMQ `Queue.add` and `Job.fromId` methods to prevent actual Redis connections during CI tests.
- Explicitly test the file type rejecting and file size limit enforcing scenarios.

## Status
ready-for-dev
