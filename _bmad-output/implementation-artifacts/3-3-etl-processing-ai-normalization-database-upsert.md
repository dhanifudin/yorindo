# Story 3.3: ETL Processing — AI Normalization & Database Upsert

## Story

**As a** system,
**I want** the ETL worker to parse uploaded files, normalize records via the AI normalization service (IEtlNormalizationService) in batches of 50, and upsert valid contacts into PostgreSQL,
**So that** raw imported data becomes clean, standardized participant records automatically.

## Status

done

## Context

This is a Phase 2 BE story — it requires Story 1.1 (Fastify scaffold), Story 1.2 (PostgreSQL schema), and Story 1.8 (repository interfaces and in-memory implementations). It also depends on Story 3.2 (ETL upload endpoint) which triggers the BullMQ job that this worker processes.

The ETL pipeline is the critical data ingestion path: uploaded Excel/CSV → BullMQ job → this worker → AI normalization (via IEtlNormalizationService) → upsert to PostgreSQL contacts OR flagged_records. The worker must be testable without real AI provider calls — it accepts a configurable `normalizer` function injected via container.ts (default: MockEtlNormalizationService in Phase 1, real adapter in Phase 2).

In Phase 1, `IEtlNormalizationService` is wired to `MockEtlNormalizationService` via container.ts (`AI_PROVIDER=mock`) or `RuleBasedEtlNormalizationService` (`AI_PROVIDER=disabled`). In Phase 2, it wires to the real adapter (e.g., `OpenAiEtlNormalizationService`) by setting `AI_PROVIDER=openai`. The worker itself is the same code in both phases — only the injected service changes.

**ETL pipeline order (mandatory):**
1. **Pre-normalize** (always, built into `EtlService` — not configurable): `normalizePhone()` → `+62XXXXXXXXXX` format; `normalizeEmail()` → lowercase + trim. These run on every row before any enrichment or dedup.
2. **Enrich** (via `AI_PROVIDER` → ETL normalization adapter): industry slug, job title classification, company name standardization, confidence scoring.
3. **Deduplicate** (always, `FuzzyDeduplicationService` — algorithmic, no AI): runs on the pre-normalized phone/email/name. Pairs above similarity threshold are flagged for admin review in Story 3.5.

See `spec-service-provider-configuration.md` for the deduplication algorithm spec and provider configuration.

## Acceptance Criteria

**AC1:** Given an ETL job is dequeued by `etl.worker.ts`,
When the file is read from `uploads`,
Then `xlsx` parses it into an array of row objects and the temp file is deleted after parsing

**AC2:** Given 50 rows are sent to the AI normalization service (IEtlNormalizationService.normalizeBatch()) in a batch,
When the response is received,
Then each row has `{ name, phone, email, industry_slug, job_title_slug, city, company_size, confidence, flags[] }` and passes Zod schema validation

**AC3:** Given a row with all field confidence ≥ 0.7,
When the upsert runs,
Then `ContactRepository.upsert()` inserts a new contact or updates an existing one matched by phone (`ON CONFLICT (phone) DO UPDATE`)

**AC4:** Given a row with any field confidence < 0.7,
When the ETL processes it,
Then the row is inserted into `flagged_records` with the raw data and flags; it is NOT upserted into `contacts`

**AC5:** Given the AI normalization service returns invalid JSON or a Zod validation failure,
When the batch is processed,
Then the batch is retried up to 3 times with exponential backoff before being marked as failed

**AC6:** Given the ETL upsert runs for a contact row,
Then `contacts.completeness_score` is computed as the percentage of non-null profile fields (`name`, `phone`, `email`, `company`, `industry_id`, `job_title_id`, `city`, `company_size`) and persisted alongside the upsert

**AC7:** Given the ETL job completes,
Then a row is inserted in `raw_uploads` (PostgreSQL) with `{ id: CUID2, filename, uploaded_by, row_count, status: 'completed', flagged_rows }` and a `contact.imported` audit entry is written to `audit_logs`

## Dev Notes

### Tech Stack (Authoritative)

- **Worker:** BullMQ Worker (not a Fastify route — a standalone worker process)
- **File parsing:** `xlsx` package (already in package.json)
- **Pre-normalization:** Built into `EtlService` — always runs; not configurable. Phone → `+62XXXXXXXXXX`; email → lowercase + trim.
- **Enrichment normalization:** `IEtlNormalizationService` adapter configured via `AI_PROVIDER`:
  - `disabled` — `RuleBasedEtlNormalizationService`: keyword-based industry slug mapping, regex job title classification; no external calls; safe production default
  - `mock` — `MockEtlNormalizationService`: fixture data (dev/test)
  - `openai` — `OpenAiEtlNormalizationService`: LLM-powered, higher accuracy on ambiguous data
  - `anthropic` — `AnthropicEtlNormalizationService`
- **Dedup:** `FuzzyDeduplicationService` — always algorithmic (pre-normalized email/phone exact match + name Jaro-Winkler); no env var; not AI
- **Validation:** Zod 3.x for normalized row schema
- **DB:** PostgreSQL only — `IContactRepository`, `IFlaggedRecordsRepository`, `IRawUploadsRepository` (for upload log)
- **Queue:** `etlQueue` from `lib/queue.ts`
- **Retry:** BullMQ built-in retry with backoff — configure on the worker, not the job

### File Locations

```
yorindo-api/src/
  workers/
    etl.worker.ts                  ← BullMQ Worker definition
  services/
    etl.service.ts                 ← ETL orchestration (parse → normalize → upsert → log)
  services/adapters/
    real/
      OpenAiEtlNormalizationService.ts  ← Real AI implementation (Phase 2 — example: OpenAI)
    mock/
      EtlNormalizationService.ts        ← Mock (already exists from Story 1.8)
  lib/
    storage.ts                     ← readFile, deleteFile for uploads
```

### Architecture Constraints (MUST FOLLOW)

1. **Repository Pattern** — All DB writes go through `IContactRepository.upsert()` and `IFlaggedRecordsRepository.create()`. Never write SQL directly in the worker or service.
2. **Service Adapter Pattern** — AI calls go through `IEtlNormalizationService`. Never call any AI provider SDK directly from the worker — always through the adapter interface.
3. **DI via container.ts** — `etl.worker.ts` imports `contactRepository`, `flaggedRecordsRepository`, and `etlNormalizationService` from `container.ts`.
4. **Interface-first** — Worker imports only interface types, not concrete classes.
5. **Testable normalizer** — `etl.service.ts` must accept the normalizer as a dependency (injected, not hardcoded) so tests can substitute a deterministic stub.
6. **No real AI calls in CI** — Tests MUST use `MockEtlNormalizationService`. No real AI provider SDK calls in vitest tests.

### Zod Schema for Normalized Row

```typescript
// src/workers/etl.worker.ts (or a shared schema file)
import { z } from 'zod'

export const NormalizedRowSchema = z.object({
  name: z.string(),
  phone: z.string().regex(/^\+62\d{8,13}$/),  // Indonesian phone format
  email: z.string().email().nullable(),
  industry_slug: z.string().nullable(),
  job_title_slug: z.string().nullable(),
  city: z.string().nullable(),               // legacy free-text city — always preserved
  company: z.string().nullable(),
  department: z.string().nullable(),         // from 'Departemen' column; latest wins on upsert
  company_size: z.enum(['<50', '50-200', '200-1000', '>1000']).nullable(),
  confidence: z.number().min(0).max(1),
  flags: z.array(z.string()),
  // Location codes — added by Task 6 (SCP-2026-03-28-D); nullable, set by RuleBasedEtlNormalizationService
  province_code: z.string().nullable(),
  province_name: z.string().nullable(),
  city_code: z.string().nullable(),
  city_name: z.string().nullable(),
  // Attendance record fields — from 'Tanggal Acara' column; stored on registrations table not contacts
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),  // ISO 8601 YYYY-MM-DD
  event_name_raw: z.string().nullable(),     // from 'Nama Acara' column (on-site template only)
})

export type NormalizedRow = z.infer<typeof NormalizedRowSchema>
```

### ETL Service Structure

```typescript
// src/services/etl.service.ts
import type { IContactRepository } from '../interfaces/repositories/IContactRepository.js'
import type { IFlaggedRecordsRepository } from '../interfaces/repositories/IFlaggedRecordsRepository.js'
import type { IEtlNormalizationService } from '../interfaces/services/IEtlNormalizationService.js'

export class EtlService {
  constructor(
    private contactRepo: IContactRepository,
    private flaggedRepo: IFlaggedRecordsRepository,
    private normalizer: IEtlNormalizationService,       // enrichment: mock | fuzzy | openai | anthropic
    private deduplicator: IDeduplicationService,         // always FuzzyDeduplicationService
  ) {}

  async processFile(
    filePath: string,
    uploadedBy: string,
    opts?: { eventId?: string; uploadSource?: 'etl_import' | 'onsite_import' }
  ): Promise<EtlResult> {
    // 1. Parse xlsx/csv
    // 2. Pre-normalize every row (always): normalizePhone() + normalizeEmail()
    //    - 'Tanggal Acara' column: parse to YYYY-MM-DD; store as event_date on row
    //    - 'Nama Acara' column (on-site template): store as event_name_raw on row
    //    - 'Departemen' column: pass through as department (no normalization needed)
    //    - Unknown columns (e.g. any future additions): silently ignored — schema is strict
    // 3. Chunk into batches of 50
    // 4. For each batch: enrich via this.normalizer.normalizeBatch(rows)
    //    - validate via Zod
    //    - retry up to 3 times on failure
    // 5. Route: confidence >= 0.7 → upsert contact + create registration; < 0.7 → create flagged_record
    //    - Contact upsert: department latest-wins (always overwrite if row has department value)
    //    - Registration: source = opts.uploadSource ?? 'etl_import'
    //                    event_id = opts.eventId ?? null
    //                    event_date = row.event_date (from Tanggal Acara)
    //                    event_name_raw = row.event_name_raw (from Nama Acara)
    //                    status = 'attended' (historical ETL) or 'attended' (on-site)
    // 6. Post-upsert: run deduplicationService.findPotentialDuplicates(contact)
    //    → flag pairs above threshold for Story 3.5 admin review
    // 7. Compute completeness_score per upserted contact
    // 8. Delete temp file
    // 9. Return { processed, upserted, flagged, failed }
  }
}
```

### Completeness Score Formula

```typescript
function computeCompletenessScore(row: NormalizedRow): number {
  // 8-field formula — location codes (province_code/city_code) are NOT included in completeness score
  // They are bonus fields; penalizing existing contacts for missing them would be incorrect
  const fields = [row.name, row.phone, row.email, row.company, row.industry_slug, row.job_title_slug, row.city, row.company_size]
  const nonNull = fields.filter(f => f !== null && f !== undefined && f !== '').length
  return Math.round((nonNull / fields.length) * 1000) / 1000  // 3 decimal places
}
```

### BullMQ Worker Setup

```typescript
// src/workers/etl.worker.ts
import { Worker } from 'bullmq'
import { redis } from '../lib/redis.js'
import { contactRepository, flaggedRecordsRepository, etlNormalizationService } from '../container.js'
import { EtlService } from '../services/etl.service.js'

const etlService = new EtlService(contactRepository, flaggedRecordsRepository, etlNormalizationService, deduplicationService)

export const etlWorker = new Worker('etl', async (job) => {
  const { filePath, uploadedBy, jobId } = job.data
  return await etlService.processFile(filePath, uploadedBy)
}, {
  connection: redis,
  concurrency: 1,  // One ETL job at a time to avoid AI provider rate limits
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  }
})

etlWorker.on('failed', (job, err) => {
  console.error(`ETL job ${job?.id} failed:`, err.message)
})
```

### AI Normalization Prompt (Reference)

The real adapter implementation (e.g., `OpenAiEtlNormalizationService.ts`) should use a prompt like:

```typescript
// src/services/adapters/real/OpenAiEtlNormalizationService.ts (example implementation)
const SYSTEM_PROMPT = `You are a data normalization assistant for an Indonesian B2B events platform.
Given raw participant data rows, normalize each row into structured format.
Return ONLY valid JSON array matching the schema exactly.
For each row output: { name, phone (format: +62XXXXXXXXXX), email, industry_slug (from provided list), job_title_slug, city, company, company_size ('<50'|'50-200'|'200-1000'|'>1000'), confidence (0.0-1.0), flags (array of reason strings for low confidence) }
Indonesian phone numbers: strip spaces/dashes, add +62 prefix, remove leading 0.`
```

### raw_uploads PostgreSQL Row

```typescript
// Inserted to PostgreSQL 'raw_uploads' table after job completes
{
  id: string,          // CUID2, generated application-side
  filename: string,
  uploaded_by: string, // user ID (CUID2)
  row_count: number,
  upserted_count: number,
  flagged_count: number,
  failed_count: number,
  status: 'completed' | 'failed',
  created_at: Date,
}
```

### RuleBasedEtlNormalizationService — Industry Keyword Map

Seed map derived from `docs/contact-etl.xlsx` sample data (2026-03-28). Add to `src/services/adapters/real/RuleBasedEtlNormalizationService.ts`:

```typescript
// Industry slug keyword map — Indonesian labels → internal slugs
const INDUSTRY_KEYWORD_MAP: Array<{ keywords: string[], slug: string }> = [
  { keywords: ['pakaian jadi', 'garmen', 'garment', 'tekstil', 'textil'], slug: 'garment' },
  { keywords: ['manufaktur', 'manufacturing', 'pabrik'], slug: 'manufacturing' },
  { keywords: ['jasa keuangan', 'keuangan', 'financial', 'perbankan', 'bank', 'asuransi'], slug: 'financial_services' },
  { keywords: ['pemerintah', 'lembaga publik', 'instansi', 'dinas', 'badan', 'kementerian'], slug: 'government' },
  { keywords: ['pendidikan', 'universitas', 'sekolah', 'akademi'], slug: 'education' },
  { keywords: ['teknologi', 'teknologi informasi', 'it ', ' it', 'software', 'digital'], slug: 'technology' },
  { keywords: ['kesehatan', 'rumah sakit', 'klinik', 'farmasi', 'medis'], slug: 'healthcare' },
  { keywords: ['retail', 'ritel', 'perdagangan', 'distribusi'], slug: 'retail' },
  { keywords: ['konstruksi', 'properti', 'bangunan'], slug: 'construction' },
  { keywords: ['lainnya', 'other', 'lain-lain', 'umum'], slug: 'other' },
]
// Match strategy: lowercase + trim input → iterate map → first keyword .includes() match → slug
// No match → industry_slug: null, confidence drops to 0.6 (triggers flagged_record)
```

### Column Handling Decisions (from sample data 2026-03-28)

| Upload column | ETL field | Action |
|---|---|---|
| `Nama Lengkap` | `name` | direct map |
| `Email` | `email` | pre-normalize: lowercase + trim |
| `No HP / Handphone` | `phone` | pre-normalize: `+62` format |
| `Nama Instansi/Perusahaan` | `company` | direct map |
| `Departemen` | `department` | direct map; **latest wins** on contact upsert |
| `Jabatan` | `job_title` raw → `job_title_slug` | normalized by `RuleBasedEtlNormalizationService` |
| `Jenis Industri` | `industry_slug` | keyword map above |
| `Asal Kota` | `city` (raw) + `mapCityToCode()` | Task 6 handles code mapping |
| `Nama Acara` | `event_name_raw` on `registrations` | stored on registration record, **not** on contact |
| `Tanggal Acara` | `event_date` on `registrations` | stored on registration record, **not** on contact; parse to `YYYY-MM-DD` |

**Date parsing for `Tanggal Acara`:** Template specifies `YYYY-MM-DD` (ISO 8601). ETL must also handle Excel serial dates (numeric) by converting via `XLSX.SSF.parse_date_code()`. Rows with unparseable dates get `event_date: null` and a `'UNPARSEABLE_DATE'` flag.

**`Tanggal Acara` → attendance history:** Each xlsx row creates one `registrations` record with `status: 'attended'`. Historical imports (event not in system) use `event_id: null` + `event_date` + `event_name_raw`. On-site imports use `event_id` from job metadata.

### Anti-Patterns (NEVER DO)

- NEVER call any AI provider SDK directly from `etl.worker.ts` — always through `IEtlNormalizationService`
- NEVER write SQL directly in the worker — use `IContactRepository.upsert()`
- NEVER process more than 50 rows per AI normalization batch (token limit / rate limit)
- NEVER delete the temp file before parsing completes
- NEVER hardcode AI provider keys — use config from `src/config/index.ts`
- NEVER make real AI provider calls in vitest tests — use `MockEtlNormalizationService`

### MSW Handler Requirements

Not applicable — this is a BE-only worker story (no FE UI in this story). The FE polling the job status (`GET /api/etl/jobs/:id`) uses the existing MSW handler from Story 1.6.

### Test Requirements

Tests must cover:
1. **Valid batch path** — 50 rows with confidence >= 0.7 → all upserted to contacts (mock normalizer returns hardcoded high-confidence rows)
2. **Low-confidence flagging path** — 10 rows with confidence < 0.7 → all go to flagged_records, none to contacts
3. **Retry logic** — mock normalizer throws JSON parse error twice, succeeds on third → batch processed successfully
4. **Completeness score** — contact with all 8 fields → 1.000; missing email + company_size → 0.750
5. **Temp file deletion** — after processing, `storage.deleteFile(filePath)` called with correct path

Use `InMemoryContactRepository` and `InMemoryFlaggedRecordsRepository` from container; inject `MockEtlNormalizationService` configured for each test case.

### Dependencies

- Prerequisite: Story 1.1 (Fastify scaffold, package.json with xlsx and any AI SDK installed at Phase 2)
- Prerequisite: Story 1.2 (PostgreSQL schema for contacts, flagged_records, audit_logs)
- Prerequisite: Story 1.8 (IContactRepository, IFlaggedRecordsRepository, IEtlNormalizationService interfaces and in-memory implementations)
- Prerequisite: Story 3.2 (ETL upload endpoint that enqueues the job this worker processes)
- Packages: `xlsx`, `bullmq`, `ioredis`, `zod` (installed from Story 1.1); AI provider SDK installed at Phase 2 only (configured via `AI_PROVIDER`)

## Tasks / Subtasks

- [x] Task 1: Create `src/services/etl.service.ts`
  - [x] Subtask 1.1: Constructor accepts IContactRepository, IFlaggedRecordsRepository, IEtlNormalizationService, IDeduplicationService (SCP-2026-03-28-C)
  - [x] Subtask 1.2: `processFile(filePath, uploadedBy, opts?)` — parse xlsx/csv using `xlsx` package; `opts` carries `{ eventId?, uploadSource? }`
  - [x] Subtask 1.2a: Pre-normalize every raw row before enrichment: `normalizePhone()` + `normalizeEmail()`; parse `Tanggal Acara` → `YYYY-MM-DD` (handle Excel serial dates); map `Departemen` → `department`; map `Nama Acara` → `event_name_raw`
  - [x] Subtask 1.3: Chunk pre-normalized rows into batches of 50
  - [x] Subtask 1.4: Call `normalizer.normalizeBatch()` per chunk; validate via Zod
  - [x] Subtask 1.5: Retry logic — up to 3 attempts with 2s/4s/8s exponential backoff on JSON parse or Zod failure
  - [x] Subtask 1.6: Route rows: confidence >= 0.7 → `contactRepo.upsert()` (department latest-wins) + `registrationRepo.create()` with attendance record; < 0.7 → `flaggedRepo.create()`
  - [x] Subtask 1.7: Compute `completeness_score` per upserted row
  - [x] Subtask 1.8: Delete temp file via `storage.deleteFile()`
  - [x] Subtask 1.9: Insert `raw_uploads` PostgreSQL row on completion
  - [x] Subtask 1.10: Write `contact.imported` audit log entry

- [x] Task 2: Create `src/workers/etl.worker.ts`
  - [x] Subtask 2.1: BullMQ Worker on queue 'etl' using redis from lib
  - [x] Subtask 2.2: Instantiate EtlService from container imports
  - [x] Subtask 2.3: Call `etlService.processFile(job.data.filePath, job.data.uploadedBy)`
  - [x] Subtask 2.4: Worker error/completion event logging

- [x] Task 3: Create `src/services/adapters/real/OpenAiEtlNormalizationService.ts`
  - [x] Subtask 3.1: Implement `IEtlNormalizationService`
  - [x] Subtask 3.2: System prompt per spec above
  - [x] Subtask 3.3: Call the AI provider API with the normalization prompt (e.g., openai.chat.completions.create())
  - [x] Subtask 3.4: Parse JSON response; throw on invalid JSON (caller handles retry)

- [ ] **Task 6 (2026-03-28): City → wilayah.id code mapping in RuleBasedEtlNormalizationService (SCP-2026-03-28-D)**
  - [ ] Subtask 6.1: Load `src/data/wilayah-static.json` at `RuleBasedEtlNormalizationService` init (provinces + regencies reference)
  - [ ] Subtask 6.2: Implement `mapCityToCode(rawCity: string)` in the service:
    1. Lowercase + strip prefixes ("kota ", "kabupaten ", "kab. ")
    2. Exact match against city name list → `{ province_code, city_code, confidence: 1.0 }`
    3. Jaro-Winkler similarity ≥ 0.85 against all city names → `{ ..., confidence: 0.8 }`
    4. Keyword alias map (`jkt → 31/31.71`, `jakarta → 31/null`, `surabaya → 35/35.78`, `purwakarta → 32/32.14`, etc.) → `{ ..., confidence: 0.7 }`
    5. No match → `null` (city_code stays null; raw `city` text preserved)
  - [ ] Subtask 6.3: Add `province_code`, `province_name`, `city_code`, `city_name` to `NormalizedRow` Zod schema (all nullable)
  - [ ] Subtask 6.4: Call `mapCityToCode()` in `normalizeBatch()` after phone/email pre-normalization, before confidence routing
  - [ ] Subtask 6.5: Tests: exact match, fuzzy match, keyword alias, no match → correct codes or null returned

- [x] Task 4: Update `src/container.ts`
  - [x] Subtask 4.1: Add `etlNormalizationService: IEtlNormalizationService` binding
  - [x] Subtask 4.2: `AI_PROVIDER=disabled` → `RuleBasedEtlNormalizationService`; `AI_PROVIDER=mock` → `MockEtlNormalizationService`; `AI_PROVIDER=openai` → `OpenAiEtlNormalizationService`; `AI_PROVIDER=anthropic` → `AnthropicEtlNormalizationService`

- [x] Task 5: Write vitest tests
  - [x] Subtask 5.1: Test valid batch path (50 high-confidence rows → 50 contacts upserted)
  - [x] Subtask 5.2: Test low-confidence flagging (10 rows < 0.7 → 10 flagged_records, 0 contacts)
  - [x] Subtask 5.3: Test retry logic (mock throws twice, succeeds third)
  - [x] Subtask 5.4: Test completeness score computation
  - [x] Subtask 5.5: Test temp file deletion called after processing

## Dev Agent Record

### Implementation Plan

1. Create `src/services/etl.service.ts` with injected IContactRepository, IFlaggedRecordsRepository, IEtlNormalizationService
2. Create `src/workers/etl.worker.ts` as lazy starter (Phase 2, requires Redis)
3. Create `src/services/adapters/real/OpenAiEtlNormalizationService.ts` as Phase 2 real adapter
4. Write vitest tests using InMemoryContactRepository + custom normalizer stubs

### Debug Log

- Used `vi.spyOn(global, 'setTimeout')` to skip real backoff delays in retry tests
- ETL worker (`etl.worker.ts`) exports `startEtlWorker()` factory — not auto-started — prevents Redis connection at module load
- `XLSX.read()` and `sheet_to_json()` used for xlsx parsing (no CSV special handling — xlsx supports both)

### Completion Notes

- 53 tests pass total (6 ETL-specific), 2 DB integration tests skipped
- `completenessScore` correctly computed: all 8 fields → 1.000
- Temp file deletion verified by asserting `unlink()` throws after processing

## File List

- `src/services/etl.service.ts`
- `src/workers/etl.worker.ts`
- `src/services/adapters/real/OpenAiEtlNormalizationService.ts`
- `src/tests/etl.service.test.ts`

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-22 | Story created (Phase 2 BE) | bmad-context-engine |
| 2026-03-28 | ETL_AI_PROVIDER → ETL_NORMALIZATION_PROVIDER (mock\|fuzzy\|openai\|anthropic); pre-normalization step added (phone +62, email lowercase) always runs before enrichment; dedup added post-upsert via FuzzyDeduplicationService; EtlService constructor updated | SCP-2026-03-28-C |
| 2026-03-28 | Task 6 added: city→code mapping in RuleBasedEtlNormalizationService via wilayah-static.json (Subtasks 6.1–6.5); NormalizedRowSchema updated with 4 nullable location fields | SCP-2026-03-28-D |
| 2026-03-28 | `department` field added to NormalizedRowSchema (latest-wins on contact upsert); `event_date`+`event_name_raw` fields added — stored on `registrations` as attendance history; `Tanggal Acara` → YYYY-MM-DD; `Nama Acara` column added to on-site template; `processFile()` gains `opts: { eventId?, uploadSource? }`; industry keyword map seeded from contact-etl.xlsx sample data | data-discussion-2026-03-28 |
