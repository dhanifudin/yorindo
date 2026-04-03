# Epic List

## Epic 1: Foundation, OpenAPI Contract & Developer Experience
Both development teams have fully operational environments with a shared OpenAPI contract gating all feature work. The FE team has complete MSW mocking for all planned API endpoints — enabling full parallel FE development with zero dependency on BE availability.
**FRs covered:** Foundation (no direct FRs — enables all epics)
**Architecture requirements:** Both repo scaffolds, OpenAPI 3.0 spec, Docker Compose (prod + dev override), DB migrations 001–004, CI/CD pipeline (GitHub Actions → GHCR → VPS SSH deploy), MSW handlers for all API domains, DevToolbar (role switcher), `src/types/api.ts` FE-owned type definitions.

## Epic 2: Team & Access Management
Admin can create and manage internal user accounts (`admin`, `viewer`, `staff`, `participant`); team members can securely log in with JWT and are automatically restricted to their role's permitted capabilities. Audit trail begins here.
**FRs covered:** FR47, FR48
**FR49 audit trail:** login, account-created, role-changed actions logged in this epic.
**NFRs:** NFR-S1, NFR-S2, NFR-S3, NFR-S9, NFR-S10, NFR-S11

## Epic 3: Contact Database & Participant Intelligence
Admin can build and maintain a clean, qualified participant database by importing Excel/CSV data, reviewing AI-normalized records (provider-agnostic via `IEtlNormalizationService`), resolving duplicate profiles, and searching/filtering contacts with AI-assisted smart industry classification (provider-agnostic via `ISmartFilterService`).
**FRs covered:** FR9, FR10, FR11, FR12, FR13, FR14
**FR49 audit trail:** contact.imported, contact.merged, flagged.reviewed actions logged in this epic.
**NFRs:** NFR-SC1, NFR-SC5, NFR-P3

## Epic 4: Event Configuration & Management
Admin can create, configure, clone, publish, and manage events through their full lifecycle — with paid/free toggle, capacity management (auto-close on quota), dual survey builder (registration + post-event with full Google Forms parity and response dashboard), multi-criteria audience segmentation (manual or AI recommendation), state machine controls, soft delete with recovery, and event cancellation.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR45, FR50, FR51, FR52 (event-context confirmation dialogs), FR53, FR61
**FR49 audit trail:** event.created, event.published, event.cancelled, event.deleted, event.restored, event.state-override actions logged in this epic.
**NFRs:** NFR-SC2, NFR-P3
> **Updated 2026-03-28** — paid/free toggle (Story 4.1), dual survey + response dashboard (Story 4.4), multi-criteria + AI recommendation targeting (Story 4.5), waitlist stat removed from Konfirmasi tab (Story 4.11).

## Epic 5: Invitation Blast & Notifications
Admin can proactively invite targeted participants to events via WhatsApp (Everpro) and email (Brevo) — with manual or AI-recommended audience targeting, consent enforcement, suppression list protection, message template management, scheduled delivery, and emergency blast capability.
**FRs covered:** FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR55, FR59
**FR49 audit trail:** blast.initiated, blast.scheduled, template.updated actions logged in this epic.
**NFRs:** NFR-P10, NFR-R3, NFR-SC3, NFR-S6, NFR-S15
> **Updated 2026-03-28** — blast targeting supports manual filter and AI recommendation modes (Story 5.2).

## Epic 6: Participant Registration & Approval Workflow
Participants can discover events and complete registration via mobile-first forms (SSO login or manual fill) with double opt-in; admins can manage the full approval-to-ticket pipeline with approve/reject actions, automated notifications, and calendar link delivery. Registration auto-closes when the event quota is reached.
**FRs covered:** FR22, FR23, FR24, FR25, FR26, FR27, FR28, FR29, FR30a, FR31, FR52 (registration-context confirmation dialogs), FR54, FR60, FR62, FR63
**FR49 audit trail:** registration.submitted, registration.approved, registration.rejected, registration.attended actions logged in this epic.
**NFRs:** NFR-P1, NFR-P2, NFR-P11, NFR-R3, NFR-SC6, NFR-S7, NFR-S14, NFR-A1
> **Updated 2026-03-28** — SSO login option added (Story 6.2); participant status simplified to registration status (provisional/pending/approved/rejected) + attendance status (attended/no_show); waitlist and cancellation status removed; Stories 6.5 and 6.7 retired.

## Epic 7: Event-Day Check-in (Offline-First PWA)
Staff can run seamless event-day check-in via QR scan, KTP-assisted identity verification, name search, and manual override — fully offline-resilient with automatic background sync on reconnect and real-time attendance monitoring for admins.
**FRs covered:** FR33, FR34, FR35, FR36, FR37, FR38, FR39
**FR49 audit trail:** checkin.scan, checkin.ktp-verified, checkin.manual-override actions logged in this epic.
**NFRs:** NFR-P5, NFR-P6, NFR-R2, NFR-R5, NFR-R6, NFR-DI1, NFR-DI2, NFR-DI5, NFR-PWA1, NFR-PWA2, NFR-PWA3, NFR-SC4, NFR-A2

## Epic 8: Analytics, Reporting & YoriMind
Admin can access AI-powered event performance insights and survey response analytics from within the Event Pipeline Hub (Laporan tab — no dedicated top-level YoriMind menu); vendors can securely download post-event reports via time-limited magic links with mandatory DPA acceptance and full access logging.
**FRs covered:** FR40, FR41, FR42, FR43, FR44, FR46
**FR49 audit trail:** report.generated, report.downloaded, vendor-link.accessed actions logged in this epic.
**NFRs:** NFR-P3, NFR-P7, NFR-P8, NFR-S12, NFR-S13
> **Updated 2026-03-28** — YoriMind accessed exclusively via Laporan tab in Event Pipeline Hub; no separate nav menu item.

## Epic 9: Participant Data Rights & UU PDP Compliance
Participants can exercise their UU PDP data rights — requesting a copy of their stored data, requesting erasure with full anonymization and permanent suppression, and receiving clear distinction between registration cancellation and data erasure.
**FRs covered:** FR56, FR57, FR58
**NFRs:** NFR-DI3, NFR-DI4, NFR-S16, NFR-R1

## Epic 10: Admin Intelligence Dashboard
Admin gets a personalized intelligence command center at `/app/dashboard` — showing live participant composition (filterable by event, job title, industry/manufacture sector, and location), events-by-vendor/sponsor breakdown, company-level contact aggregation, and contextual quick-filter entry points — replacing the current basic stat-card overview at `/app`.
**FRs covered:** FR-D1 (dashboard intelligence view), FR-D2 (company aggregation view), FR-D3 (vendor-event breakdown)
**Architecture requirements:** New route `/app/dashboard`; `/app` redirects to `/app/dashboard`; new MSW handlers for `GET /api/dashboard/stats`, `GET /api/contacts/companies`; reuses existing `events.vendor_id` FK for vendor grouping

## Epic 11: Demo Environment Deployment
A self-contained demo environment at `demo.dhanifudin.com` with realistic seed data that resets on every deployment — enabling prospects and team members to experience the full product lifecycle without affecting production data.
**FRs covered:** None (enables sales/demo, not a user-facing feature)
**Architecture requirements:** Docker Compose demo profile, seed script with relative dates, HTTPS configuration, known demo user credentials, self-validating seed data

---
