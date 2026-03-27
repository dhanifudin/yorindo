# Development Phase Plan

> **Revised 2026-03-21** — Changed from 2-phase serial to 3-phase concurrent per Sprint Change Proposal v2.
> FE and BE are developed in parallel from Sprint 1 using the Repository Pattern + Service Adapter Pattern. Persistent storage and real external services are integrated last.

---

## Phase 1: Concurrent FE + BE (In-Memory / Mock)

All of **Epic 1** must complete before Phase 1 feature work begins (type contracts + MSW handlers + service interfaces are the foundation).

FE builds against MSW browser handlers. BE builds with Fastify routes fully wired, but backed by **in-memory repository implementations** and **mock service adapters** — no PostgreSQL/Redis/Brevo/Everpro, or any AI provider required. Both teams can develop, review, and unit-test in parallel.

### FE Deliverables (MSW-backed)

| Work | Deliverable |
|---|---|
| Epic 1 FE | `src/types/api.ts`, MSW worker + handlers, DevToolbar, vitest setup |
| Epic 2 FE | Login page, user management UI, route guards, event assignment UI |
| Epic 3 FE | Contacts Intelligence Hub — filter bar, table, upload form, ETL status monitor, flagged records review, duplicate merge UI, smart filter |
| Epic 4 FE | Event creation form, lifecycle controls, clone flow, survey builder, audience preview, soft delete/restore UI — **plus Event Pipeline Hub (Stories 4.7–4.12): 6-tab workspace (Overview, Undangan, Registrasi, Konfirmasi, Check-in, Laporan)** |
| Epic 5 FE | Template editor, blast config form, schedule picker, emergency blast, suppression management |
| Epic 6 FE | Public landing page, registration form, double opt-in confirmation page, approval queue, waitlist view, ticket display, self-cancellation |
| Epic 7 FE | PWA install flow, QR scanner UI, offline indicator + Background Sync auto-flush, KTP identity verification flow, name search, live attendance monitor |
| Epic 8 FE | Report page, vendor magic link landing, DPA acceptance page, analytics dashboard, YoriMind panel, download buttons |
| Epic 9 FE | Data request form, erasure request form, erasure/cancellation distinction UI |

### BE Deliverables (In-Memory / Mock-backed)

| Work | Deliverable |
|---|---|
| Epic 1 BE | Repository interfaces in `src/interfaces/`, in-memory implementations for all domains, service adapter interfaces + mock implementations (Story 1.8), Fastify server skeleton, Docker Compose |
| Epic 2 BE | `POST /api/auth/*`, `GET/POST/PATCH/DELETE /api/users`, JWT middleware — backed by `InMemoryUserRepository`, `MockTokenBlacklistService` |
| Epic 3 BE | `GET /api/contacts`, `POST /api/etl/upload`, ETL worker — backed by `InMemoryContactRepository`, `InMemoryFlaggedRecordsRepository`, `MockEtlNormalizationService` (no AI provider call), `MockQueueService` |
| Epic 4 BE | `POST/PATCH/GET/DELETE /api/events`, state machine service, clone logic, survey schema, capacity preview — backed by `InMemoryEventRepository`, `InMemorySurveyRepository` |
| Epic 5 BE | `POST /api/blast`, blast worker — backed by `InMemoryBlastRepository`, `MockEmailService`, `MockWhatsAppService`, `MockQueueService` |
| Epic 6 BE | `POST /api/registrations`, approval scoring, waitlist, ticket generation — backed by `InMemoryRegistrationRepository`, `MockEmailService`, `MockWhatsAppService` |
| Epic 7 BE | `POST /api/scan/verify`, `POST /api/scan/manual-checkin`, participant list — backed by `InMemoryRegistrationRepository` (no OTP service — KTP manual verification adopted) |
| Epic 8 BE | Report generation, YoriMind — backed by `InMemorySnapshotStore`, `MockYoriMindService` (no AI provider call) |
| Epic 9 BE | `POST /api/participants/data-request`, erasure job — backed by `InMemorySuppressionRepository`, `MockQueueService` |

---

## Phase 2: Integration (Real Storage + Real Services)

Swap in-memory implementations for real ones, one domain at a time, in epic sequence. Run database migrations. Integration and E2E tests against the real stack.

| Work | Deliverable |
|---|---|
| Epic 1 → Epic 2 Integration | `PostgresUserRepository` replaces `InMemoryUserRepository`; Redis token blacklist replaces mock; migrations 001–004 run |
| Epic 3 Integration | `PostgresContactRepository` + `MongoFlaggedRecordsRepository` replace in-memory; real `IEtlNormalizationService` adapter (e.g. `OpenAIEtlAdapter`) replaces mock (set `ETL_AI_PROVIDER`); `BullMQQueueService` replaces in-memory queue |
| Epic 4 Integration | `PostgresEventRepository` + `MongoSurveyRepository` replace in-memory |
| Epic 5 Integration | `BrevoEmailService` + `EverproWhatsAppService` + `BullMQQueueService` replace mocks; blast rate limiting enforced |
| Epic 6 Integration | `PostgresRegistrationRepository` replaces in-memory; `qrcode` ticket generation live |
| Epic 7 Integration | `POST /api/scan/verify` validates against real PostgreSQL; IndexedDB offline queue tested |
| Epic 8 Integration | Snapshot cron writes to real VPS filesystem; real `IYoriMindService` adapter (e.g. `AnthropicYoriMindAdapter`) replaces mock (set `YORIMIND_AI_PROVIDER`); PDF export live |
| Epic 9 Integration | Erasure job operates against real PostgreSQL; suppression list enforced in blast worker |

---

## Phase 3: Hardening

Quality gates before production launch.

| Area | Work |
|---|---|
| Load testing | 500K contacts import, 30K-contact blast throughput, 500 concurrent registration sessions |
| Accessibility | WCAG 2.1 AA audit across all 3 surfaces (admin, public registration, PWA) |
| Security | Penetration testing: JWT tamper, QR replay, rate limit bypass, RBAC escalation |
| Performance | FCP ≤ 3s on 4G, QR scan ≤ 2s, dashboard load ≤ 2s — Lighthouse + manual profiling |
| Offline resilience | Offline scan queue (IndexedDB) — simulate network drop on event day, verify zero records lost |
| Production deploy | Docker Compose on VPS, Nginx + Let's Encrypt, CI/CD deploy pipeline verified |
| Monitoring | Health check endpoint alive, container restart policies set, log aggregation with Pino |
