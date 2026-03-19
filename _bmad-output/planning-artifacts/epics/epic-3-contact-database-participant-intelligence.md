# Epic 3: Contact Database & Participant Intelligence

Admin can build and maintain a clean, qualified participant database by importing Excel/CSV data, reviewing AI-normalized records, resolving duplicate profiles, and searching/filtering contacts with AI-assisted smart industry classification.

> **Phase 1 (FE):** Contacts table (TanStack Table, pagination, filter bar, smart filter input + debounce); upload form + file picker + job status poller; ETL job status page; flagged records review UI (side-by-side diff + approve/discard); duplicate merge UI (field selector); — all wired to MSW contacts/etl handlers
> **Phase 2 (BE):** `GET /api/contacts`, `POST /api/etl/upload`, BullMQ ETL worker + GPT-4o normalization + Zod validation, `GET /api/etl/jobs/:id`, `GET/PATCH /api/contacts/flagged`, `POST /api/contacts/:id/merge`, `POST /api/smart-filter/industry` (Claude Haiku), MongoDB raw_uploads document write, all repositories

## Story 3.1: Contact List with Server-Side Pagination & Filtering

As an admin,
I want to browse the contact database with pagination, sorting, and filtering by industry, city, and company size,
So that I can find and review specific participant segments efficiently.

**Acceptance Criteria:**

**Given** I am authenticated as `admin`,
**When** `GET /api/contacts?page=1&pageSize=50` is called,
**Then** it returns `{ data: Contact[], pagination: { page, pageSize, total, totalPages } }` with HTTP 200, results within 500ms

**Given** a filter param `?industry=kesehatan&city=Jakarta`,
**When** the contacts endpoint is called,
**Then** only contacts matching both filters are returned

**Given** the contacts page in the admin dashboard,
**When** it renders,
**Then** TanStack Table v8 in manual (server-side) mode displays the paginated data with sortable columns (name, industry, city, company, created_at)

**Given** the page or sort params change,
**When** React Query re-fetches,
**Then** the table updates without a full page reload and shows a skeleton loader during fetch

**Given** a `viewer` user accesses the contacts list,
**Then** it returns HTTP 403 — viewers cannot access the contact database

---

## Story 3.2: Excel/CSV Upload & ETL Job Trigger

As an admin,
I want to upload an Excel or CSV file of participant records and trigger the ETL normalization pipeline,
So that I can import bulk data into the contact database without manual entry.

**Acceptance Criteria:**

**Given** I am authenticated as `admin`,
**When** `POST /api/etl/upload` is called with a multipart file upload (`.xlsx` or `.csv`),
**Then** the file is saved to the `uploads_tmp` Docker volume and a BullMQ ETL job is enqueued; the endpoint returns HTTP 202 `{ jobId, status: 'queued' }`

**Given** a file larger than the configured max size,
**When** the upload is attempted,
**Then** it returns HTTP 400 `{ error: { code: 'FILE_TOO_LARGE', ... } }`

**Given** a file with an unsupported extension,
**When** the upload is attempted,
**Then** it returns HTTP 400 `{ error: { code: 'INVALID_FILE_TYPE', ... } }`

**Given** the ETL job is enqueued,
**When** `GET /api/etl/jobs/:jobId` is called,
**Then** it returns the current job status: `queued`, `processing`, `completed`, or `failed`

**Given** the upload form on the FE (`/admin/contacts/upload`),
**When** a file is selected and submitted,
**Then** the form shows an upload progress indicator and on success shows the job ID with a link to monitor status

---

## Story 3.3: ETL Processing — GPT-4o Normalization & Database Upsert

As a system,
I want the ETL worker to parse uploaded files, normalize records via GPT-4o in batches of 50, and upsert valid contacts into PostgreSQL,
So that raw imported data becomes clean, standardized participant records automatically.

**Acceptance Criteria:**

**Given** an ETL job is dequeued by `etl.worker.ts`,
**When** the file is read from `uploads_tmp`,
**Then** `xlsx` parses it into an array of row objects and the temp file is deleted after parsing

**Given** 50 rows are sent to GPT-4o with the standard system prompt,
**When** the response is received,
**Then** each row has `{ name, phone, email, industry_slug, job_title_slug, city, company_size, confidence, flags[] }` and passes Zod schema validation

**Given** a row with all field confidence ≥ 0.7,
**When** the upsert runs,
**Then** `ContactRepository.upsert()` inserts a new contact or updates an existing one matched by phone (`ON CONFLICT (phone) DO UPDATE`)

**Given** a row with any field confidence < 0.7,
**When** the ETL processes it,
**Then** the row is inserted into `flagged_records` with the raw data and flags; it is NOT upserted into `contacts`

**Given** GPT-4o returns invalid JSON or a Zod validation failure,
**When** the batch is processed,
**Then** the batch is retried up to 3 times with exponential backoff before being marked as failed

**Testing Strategy (Quinn):** ETL GPT-4o calls are never made in CI tests. The `etl.worker.ts` must accept a configurable `normalizer` function (default: GPT-4o, test override: deterministic stub returning pre-defined normalized rows). Vitest tests cover: valid batch upsert path, low-confidence flagging path, retry logic with simulated JSON parse failure. No real OpenAI API calls in test suite.

**Given** the ETL upsert runs for a contact row,
**Then** `contacts.completeness_score` is computed as the integer percentage of non-null profile fields (`name`, `phone`, `email`, `company`, `industry_id`, `job_title_id`, `city`, `company_size`) and persisted alongside the upsert (FR12)

**Given** the ETL job completes,
**Then** a `raw_uploads` document is created in MongoDB with `{ filename, uploaded_by, row_count, status: 'completed', flagged_rows }` and a `contact.imported` audit entry is written

---

## Story 3.4: Flagged Records Review & Resolution

As an admin,
I want to review AI-flagged contact records, correct errors, and either approve or discard them,
So that uncertain data is human-reviewed before entering the clean contact database.

**Acceptance Criteria:**

**Given** I am authenticated as `admin`,
**When** `GET /api/contacts/flagged?page=1&pageSize=50` is called,
**Then** it returns paginated flagged records with `{ raw_data, flags[], status: 'pending' }`

**Given** a flagged record is displayed in the FE (`/admin/contacts/flagged`),
**Then** the original raw field values and the AI flags are both shown side by side for comparison

**Given** I correct a flagged record's fields and submit,
**When** `PATCH /api/contacts/flagged/:id` is called with `{ resolved_data, action: 'approve' }`,
**Then** the corrected contact is upserted into `contacts` and the flagged record `status` is updated to `resolved`; a `flagged.reviewed` audit entry is written

**Given** I choose to discard a flagged record,
**When** `PATCH /api/contacts/flagged/:id` is called with `{ action: 'discard' }`,
**Then** the flagged record `status` is updated to `discarded` and no contact is created

**Given** the flagged records list,
**When** it renders,
**Then** TanStack Table v8 server-side mode shows the data with status filter (pending / resolved / discarded)

---

## Story 3.5: Duplicate Profile Detection & Merge

As an admin,
I want to review automatically flagged duplicate participant profiles and merge them into a single canonical record,
So that the contact database maintains one accurate profile per real participant.

**Acceptance Criteria:**

**Given** a new registration or ETL import occurs,
**When** the system checks composite identity signals (phone, email, name + company),
**Then** potential duplicates are flagged and surfaced in the admin dashboard for review (FR10)

**Given** I am on the duplicate review page,
**When** two profiles are shown side by side,
**Then** I can see all fields from both records and select which value to keep per field

**Given** I confirm the merge,
**When** `POST /api/contacts/:id/merge` is called with `{ mergeIntoId, fieldSelections }`,
**Then** the surviving record is updated with selected fields, the duplicate is soft-deleted, all registrations referencing the duplicate are re-linked to the surviving record, and a `contact.merged` audit entry is written

**Given** a merge is performed,
**When** the duplicate contact's ID is used in any subsequent API call,
**Then** it returns the surviving contact's data (redirect via ID mapping)

---

## Story 3.6: Smart Filter — AI Industry Autocomplete

As an admin,
I want to type a free-form industry term in the contact filter and have it automatically mapped to a canonical industry slug,
So that I don't need to know exact industry taxonomy values to filter contacts accurately.

**Acceptance Criteria:**

**Given** I type "rumah sakit" in the industry filter input,
**When** 500ms elapses (debounce),
**Then** `POST /api/smart-filter/industry` is called with `{ query: 'rumah sakit' }`

**Given** Claude Haiku returns a match with confidence ≥ 0.6,
**When** the response is received,
**Then** the filter applies the matched slug (e.g., `kesehatan`) and the contact list updates

**Given** Claude Haiku returns confidence < 0.6,
**When** the response is received,
**Then** `{ fallback: true }` is returned and the filter displays a standard dropdown of all industry options

**Given** the smart filter API call fails or times out,
**When** the error occurs,
**Then** the filter silently falls back to the standard dropdown — no error shown to the user

---
