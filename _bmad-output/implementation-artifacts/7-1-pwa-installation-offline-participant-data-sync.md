# Story 7.1: PWA Installation & Offline Participant Data Sync

**Story ID:** 7.1
**Story Key:** 7-1-pwa-installation-offline-participant-data-sync
**Epic:** Epic 7 — Event-Day Check-in (Offline-First PWA)
**Phase:** Phase 1 (FE) — PWA setup + install banner + IndexedDB foundation
**Status:** review
**Created:** 2026-03-20

---

## Story

As a staff member,
I want to install the check-in app on my tablet and download the participant list before the event,
So that I can perform check-in even when the venue WiFi is unreliable.

> **Phase 1 FE scope:** Configure PWA manifest, design the custom install banner (NOT browser default), implement `beforeinstallprompt` capture, set up IndexedDB participant cache with `idb` library — all wired to MSW. The scan surface itself is Story 7.2.

---

## Acceptance Criteria (FE Phase 1)

**AC1:** Given `/scan` is opened on Chrome Android (simulated),
When the PWA installability criteria are met,
Then the `beforeinstallprompt` event fires and the custom install banner appears (not the browser mini-infobar)

**AC2:** Given the custom install banner,
When rendered,
Then it shows: app icon, "Install Yorindo Check-in" label, "Install" button, "Not Now" button

**AC3:** Given "Install" is clicked,
Then `promptEvent.prompt()` is called and the banner is dismissed

**AC4:** Given "Not Now" is clicked,
Then the banner is dismissed for the current session (does not reappear)

**AC5:** Given the PWA is installed and `/scan` is opened,
When an event is selected,
Then `GET /api/events/:id/participants` is called and up to 300 participant records are cached in IndexedDB

**AC6:** Given the IndexedDB cache exists,
When the app is reopened offline,
Then participant records are still accessible from IndexedDB

---

## Tasks / Subtasks

- [x] **Task 1: Verify PWA manifest**
  - [x] Created `public/manifest.json` with name, short_name, icons, start_url: '/scan', display: 'standalone'
  - [x] Created `public/icons/` directory (placeholder icons path referenced)

- [x] **Task 2: Create `/scan` page**
  - [x] Create `src/app/scan/page.tsx` — event selector, ParticipantSyncStatus, PWAInstallBanner

- [x] **Task 3: Build PWAInstallBanner component**
  - [x] Create `src/components/features/scan/PWAInstallBanner.tsx`
  - [x] `beforeinstallprompt` captured in useEffect; sessionStorage dismiss check
  - [x] Install → `deferredPrompt.prompt()` + dismiss; Nanti → sessionStorage + dismiss

- [x] **Task 4: Set up IndexedDB with `idb` library**
  - [x] Create `src/lib/offline/scanQueue.ts`
  - [x] `yorindo-checkin` DB, `participants` + `pendingScan` stores
  - [x] Exported: `cacheParticipants`, `getCachedParticipants`, `queueScan`, `getPendingScans`, `clearPendingScan`

- [x] **Task 5: Add participants endpoint to MSW events handler**
  - [x] Added `GET /api/events/:id/participants` → 50 faker participants with 500ms delay

- [x] **Task 6: ParticipantSyncStatus component**
  - [x] Create `src/components/features/scan/ParticipantSyncStatus.tsx`
  - [x] idle/syncing/synced/error states; fetches + caches in IndexedDB; last sync time

- [x] **Task 7: Write vitest tests**
  - [x] Installed `fake-indexeddb` dev dep; `import 'fake-indexeddb/auto'` in test
  - [x] Test: cacheParticipants + getCachedParticipants round-trip
  - [x] Test: queueScan adds pending entry
  - [x] Test: clearPendingScan removes by id

---

## Dev Notes

### next-pwa is already configured (from Story 1.3)
`next.config.js` already has:
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development', // ← disabled in dev!
  runtimeCaching: [...]
})
module.exports = withPWA({ reactStrictMode: true, output: 'standalone' })
```
**CRITICAL:** PWA is disabled in development (`NODE_ENV === 'development'`). The `beforeinstallprompt` event will NOT fire in dev. Use Chrome DevTools → Application → Manifest to simulate PWA installability. For unit testing, mock the `beforeinstallprompt` event.

### `idb` library (already installed)
Package `idb` is in `package.json` from Story 1.3 setup. Import as:
```typescript
import { openDB } from 'idb'

const DB_NAME = 'yorindo-checkin'
const DB_VERSION = 1

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore('participants', { keyPath: 'id' })
      db.createObjectStore('pendingScan', { autoIncrement: true })
    }
  })
}
```

### File Locations (from architecture)
- Scan page: `src/app/scan/page.tsx`
- IDB module: `src/lib/offline/scanQueue.ts`
- Install banner: `src/components/features/scan/PWAInstallBanner.tsx`
- Sync status: `src/components/features/scan/ParticipantSyncStatus.tsx`

### PWA Install Banner Pattern
```typescript
'use client'
import { useEffect, useRef, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt.current = e as BeforeInstallPromptEvent
      if (!sessionStorage.getItem('installBannerDismissed')) {
        setShowBanner(true)
      }
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])
  ...
}
```

### Key Anti-Patterns
- DO NOT show the browser's default install mini-infobar — always call `e.preventDefault()` on beforeinstallprompt
- DO NOT use localStorage for IndexedDB data — use the `idb` wrapper
- DO NOT mock IndexedDB in tests with a generic object — use `fake-indexeddb` npm package if needed

---

## Dev Agent Record

### Implementation Plan

1. Created `public/manifest.json` — PWA manifest with start_url: '/scan', standalone display, blue theme.
2. Created `src/lib/offline/scanQueue.ts` — `idb`-based IDB wrapper; `yorindo-checkin` DB v1; participants + pendingScan stores; 5 exported async functions.
3. Added `GET /api/events/:id/participants` to MSW events handler — 50 faker participants, 500ms delay.
4. Created `src/components/features/scan/PWAInstallBanner.tsx` — `beforeinstallprompt` capture in useEffect; sessionStorage dismiss persistence.
5. Created `src/components/features/scan/ParticipantSyncStatus.tsx` — sync state machine; fetches participants → caches in IDB.
6. Created `src/app/scan/page.tsx` — event selector + ParticipantSyncStatus + PWAInstallBanner.
7. Installed `fake-indexeddb` dev dep; created `src/lib/offline/scanQueue.test.ts` — 3 IDB round-trip tests.

### Debug Log

- `fake-indexeddb` not in package.json — installed as dev dep. Used `import 'fake-indexeddb/auto'` for auto-shimming.

### Completion Notes

All 7 tasks complete. 45/45 tests pass (3 new; 42 pre-existing). `tsc --noEmit` clean.

---

## File List

**New files:**
- `public/manifest.json`
- `src/lib/offline/scanQueue.ts`
- `src/lib/offline/scanQueue.test.ts`
- `src/components/features/scan/PWAInstallBanner.tsx`
- `src/components/features/scan/ParticipantSyncStatus.tsx`
- `src/app/scan/page.tsx`

**Modified files:**
- `src/mocks/handlers/events.ts` — added `GET /api/events/:id/participants`
- `package.json` — added `fake-indexeddb` dev dependency

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-20 | Story created (FE Phase 1) | bmad-create-story |
| 2026-03-20 | All 7 tasks implemented; 45/45 tests pass | bmad-dev-story |
