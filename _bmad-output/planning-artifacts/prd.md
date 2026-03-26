---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
workflowStatus: 'complete'
completedAt: '2026-03-18'
inputDocuments:
  - 'docs/Project Brief Yorindo - KADA.pdf'
  - '_bmad-output/brainstorming/brainstorming-session-2026-03-18-001.md'
workflowType: 'prd'
briefCount: 1
researchCount: 0
brainstormingCount: 1
projectDocsCount: 0
classification:
  projectType: 'Operations Platform + Vendor Intelligence Product'
  domain: 'Event Technology (B2B, Indonesia)'
  complexity: 'High'
  projectContext: 'greenfield'
  userTypes:
    - 'Participant (mobile-first, WhatsApp-driven)'
    - 'Admin/Operator (ops tool, high-pressure)'
    - 'Vendor Client (intelligence product, report-driven)'
  coreValue: 'Qualified lead intelligence — registration is the mechanism, not the product'
  compliance: 'UU PDP (Indonesia Personal Data Protection Law)'
  criticalConstraint: 'OpenAPI spec is first-class deliverable — gates both FE and BE teams'
---

# Product Requirements Document - Yorindo

**Author:** Dian
**Date:** 2026-03-18

---

## Executive Summary

Yorindo Communication is Indonesia's leading B2B technology seminar organizer, operating across 18 cities since 2017 with a 30,000+ verified participant database spanning manufacturing, healthcare, education, oil & gas, and other industries. This system — the **Yorindo Registration Management & Participant Intelligence Platform** — replaces a manual, spreadsheet-driven operation with a purpose-built platform that transforms each seminar into a measurable demand generation engine for vendor clients.

The platform serves three distinct user groups with fundamentally different needs: **participants** who register and attend seminars (mobile-first, channel-agnostic — notification channel configured per event — frictionless experience); **admin operators** who manage events end-to-end under time pressure (approval workflows, multi-city coordination, real-time ops); and **vendor clients** who sponsor seminars expecting qualified, sales-ready leads (intent data, engagement signals, branded intelligence reports). These are three separate products sharing one codebase — each with its own UX contract and success metric.

**The strategic driver is two compounding forces:** Yorindo's internal operations broke under the weight of 18 simultaneous cities, and Indonesia's B2B event market is mid-transition from brand-awareness events to demand-generation events — a shift that has already completed in mature markets globally. The first EO in Indonesia's B2B technology seminar space to deliver attributable pipeline to vendor clients captures the market. The window is measured in months.

### What Makes This Special

Competitors deliver a spreadsheet. Yorindo will deliver a **lead intelligence dossier** — pre-event intent signals (which solutions is the participant evaluating?), on-site engagement (did they visit the booth?), post-event confirmation (do they want a follow-up?) — assembled automatically from registration through to reporting. The paying customer — the vendor sales director — doesn't receive an attendance list. They receive a sales-qualified lead package they forward directly to their team.

The defensible moat is Yorindo's 30,000-contact database, built across 9 years and 18 cities. This system makes that moat **visible, queryable, and compounding**: every event enriches participant profiles with new job titles, new engagement signals, and new cross-event attendance history. A competitor starting today cannot replicate that contact graph. The advantage widens with every seminar Yorindo runs.

The product loop is: **seamless participant experience → healthy, growing database → credible vendor intelligence → repeat vendor investment → more events → stronger database.** Every layer feeds the next. The platform is the infrastructure that closes that loop.

A premium **Lead Intelligence Suite** (configurable per event) unlocks pre-event intent capture, vendor booth QR self-check-in, and post-event WhatsApp survey delivery. Vendor clients who enable it receive richer reporting; Yorindo prices it as a premium tier. Vendor willingness to pay for intelligence validates the vision — it is the real product.

Data quality is a prerequisite: AI-powered participant scoring and vendor reporting lose credibility if the 30K contact database contains stale job titles or duplicate records. The platform's import and enrichment layer is not an afterthought — it is what makes the intelligence promise credible.

## Project Classification

| Dimension | Value |
|---|---|
| **Project Type** | Operations Platform + Vendor Intelligence Product (PWA + REST API) |
| **Domain** | B2B Event Technology — Indonesia |
| **Complexity** | High — offline-first PWA, multi-integration, AI scoring, 5-role RBAC, two-team parallel dev |
| **Project Context** | Greenfield |
| **Compliance** | UU PDP (Indonesia Personal Data Protection Law) — consent management, data retention, participant rights |
| **Critical Constraint** | OpenAPI 3.0 spec is a first-class deliverable — gates both FE and BE teams from day one |
| **Team Structure** | Two parallel teams (Frontend / Backend) coordinated via OpenAPI contract |

---

## Success Criteria

### User Success

| User | Success Moment | Metric |
|---|---|---|
| Participant | Registers without frustration | Form completed in **< 2 minutes** on mobile |
| Participant | Arrives at event without stress | Check-in time **< 45 seconds** measured from staff scan initiation |
| Participant | Self-serves without staff help | **< 5%** of participants require staff assistance (name search or OTP recovery) |
| Participant | Never loses access | OTP self-recovery available — zero admin intervention for lost tickets |
| Admin | Routine approvals are automated | **≥ 50% auto-approval at launch**, rising to **≥ 75% by month 12** as database quality improves |
| Admin | Event day runs without firefighting | Check-in queue cleared within **15 minutes** of event start for events up to 300 pax |
| Admin | Venue changes don't cause chaos | Emergency blast queued within **30 seconds** of admin action with visual delivery confirmation — zero manual fallback required |
| Vendor Client | Report is immediately actionable | Post-event report delivered **within 24 hours** of event end (automated — no manual export) |
| Vendor Client | Leads are qualified, not just attendance | **≥ 60%** of report leads rated relevant by vendor sales team (vs. established pre-launch baseline) |

### Business Success

| Horizon | Target |
|---|---|
| **Month 3** | First complete event cycle runs end-to-end on the platform — blast → registration → approval → check-in → report — with zero spreadsheet fallback |
| **Month 6** | Admin team reports **≥ 50% reduction** in time spent on event operations per city |
| **Month 12** | **≥ 30%** of active vendor clients opted into the Lead Intelligence Suite premium tier |
| **Ongoing** | Vendor report delivery transformed: from weeks (manual baseline) → **< 24 hours** automated |

### Technical Success

| Requirement | Target | Notes |
|---|---|---|
| Offline check-in reliability | **0 attendance records lost** due to sync failure | Separate from user errors (wrong OTP, unregistered participant) |
| Event-window availability | **100% availability** during event day ± 2 hours | Off-peak maintenance windows acceptable |
| Annual uptime | **≥ 99.5%** | ~3.65 hours total downtime per year |
| Message delivery rate | **≥ 95%** WhatsApp + Email combined | BullMQ retry + dual-channel fallback — treat as launch blocker, not stretch goal |
| Data integrity | **0 attendance records lost** on offline-to-online sync | IndexedDB + first-write-wins conflict resolution |
| Sprint 0 gate | OpenAPI 3.0 spec **reviewed and approved by both FE and BE tech leads** before any feature code is written | Hard gate — unmet = both teams blocked |

### Measurable Outcomes

- **Participant experience:** Registration-to-confirmation flow achievable in < 5 minutes total (form + double opt-in + OTP receipt)
- **Admin efficiency:** Auto-approval engine handles routine cases; manual review queue ≤ 20% of registrants at steady state
- **Vendor intelligence:** Lead Intelligence Suite produces a report that vendor sales director can forward directly to their team without manual cleanup
- **Data quality improvement:** Participant database enrichment rate (profiles with complete industry + job title + phone) improves from current unstructured baseline to **≥ 85% complete profiles** within 6 months
- **Competitive moat:** Cross-event identity tracking active — returning participant history visible within 12 months of launch

---

## Product Scope

### MVP — Minimum Viable Product

Core event cycle — proves the operational promise before layering intelligence on top:

- **Event Management:** Create, publish, clone events with full config (capacity, target criteria, approval mode, notification channel, scan format)
- **Invitation Blast:** Segmented blast to participant database via Brevo (email) + Everpro (WhatsApp)
- **Registration Module:** Public event landing page + mobile-first registration form + optional double opt-in confirmation (configurable per event)
- **Admin Approval Workflow:** Pending list → manual/hybrid approval → approved/rejected/waitlisted status with automated notifications
- **QR/Barcode Ticket Delivery:** Auto-generated QR code sent via WhatsApp/Email on approval
- **Offline-First Check-in PWA:** QR scanner, OTP entry, name search fallback, degraded mode — all offline-capable via IndexedDB + Service Worker
- **Basic Analytics:** Attendance report, registration funnel, participant demographics (age, industry, job title distribution)
- **Admin Safety Layer:** Event state machine, soft delete, audit trail, destructive action confirmations, role-based access (5 roles)
- **Security Baseline:** Rate limiting, OTP single-use + expiry, input sanitization, CAPTCHA, HMAC webhook verification
- **UU PDP Compliance:** Consent capture at registration, unsubscribe handling, suppression list, participant data rights
- **OpenAPI Contract:** Full API spec completed and Prism mock server running before feature development starts

> **Lead Intelligence Suite data model** is designed into the MVP schema (event config toggles, consent fields, booth QR infrastructure) even though the UI ships in Growth Phase 1.

### Growth Features (Post-MVP)

Features that make Yorindo competitive as an intelligence platform:

- **Lead Intelligence Suite UI:** Pre-event intent survey, vendor booth QR check-in, post-event WhatsApp survey, combined lead quality score
- **Participant Accounts:** Passwordless WhatsApp OTP login, profile auto-fill across events, attendance history dashboard
- **Smart Auto-Approval Engine:** AI scoring via pluggable provider (OpenAI/Gemini) — `AI_PROVIDER` config, factory pattern
- **Advanced Analytics:** Branded PDF report generator, scheduled report delivery, multi-format export (PDF/Excel/CSV), field drop-off analytics
- **Multi-Event Operations:** Simultaneous event war room, event performance benchmarking, cross-event participant identity, conflict detection
- **Agenda & Speaker Management:** Session builder, speaker profile library, session-level QR check-in
- **Notification Intelligence:** Granular notification type controls, participant preference center, smart reminder sequences

### Vision (Future)

Long-term platform evolution:

- **AI Lead Scoring at Scale:** Predictive lead quality scoring trained on cross-event attendance and engagement data
- **Vendor Self-Service Portal:** Vendor clients configure their own Lead Intelligence preferences and access reports independently
- **Event Performance Intelligence:** Benchmarking across all 18 cities — "Your Manufacturing seminar in Surabaya outperformed the national average by 23%"
- **Database Health Engine:** Automated contact enrichment, duplicate detection, career progression tracking across events
- **Multi-Tenant Platform:** Potential to offer the platform to other Indonesian EOs as a SaaS product

---

## User Journeys

### Journey 1 — Participant: The Reluctant Registrant (Success Path)

**Persona: Budi Santoso**, 38, Procurement Manager at a manufacturing plant in Cikarang. He gets 40+ WhatsApp messages a day and deletes most of them. He's attended two Yorindo seminars before — both required him to fill in the same long form, then wait days wondering if he was confirmed.

**Opening Scene:** It's 11am on a Tuesday. A WhatsApp message lands from Yorindo: *"Halo Pak Budi, kami mengundang Anda ke seminar ERP Solution untuk industri manufaktur di Jakarta, 15 April."* The message has a link. He almost swipes it away — but the topic is relevant; his plant is evaluating ERP vendors this quarter.

**Rising Action:** He taps the link. The registration page loads in 3 seconds on his 4G connection. His name and phone are pre-filled — the system recognized his number from a previous event. He only needs to confirm his current job title (changed since last year) and answer one intent question: *"Solusi apa yang sedang Anda evaluasi?"* He selects ERP and Supply Chain. Done. He submits. A WhatsApp reply arrives in under a minute: confirmation received, processing within 1×24 hours.

**Climax:** The auto-approval engine scores his profile: verified phone, manufacturing industry, procurement title, two prior attendances, active ERP evaluation signal. Score: 87. Auto-approved. Three minutes after submitting, a second WhatsApp arrives — his QR ticket, event details, and a calendar link.

**Resolution:** On event day, Budi scans his QR at the door. Green. He's in within 20 seconds. No queue, no name lookup, no staff help needed. The system is invisible — and that's the point.

**Capabilities revealed:** Invitation blast with personalization, pre-fill from participant history, auto-approval engine with score-based rules, instant WhatsApp ticket delivery, QR check-in, calendar integration.

---

### Journey 2 — Participant: The Check-in Crisis (Edge Case — Lost Ticket)

**Persona: Sari Wulandari**, 29, HR Coordinator at a hospital in Surabaya. She registered, was approved, received her QR — but switched phones and lost her WhatsApp backup.

**Opening Scene:** 8:47am. Event starts at 9:00. Sari is at the registration desk with an empty phone. The queue is forming behind her.

**Rising Action:** Staff taps "OTP Recovery." Enters Sari's phone number. A 6-digit OTP lands on her WhatsApp — new phone, same number — in seconds. She reads it to staff. Green. 45 seconds total.

**Alternative fallback:** If OTP fails (no signal), staff switches to name search. Types "Sari", filters by event — her record appears with approved status. Manual check-in with audit log. She's in.

**Additional requirement surfaced:** Optional photo capture at registration enables visual identity assist at check-in for high-security events — configurable event setting, not mandatory.

**Wrong-city scenario:** A participant presents a QR from a different city event. The staff device shows only: *"Peserta ini tidak terdaftar untuk event ini. Hubungi admin untuk bantuan."* — no cross-event details exposed to field staff (UU PDP: staff role scoped to current event data only). Full cross-event lookup is admin-only access.

**Capabilities revealed:** OTP recovery flow, name search fallback, offline check-in, degraded mode sync, optional photo identity assist, role-based data scoping at check-in (staff sees wrong-event message only — no event details).

---

### Journey 3 — Participant: The Rejected Applicant

**Persona: Tono**, 52, General Manager at a retail company in Semarang. He registers for a manufacturing-focused ERP seminar. The event targets manufacturing industry specifically — retail is out of scope.

**Opening Scene:** Tono submits his registration. The auto-approval engine scores him: retail industry, no prior attendance, job title mismatch for event target criteria. Score: 28. Falls into manual review queue.

**Rising Action:** Yolanda reviews his profile. The event is oversubscribed (150 registered, 120 capacity). Tono's profile doesn't fit the vendor's target segment. She clicks "Reject." She selects a rejection reason from a dropdown — the system generates a notification from the admin-editable template for this reason type.

**Climax:** Tono receives a WhatsApp within minutes: *"Halo Pak Tono, terima kasih sudah mendaftar. Mohon maaf, kapasitas untuk seminar ini sudah penuh untuk segmen industri yang dituju. Kami akan menghubungi Anda untuk event berikutnya yang relevan."* Warm, non-technical, no scoring logic exposed. His profile is automatically tagged for the next relevant event segment.

**Resolution:** Six weeks later, a retail-focused digital transformation seminar opens. Tono is in the first blast segment. He registers, is auto-approved, and attends. He becomes a returning participant.

**Capabilities revealed:** Rejection notification with admin-editable templates and variable substitution, rejection reason abstraction (no score logic exposed to participant), automatic segment tagging for future targeting.

---

### Journey 4 — Participant: The Waitlisted Experience

**Persona: Rina**, 35, IT Manager at a textile factory. She registers for a popular cloud infrastructure seminar — 200 capacity, already at soft limit with 15 buffer slots held for VIPs.

**Opening Scene:** Rina submits. Score: 74 — above baseline but event is at soft capacity. Status: Waitlisted. She receives: *"Anda saat ini dalam daftar tunggu. Kami akan memberitahu Anda segera jika tempat tersedia."*

**Rising Action:** Day before the event, a confirmed participant cancels. The system auto-promotes the next waitlisted participant by score. Rina is #1. She receives: *"Selamat! Tempat tersedia untuk Anda. Konfirmasi kehadiran Anda sebelum [deadline — 24 jam]."* She confirms. QR ticket arrives.

**Deadline expiry logic:** If Rina had not confirmed within 24 hours, the system would attempt one more promotion cycle to the next waitlisted participant. After 2 failed auto-promotion attempts, the slot returns to Yolanda's manual queue. This is enforced by a BullMQ delayed job, not a user action.

**Walk-in edge case:** A different waitlisted participant, Ahmad, didn't see the promotion message and shows up anyway. Rizky's check-in device shows Ahmad as "Waitlisted — Not Confirmed." Rizky checks remaining capacity in the ops view — 3 unfilled confirmed slots exist. He manually checks Ahmad in and logs the override. Ahmad gets in.

**Capabilities revealed:** Waitlist queue, score-based auto-promotion (FIFO configurable per event), BullMQ delayed job for confirmation deadline enforcement, 2-attempt max then manual fallback, capacity buffer management, manual check-in override for staff.

---

### Journey 5 — Participant: The Self-Cancellation

**Persona: Farhan**, 41, IT Director. Confirmed for the Jakarta seminar — but his overseas client visit was rescheduled to the same day.

**Opening Scene:** Farhan opens his WhatsApp ticket. At the bottom: *"Tidak bisa hadir? [Batalkan Pendaftaran]"* — a link.

**Rising Action:** He taps it. A web page loads: *"Apakah Anda yakin ingin membatalkan pendaftaran untuk [Event Name]? Tempat Anda mungkin diberikan ke peserta lain."* He confirms. Status updates to Cancelled.

**System response (waitlisted event):** The freed slot triggers the next waitlist promotion cycle immediately. No admin involvement.

**Resolution:** Farhan receives a cancellation confirmation. Zero admin intervention. Yolanda never knows it happened. Farhan's profile and full history are retained — cancellation changes registration status only. Data erasure (UU PDP Article 35 right to be forgotten) is a separate, explicit flow.

**Capabilities revealed:** Self-cancellation link in ticket, cancellation confirmation screen, slot release triggering waitlist re-promotion, data retention policy (status change only — not profile deletion), distinction between cancellation and data erasure.

---

### Journey 6 — Admin/Operator: Multi-City Event Week + Trust-Building Arc

**Persona: Yolanda Permata**, 32, Event Operations Lead. This week: Surabaya (Wednesday), Bandung (Friday), Medan (Saturday).

**Month 1 — Reality (trust-building):** Yolanda clones last month's Surabaya event, tweaks date and vendor, publishes in 8 minutes. She runs the segmented blast. Registrations arrive. Auto-approval handles 73%. It's month 1 — she reviews a sample manually. The system shows *why* each was approved: "Verified phone ✓ | Manufacturing industry ✓ | Prior attendance ✓ | Score: 87." After reviewing 20 records and finding no surprises, she stops checking approved cases by week 3. The confidence indicators made the engine trustworthy.

**Month 3 — Steady state:** The 27% borderline cases land in her manual review queue. She reviews 12 in 20 minutes. Eight approved, four waitlisted.

**Event day:** She monitors remotely via ops dashboard — real-time check-in count, queue clearance estimate — on a tablet. Tablet-priority layout: large status cards, city-by-city view. At 9:15am, queue cleared. At 10am: venue A/V floods. She opens the emergency blast from her phone — large tap targets, message preview with participant count, 3-second hold-to-send confirmation. 156 confirmed participants receive a WhatsApp update within 3 minutes.

**Non-functional requirement:** Emergency blast uses a priority queue — separate from the standard invitation queue — to guarantee ~52 messages/minute throughput within Everpro API rate limits.

**Post-event:** Report auto-generates overnight. Vendor package delivered by 8am Thursday.

**Capabilities revealed:** Event clone, segmented blast scheduling, auto-approval with confidence indicators ("why approved" explanations), manual review queue, real-time ops dashboard (tablet-priority layout), emergency blast with mobile-first UX design (hold-to-send, priority queue routing), automated post-event report.

---

### Journey 7 — Vendor Client (Premium Tier): From Sponsorship to Sales Pipeline

**Persona: Hendri Kusuma**, 44, Regional Sales Director at an ERP software company. Has sponsored 6 Yorindo seminars. Always received an Excel file two weeks later. Conversion rate: 3%.

**Opening Scene:** Hendri opts into Lead Intelligence Suite for the April event. Pre-event: 34 of 178 confirmed participants flagged ERP as active evaluation focus. He forwards to pre-sales team. Booth staff arrives prepared.

**Rising Action:** 22 participants scan the vendor booth QR voluntarily. Post-event WhatsApp survey: 41 of 178 reply yes to follow-up interest.

**Climax:** Next morning — Lead Intelligence Report arrives via email magic link. 41 warm leads, 22 booth visitors, 12 with active ERP evaluation. Those 12 flagged sales-qualified. Each lead card: name, company, job title, industry, intent signal, booth visit, survey response.

**Resolution:** Hendri forwards the 12 SQL cards before his 9am meeting. Three discovery calls booked that afternoon. He texts Yorindo's AM: *"Renew untuk Q3 — 4 kota."*

**Capabilities revealed:** Pre-event intent capture, vendor booth QR check-in, post-event WhatsApp survey, lead scoring, branded PDF report, 24h automated delivery via magic link.

---

### Journey 8 — Vendor Client (Standard Tier): The Basic Report

**Persona: Dewi**, Marketing Manager at a networking equipment company. First-time Yorindo sponsor. Did not opt into Lead Intelligence Suite.

**Opening Scene:** Event day +1. Dewi receives an email: *"Laporan kehadiran untuk [Event Name] sudah tersedia. [Unduh Laporan]"* — a magic link (signed URL + HMAC + expiry). One click, no login, no portal.

**Rising Action:** She downloads the attendance summary: 178 registrants, 147 checked in (82.6%), demographic breakdown by industry and job title. She exports to Excel for her sales team and downloads a PDF summary for her internal stakeholder report.

**Resolution:** Clean, usable, no manual cleanup. She notes the Lead Intelligence tier for next quarter.

> **Vendor portal** (multi-event history, persistent login, self-service report access) is a **Growth Phase feature** for multi-event vendors. MVP delivers magic link report delivery only.

**Capabilities revealed:** Magic link report delivery (signed URL + HMAC + expiry, time-limited), attendance report with demographic breakdown, Excel + PDF export, no vendor account required at MVP.

---

### Journey 9 — Staff / Check-in Operator: Event Day Under Pressure

**Persona: Rizky**, 24, field staff. 312 confirmed participants, 45 minutes, no queue.

**Opening Scene:** 7:30am. Rizky syncs the confirmed list on WiFi. "312 confirmed — sync complete."

**Rising Action:** 8:45am — WiFi drops. "Offline Mode — 312 records cached." He keeps scanning. All check-ins queue to IndexedDB. 9:15am — WiFi returns. 67 records sync silently in background. Dashboard in Jakarta updates in seconds.

**Edge case:** A woman without a ticket. Manual name search. Approved status, ticket sent to wrong number. Manual check-in with audit note. She's in.

**Resolution:** Event opens on time. 247 of 312 checked in (79% attendance). Report generating automatically.

**Capabilities revealed:** Offline-first PWA, IndexedDB + background sync on reconnect, manual check-in with audit log, staff role-scoped access (check-in functions only — no admin views), wrong-event detection showing limited message only.

---

### Journey 10 — Super Admin: Vendor Setup, Audit, and Access Control

**Persona: Andi**, COO of Yorindo.

**Part A — Vendor report setup (pre-event):** Andi attaches Dewi's email address to the April Jakarta event report. On report completion (event day +1), the system generates a magic link and sends it automatically. No vendor account required. For premium-tier vendors like Hendri, Andi marks the event as Lead Intelligence enabled and confirms the vendor contact email.

**Part B — Audit and access correction (post-event):** Vendor complaint — report shows 0 attendees. Andi opens the event audit trail. Finds a junior admin set event to Draft post-completion. Reverts to Completed. Report regenerates. Corrected copy delivered within 15 minutes of complaint. He also finds the junior admin has super_admin access — misconfigured at onboarding. Downgrades to event_admin.

**Capabilities revealed:** Vendor email attachment to event (no account creation), magic link generation on report completion, full audit trail (event + participant + admin actions), event state machine manual override, role management (5 roles), report regeneration trigger.

---

### Journey Requirements Summary

| Journey | Capabilities Required |
|---|---|
| Participant — Success | Pre-fill from history, auto-approval with scoring, WhatsApp ticket, QR check-in, calendar link |
| Participant — Lost ticket | OTP recovery, name search fallback, offline check-in, optional photo identity assist |
| Participant — Rejected | Admin-editable notification templates, rejection reason abstraction, auto segment tagging |
| Participant — Waitlisted | Waitlist queue, score/FIFO auto-promotion, BullMQ deadline job, 2-attempt max + manual fallback |
| Participant — Cancellation | Cancel link in ticket, slot release → waitlist trigger, data retention (status only, not erasure) |
| Admin — Multi-City Ops | Event clone, segmented blast, approval with confidence indicators, ops dashboard (tablet-priority), emergency blast (mobile-first UX + priority queue) |
| Vendor — Premium | Intent capture, booth QR, post-event survey, lead scoring, branded PDF, 24h magic link delivery |
| Vendor — Standard | Magic link report (signed URL + HMAC + expiry), attendance report, Excel/PDF export |
| Staff — Check-in | Offline PWA, IndexedDB sync, manual override + audit, role-scoped access, wrong-event message only (no cross-event detail) |
| Super Admin | Vendor email-to-event attachment, audit trail, state override, role management, report regeneration |
| **Non-functional** | Emergency blast priority queue (~52 msg/min Everpro throughput); notification templates use structured form with variable hints — plain-text compliant with WhatsApp template requirements |

---

## Domain-Specific Requirements

### Compliance & Regulatory

**UU PDP — Indonesia Personal Data Protection Law (UU No. 27 Tahun 2022)**

> Note: UU PDP implementing regulations (Peraturan Pemerintah) are still being finalized as of 2026. Requirements below are based on the enacted law. Where specific timeframes are noted (e.g., re-consent window), these are admin-configurable policy parameters — final values subject to legal counsel review and PP clarification.

- **Consent capture at registration** — explicit, informed, granular consent required before collecting personal data (name, phone, job title, industry, company). Consent documented per participant per event.
- **Right to access** — participants can request a copy of their stored data. System must export a participant's full profile + event history on request.
- **Right to erasure (Article 35)** — participants can request deletion of personal data. System distinguishes: (a) event registration cancellation — status change only, history retained; (b) data erasure request — profile + history anonymized in historical reports (`name → "Peserta [ID]"`), suppression flag set to prevent re-collection. Hard delete vs. anonymization approach subject to legal counsel review.
- **Data retention limits** — per legal counsel review. Reference baseline: participant profile — active + 2 years after last event; event attendance records — 5 years for vendor reporting integrity.
- **Suppression list** — participants who opt out or request erasure must be suppressed from future blasts and never re-added even if they re-register with the same phone number.
- **Vendor data processing agreement (DPA)** — vendor clients are data processors for leads they receive. Before accessing any lead report, vendor must accept the DPA. MVP feature: acceptance gate (checkbox + timestamp + DPA version reference stored per vendor record). DPA versioning: when Yorindo updates the DPA, vendors must re-accept before accessing new reports. Legal text of DPA is a pre-launch legal deliverable — not an engineering task.
- **Cross-border data transfer** — if any vendor client is headquartered outside Indonesia, lead report delivery may require additional compliance steps under UU PDP Chapter VII. Flag during vendor onboarding; legal review required before report delivery to foreign entities.
- **30K database import — re-consent requirement** — existing contacts require re-consent or documented legitimate basis for continued processing (Article 20), per legal counsel review. Re-consent campaign is a **Sprint 0 operational prerequisite** — must complete before the first production blast.
  - `consentStatus` field on participant records: `legacy_unverified` | `re-consent-sent` | `consented` | `suppressed`
  - Blast engine must check this field — `legacy_unverified` contacts are blocked from all outbound communication until re-consent confirmed
  - Re-consent campaign: one-time WhatsApp message to all 30K contacts; contacts who do not respond within admin-configurable window (recommended baseline: 90 days) are moved to `suppressed`
  - Brevo email fallback for contacts without WhatsApp — documents good-faith compliance attempt for contacts unreachable via WhatsApp
  - **Dependency:** Everpro WhatsApp Business API registration + Meta Business Verification (2–4 week lead time) is a **pre-Sprint 0 business task**. Dependency chain: Everpro setup → template approval → re-consent send → consent window → first production blast. This is a project milestone, not a sprint task.

**WhatsApp Business API (via Everpro) Terms of Service**

- Messages sent to opted-in, consented recipients only — blast engine enforces suppression list and `consentStatus` check before every send.
- Promotional message templates require pre-approval by Meta via Everpro — admin-editable notification templates may require re-approval before deployment. Operational constraint: maintain approved fallback templates for each notification type.
- OTP messages fall under "utility" template category — faster approval; subject to WhatsApp 24-hour session window rules.

---

### Technical Constraints

**Connectivity — Indonesian infrastructure reality**

- 4G is the dominant standard in tier-2/tier-3 cities (Cikarang, Medan, Balikpapan, etc.). Registration pages and PWA must be optimized for 4G — target initial page load ≤ 3 seconds on 4G, graceful degradation to 3G.
- Event venue WiFi is unreliable. The offline-first check-in PWA must function without any network connection for all check-in operations. No check-in function should require a network call.

**Multi-timezone operations**

- Yorindo operates across 3 Indonesian time zones: WIB (UTC+7), WITA (UTC+8), WIT (UTC+9).
- All timestamps stored in UTC, displayed in local event timezone. Blast scheduling, reminder sequences, confirmation deadlines, and report delivery windows must account for timezone.
- Simultaneous event ops dashboard must display per-event local time clearly.

**Participant identity — phone as primary identifier**

- SIM card replacement is common in Indonesia — creates identity fragmentation risk across a 9-year database.
- Participant schema must include an `identitySignals` subdocument: `{ phones: [{ value, source, addedAt, isPrimary }], emails: [{ value, source, addedAt, isPrimary }], nameVariants: [], companyHistory: [] }`. Enables future composite identity matching without schema migration.
- Deduplication at import: score match probability across phone (exact, high weight), name (fuzzy, medium), company + city (medium), email (exact, high). High-confidence composite match surfaces admin merge prompt.
- Continuous identity resolution (matching on every new registration) is **Growth Phase** — data model must support it from MVP.
- Prior erasure requests must be respected even when a participant returns with a new phone number — known risk at MVP, manual resolution process documented.

**OpenAPI contract-first — two-team coordination constraint**

- OpenAPI 3.0 spec is the Sprint 0 gate. Spec must include **sync infrastructure endpoints** (`POST /sync/checkins` batch upload, `GET /sync/participants/{eventId}` initial download) in addition to user-facing feature endpoints — these are required for the offline PWA sync layer and are easily omitted when speccing user features.
- **Standardized error response schemas** required for all endpoints — FE offline PWA handles rate-limit errors, auth errors, and sync conflicts differently; without defined error schemas, FE builds on optimistic assumptions that break in production.
- Prism mock server (dev) is stateless — contract validation only, not scenario testing. MSW (Mock Service Worker) with stateful handlers is the FE testing layer for full scenarios. Both teams must align on this distinction before Sprint 0.

---

### Integration Requirements

| Integration | Purpose | Constraint |
|---|---|---|
| **Everpro (WhatsApp Business API)** | Invitation blast, OTP, ticket delivery, post-event survey, emergency blast | Template pre-approval required; 4 named BullMQ queues: `otp` > `emergency-blast` > `transactional` > `marketing`; ~52 msg/min rate limit; HMAC webhook verification for delivery callbacks |
| **Brevo (Email)** | Invitation blast fallback, vendor magic link report delivery, re-consent fallback | Bounce handling; unsubscribe management; suppression list sync |
| **BullMQ + Redis** | Async queues, OTP expiry, waitlist promotion deadline jobs, report generation | 4 separate named queues with dedicated workers (not priority integers — starvation risk under load). Concurrency: `otp` (10), `emergency-blast` (20), `transactional` (5), `marketing` (2 — throttled to protect Everpro rate limit budget) |
| **ZXing-js** | QR/barcode scanning in offline check-in PWA | Must function fully offline — no network call for decode |
| **Google reCAPTCHA v3** | Public registration form bot protection | Invisible risk score — if unavailable, log-and-flag (do not block registration); admin approval queue shows `⚠ reCAPTCHA not verified` indicator; alert if failure rate > 5% |
| **AI Provider (OpenAI / Gemini)** | Participant scoring for auto-approval engine | Pluggable via `AI_PROVIDER` env config + factory pattern; fail-safe: if AI unavailable, route to manual queue — never block registration |
| **Calendar (Google / Apple)** | Add-to-calendar link in ticket delivery | Deep link generation only — no OAuth, no API call |

---

### Stated Exclusions

- **No payment processing** — the platform has no payment processing capability. Vendor sponsorship billing is handled off-platform via Yorindo's existing invoicing process. Avoids OJK (Otoritas Jasa Keuangan) licensing requirements and PPN digital services obligations. Any future in-platform billing requires a separate compliance workstream.

---

### Domain-Specific Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| WhatsApp template rejected by Meta after admin edits copy | Medium | Maintain approved fallback templates per notification type; route changes through Everpro with lead time buffer |
| Participant database quality degradation (stale phones, duplicates) | High | `identitySignals` schema from day one; deduplication on import; merge prompt on high-confidence composite match |
| UU PDP non-compliance — blasting legacy contacts without re-consent | High (without mitigation) | Re-consent campaign as Sprint 0 prerequisite; `consentStatus` blocks `legacy_unverified` contacts from all sends |
| UU PDP non-compliance — lead report delivery without vendor DPA | Medium | DPA acceptance gate required before any report access; versioned acceptance record stored per vendor |
| Offline sync conflict (two devices check in same participant) | Low | First-write-wins; duplicate check-in flagged in audit log; report deduplicates attendance count |
| AI provider outage during high-volume registration | Medium | Fail-safe to manual queue; queue depth monitoring alert; no registration blocked |
| Emergency blast delayed beyond 5-minute SLA | Low | Priority queue separation (`emergency-blast` queue, dedicated worker); dual-channel fallback (email) if WhatsApp stalls |
| Participant data erasure conflicts with vendor report integrity | Low | Anonymize (`"Peserta [ID]"`) rather than hard delete in historical reports; reports are point-in-time snapshots |
| Returning participant bypasses prior erasure request (new phone number) | Low | MVP: known risk, manual resolution documented; Growth: composite identity resolution detects returning participants |
| No-show rate variance — vendor report credibility | Medium | Attendance rate prominently displayed in report; internal alert threshold (configurable) triggers account management call when attendance drops below X% before report is sent |
| Staff device lost or stolen — personal data breach | Low | PWA session requires PIN to unlock; admin can remotely invalidate device session token from dashboard; constitutes UU PDP reportable breach if unmitigated |
| Event cancelled by Yorindo — participant and vendor notification | Low | "Cancel Event" admin action (available on Published/Live events): triggers mandatory participant blast, invalidates all QR codes, notifies vendor contacts, transitions event to `Archived` with `cancelledAt` timestamp. No new state required in state machine. |
| Everpro setup delayed — re-consent campaign blocked | Medium | Brevo email fallback documents good-faith attempt; Everpro setup must start at project kickoff as pre-Sprint 0 business task |
| OpenAPI sync endpoints omitted from spec | Medium | Spec review checklist must include `/sync/*` endpoints; BE tech lead sign-off required before FE starts offline PWA development |

---

## Innovation & Novel Patterns

> These are validated hypotheses based on market analysis, user journey research, and architectural design — not proven outcomes. Validation signals below will confirm or challenge each hypothesis within the first 6 months of operation.

### Detected Innovation Areas

**1. Automated Lead Qualification: Registration Touchpoints → Vendor-Ready Sales Package**

Every B2B event platform treats registration as access control — the goal is to know who's coming. Yorindo's core innovation is treating every participant touchpoint as a qualification signal assembled automatically into a vendor-ready sales package.

The registration form captures active evaluation intent. The approval workflow enriches the profile. The check-in scan confirms attendance. The booth QR records vendor engagement. The post-event survey captures follow-up intent. Each touchpoint feeds a composite lead score — and the output is not an attendance list but a **lead intelligence dossier** the vendor sales director forwards directly to their team.

What makes this different from Eventbrite or HubSpot event integrations: (a) **intent specificity** — Yorindo's form captures vendor-specific evaluation signals; (b) **closed-loop assembly** — all signals are automatically combined into a single scored lead card without organizer intermediation; (c) **database baseline** — Yorindo's 30K verified Indonesian B2B contacts give the scores meaning a new entrant cannot replicate. The components are available in global tools; the assembled, locally-grounded product is not.

**2. The Compounding Participant Graph**

Most event platforms are stateless per event — each registration is isolated. Yorindo's 9-year, 18-city database is the defensible moat, but only if the platform makes it *compounding*.

**MVP enrichment mechanism (event-triggered):** On each new registration, if an existing profile is matched via `identitySignals` composite score, the system updates `jobTitle`, `company`, `industry` if edited; appends the event to `eventHistory`; recalculates `profileCompleteness` score; logs the delta. After 10 events across 3 years, a participant's profile reflects their current role and 10 engagement data points — compounding with every event Yorindo runs.

**Measurable output:** `profileCompleteness` score (profiles with verified industry + jobTitle + phone) is the compounding graph metric — already embedded in the 6-month success criterion (≥ 85% complete profiles).

**Growth/Vision enrichment (proactive):** Active contact verification, duplicate detection, and career progression tracking (Database Health Engine) is a Vision-phase feature. The MVP schema supports it without migration.

**3. AI-Hybrid Approval Engine — Configurable Per Event, Explainable by Design**

The hybrid model (rule-based scoring + pluggable AI provider + human review queue) is configurable per event — admin sets approval mode (auto / hybrid / manual) and score threshold at event creation.

**Explanation layer precision:** For rule-based scoring, explanations are deterministic: `"Verified phone ✓ | Manufacturing industry ✓ | Prior attendance ✓ | Score: 87"`. For AI-scored profiles, the provider adapter normalizes AI output into the `signals[]` schema (`{ label, met: boolean, weight: 'high|medium|low' }`) via prompt engineering (JSON mode / function calling). Quality of AI explanations depends on adapter prompt design — this is an adapter implementation responsibility, not a platform guarantee. MVP can launch with rule-based scoring only (100% explainable) and add AI scoring once the adapter is validated.

The pluggable provider pattern (`AI_PROVIDER` env config, factory interface: `scoreParticipant(profile) → { score: 0-100, signals[], confidence }`) future-proofs against lock-in — OpenAI today, Gemini next year, a fine-tuned Yorindo model eventually.

**4. Offline-First Event Operations — Complete Degraded Mode**

The check-in PWA handles without any network connection: QR scan, OTP recovery, name search fallback, manual override with audit log, capacity view, waitlist walk-in detection. Every check-in function, fully operational offline.

Sync layer: IndexedDB + first-write-wins + background sync on reconnect. Event-day operations are **network-optional**, not network-dependent. In Indonesia's tier-2 and tier-3 city venues where event WiFi is unreliable, this is the operational difference between a platform staff can trust and one they keep a printed backup list for.

QR code (default) or barcode (admin-configurable per event) — both decoded by ZXing-js entirely on-device. Scan-to-confirmation: 2–3 seconds per participant. At 300 people, this is the difference between a cleared queue and a 45-minute bottleneck.

**5. Zero-App Participant Experience — Channel-Configurable, App-Download-Free**

The notification channel (WhatsApp via Everpro, or email via Brevo) is configured by the admin at event creation — not hardcoded. For WhatsApp events, every participant touchpoint flows through WhatsApp. For email events, through Brevo. Either way, participants never download an app or create an account.

For WhatsApp-configured events: invitation arrives via WhatsApp, registration is a web link, ticket is a WhatsApp message, check-in QR is pulled from WhatsApp, OTP recovery is a WhatsApp reply. For email-configured events: same experience, email-native. The zero-app principle holds regardless of channel.

This eliminates app-install friction — the single biggest barrier to event platform adoption in emerging markets. Participants don't choose to "use Yorindo" — they respond to a message on their existing channel. This scales across 18 cities and a participant base of manufacturing workers, healthcare professionals, and oil & gas engineers who may never have used a dedicated event app.

---

### Market Context & Competitive Landscape

**Current state in Indonesia:** B2B event organizers operate on manual workflows — registration via Google Forms, approval via WhatsApp group chat, check-in via printed name list or basic QR apps. Vendor reports are produced manually 1–2 weeks post-event. The "report" is a contact list exported from a spreadsheet.

**Global comparable:** Revenue attribution for events exists in mature markets (Splash, Bizzabo, Hopin with Salesforce integration) — enterprise SaaS products priced for US/EU markets that don't run in Indonesia's infrastructure reality, don't integrate with Everpro/WhatsApp natively, and don't address tier-2 city operational context.

**The window:** Indonesia's B2B technology seminar market is mid-transition — vendors are starting to ask for ROI on sponsorship spend, not just brand visibility. The organizer who delivers attributable pipeline first sets the standard. Yorindo's 9-year database and 18-city footprint provides the credibility; the platform provides the infrastructure. The window is measured in months.

---

### Validation Approach

| Innovation | Hypothesis | Validation Signal | Timeframe |
|---|---|---|---|
| Lead qualification dossier replaces spreadsheet | Vendor uses report without manual cleanup and attributes pipeline to Yorindo event | **Vendor renewal rate** (% who rebook within 6 months) + **lead qualification rate** measured via structured AM call question ("How many leads did your team contact?") logged in vendor record | Month 3–6 |
| Report drives immediate vendor action | Report is actionable, not filed away | **Time-to-report-download** (magic link click telemetry) — vendors opening within 2 hours signals behavioral change; zero-cost instrumentation | Month 3 |
| Compounding graph improves targeting | Enrichment loop captures profile changes; returning participants with changed profiles still score accurately | Approval rate for returning participants whose **profile changed** since last event vs. unchanged — proves enrichment loop, not just selection effect | Month 6 |
| Compounding graph completeness | Database enriches with every event | `profileCompleteness` ≥ 85% within 6 months of launch | Month 6 |
| AI-hybrid approval reduces admin workload | Engine handles ≥ 50% of cases without manual review | Monthly ops hours per event drops ≥ 50% vs. pre-platform baseline | Month 6 |
| Offline-first eliminates check-in failures | Zero attendance records lost due to connectivity | 0 lost records across first 10 events | Month 3 |
| Zero-app UX reduces registration friction | Participants complete registration without staff help, regardless of channel | Median registration time < 2 minutes on mobile; < 5% require staff assistance at check-in | Month 3 |

---

### Risk Mitigation

| Innovation Risk | Mitigation |
|---|---|
| Vendors don't value intelligence report over spreadsheet | Pre-launch vendor satisfaction baseline; pilot Lead Intelligence Suite on 1 event before pricing premium tier; time-to-download and AM call data as early signals |
| Auto-approval rejects too many legitimate participants (low initial database quality) | Conservative 50% threshold at launch; manual review queue absorbs borderline cases; confidence indicators prevent over-reliance |
| AI provider costs spiral with scale | Pluggable provider allows cost-optimized fallback; rule-based scoring handles clear-cut cases without AI call |
| Offline sync produces duplicate attendance records | First-write-wins + duplicate detection in sync layer; report deduplication before vendor delivery |
| Participant graph fragmentation (SIM replacement) | `identitySignals` composite matching; high-confidence matches surface admin merge prompt |
| WhatsApp Business API pricing or policy changes | Dual-channel architecture (email is first-class equal, not fallback); `NotificationService.send()` channel abstraction prevents rebuild if channel priority shifts; acknowledged as strategic dependency — monitor Meta pricing announcements |
| Zero-app experience breaks for email-only participants at WhatsApp-configured event | Channel is set per event by admin — mismatch prevented at event configuration; Brevo fallback always available |

---

## Platform-Specific Requirements

### Project-Type Overview

Yorindo is a **single-tenant B2B operations platform + vendor intelligence product** built as a PWA + REST API. It serves three distinct user groups (participants, admins, vendor clients) through separate UX surfaces sharing one codebase. The platform is greenfield, single-tenant at MVP, with multi-tenant architecture deferred to Vision phase.

---

### Tenant Model

**MVP: Single-tenant (Yorindo only)**

All data is scoped to one organization. No tenant isolation required at the data layer. Database collections are not namespaced by tenant ID.

**Vision: Multi-tenant SaaS** — if Yorindo offers the platform to other Indonesian EOs, tenant isolation becomes a requirement. The schema should not actively prevent this future migration (avoid hard-coded `yorindo` org references), but no tenant abstraction layer is built at MVP.

---

### RBAC Matrix

Five roles with strict permission boundaries:

| Role | Scope | Key Permissions | Account Management |
|---|---|---|---|
| `super_admin` | System-wide | All events, all reports, audit trail, system config, vendor setup, account management | **Only role that can create/edit/deactivate accounts** |
| `event_admin` | Assigned events | Create/clone/publish events, run blasts, manage approval queue, monitor check-in ops, access reports | Cannot manage accounts — created and managed by `super_admin` only |
| `staff` | Assigned event (check-in only) | QR scan, OTP recovery, name search, manual check-in override, capacity view | No dashboard access; check-in PWA only |
| `vendor_client` | Assigned event reports | Read-only report access via magic link (MVP) or vendor portal (Growth) | No write access of any kind |
| `participant` | Self only | Registration, self-cancellation, OTP recovery | No dashboard access; public web forms only |

**Account creation flow:** `super_admin` creates all accounts. `event_admin` and `staff` accounts are internal Yorindo staff. `vendor_client` access is provisioned by `super_admin` per event (email attachment for magic link — no account required at MVP). Participants are not accounts — they are database records created via public registration.

**Permission enforcement:** JWT with role claim, validated server-side on every request via `express-openapi-validator` middleware. Role claim is not trusted from client — always resolved from database on token issue.

---

### Device & Browser Matrix

| Surface | Primary Target | Responsive Behavior | Notes |
|---|---|---|---|
| **Participant registration form** | Mobile (4G, Android Chrome) | Mobile-first — designed for 375px width, scales up | Target load ≤ 3s on 4G; graceful degradation to 3G |
| **Admin dashboard** | Desktop (1280px+, Chrome/Edge) | Desktop-first with responsive view | Fully functional on tablet for event-day ops; not optimized for mobile |
| **Check-in PWA** | Tablet (staff devices, Chrome) | Tablet-first (768px+), works on mobile | Offline-first; large tap targets for scanning workflow |
| **Vendor report (magic link)** | Desktop email client + browser | Responsive web page + downloadable PDF/Excel | No special device requirements |

**Browser support:** Modern evergreen browsers (Chrome 90+, Edge 90+, Safari 14+, Firefox 88+). No IE11 support. PWA Service Worker requires HTTPS in production.

---

### Performance Targets

| Surface | Target | Condition |
|---|---|---|
| Participant registration page | First Contentful Paint ≤ 3s | 4G connection (10 Mbps), cold load |
| Registration form submission → confirmation | ≤ 60 seconds end-to-end | Includes queue processing time |
| Admin dashboard initial load | ≤ 2s | Desktop, broadband |
| Check-in PWA initial sync (participant list) | ≤ 30 seconds | 200–300 participants, WiFi |
| QR scan → check-in confirmation (online) | ≤ 2 seconds | Full round-trip |
| QR scan → check-in confirmation (offline) | ≤ 1 second | IndexedDB lookup only |
| Report generation (async background job) | ≤ 10 minutes | Vendor notified via email when ready |
| Magic link report delivery | ≤ 24 hours after event end | Automated trigger on event completion |

---

### SPA Architecture

- **Frontend:** Vite + React, single PWA codebase for all surfaces (participant, admin, check-in)
- **UI components:** shadcn/ui
- **Routing:** Role-based route guards — `super_admin`/`event_admin` routes, `staff` routes (check-in only), participant public routes
- **Offline layer:** Service Worker + IndexedDB (Dexie.js) for check-in PWA; registration and admin dashboard do not require offline support
- **API client:** Orval-generated React Query hooks from OpenAPI spec — FE team consumes spec, not hand-written fetch calls
- **State management:** React Query for server state; local component state for UI — no global store at MVP

---

### API Architecture

- **Backend:** Express.js (JavaScript ES6, no TypeScript)
- **API style:** REST, OpenAPI 3.0 spec as first-class deliverable
- **Authentication:** JWT (access token 15min + refresh token 7 days), Redis blacklist for logout/invalidation
- **Validation:** `express-openapi-validator` middleware — request/response validated against OpenAPI spec on every call
- **Sync endpoints** (required for offline PWA — must be in OpenAPI spec from Sprint 0):
  - `GET /sync/participants/{eventId}` — downloads confirmed participant list for offline caching
  - `POST /sync/checkins` — batch upload of offline check-in records on reconnect
- **Error response schema:** Standardized across all endpoints — `{ error: { code, message, details[] } }` — required for offline PWA error handling (rate-limit vs. auth vs. sync conflict handled differently)
- **Rate limiting:** Per-IP on public endpoints (registration form, OTP request); per-user on authenticated endpoints
- **HMAC webhook verification:** All inbound webhooks from Everpro and Brevo verified before processing

---

### Integration Architecture

All external service calls (Everpro, Brevo, AI provider) are abstracted behind service interfaces — `NotificationService.send()`, `ScoringService.score()` — to enable provider substitution without caller changes. No direct SDK calls from route handlers.

---

### File Storage

- **Vendor reports, speaker photos, event banners, and exported files:** stored on VPS filesystem under `/uploads/[org]/[event]/`
- **Serving pattern:** all file requests route through Nginx → Express; Express validates the signed URL + HMAC before streaming the file from disk — Nginx acts as reverse proxy only, no direct static file serving for protected paths
- **Access control:** Express owns file access decisions; Nginx forwards all `/uploads/*` requests to Express without short-circuiting. Public assets (event banners on landing pages) may be served directly by Nginx without Express involvement — explicitly configured per path
- **Migration path:** at current scale (single-tenant, <100 events/year), VPS local disk is sufficient. Migrate to object storage (S3-compatible) when VPS disk utilization exceeds 70% or multi-tenant SaaS migration begins

---

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Operations Platform MVP — prove the complete event cycle end-to-end before layering intelligence on top.

**Core principle:** The MVP succeeds when Yorindo runs one complete event cycle — blast → registration → approval → check-in → report — with zero spreadsheet fallback. Every MVP capability must serve this cycle. The intelligence layer (Lead Intelligence Suite) is validated by the MVP data model and schema design, but ships in Growth Phase 1.

**Why this MVP is large by necessity:** The event cycle is a closed loop — each stage depends on the previous. A registration tool without check-in is a form builder. A check-in tool without blast is useless. Partial delivery does not validate the loop. Estimated timeline to MVP: ~4–5 months across two parallel teams. Stakeholder timeline expectations must be calibrated accordingly.

**Team structure:** Two parallel teams (Frontend / Backend) coordinated via OpenAPI 3.0 contract. Sprint 0 gate: OpenAPI spec reviewed and approved by both tech leads before any feature code is written.

**Resource requirements:** FE team (Vite + React + shadcn/ui + Dexie.js + Orval + MSW); BE team (Express.js ES6 + MongoDB + BullMQ + Redis + express-openapi-validator). Shared: OpenAPI spec, Prism mock server (FE dev).

---

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- Participant: registration → approval → ticket delivery → check-in (QR scan, OTP recovery, name search fallback)
- Participant: rejection notification, waitlist + auto-promotion, self-cancellation
- Admin: event create/clone/publish → segmented blast → approval queue (auto + manual + hybrid) → event day ops dashboard → post-event basic report
- Staff: offline-first check-in PWA (QR scan, OTP recovery, name search, manual override)
- Super Admin: account management, vendor email attachment, audit trail, state overrides, report regeneration
- Vendor: magic link basic report delivery (attendance + demographics + Excel/PDF export)

**Must-Have Capabilities:**

| Capability | Notes |
|---|---|
| **Event Management** | Create, publish, clone with full config (capacity, target criteria, approval mode, notification channel, scan format QR/barcode, double opt-in toggle, cancellation deadline) |
| **Criteria Validation Preview** | Before saving event target criteria, shows match count against participant database ("~847 contacts qualify") — count only, no sample; catches misconfiguration before any message is sent |
| **Invitation Blast** | Segmented blast via Brevo (email) + Everpro (WhatsApp); `consentStatus` check + suppression list enforced before every send; 4 named BullMQ queues (`otp` > `emergency-blast` > `transactional` > `marketing`) |
| **Registration Module** | Public event landing page + mobile-first form + optional double opt-in (configurable per event — if enabled, unconfirmed entries held in provisional state until confirmed or expired); phone-based pre-fill from participant history; reCAPTCHA v3 with log-and-flag fallback (`⚠ reCAPTCHA not verified` shown in approval queue) |
| **Admin Approval Workflow** | Auto / hybrid / manual mode configurable per event; rule-based scoring with confidence indicators ("why approved" explanations); pending → approved / rejected / waitlisted |
| **Notification Templates** | Admin-editable structured form with variable hints (`{name}`, `{eventTitle}`, `{date}`, `{venue}`) for all notification types (rejection, waitlist, promotion, ticket, OTP, emergency blast); plain-text compliant with WhatsApp template requirements |
| **Waitlist Engine** | Score-based auto-promotion (FIFO configurable per event); BullMQ delayed job for confirmation deadline enforcement; 2-attempt max then manual fallback to admin queue |
| **Self-Cancellation** | Cancel link in ticket; slot release triggers waitlist promotion cycle; data retention (status change only — not erasure) |
| **QR/Barcode Ticket Delivery** | Auto-generated ticket sent via configured channel (WhatsApp or email) on approval; scan format (QR default / barcode) configurable per event |
| **Offline-First Check-in PWA** | QR/barcode scan (ZXing-js, fully offline), OTP recovery, name search fallback, manual override with audit log; IndexedDB (Dexie.js) + Service Worker + background sync on reconnect; first-write-wins conflict resolution |
| **Sync Endpoints** | `GET /sync/participants/{eventId}` + `POST /sync/checkins` — in OpenAPI spec from Sprint 0; required before FE starts check-in PWA development |
| **Basic Analytics & Report** | Attendance report, registration funnel, participant demographics (industry, job title, age); `profileCompleteness` score computed on every registration create/update; magic link report delivery (signed URL + HMAC + expiry) |
| **Vendor DPA Acceptance Gate** | Checkbox + timestamp + DPA version reference stored per vendor record; re-acceptance required on DPA version change |
| **Admin Safety Layer** | Event state machine (Draft → Published → Live → Completed → Archived; Cancel action → Archived + mandatory blast + QR invalidation); soft delete 30-day recovery; full audit trail; destructive action confirmations |
| **5-Role RBAC** | `super_admin` / `event_admin` / `staff` / `vendor_client` / `participant`; JWT (15min access + 7-day refresh) + Redis blacklist; `super_admin`-only account creation/management |
| **Security Baseline** | Rate limiting (per-IP public, per-user authenticated); OTP single-use + expiry; input sanitization; reCAPTCHA v3; HMAC webhook verification; staff PWA session expiry (configurable hours — baseline device security) |
| **UU PDP Compliance** | Consent capture at registration; `consentStatus` field (`legacy_unverified` \| `re-consent-sent` \| `consented` \| `suppressed`); suppression list; anonymization path for erasure requests; vendor DPA gate |
| **Data Model Foundation** | `identitySignals` subdocument (`phones[]`, `emails[]`, `nameVariants[]`, `companyHistory[]` — arrays of objects with metadata); `profileCompleteness` score field; Lead Intelligence Suite config fields in event schema (toggles, consent fields) — UI ships Growth Phase 1 |
| **Service Abstractions** | `NotificationService.send()`, `ScoringService.score()` — provider-agnostic interfaces; no direct SDK calls from route handlers |
| **OpenAPI Contract** | Full spec (including `/sync/*` endpoints + standardized error response schema) reviewed and approved by both tech leads before feature development; Prism mock server running for FE dev |

**Sprint 0 prerequisites (not feature code — must start at project kickoff):**

| Task | Owner | Lead Time |
|---|---|---|
| Everpro WhatsApp Business API registration + Meta Business Verification | Business (Yorindo) | 2–4 weeks — start immediately |
| Re-consent campaign to 30K legacy contacts | Ops (runs Sprint 1 after Everpro live) | Depends on Everpro setup |
| Vendor DPA legal text prepared by counsel | Legal | Pre-launch deliverable |
| OpenAPI spec reviewed and approved by both tech leads | Both teams | Sprint 0 hard gate |

---

### Post-MVP Features

**Phase 2 — Growth (Intelligence Layer):**

| Feature | Dependency |
|---|---|
| Lead Intelligence Suite UI | Pre-event intent survey, vendor booth QR check-in, post-event WhatsApp survey, combined lead score — data model ready in MVP schema |
| AI Scoring Engine | Pluggable AI provider (OpenAI/Gemini) via `AI_PROVIDER` factory pattern; rule-based scoring at MVP, AI scoring added once adapter validated |
| Participant Accounts | Passwordless WhatsApp OTP login, profile auto-fill across events, attendance history dashboard |
| Vendor Portal | Multi-event report history, persistent login, self-service access — replaces magic link for multi-event vendors |
| Advanced Analytics | Branded PDF generator, scheduled delivery, multi-format export (PDF/Excel/CSV), field drop-off analytics, vendor feedback prompt (lead qualification rate tracking) |
| Notification Intelligence | Granular notification type controls, participant preference center, smart reminder sequences |
| Staff Device Security | PWA session PIN + admin remote session invalidation (baseline: session expiry is MVP; PIN + remote invalidation is Growth) |
| Continuous Identity Resolution | Composite matching on every registration; admin merge prompt for high-confidence matches |
| Registration Status Page | Participant self-service live status page (Pending / Approved / Rejected / Waitlisted) via unique per-registration link — no login required; reduces admin inbox load |
| Cancellation Reason Capture | Structured reason on self-cancellation (Schedule conflict / Not relevant / Work emergency / Other); feeds analytics as demand signal and targeting intelligence |
| Criteria Validation Preview (Enhanced) | Full sample preview — "~847 contacts qualify; sample of 10 shown" — builds on MVP count-only validation |
| Apple iCal (.ics) | Calendar file download via backend-served .ics route (`/events/{id}/calendar.ics`); complements MVP Google Calendar deep link |
| Optional Photo Capture | Photo at registration for visual identity assist at high-security events; configurable per event, not mandatory |

**Phase 3 — Vision (Platform Scale):**

| Feature | Dependency |
|---|---|
| Database Health Engine | Automated contact enrichment, duplicate detection, career progression tracking |
| Multi-Event Operations | Simultaneous event war room, cross-event benchmarking, conflict detection |
| Agenda & Speaker Management | Session builder, speaker profiles, session-level QR check-in |
| Multi-Tenant Platform | Offer platform to other Indonesian EOs as SaaS; requires tenant isolation layer |
| AI Lead Scoring at Scale | Model trained on cross-event attendance and engagement data |
| Vendor Self-Service Portal | Vendors configure Lead Intelligence preferences independently |

---

### Risk Mitigation Strategy

| Risk Category | Risk | Mitigation |
|---|---|---|
| **Technical** | Offline sync complexity | First-write-wins simplicity + Dexie.js abstraction; 0 lost records is launch blocker |
| **Technical** | OpenAPI contract drift between teams | `express-openapi-validator` enforces spec on every BE request; drift is a build error |
| **Technical** | BullMQ queue starvation under load | 4 named queues with dedicated workers — not priority integers |
| **Market** | Vendors don't value report over spreadsheet | MVP basic report first; Lead Intelligence Suite ships only after renewal rate + time-to-download signals are positive |
| **Market** | Auto-approval doesn't reach 50% target at launch | Conservative threshold; manual queue absorbs borderline cases; 50% is month-3 target not launch requirement |
| **Resource** | Two-team coordination breaks down | OpenAPI contract as single source of truth; Prism mock server unblocks FE independently of BE progress |
| **Resource** | Everpro setup delayed | Brevo email is first-class equal channel; delay shifts WhatsApp blast timeline but does not block platform launch |
| **Compliance** | Re-consent campaign delayed | Brevo email fallback for contacts without WhatsApp; Everpro setup starts at project kickoff — not sprint 1 |

---

## Functional Requirements

> **Capability contract:** Every feature in the final product must trace to an FR in this list. UX designers will only design what is listed here. Architects will only support what is listed here. Epic breakdown will only implement what is listed here.

### Event Management

- **FR1:** Event admin can create an event with full configuration — name, date, venue, capacity, target segment criteria, approval mode, notification channel, scan format, double opt-in toggle, and cancellation deadline
- **FR2:** Event admin can clone an existing event, inheriting all configuration with editable overrides
- **FR3:** Event admin can manage event state transitions through the defined lifecycle (Draft → Published → Live → Completed → Archived)
- **FR4:** Event admin can cancel a published or live event, triggering mandatory participant notification and ticket invalidation
- **FR5:** Event admin can configure the approval mode per event (automatic / hybrid / manual) with a configurable score threshold
- **FR6:** Event admin can configure the notification channel per event (WhatsApp or email)
- **FR7:** Event admin can configure the scan format per event (QR code or barcode)
- **FR8:** Event admin can set event capacity with a configurable buffer for waitlist and VIP holds

### Participant Database & Identity

- **FR9:** Super admin can import participant records from structured data sources into the platform database
- **FR10:** System automatically matches new registrations against existing participant profiles using composite identity signals (phone, email, name, company)
- **FR11:** Admin can review and merge duplicate participant profiles flagged by the identity matching system
- **FR12:** System computes and maintains a profile completeness score for each participant record, updated on every registration
- **FR13:** Admin can view a participant's full registration history, profile data, and event attendance record when reviewing an approval or account
- **FR14:** Participant can update their profile information during registration, with changes persisted to their stored profile

### Invitation & Communication

- **FR15:** Event admin can configure and send segmented invitation blasts to the participant database, filtered by industry, city, job title, and attendance history
- **FR16:** Event admin can schedule blast delivery for a specified date and time
- **FR17:** Super admin can create and edit notification message templates for each notification type, with named variable substitution (name, event title, date, venue)
- **FR18:** System enforces consent status and suppression list checks before including any contact in any outbound communication
- **FR19:** System delivers notifications via the event-configured channel with automatic fallback handling on delivery failure
- **FR20:** Event admin can trigger an emergency blast to all confirmed participants for a specific event
- **FR21:** System maintains a suppression list of contacts who have opted out or requested data erasure, permanently excluding them from outbound communications

### Registration & Approval

- **FR22:** Participant can view event details and availability on a public event landing page before registering
- **FR23:** Participant can register for a published event via a public web form
- **FR24:** System pre-fills registration form fields for returning participants identified by their phone number; pre-filled fields: name, email, company_name, position; additional fields (company_email, company_location, industry_type) pre-filled when available in the contact record
- **FR25:** System captures configurable participant intent signals during registration (e.g., solutions currently being evaluated)
- **FR26:** System processes each registration through the event-configured approval workflow (automatic, hybrid, or manual)
- **FR27:** System scores registrations using rule-based criteria and surfaces confidence indicators explaining each approval decision to the reviewing admin
- **FR28:** Admin can manually review, approve, reject, or waitlist individual registrations from the approval queue
- **FR29:** System sends automated notifications to participants on every approval status change, using admin-configured templates
- **FR30:** Approved participant can self-cancel their registration via a link in their ticket, releasing their slot; self-cancellation is only permitted before the event-configured cancellation deadline — after the deadline the link deactivates
- **FR30a:** If double opt-in is enabled for the event, system sends a confirmation request to the participant via the event-configured notification channel on form submission; unconfirmed registrations are held in a provisional state and expire after the admin-configured window (default: 24 hours) without entering the pending approval queue; slot position is not reserved during the provisional window — queue position is assigned on confirmation
- **FR31:** System maintains a waitlist queue and automatically promotes waitlisted participants when confirmed slots become available, subject to a configurable confirmation deadline
- **FR32:** System re-queues unconfirmed waitlist slots after a configurable number of failed auto-promotion attempts (default: 2), returning them to admin review

### Check-in Operations

- **FR33:** Staff can scan participant QR codes or barcodes to confirm event-day check-in
- **FR34:** Staff can initiate OTP-based identity recovery for participants who cannot present their ticket
- **FR35:** Staff can search for participants by name to perform manual check-in
- **FR36:** Staff can manually check in a participant with a logged override reason and staff identity record
- **FR37:** Staff can perform QR code scan check-in, OTP identity recovery, name search check-in, and manual override check-in without network connectivity; all check-in records are persisted locally and synced automatically when connectivity is restored
- **FR38:** System detects when a presented ticket belongs to a different event and notifies staff without exposing cross-event registration details
- **FR39:** Event admin can monitor real-time check-in progress, queue status, and attendance count during event operations

### Reporting & Vendor Intelligence

- **FR40:** System automatically generates a post-event attendance report upon event completion
- **FR41:** System delivers the vendor report to the configured vendor contact via a time-limited access link requiring no account login
- **FR42:** Vendor can download the event report in Excel and PDF formats
- **FR43:** Report includes attendance rate, registration funnel, and participant demographic breakdown by industry, job title, and age distribution
- **FR44:** Vendor must accept the current version of the data processing agreement before accessing any report; re-acceptance required when the DPA version changes
- **FR45:** Super admin can configure vendor contact email and report tier (standard / Lead Intelligence Suite) per event
- **FR46:** Super admin can regenerate a post-event report for a completed event

### Administration & Access Control

- **FR47:** Super admin can create, edit, and deactivate user accounts for all internal roles
- **FR48:** System enforces role-based access control, restricting all capabilities to those permitted for each role
- **FR49:** System maintains a full audit trail of all significant actions — event state changes, approval decisions, check-in overrides, admin account changes
- **FR50:** Admin can soft-delete events and records with a configurable recovery window (default: 30 days) before permanent deletion
- **FR51:** Admin can view and restore soft-deleted items within the recovery window
- **FR52:** System requires explicit confirmation before executing destructive or irreversible admin actions
- **FR53:** Super admin can override event state machine transitions with safeguarded access

### Compliance & Data Rights

- **FR54:** System captures explicit participant consent at registration, linked to the specific event and stated data processing purpose
- **FR55:** System maintains a consent status per participant and enforces it on all outbound communications
- **FR56:** Participant can request a copy of their stored personal data
- **FR57:** Participant can request erasure of their personal data, triggering anonymization of their records in historical data and activation of a suppression flag
- **FR58:** System distinguishes between registration cancellation (status change only, history retained) and data erasure (anonymization + permanent suppression)
- **FR59:** System prevents any outbound communication to participants whose consent status is `legacy_unverified` or `suppressed`
- **FR60:** System generates a Google Calendar deep link embedded in approval confirmation notifications, constructed from event metadata (title, date, venue)
- **FR61:** Before saving event target criteria configuration, system displays the count of participant database records matching the configured filters (industry, job title, city) — enabling admin to validate criteria scope before committing or sending any blast
- **FR62:** System detects duplicate registration attempts (same participant identifier + same event) and redirects the participant to their existing registration status rather than creating a second submission
- **FR63:** Admin can manually requeue a rejected registration for re-review, or promote it directly to waitlisted or approved status, with the action logged in the audit trail
- **FR-D1:** The system shall provide a personalized admin intelligence dashboard at `/app/dashboard` showing: (a) live metric cards for total contacts, events, companies, and pending registrations; (b) a participant quick-filter panel filterable by event, job title, industry type, and city with live matching contact count; (c) a vendor/sponsor event breakdown showing top vendors by event count using the existing `events.vendor_id` relation
- **FR-D2:** The system shall provide a company intelligence view at `/app/contacts/companies` displaying contacts aggregated by company name — showing per-company: contact headcount, primary industry, distinct events attended, and most common city; the view shall support filtering by industry and city and click-through navigation to the contact list pre-filtered by company
- **FR-D3:** The contact list filter bar shall support a Company Name filter dimension with facet counts, URL state persistence, and dismissible ActiveFilterPills — consistent with existing industry/city/companySize filter behavior; `GET /api/contacts/facets` shall return top 20 companies by contact count in addition to existing facets

---

## Non-Functional Requirements

### Performance

| NFR | Target | Context |
|---|---|---|
| **NFR-P1** | Participant registration page: First Contentful Paint ≤ 3 seconds | 4G (10 Mbps), cold load, Android Chrome |
| **NFR-P2** | Registration form submission → confirmation received: ≤ 60 seconds end-to-end | Includes queue processing, not just API response |
| **NFR-P3** | Admin dashboard initial load: ≤ 2 seconds | Desktop, broadband |
| **NFR-P4** | Check-in PWA participant list sync: ≤ 30 seconds for 300 participants | WiFi, before event start |
| **NFR-P5** | QR/barcode scan → confirmation (online mode): ≤ 2 seconds | Full round-trip including server write |
| **NFR-P6** | QR/barcode scan → confirmation (offline mode): ≤ 1 second | IndexedDB lookup only — no network call |
| **NFR-P7** | Post-event report generation: ≤ 10 minutes | Async background job; vendor notified on completion |
| **NFR-P8** | Vendor magic link report delivery: ≤ 24 hours after event completion | Automated trigger on event state → Completed |
| **NFR-P9** | OTP delivery (WhatsApp or email): ≤ 30 seconds | From request submission to message received |
| **NFR-P10** | Emergency blast queued and transmission initiated: ≤ 30 seconds of admin action | Platform SLA — what Yorindo controls. Full delivery within Everpro rate-limit capacity (~52 msg/min); events > 250 confirmed participants will exceed 5-minute full delivery window. |
| **NFR-P11** | `POST /registrations` returns 201 response: ≤ 3 seconds normal load, ≤ 5 seconds during burst | Synchronous acknowledgement only — approval processing is async via BullMQ. Admin approve/reject action returns ≤ 1 second. |

### Reliability

| NFR | Target | Notes |
|---|---|---|
| **NFR-R1** | API annual uptime: ≥ 99.5% | ~3.65 hours downtime/year. System must include: automated daily database backup to offsite storage, verified restore capability (tested monthly), documented recovery procedure with RTO ≤ 2 hours. Deployment blackout policy: no deployments or maintenance during event window ± 2 hours. |
| **NFR-R2** | Event-day availability: 100% during event window ± 2 hours | Zero tolerance for downtime during active check-in |
| **NFR-R3** | Message delivery rate: ≥ 95% WhatsApp + email combined | BullMQ retry with exponential backoff; dual-channel fallback; treat as launch blocker |
| **NFR-R4** | OTP delivery success rate: ≥ 99% | Highest-priority queue (`otp`); failure = blocked check-in recovery |
| **NFR-R5** | Attendance records lost due to offline sync failure: 0 | IndexedDB persists through app restart, browser close, and device reboot |
| **NFR-R6** | Background sync completion after reconnect: ≤ 60 seconds | From network restoration to all offline check-ins reflected on ops dashboard |

### Security

| NFR | Requirement |
|---|---|
| **NFR-S1** | All data in transit encrypted via TLS 1.2 or higher |
| **NFR-S2** | All personal data at rest encrypted at the storage layer |
| **NFR-S3** | JWT access tokens expire after 15 minutes; refresh tokens after 7 days; invalidated on logout via a server-side token blacklist |
| **NFR-S4** | OTP codes are single-use, expire after 5 minutes, invalidated immediately on use |
| **NFR-S5** | OTP requests rate-limited to maximum 3 per phone number per 10-minute window |
| **NFR-S6** | All inbound webhooks (Everpro, Brevo) verified via HMAC signature; unverified requests rejected with 401 |
| **NFR-S7** | Public registration form protected by an automated bot-detection mechanism; unavailable mechanism logs and flags submission — does not block registration |
| **NFR-S8** | All authenticated API requests validated against OpenAPI spec; schema violations return 400 with standardized error response |
| **NFR-S9** | Role claims in JWT resolved from database on token issue — not trusted from client payload |
| **NFR-S10** | Staff PWA sessions expire after configurable inactivity period (default: 8 hours) |
| **NFR-S11** | All secrets stored in environment variables; never committed to version control |
| **NFR-S12** | Vendor report magic link: maximum 7-day expiry; triggers file download (not browser-viewable page) to prevent screenshot/copy exposure |
| **NFR-S13** | Every vendor report magic link access (IP address, timestamp, user agent) logged for UU PDP audit accountability |
| **NFR-S14** | The registration form always collects a fixed baseline set (phone, name, email, company_email, company_name, company_location, position, industry_type); admin-configured custom survey fields are additive — rendered via rjsf from the event's JSON Schema; no custom field is shown that wasn't explicitly enabled by the admin (UU PDP Art. 16 — data minimization applies to custom fields, not the fixed baseline) |
| **NFR-S15** | Participant consent withdrawal (unsubscribe) completable in ≤ 2 taps/clicks from any notification message, without requiring login (UU PDP Art. 9(2) — withdrawal as easy as giving) |
| **NFR-S16** | All admin access to bulk participant data exports logged; logs retained for minimum 1 year for breach investigation (UU PDP Art. 46 — breach notification readiness) |

### Scalability

| NFR | Target | Notes |
|---|---|---|
| **NFR-SC1** | Participant database: support up to 100,000 records; search by phone, name, or industry returns results ≤ 500ms | 3 targeted indexes: compound `{industry, jobTitle, status}`, text `{name, company}`, single `{phone}` |
| **NFR-SC2** | Simultaneous active events: ≥ 5 concurrent; admin dashboard load ≤ 2 seconds with 5 concurrent active events | Multi-city operations baseline |
| **NFR-SC3** | Invitation blast transmission initiated within 30 minutes of scheduling | Dual-channel (Brevo email + Everpro WhatsApp); full delivery 4–8 hours for 30K-contact blast depending on channel ratio and rate limits |
| **NFR-SC4** | Event-day peak: QR scan → check-in confirmation ≤ 2 seconds at 300-pax load | Offline mode eliminates server-side peak dependency; sync load is post-event |
| **NFR-SC5** | Participant search by phone, name, or industry: results ≤ 500ms under normal load | |
| **NFR-SC6** | Concurrent load: ≥ 500 simultaneous registration form sessions; ≥ 10 simultaneous check-in device sessions; ≥ 5 concurrent admin sessions; ≥ 500 registration submissions within a 5-minute burst without timeout | Sized for typical targeted blast (2K–5K recipients, ~80% open rate, peak spike window). Full 30K all-contact blasts require infrastructure review before scheduling — may exceed VPS single-node capacity. |

### Data Integrity

| NFR | Requirement |
|---|---|
| **NFR-DI1** | Zero attendance records lost due to offline sync failure — IndexedDB persists through app restart, browser close, and device reboot |
| **NFR-DI2** | Zero duplicate attendance records in post-event report — sync layer deduplicates on upload; report generation includes deduplication step |
| **NFR-DI3** | All audit trail entries are immutable once written — no update or delete operations permitted on audit log |
| **NFR-DI4** | Participant data erasure uses anonymization, not hard delete — historical records remain structurally intact; reports not retroactively altered |
| **NFR-DI5** | Offline-to-online sync conflicts resolved by first-write-wins; duplicate check-in attempts flagged in audit log |

### Offline PWA

| NFR | Requirement |
|---|---|
| **NFR-PWA1** | Check-in PWA must meet Chrome PWA installability criteria (web manifest, Service Worker, HTTPS) to enable home screen installation on staff Android tablets |
| **NFR-PWA2** | Check-in PWA must request persistent storage permission on install to prevent browser storage eviction during event operations |
| **NFR-PWA3** | Participant data cache invalidated on reconnect if server-side version token has changed; devices with continuous connectivity check for version updates every 30 minutes; full participant list re-downloaded on version change |

### Accessibility

| NFR | Requirement | Scope |
|---|---|---|
| **NFR-A1** | Public participant registration form meets WCAG 2.1 Level AA for form elements — labels, error messages, color contrast, keyboard navigation | Broad public audience |
| **NFR-A2** | Admin dashboard and check-in PWA are fully keyboard-navigable; all interactive elements reachable via Tab key; all form inputs have visible labels | Internal tools — no specific WCAG target |
