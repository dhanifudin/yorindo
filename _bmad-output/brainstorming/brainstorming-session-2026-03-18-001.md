---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: ['docs/Project Brief EM . U - KADA.pdf']
session_topic: 'EM . U Registration & Participant Database Management System'
session_goals: 'Technical Architecture, Risk Identification, UX Flow Design'
selected_approach: 'ai-recommended'
techniques_used: ['Constraint Mapping', 'Reversal Inversion', 'Solution Matrix']
ideas_generated: 91
session_active: false
workflow_completed: true
---

# Brainstorming Session Results

**Facilitator:** Dian
**Date:** 2026-03-18

---

## Session Overview

**Topic:** EM . U Registration & Participant Database Management System
**Goals:** Technical Architecture · Risk Identification · UX Flow Design

### Context

EM . U Communication is a Technology Seminar Event Organizer (est. 2017) operating across 18 Indonesian cities with 30,000+ participant contacts. Building a 4-module system:
1. Data Architecture & Integration (Back-End)
2. Registration & Survey Module (Front-End)
3. Attendance & Barcode/QR Management (Mobile/Web)
4. Analytics & Reporting Dashboard

**Key concerns identified:** DB scalability, 3rd-party integration reliability (Brevo + Everpro), offline on-site check-in, high-volume admin screening workflow.

---

## Technique Selection

**Approach:** AI-Recommended — 3 Phase Sequence
**Total Ideas Generated:** 91

| Phase | Technique | Category | Purpose |
|---|---|---|---|
| 1 | Constraint Mapping | Deep | Surface all real vs imagined constraints before designing |
| 2 | Reversal Inversion | Creative | Flip every problem to expose hidden assumptions |
| 3 | Solution Matrix | Structured | Grid key variables against solution approaches |

---

## Complete Idea Inventory (91 Ideas)

### Theme 1: Participant Experience & Registration Journey *(21 ideas)*

**#17 — One-Screen Registration**
_Concept:_ Mobile-first registration form with minimum required fields (Name, Phone, Job Title, Company, Industry). Event-specific survey appears as step 2 only after core fields submitted.
_Novelty:_ Thumb-friendly for busy managers checking WhatsApp during meetings. Breaks the desktop-PDF-style form tradition in Indonesian EO industry.

**#18 — Smart Event Reminder Sequence**
_Concept:_ Auto-scheduled 3-touchpoint WhatsApp sequence after approval: (1) Confirmation + OTP immediately, (2) "See you tomorrow" + venue maps link 24h before, (3) "Event starts in 1 hour" + Google Maps deep link on event morning.
_Novelty:_ Participant never has to remember. Reduces no-show rate — directly protecting EM . U's credibility with vendor clients.

**#19 — Digital Ticket with Embedded Info**
_Concept:_ OTP confirmation message includes link to a lightweight participant page — name, event details, venue, OTP code, "Add to Calendar" button. PWA page accessible anytime from the WhatsApp link.
_Novelty:_ Single source of truth for the participant. Survives deleted WhatsApp messages.

**#20 — Rejection with Waitlist Option**
_Concept:_ Rejected registrants offered a waitlist spot. If approved participant cancels, system auto-promotes next waitlist person and sends OTP automatically.
_Novelty:_ Maximizes seat fill rate. Rejected participants feel respected — protecting EM . U brand for future events.

**#21 — Returning Participant Auto-Fill**
_Concept:_ Phone number entered first — system detects returning participant and pre-fills all personal fields from previous registration. Only new survey questions require input.
_Novelty:_ Eliminates repetitive form-filling. Also captures career progression when participants update job titles.

**#22 — Social Proof Registration Counter**
_Concept:_ Live counter on registration page — "47 IT Managers from Manufacturing have already registered." Segmented to show peer count, not just total.
_Novelty:_ Peer validation stronger than event description copy. A Director is more likely to attend seeing other Directors registered.

**#23 — Register My Team Bulk Flow**
_Concept:_ After personal registration, participant sees "Register a colleague?" — company/industry pre-filled, only name/phone/title needed. Single WhatsApp forward sends link to teammates.
_Novelty:_ Turns one registrant into three with zero marketing spend.

**#24 — OTP Recovery Self-Service**
_Concept:_ Participant opens registration link, enters phone number, taps "Resend OTP." New code delivered in seconds. Works offline via cached phone-to-OTP map on PWA.
_Novelty:_ Removes the most common on-site bottleneck — the "I deleted the WhatsApp" queue — without admin involvement.

**#25 — Cancellation + Reason Capture**
_Concept:_ Cancellation link in confirmation message. System asks one question: "Why can't you make it?" — Schedule conflict / Not relevant / Work emergency / Other. Seat opens for waitlist. Reason feeds into analytics.
_Novelty:_ Turns cancellations into market research. 30% cancelling "Not relevant" signals targeting problems.

**#26 — Urgency Nudge for Pending Registrants**
_Concept:_ Registrants in "Pending" status for 48+ hours receive automated WhatsApp: "Your registration is still being reviewed — seats are filling fast."
_Novelty:_ Prevents participants from assuming rejection and double-booking elsewhere.

**#43 — Real-Time Cancellation Cascade**
_Concept:_ Cancellation triggers: (1) seat count updates, (2) next waitlist participant auto-promoted and receives OTP, (3) cancelled participant flagged "Cancelled — Self" in analytics. Fully automated.
_Novelty:_ Empty seats are a revenue and credibility problem. Automated cascade keeps fill rate high without manual scrambling.

**#44 — Cancellation Window Policy**
_Concept:_ Admin configures cancellation deadline per event. After deadline, cancellation link deactivates. Participant gets: "Cancellation window has closed — we look forward to seeing you tomorrow."
_Novelty:_ Protects fill rate from last-minute cancellations that can no longer be backfilled.

**#57 — Required Field Hard Limit**
_Concept:_ System enforces maximum 5 required fields per form. Admin can add more but must mark as optional. Counter shows "Required fields: 5/5."
_Novelty:_ Admin creativity protected from itself. System enforces participant experience standards.

**#58 — Progressive Form Disclosure**
_Concept:_ 3 core fields shown first. Survey questions load only after core identity captured. Partial submissions (abandoned at step 2) still saved as leads.
_Novelty:_ Captures partial data rather than nothing. Step-2 abandoner is still a warmer lead than a non-opener.

**#59 — Form Completion Time Estimator**
_Concept:_ "This takes about 2 minutes" shown at top. Dynamically calculated. Warning to admin if form exceeds 4 minutes.
_Novelty:_ Translates "too many fields" into concrete time cost that admin can act on.

**#61 — Smart Field Reuse from Profile**
_Concept:_ Returning participants skip fields already in their profile. Pre-filled and locked. Only new questions visible.
_Novelty:_ Long forms feel short when 70% is already filled.

**#62 — Participant Account with Passwordless Login**
_Concept:_ Participants create a profile once. Future registrations: login via WhatsApp OTP → review pre-filled profile → answer event survey only → submit. Attendance history visible in participant dashboard.
_Novelty:_ Reuses existing Everpro WhatsApp channel. Login OTP and event confirmation OTP are same pattern. Zero new auth infrastructure.

**#75 — Double Opt-in Registration Confirmation**
_Concept:_ After form submission, participant receives WhatsApp or Email (admin-configurable per event) with confirmation link. Only confirmed entries enter Pending List. Unconfirmed expire after 24 hours.
_Novelty:_ Every entry in Pending List is a verified, reachable contact. Eliminates accidental or bot submissions.

**#80 — Participant Notification Control Center**
_Concept:_ Participant dashboard preferences panel — toggle WhatsApp/email on/off, set preferred channel, opt-out from marketing while keeping transactional messages (OTP, confirmation) always on.
_Novelty:_ UU PDP compliance built into UX. Transactional messages never blocked — only marketing is optional.

**#81 — Granular Notification Types**
_Concept:_ Admin configures which notification types sent per event — Registration Received, Approval/Rejection, Reminder (24h), Day-of Navigation, Post-event Survey, Vendor Follow-up. Each individually toggleable.
_Novelty:_ Prevents notification fatigue. Participant who attended 10 events won't block the number.

**#85 — One-Tap Calendar Integration**
_Concept:_ Digital ticket page includes "Add to Google Calendar" (deep link with event details) and "Add to Apple Calendar" (.ics download). Zero backend implementation — pure URL/file generation.
_Novelty:_ Calendar entry includes event name, date/time, venue address, Google Maps link, and OTP in notes.

---

### Theme 2: Check-in & Attendance Management *(13 ideas)*

**#1 — Offline Sync Conflict Triad**
_Concept:_ Three failure modes on reconnect: ID conflicts, status not propagating, lost records. Treated as one distributed consistency problem requiring unified solution.
_Novelty:_ Naming them together forces a single architectural solution rather than three separate bug fixes.

**#2 — PWA as Offline-First Shell**
_Concept:_ Service Worker caches approved attendee list locally at event start. All scans write to IndexedDB first, sync to MongoDB when connection restores. Server is source of truth only after sync.
_Novelty:_ Flips architecture — "offline-first with online sync" not "online with offline fallback."

**#3 — First-Write-Wins Attendance Ledger**
_Concept:_ Offline sync resolves conflicts by timestamp — earliest scan wins, duplicates logged but ignored. MongoDB `$setOnInsert` makes this trivial.
_Novelty:_ Attendance log treated as append-only ledger, not updatable record.

**#4 — WhatsApp OTP Check-in**
_Concept:_ When approved, participant receives 6-digit OTP via Everpro/WhatsApp. On arrival, staff types or scans QR code → system marks present. OTP list cached in PWA for offline use.
_Novelty:_ Zero hardware dependency. Works even if participant forgot phone. Staff can handle verbally in a crowd.

**#40 — Printable Emergency Attendee List**
_Concept:_ 24h before event, system auto-generates PDF of all approved participants — name, company, OTP, sorted A-Z. Physical backup if everything fails. Checked manually, synced later.
_Novelty:_ Lowest-tech fallback is most reliable. Paper never crashes.

**#41 — PWA Health Check on Event Morning**
_Concept:_ At 6am on event day, admin receives WhatsApp: "Event day checklist: ✅ 247 confirmed ✅ Offline data cached ✅ OTP list ready." Link forces fresh PWA cache sync.
_Novelty:_ Moves system check from 8am panic to 6am calm — while there's still time to fix issues.

**#42 — Degraded Mode Check-in**
_Concept:_ If PWA has no cached data, switches to "Degraded Mode" — staff enters last 4 digits of participant phone, matches against minimal locally-stored lookup table.
_Novelty:_ Even in catastrophic failure, check-in never fully stops. It just slows down.

**#46 — Multi-Device Parallel Check-in**
_Concept:_ Check-in PWA works on any staff phone with event-scoped credentials. 5 staff = 5 simultaneous check-in lanes. Conflict resolution handled by first-write-wins.
_Novelty:_ Throughput scales linearly with staff count. Calibrated to expected crowd size per event.

**#47 — Pre-Event OTP Nudge with Screen Tip**
_Concept:_ Morning-of reminder includes: "Have your 6-digit code ready: [OTP]. Screenshot this message for faster check-in."
_Novelty:_ Moves "find your OTP" friction from check-in queue to participant's commute.

**#48 — Name Search as Scan Fallback**
_Concept:_ Staff types first 3 letters — matching names appear instantly from cached list. One tap to check in. No scanning required.
_Novelty:_ QR scan is fast lane. Name search is fallback lane. Nobody gets stuck.

**#49 — Alphabetical Self-Serve Check-in Zones**
_Concept:_ Large events (150+) divided into A-H, I-P, Q-Z zones with dedicated staff and device each. Signage directs participants to their zone immediately.
_Novelty:_ Solves queue before it forms. Works even if app is slow.

**#63 — Configurable Scan Format per Event**
_Concept:_ Event creation includes "Check-in Format" toggle — QR Code or Barcode. System generates appropriate format for tickets and configures ZXing-js scanner accordingly. Default: QR Code.
_Novelty:_ Some venues have existing barcode hardware. Admin flexibility prevents forcing format changes on operations that already work.

**#88 — Session-Level QR Check-in**
_Concept:_ Each agenda session gets unique QR displayed at room entrance. Participants scan to mark attendance for that session. Vendor clients see which sessions were attended, not just event attendance.
_Novelty:_ Session attendance is the most precise interest signal available without asking participants directly.

---

### Theme 3: Admin Workflow & Safety *(10 ideas)*

**#9 — Smart Auto-Approval Engine**
_Concept:_ Admin sets per event: seat capacity, target criteria (industry + job title keywords), approval mode (Manual / Auto / Hybrid). In Hybrid, AI scores each registrant — above threshold auto-approves until capacity fills, below auto-rejects, borderline queues for manual review.
_Novelty:_ Admin effort scales with edge cases only. A 500-registrant event might need only 20 manual reviews.

**#10 — Event Creation as Strategy Config**
_Concept:_ "Create Event" form becomes strategic configuration — admin defines ideal participant profile (industry tags, job titles, cities). This profile drives both invitation blast segmentation AND auto-approval scoring. One config, two uses.
_Novelty:_ EM . U's "targeted audience" promise becomes system-enforceable, not just human judgment.

**#38 — Criteria Validation Preview**
_Concept:_ Before saving event config, system simulates against 30K database — "Based on your criteria, ~847 contacts qualify. Here's a sample of 10." Admin sees real names/profiles before committing.
_Novelty:_ Catches misconfiguration before a single message is sent.

**#39 — Registration Anomaly Alert**
_Concept:_ During live registration, system monitors approval patterns. Spike in non-target job titles triggers admin alert: "Warning: 23% of recent approvals don't match your target criteria."
_Novelty:_ Catches gaming attempts in real-time, not after the event.

**#51 — Event State Machine**
_Concept:_ Events have strict states: Draft → Published → Live → Completed → Archived. Each state locks specific fields. Live events cannot be deleted — only archived. Transitions require explicit confirmation.
_Novelty:_ System enforces rules admin might forget under pressure. UI prevents catastrophic actions based on context.

**#52 — Soft Delete Everything**
_Concept:_ Nothing hard-deleted. All deletions move to 30-day recovery bin. Permanent deletion requires second admin confirmation.
_Novelty:_ "Delete" becomes "hide." Data always recoverable. Removes existential fear of misclicks.

**#53 — Destructive Action Confirmation with Impact Preview**
_Concept:_ Before dangerous actions — bulk reject, cancel event — system shows impact preview: "You are about to reject 47 participants. This will send 47 rejection WhatsApp messages immediately. Type REJECT to confirm."
_Novelty:_ Friction is a feature for destructive actions. Forces admin to read what they're about to do.

**#54 — Audit Trail Log**
_Concept:_ Every admin action logged — who, what, when, on which event. Before/after state captured. Read-only, visible to super_admin, exportable.
_Novelty:_ When something goes wrong, the answer is always in the log. Also deters careless actions.

**#55 — Published Event Edit Warnings**
_Concept:_ Editing published event triggers yellow banner: "This event has 247 confirmed participants. Changes to venue/date will trigger re-notification to all confirmed participants. Proceed?"
_Novelty:_ Admin doesn't need to remember rules — system reminds them of downstream effects.

**#56 — Two-Factor Authorization for Critical Actions**
_Concept:_ Highest-risk actions — bulk reject, cancel event, delete data — require second admin approval within 10 minutes, or verification code sent to account owner's phone.
_Novelty:_ Most dangerous actions should never be one-click. Human checkpoint survives tired fingers.

---

### Theme 4: Multi-Event & Content Management *(9 ideas)*

**#31 — Event Cloning**
_Concept:_ Admin clones existing event — all config copied: form fields, survey questions, criteria, lead intelligence toggles, templates. Only date, city, venue, capacity need changing.
_Novelty:_ A "Seminar AI untuk Rumah Sakit" in Jakarta is 90% identical to the same in Surabaya. Cloning eliminates repetitive setup entirely.

**#32 — Role-Based Event Access**
_Concept:_ Admin accounts have event-scoped permissions. Field staff in Surabaya sees only Surabaya events. Regional manager sees their region. HQ sees everything.
_Novelty:_ 18 cities of staff without scoped access = one wrong click affects the wrong event.

**#33 — Simultaneous Event War Room**
_Concept:_ HQ admin sees all active events on one screen — registration count vs capacity, pending approvals, messages delivered, live check-in progress. Color-coded: green (healthy), yellow (needs attention), red (urgent).
_Novelty:_ Managing two events same weekend currently means switching spreadsheets. One screen for Cikarang and Denpasar simultaneously.

**#34 — Cross-Event Participant Identity**
_Concept:_ Phone number as universal identifier across all events. System flags participant registered for multiple upcoming events. Profile shows full attendance history.
_Novelty:_ A participant who attended 5 EM . U events surfaces automatically as a priority contact for vendor clients.

**#35 — Shared Template Library**
_Concept:_ Message templates, survey question banks, approval criteria stored at organization level. Admin picks from library when creating events. "Healthcare Seminar Survey Pack," "Manufacturing IT Criteria" etc.
_Novelty:_ Institutional knowledge encoded into system. New staff build on what worked, not from scratch.

**#36 — Conflict Detection for Participants**
_Concept:_ Participant registered for Event B while approved for Event A on same date → system flags it. Admin sees warning. Auto-sends "Did you mean to register for both?" WhatsApp.
_Novelty:_ Protects seat capacity for both events. Prevents double-booking.

**#37 — Event Performance Benchmarking**
_Concept:_ After each event, auto-generates performance card — registration rate, approval rate, attendance rate, no-show rate, lead quality score. New events show benchmark comparison against previous similar events.
_Novelty:_ Turns historical data into operational intelligence. EM . U can tell vendor clients "Our Healthcare seminars consistently deliver 75%+ attendance" — with data.

**#86 — Event Agenda Builder**
_Concept:_ Event creation includes "Agenda" tab — admin adds sessions with time slot, title, speaker, room/track. Drag-and-drop reordering. Published agenda displays on landing page as clean timeline.
_Novelty:_ Agenda visibility directly impacts registration conversion — participant on the fence decides when they see a relevant speaker.

**#87 — Speaker Profile Management**
_Concept:_ Speakers stored at organization level — name, photo, job title, company, bio, LinkedIn. Picked from library when building agenda. Speaker who presents at 5 events created once, reused across all.
_Novelty:_ Builds EM . U's speaker network as a visible asset. Repeat speakers develop recognition.

---

### Theme 5: Integration & Communication *(8 ideas)*

**#11 — Resilient Message Queue with Manual Fallback**
_Concept:_ All outbound messages go through BullMQ job queue. Failed jobs retry with exponential backoff. After max retries, status flips to "Delivery Failed" — admin gets one-click button opening `wa.me/628xxx?text=[pre-filled OTP message]`.
_Novelty:_ Every message either confirms delivered, retrying, or needs human action. No participant falls through the cracks.

**#11b — Dual-Channel Fallback**
_Concept:_ Queue attempts WhatsApp first (Everpro). On failure after retries, automatically falls back to Email (Brevo). Admin configures preferred channel per event — or per participant. Manual `wa.me` link remains last resort.
_Novelty:_ Both Brevo and Everpro already in integration plan — fallback costs zero extra vendor dependency.

**#12 — Pre-filled WA Template Library**
_Concept:_ Admin manages message templates per event — confirmation OTP, rejection notice, reminders, post-event follow-up. The `wa.me` fallback link pulls from same template as automated messages.
_Novelty:_ Manual fallback messages consistent with automated ones. Template management becomes useful beyond the fallback case.

**#13 — Post-Event Interest Survey via WhatsApp**
_Concept:_ 2 hours after event, system auto-sends 3-question WhatsApp: "Did you find today's session valuable? Are you evaluating [vendor solution]? Would you like vendor to follow up?" Responses feed into analytics as engagement scores.
_Novelty:_ Turns Everpro from notification tool into lead-qualification engine.

**#14 — Vendor Booth Self Check-in QR**
_Concept:_ Each vendor sponsor gets unique QR for their booth. Participant scans voluntarily ("scan to get brochure"). System records booth visit linked to participant profile.
_Novelty:_ Opt-in signal is stronger than passive attendance. Participant who walked to booth and scanned is a genuinely warm lead.

**#15 — Registration Intent Capture**
_Concept:_ Standard question across all events: "Which solutions are you currently evaluating or planning to budget for?" — checkbox of vendor categories. Pre-event intent signal for vendor booth preparation.
_Novelty:_ Vendor clients can see intent before the event. Useful for who to prioritize meeting.

**#16 — Lead Intelligence Suite — Per-Event Config**
_Concept:_ Event creation includes "Lead Intelligence" section — three toggleable features: (1) Pre-event intent survey, (2) Vendor booth QR check-in, (3) Post-event follow-up survey. Each toggle reveals config options. All disabled by default.
_Novelty:_ Lightweight for simple events, powerful for premium vendor-sponsored seminars. Priceable as a premium tier.

**#82 — Unsubscribe Handling + Suppression List**
_Concept:_ Every message includes unsubscribe option. Unsubscribed contacts go into suppression list — never messaged again. Suppression list checked before every blast. Admin can see count but cannot override individuals.
_Novelty:_ Protects EM . U's sender reputation with Brevo/Everpro. High unsubscribe rates get accounts flagged.

---

### Theme 6: Analytics, Reporting & Intelligence *(6 ideas)*

**#45 — Cancellation Reason as Analytics Signal**
_Concept:_ Cancellation reasons feed into vendor reporting — not just operational data. Report distinguishes: Attended / No-Show / Cancelled-Early / Cancelled-Late. "15 cancelled: Not Relevant" becomes targeting insight.
_Novelty:_ Transforms failure metric into market intelligence.

**#50 — Check-in Speed Analytics**
_Concept:_ System timestamps every scan — arrival vs check-in completion. Post-event report shows average duration, peak queue time, slowest scan moments. Used to optimize staff deployment at future events.
_Novelty:_ Each event EM . U runs gets faster than the last.

**#60 — Field Drop-off Analytics**
_Concept:_ System tracks which form field causes abandonment. Post-event admin sees: "32 abandoned at Question 4: Annual IT Budget. Consider making this optional."
_Novelty:_ Data-driven form optimization. Each event produces a better form than the last.

**#76 — Multi-Format Export Engine**
_Concept:_ Every report has export button with three options — PDF (branded with charts), Excel/CSV (raw data for CRM import), printable view. Export respects current filters.
_Novelty:_ Vendor clients have different internal workflows. One engine serves all.

**#77 — Branded PDF Report Generator**
_Concept:_ PDF reports include EM . U header, vendor client logo, event name, auto-generated executive summary: "87 participants attended. 62% IT Decision Makers. Top industries: Manufacturing 34%, Healthcare 28%."
_Novelty:_ Vendor clients forward this directly to sales team. EM . U's logo on every page = free brand exposure.

**#78 — Scheduled Report Delivery**
_Concept:_ Vendor clients subscribe to automated report delivery — daily during registration period + final report auto-sent 24h after event ends. Delivered via Brevo with PDF attached.
_Novelty:_ Vendor clients don't need to log into dashboard. Reports come to them.

**#79 — Export Audit Trail**
_Concept:_ Every data export logged — who exported, filters applied, format, timestamp. Visible to super_admin.
_Novelty:_ Full accountability on every data extraction. Closes the cross-contamination risk.

---

### Theme 7: Event Landing Page & Discovery *(4 ideas)*

**#71 — Public Event Landing Page**
_Concept:_ Each event gets `/events/[event-slug]` — event title, date, venue, speakers, agenda, sponsor logos, "Register Now" CTA. Open Graph preview image for social sharing. Fully public.
_Novelty:_ Participants currently receive a bare registration link. Landing page builds credibility, reduces drop-off.

**#72 — Registration Status Page**
_Concept:_ After submitting form, participant lands on personal status page showing current status: Pending / Approved / Rejected / Waitlisted. Live-updating without refresh.
_Novelty:_ Replaces post-registration anxiety with self-service check. Admin inbox stays quiet.

**#73 — Event Page Social Sharing**
_Concept:_ Pre-formatted share buttons — WhatsApp, LinkedIn. WhatsApp share opens with: "I'm attending [Event Name] on [Date] in [City] — join me! [link]"
_Novelty:_ Turns confirmed participants into event promoters. Peer-to-peer reach in target industries.

**#74 — Countdown Timer + Seat Availability**
_Concept:_ Landing page shows live countdown and remaining seat count — "47 seats remaining." When seats fill, CTA changes to "Join Waitlist" automatically.
_Novelty:_ Genuine urgency — numbers are real.

---

### Theme 8: Venue & Logistics *(4 ideas)*

**#27 — Rich Venue Card in Confirmation**
_Concept:_ OTP confirmation includes full hotel name, full address, Google Maps deep link (coordinates), nearest landmark, and parking info.
_Novelty:_ Coordinates never lie — even if two hotels share similar names.

**#28 — Day-Of Navigation Nudge**
_Concept:_ Morning of event (7am for 9am seminar), system auto-sends: "Good morning! Your event starts in 2 hours. Tap here to navigate → [Google Maps link]."
_Novelty:_ Participant opens WhatsApp in the morning and navigation is one tap away.

**#29 — Venue Change Emergency Blast**
_Concept:_ Admin panel has "Venue Changed" button. One click blasts all approved + waitlisted participants via WhatsApp AND email with new location instantly.
_Novelty:_ Compresses a 2-hour panic into a 30-second admin action.

**#30 — Live Event Status Page**
_Concept:_ Every participant's digital ticket page shows live event status — Confirmed / Venue Changed / Delayed / Cancelled — updated by admin in real-time.
_Novelty:_ Single source of truth that survives buried WhatsApp messages.

---

### Theme 9: Security & Compliance *(5 ideas)*

**#66 — API Rate Limiting per Endpoint**
_Concept:_ express-rate-limit + Redis limits per IP per time window. Registration: 5/10min. OTP resend: 3/hour. Login: 10/15min. Each endpoint individually tuned.
_Novelty:_ Prevents brute-force OTP guessing and registration spam bots. Redis ensures counters survive restarts.

**#67 — OTP Expiry + Single Use**
_Concept:_ Every OTP has 24-hour expiry and invalidated immediately after first successful use. Reuse returns explicit "already used" error.
_Novelty:_ OTP theft window closed. Intercepted WhatsApp message is worthless after first use.

**#68 — Input Sanitization Middleware**
_Concept:_ All request bodies pass through sanitization layer — strips HTML tags, rejects script injection, validates types against OpenAPI spec.
_Novelty:_ Stored XSS via registration form fields (malicious Company Name) could execute code in admin panel. This prevents it.

**#69 — Admin Action Anomaly Detection**
_Concept:_ System flags suspicious behavior — bulk rejection of 200 in 30 seconds, mass export outside business hours, login from new IP + immediate sensitive action. Alerts sent to super_admin via WhatsApp.
_Novelty:_ Insider threats and compromised accounts caught before damage done.

**#70 — CAPTCHA on Public Registration Form**
_Concept:_ Google reCAPTCHA v3 (invisible, score-based). Below threshold = silent block. Grey zone = visible challenge. Legitimate mobile users see zero friction.
_Novelty:_ Only bots and suspicious behavior trigger visible challenge.

---

### Theme 10: Developer Workflow & Architecture *(4 ideas)*

**#64 — OpenAPI Contract-First Development**
_Concept:_ Full API contract defined in `openapi.yaml` before any code written. Frontend generates TypeScript types via openapi-typescript. Backend validates requests via express-openapi-validator. Swagger UI provides live documentation.
_Novelty:_ Frontend and backend teams work in true parallel. Zero integration surprises at merge time.

**#65 — Versioned API from Day One**
_Concept:_ All routes prefixed `/api/v1/`. Breaking changes introduce `/api/v2/` running alongside. OpenAPI spec versioned in git.
_Novelty:_ Versioning costs nothing now, saves massive pain when vendor clients integrate.

**#83 — Prism Mock Server from OpenAPI Spec**
_Concept:_ Prism by Stoplight reads `openapi.yaml` and spins up mock HTTP server at `localhost:4010`. Frontend develops against mock. When backend ready, swap one `.env` URL.
_Novelty:_ Backend taking 2 weeks doesn't block frontend at all. True parallel development.

**#84 — MSW for Frontend Testing**
_Concept:_ Mock Service Worker intercepts API calls in browser during testing. Frontend defines handlers matching OpenAPI spec. Works with Vitest + React Testing Library.
_Novelty:_ Prism for development, MSW for testing. Frontend completely independent from backend throughout lifecycle.

---

### Theme 11: Infrastructure *(2 ideas)*

**#89 — Local VPS File Storage**
_Concept:_ Speaker photos, event banners, exported PDFs stored on VPS filesystem under `/uploads/[org]/[event]/`. Served via Nginx static file serving.
_Novelty:_ At current scale, S3 adds complexity without benefit. Migrate to object storage when VPS disk becomes constraint.

**#90 — MongoDB Search Index Strategy**
_Concept:_ Three targeted indexes: (1) Compound `{industry, jobTitle, status}` for admin filter queries, (2) Text index `{name, company}` for free-text search, (3) Single `{phone}` for OTP lookup and returning participant detection.
_Novelty:_ Three indexes cover 95% of query patterns without over-indexing. Fast at 100K+ contacts.

---

### Theme 12: AI Infrastructure *(1 idea)*

**#91 — Pluggable AI Provider via Configuration**
_Concept:_ The AI scoring engine (Smart Auto-Approval #9) is abstracted behind a provider interface. Admin configures `AI_PROVIDER` in system settings — switching between `openai` (GPT-4o) and `gemini` (Gemini Pro) without code changes. Each provider implements the same `scoreParticipant(profile) → score (0-100)` contract.

```
/services/ai/
  ├── provider.interface.ts     ← scoreParticipant() contract
  ├── openai.provider.ts        ← OpenAI implementation
  ├── gemini.provider.ts        ← Gemini implementation
  └── ai.factory.ts             ← reads AI_PROVIDER env, returns correct instance
```

```env
AI_PROVIDER=gemini    # or openai
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
```

_Novelty:_ Prevents vendor lock-in on AI infrastructure. If OpenAI pricing spikes or Gemini improves, EM . U switches in one config change. Adding a third provider (Claude, local LLM) requires only a new adapter.

---

## Solution Matrix (Final Architecture Decisions)

| Module | Decision |
|---|---|
| **Database** | Pure MongoDB + 3 targeted indexes |
| **Backend API** | Express (Node.js) |
| **Frontend** | Vite + React + shadcn/ui (Single PWA) |
| **Offline Sync** | IndexedDB + Dexie.js + Service Worker Background Sync |
| **Message Queue** | BullMQ + Redis |
| **Auth & RBAC** | JWT + Redis blacklist + 5 roles (super_admin, event_admin, staff, vendor_client, participant) |
| **Participant Auth** | WhatsApp OTP passwordless login via Everpro |
| **3rd Party** | Brevo (email) + Everpro (WhatsApp) + HMAC webhook verification |
| **Dual-channel** | WhatsApp primary → Email fallback → Manual wa.me last resort |
| **AI Provider** | Pluggable — OpenAI / Gemini via `AI_PROVIDER` config, factory pattern |
| **Analytics** | Custom Recharts inside PWA |
| **Deployment** | VPS + PM2 + Nginx (Development + Production) |
| **Scan Format** | QR Code (default) / Barcode (configurable per event) |
| **QR Library** | ZXing-js via PWA Camera API |
| **API Contract** | OpenAPI 3.0 + openapi-typescript + express-openapi-validator |
| **Code Generation** | Orval (React Query hooks from spec) |
| **Mock Server** | Prism (development) + MSW (testing) |
| **API Docs** | Swagger UI |
| **Calendar** | Google Calendar deep link + Apple iCal .ics |
| **File Storage** | Local VPS + Nginx static serving |
| **Search** | 3 targeted MongoDB indexes |
| **Environments** | Development + Production |

---

## Prioritization Results

### Top 3 High-Impact Ideas

| Priority | Idea | Why |
|---|---|---|
| 1 | **Smart Auto-Approval Engine** (#9-10) | Directly delivers EM . U's core promise of targeted audience to vendor clients |
| 2 | **Participant Account + Passwordless Login** (#62) | Eliminates registration friction permanently, builds long-term identity asset across all events |
| 3 | **Lead Intelligence Suite** (#13-16) | Transforms EM . U from event organizer to B2B lead intelligence platform |

### Top 5 Quick Wins

| # | Idea | Why Fast |
|---|---|---|
| 1 | **Event State Machine** (#51) | Pure backend state logic, prevents catastrophic mistakes |
| 2 | **Rich Venue Card + Day-of Navigation** (#27-28) | URL templates, reuses existing message queue |
| 3 | **OTP Single-Use + Expiry** (#67) | Few lines of code, critical security gap closed immediately |
| 4 | **Smart Reminder Sequence** (#18) | Reuses BullMQ + Everpro already in stack |
| 5 | **Multi-Device Parallel Check-in** (#46) | Works by design with PWA — no extra development needed |

### Breakthrough Concepts

| Concept | Long-term Potential |
|---|---|
| **Lead Intelligence Suite** | Reframes EM . U's entire value proposition — from EO to B2B lead intelligence platform |
| **Event Performance Benchmarking** (#37) | Creates proprietary data moat across 18 cities + 30K contacts — impossible for competitors to replicate quickly |
| **Participant Account Ecosystem** (#62) | Persistent identity turns a one-time attendee database into a living professional network |
| **Pluggable AI Provider** (#91) | Future-proofs the AI layer — swap providers as the market evolves without code changes |

---

## Action Plans

### Priority 1: OpenAPI Contract (This Week)
**Why first:** Unblocks both teams to work in parallel immediately.
1. Both teams co-author `openapi.yaml` covering all 4 modules
2. Frontend team runs `prism mock openapi.yaml` — starts UI development
3. Backend team sets up Express boilerplate + MongoDB + BullMQ + Redis
4. Orval generates React Query hooks from spec

### Priority 2: Core Infrastructure (Week 1-2)
1. MongoDB schema design — Participant, Event, Registration, Message, AuditLog collections
2. Express middleware stack — rate limiting, input sanitization, JWT auth, RBAC guards
3. BullMQ job queues — WhatsApp channel, Email channel, retry logic, fallback triggers
4. Event State Machine implementation
5. AI provider factory — `provider.interface.ts` + OpenAI + Gemini adapters

### Priority 3: MVP Registration Flow (Week 2-3)
End-to-end slice: Landing Page → Form → Double Opt-in → Pending List → Admin Approval → OTP Delivery → QR Ticket
This validates the entire stack before building remaining features.

### Priority 4: Check-in System (Week 3-4)
PWA offline-first check-in with IndexedDB + Dexie.js, QR scanner via ZXing-js, first-write-wins sync, degraded mode fallback.

### Priority 5: Analytics & Reporting (Week 4-5)
Custom Recharts dashboard, branded PDF export, scheduled report delivery, lead quality scoring.

---

## Session Summary & Insights

### Key Achievements
- **91 ideas** generated across 3 techniques and 12 domains
- **Complete architecture decisions** covering the full stack from VPS to PWA
- **Risk mitigation** for all 3 critical failure scenarios (wrong audience, system down, data contamination)
- **Clear implementation roadmap** from quick wins to breakthrough features

### Creative Breakthroughs
1. **Offline-first architecture flip** — treating the PWA as the primary system, server as eventual sync target
2. **Event Creation as Strategy Config** — one configuration panel drives invitation targeting AND approval criteria simultaneously
3. **Lead Intelligence Suite** — the realization that "attended ≠ engaged" transforms the analytics value proposition entirely
4. **Pluggable AI Provider** — abstracting AI behind an interface prevents lock-in as the LLM market evolves rapidly
5. **Reversal Inversion payoff** — every sabotage scenario directly produced a hardened feature (state machine, soft delete, audit trail, rate limiting, CAPTCHA)

### System Design Principles Emerged
- **Configurable by default** — scan format, notification channel, lead intelligence, approval mode, AI provider — all configurable per event or system-wide
- **Graceful degradation** — every critical flow has a fallback: WhatsApp → Email → Manual; Online → Offline → Degraded Mode; QR Scan → Name Search → Manual List
- **Data as compounding asset** — participant profiles, attendance history, engagement signals, and benchmarking data grow in value with every event run

### Recommended Next Step
**Start with `openapi.yaml`** — it costs one team meeting, produces a shared contract, and immediately enables parallel development. Everything else follows from it.

---

*Session facilitated using BMad Brainstorming Workflow*
*Technique sequence: Constraint Mapping → Reversal Inversion → Solution Matrix*
*Session date: 2026-03-18 | Facilitator: Dian | Client: EM . U Communication × KADA*
