# Epic 7: Event-Day Check-in (Offline-First PWA)

Staff can run seamless event-day check-in via QR scan, OTP identity recovery, name search, and manual override — fully offline-resilient with automatic sync on reconnect and real-time attendance monitoring for admins.

> **Phase 1 (FE):** PWA install prompt (designed banner, not browser default); QR scanner UI (`html5-qrcode`); scan result screen (success/already-attended/invalid/wrong-event states); offline indicator + queue counter badge; sync status toast with conflict summary; OTP input flow; name search + manual override form; live attendance monitor chart (polling) — all wired to MSW scan handler (MOCK_INVALID / MOCK_ALREADY test tokens)
> **Phase 2 (BE):** `POST /api/scan/verify`, registration status → `attended` write, `POST /api/scan/otp/request|verify`, OTP Redis storage + expiry + rate limit (NFR-S4/S5), `GET /api/events/:id/participants` (offline cache endpoint), `GET /api/events/:id/attendance` (live monitor SSE or polling), all scan repositories, audit trail writes

## Story 7.1: PWA Installation & Offline Participant Data Sync

As a staff member,
I want to install the check-in app on my tablet and download the participant list before the event,
So that I can perform check-in even when the venue WiFi is unreliable.

**Acceptance Criteria:**

**Given** Chrome on Android opens `/scan`,
**When** the PWA install prompt appears,
**Then** the app meets Chrome PWA installability criteria: valid web manifest, registered Service Worker, served over HTTPS (NFR-PWA1)

**Given** the browser `beforeinstallprompt` event fires,
**When** the `/scan` page is loaded for the first time,
**Then** a designed install banner is shown at the bottom of the screen (not the browser default mini-infobar) with: app icon, "Install Yorindo Check-in" label, and "Install" + "Not Now" buttons; clicking "Install" calls `promptEvent.prompt()` and dismisses the banner; "Not Now" dismisses for the session

**Given** the PWA is installed,
**When** it requests persistent storage,
**Then** the browser grants persistent storage permission — preventing eviction of IndexedDB data during the event (NFR-PWA2)

**Given** the app is opened before the event,
**When** `GET /api/events/:id/participants` is called,
**Then** up to 300 participant records are downloaded and cached in IndexedDB within 30 seconds on WiFi (NFR-P4)

**Given** the participant cache exists and the network is restored,
**When** the server-side version token has changed,
**Then** the full participant list is re-downloaded and the cache is invalidated (NFR-PWA3)

---

## Story 7.2: QR Code Scan Check-in (Online Mode)

As a staff member,
I want to scan a participant's QR code ticket and confirm their check-in in under 2 seconds,
So that the check-in queue moves quickly and participants feel welcomed.

**Acceptance Criteria:**

**Given** the camera is active on the `/scan` page,
**When** a valid ticket QR code is scanned,
**Then** `POST /api/scan/verify` is called with `{ token }` and a success confirmation (participant name + green indicator) is displayed within 2 seconds (NFR-P5)

**Given** the ticket belongs to a different event,
**When** `POST /api/scan/verify` is called,
**Then** it returns `{ error: { code: 'WRONG_EVENT' } }` and the UI displays "Tiket bukan untuk event ini" without exposing cross-event registration details (FR38)

**Given** the ticket has already been scanned (status = 'attended'),
**When** `POST /api/scan/verify` is called,
**Then** it returns `{ alreadyAttended: true, attendedAt }` and the UI displays an already-checked-in warning

**Given** an invalid or expired token is scanned,
**When** `POST /api/scan/verify` is called,
**Then** it returns HTTP 401 and the UI displays a clear invalid ticket error in Indonesian

**Given** a successful scan,
**Then** `registrations.status` is updated to `'attended'` and a `checkin.scan` audit entry is written

**MSW Test Tokens (for manual and automated testing of scan states):**
- `MOCK_INVALID` → 401 invalid/expired token response
- `MOCK_ALREADY` → 200 `{ alreadyAttended: true, attendedAt }` response
- Any other string → 200 success with seeded attendee profile

---

## Story 7.3: Offline Check-in Queue & Background Sync

As a staff member,
I want to continue scanning QR codes when offline, with scans automatically synced when connectivity is restored,
So that no attendance record is lost due to network issues during the event.

**Acceptance Criteria:**

**Given** the device has no network connectivity,
**When** a QR code is scanned,
**Then** the scan token is written to IndexedDB via `queueScan()` within 1 second (NFR-P6) and a success confirmation is displayed (optimistic UI)

**Given** offline scans are stored in IndexedDB,
**When** the device's `navigator.onLine` changes to `true`,
**Then** `flushScanQueue()` is called automatically and all pending scans are submitted to `POST /api/scan/verify`

**Given** the sync runs and a queued scan conflicts (participant already attended),
**When** the conflict is detected,
**Then** the conflict is surfaced in a post-sync summary showing: participant name, timestamp of original offline scan, and timestamp of the earlier attended record; the UI displays a toast "X conflict(s) detected after sync — tap to review" with a dismissible detail list (NFR-DI5)

**Given** the app is closed and reopened after offline scanning,
**When** the app reloads,
**Then** IndexedDB data persists and unsynced scans are still in the queue — browser storage eviction does not occur (NFR-R5, NFR-PWA2)

**Given** sync completes,
**Then** background sync completion occurs within 60 seconds of network restoration (NFR-R6)

**MSW Test Tokens (for testing offline-to-online sync conflict scenarios):**
- Use `MOCK_ALREADY` as the queued scan token to simulate a conflict response on flush
- Use any other string to simulate a successful flush with attendee profile

---

## Story 7.4: OTP-Based Identity Recovery

As a staff member,
I want to initiate OTP verification for a participant who cannot present their QR ticket,
So that legitimate attendees are not turned away due to a lost or inaccessible ticket.

**Acceptance Criteria:**

**Given** a participant cannot show their QR code,
**When** I tap "OTP Recovery" and enter the participant's phone number,
**Then** `POST /api/scan/otp/request` is called and an OTP is sent to the participant's registered phone via the event channel

**Given** the OTP delivery,
**When** the message is sent,
**Then** delivery occurs within 30 seconds (NFR-P9) and the OTP is single-use with a 5-minute expiry (NFR-S4)

**Given** the OTP request is made for the same phone number 4 times in 10 minutes,
**When** the 4th request is made,
**Then** it returns HTTP 429 — OTP rate-limited at 3 requests per phone per 10 minutes (NFR-S5)

**Given** the participant provides the correct OTP,
**When** `POST /api/scan/otp/verify` is called with `{ phone, otp }`,
**Then** their registration is marked `attended` and the success check-in screen is shown; OTP is invalidated immediately

---

## Story 7.5: Name Search & Manual Override Check-in

As a staff member,
I want to search for participants by name and perform a manual check-in with a logged override reason,
So that I can handle edge cases where neither QR nor OTP is available.

**Acceptance Criteria:**

**Given** I type a participant's name in the search field,
**When** `GET /api/events/:id/participants?name={query}` is called,
**Then** matching participants are returned within 500ms; results update as I type (debounced)

**Given** I select a participant from search results,
**When** I tap "Manual Check-in",
**Then** a confirmation dialog appears requiring me to enter an override reason before proceeding

**Given** I confirm the manual check-in with a reason,
**When** `POST /api/scan/manual-checkin` is called with `{ registrationId, reason }`,
**Then** the registration is marked `attended` and a `checkin.manual-override` audit entry is written with `{ actor_id (staff), reason, timestamp }`

**Given** a manual check-in is attempted while offline,
**When** the override is confirmed,
**Then** it is stored in IndexedDB with the reason and synced when connectivity restores

---

## Story 7.6: Real-Time Attendance Monitor (Admin Dashboard)

As an admin,
I want to see live check-in progress, queue status, and attendance count during the event,
So that I can make real-time decisions about staffing and capacity.

**Acceptance Criteria:**

**Given** an event is `live` and I am on the event detail page (`/admin/events/:id`),
**When** the page renders,
**Then** `GET /api/events/:id/attendance-stats` is polled every 5 seconds and the dashboard shows: total approved, attended count, attendance rate %, and a live check-in activity feed

**Given** the attendance stats update,
**When** the poll response arrives,
**Then** the numbers update without a full page reload — only the stats section re-renders

**Given** the live attendance counter,
**When** 5 concurrent check-in devices are scanning simultaneously,
**Then** the attendance count remains accurate within 1 polling interval (no double-counting due to DB-level unique constraint)

**Given** the event ends (status → `completed`),
**When** the page is viewed,
**Then** polling stops automatically and the final attendance stats are frozen

---
