# Development Phase Plan

## Phase 1: FE Development (Build against MSW)

All of **Epic 1** must complete before any Phase 1 feature work begins (OpenAPI contract + MSW handlers are the foundation).

| Phase 1 Work | FE Deliverable |
|---|---|
| Epic 1 (all stories) | Both repos scaffolded, OpenAPI spec, all MSW handlers, CI/CD |
| Epic 2 FE | Login page, user management UI, route guards, event assignment UI |
| Epic 3 FE | Contacts table, upload form, ETL status monitor, flagged records review, duplicate merge UI, smart filter |
| Epic 4 FE | Event creation form, lifecycle controls, clone flow, survey builder, audience preview, soft delete/restore UI |
| Epic 5 FE | Template editor, blast config form, schedule picker, emergency blast, suppression management |
| Epic 6 FE | Public landing page, registration form, double opt-in confirmation page, approval queue, waitlist view, ticket display, self-cancellation |
| Epic 7 FE | PWA install flow, QR scanner UI, offline indicator + sync status, OTP recovery UI, name search, live attendance monitor |
| Epic 8 FE | Report page, vendor magic link landing, DPA acceptance page, analytics dashboard, YoriMind panel, download buttons |
| Epic 9 FE | Data request form, erasure request form, erasure/cancellation distinction UI |

## Phase 2: BE Development (Real Fastify API)

Implemented after Phase 1 is complete. BE stories are implemented in epic sequence (Epic 2 → 9).

| Phase 2 Work | BE Deliverable |
|---|---|
| Epic 2 BE | `POST /api/auth/*`, `GET/POST/PATCH/DELETE /api/users`, JWT middleware, Redis token blacklist |
| Epic 3 BE | `GET /api/contacts`, `POST /api/etl/upload`, ETL BullMQ worker + GPT-4o, flagged records CRUD, duplicate merge, smart filter route |
| Epic 4 BE | `POST/PATCH/DELETE /api/events`, state machine service, clone logic, survey schema storage, soft delete cron |
| Epic 5 BE | `POST /api/blast`, BullMQ blast worker, Everpro + Brevo integrations, template CRUD, suppression enforcement |
| Epic 6 BE | `POST /api/registrations`, approval scoring service, waitlist promotion, `qrcode` ticket generation, double opt-in cron |
| Epic 7 BE | `POST /api/scan/verify`, OTP service, `POST /api/scan/otp/*`, `GET /api/events/:id/participants` |
| Epic 8 BE | Report generation job, `GET /api/events/:id/report`, vendor magic link service, DPA acceptance, YoriMind cron + Claude API |
| Epic 9 BE | `POST /api/participants/data-request`, erasure job, anonymization service, suppression enforcement |
