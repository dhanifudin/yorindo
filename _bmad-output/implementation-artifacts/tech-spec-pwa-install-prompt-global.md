---
title: 'PWA Install Prompt Global Enhancement'
slug: 'pwa-install-prompt-global'
created: '2026-03-20'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['@serwist/next@9.5.7', 'serwist@9.5.7', 'next.js@16.2.0', 'react', 'typescript', 'tailwindcss', 'shadcn/ui']
files_to_modify:
  - 'src/components/features/scan/PWAInstallBanner.tsx'
  - 'src/app/app/layout.tsx'
  - 'src/app/app/scan/page.tsx'
  - 'src/app/layout.tsx'
  - 'src/components/dev/DevToolbar.tsx'
  - 'public/manifest.json'
  - 'public/icons/icon-192x192.png (new)'
  - 'public/icons/icon-512x512.png (new)'
code_patterns:
  - 'useEffect + useState for browser API interactions'
  - 'localStorage for persistent dismissal'
  - 'shadcn/ui Card + Button for UI components'
  - 'BeforeInstallPromptEvent interface for type safety'
  - 'Next.js Metadata export for SEO/PWA meta tags'
  - 'DevToolbar pattern for dev-only UI'
test_patterns:
  - 'No existing tests for PWA components'
  - 'Manual testing via production build or DevToolbar mock trigger'
---

# Tech-Spec: PWA Install Prompt Global Enhancement

**Created:** 2026-03-20

## Overview

### Problem Statement

The PWA install banner only renders on `/app/scan`, meaning admin and viewer users never see the install prompt. Additionally, the manifest references missing icon files, the start_url points to `/scan` instead of `/app`, and the root layout lacks proper PWA metadata (theme-color, viewport). These gaps prevent a proper native-like install experience.

### Solution

Move the install banner to the app-level layout so it triggers on first visit to any `/app/*` route after a 3-second delay. Keep a persistent reminder on `/app/scan` that ignores dismissal. Generate placeholder PWA icons, fix the manifest start_url, and add proper metadata to the root layout.

### Scope

**In Scope:**
- Global install banner on all `/app/*` routes (3-second delay, dismiss once via localStorage)
- Persistent install reminder on `/app/scan` (always shows if not installed)
- Generate placeholder 192x192 and 512x512 PNG icons
- Fix manifest.json start_url to `/app`
- Add theme-color and viewport metadata to root layout
- Dev-only mock trigger in DevToolbar for testing install banner without a real service worker

**Out of Scope:**
- Custom brand icons/logo design
- Push notifications
- Offline-first data sync
- iOS-specific install instructions (Safari doesn't support beforeinstallprompt)

## Context for Development

### Codebase Patterns

- **PWAInstallBanner** (`src/components/features/scan/PWAInstallBanner.tsx`):
  - Uses `BeforeInstallPromptEvent` interface extending `Event` with `prompt()` and `userChoice`
  - Stores deferred prompt in `useRef`, visibility in `useState`
  - Dismissal stored in `sessionStorage('installBannerDismissed')`
  - UI: shadcn `Card` + `Button`, fixed positioning at bottom with z-50
  - Shows "Y" branded icon, "Install EM . U Check-in" title, Install/Nanti buttons

- **App Layout** (`src/app/app/layout.tsx`):
  - `'use client'` component wrapping all `/app/*` routes
  - Auth guard with `useAuthStore`, viewer route restrictions
  - Renders `<AdminShell>{children}</AdminShell>`

- **Scan Page** (`src/app/app/scan/page.tsx`):
  - Renders `<PWAInstallBanner />` at line 252
  - Has its own bottom tab bar at z-50

- **Root Layout** (`src/app/layout.tsx`):
  - Server component with `Metadata` export — only has `title` and `description`
  - Missing: `themeColor`, `manifest` link, `viewport` configuration

- **DevToolbar** (`src/components/dev/DevToolbar.tsx`):
  - Fixed bottom-right, z-50, yellow-themed dev panel
  - Role-switching buttons (admin/staff/viewer)
  - Gated behind `MOCKS_ENABLED` (dev mode or `NEXT_PUBLIC_ENABLE_MOCKS`)

- **Manifest** (`public/manifest.json`):
  - `start_url: "/scan"` — needs to be `/app`
  - Icons reference missing files in `/public/icons/`

### Files to Reference

| File | Purpose | Action |
| ---- | ------- | ------ |
| `src/components/features/scan/PWAInstallBanner.tsx` | Existing install banner | Refactor: add `mode` prop |
| `src/app/app/layout.tsx` | App layout | Add: render global install banner |
| `src/app/app/scan/page.tsx` | Scan page | Update: pass `mode="scan"` to banner |
| `src/app/layout.tsx` | Root layout metadata | Update: add themeColor, manifest, viewport |
| `src/components/dev/DevToolbar.tsx` | Dev toolbar | Add: mock install prompt button |
| `public/manifest.json` | PWA manifest | Fix: start_url |
| `public/icons/` | Icon directory (empty) | Create: placeholder icons |

### Technical Decisions

- **Single component with `mode` prop** — `PWAInstallBanner` accepts `mode: 'global' | 'scan'` (default `'global'`)
- **localStorage** for global dismiss — persists across sessions
- **Scan page** uses `mode="scan"` — always shows if `beforeinstallprompt` fired, ignoring localStorage
- **3-second delay** in global mode via `setTimeout` in `useEffect`
- **Dev mock trigger** — DevToolbar button dispatches a synthetic `beforeinstallprompt` event with a mock `prompt()` that logs to console and a mock `userChoice` that resolves to `{ outcome: 'dismissed' }`
- **Placeholder icons** — Simple blue (#2563eb) rounded squares with white "Y" letter, generated as static PNG files using a Node.js script with canvas

## Implementation Plan

### Tasks

- [ ] Task 1: Generate placeholder PWA icons
  - File: `public/icons/icon-192x192.png` (new)
  - File: `public/icons/icon-512x512.png` (new)
  - Action: Create a Node.js script (`scripts/generate-icons.js`) that uses the `canvas` package to generate blue (#2563eb) rounded-rect icons with white "Y" letter at 192x192 and 512x512 sizes, outputting to `public/icons/`. Run the script once and commit the PNGs. The script can be deleted after use, or kept for regeneration.
  - Notes: If `canvas` is not available, create simple SVG files and convert via an online tool, or use any image editor. The key is: blue background, white "Y", two sizes.

- [ ] Task 2: Fix manifest.json
  - File: `public/manifest.json`
  - Action: Change `"start_url": "/scan"` to `"start_url": "/app"`. Verify icon paths match the generated files from Task 1.
  - Notes: Keep all other fields unchanged.

- [ ] Task 3: Add PWA metadata to root layout
  - File: `src/app/layout.tsx`
  - Action: Update the `metadata` export to include:
    ```typescript
    export const metadata: Metadata = {
      title: "EM . U",
      description: "Event management platform",
      manifest: "/manifest.json",
      themeColor: "#2563eb",
    }
    ```
  - Notes: Next.js automatically renders these as `<link rel="manifest">` and `<meta name="theme-color">` tags. The `viewport` export is handled separately by Next.js 16 defaults.

- [ ] Task 4: Refactor PWAInstallBanner with `mode` prop
  - File: `src/components/features/scan/PWAInstallBanner.tsx`
  - Action: Add `mode` prop with type `'global' | 'scan'` (default `'global'`). Behavior changes:
    - **`global` mode**:
      - Check `localStorage.getItem('pwa-install-dismissed')` — if set, don't show
      - After `beforeinstallprompt` fires, wait 3 seconds (`setTimeout`) before showing banner
      - On dismiss: `localStorage.setItem('pwa-install-dismissed', 'true')`, hide banner
      - On install: hide banner (localStorage not set — if user uninstalls, they'll see it again)
    - **`scan` mode**:
      - Do NOT check localStorage — always eligible to show
      - Show immediately when `beforeinstallprompt` fires (no delay)
      - On dismiss: hide banner for current mount only (no persistence)
      - On install: hide banner
    - Move `BeforeInstallPromptEvent` interface to be exported (DevToolbar will need it)
    - Clean up `setTimeout` on unmount to avoid memory leaks
  - Notes: The existing UI (Card with Y icon, Install/Nanti buttons) stays the same for both modes. The text can differ: global says "Install EM . U" while scan keeps "Install EM . U Check-in".

- [ ] Task 5: Add global install banner to app layout
  - File: `src/app/app/layout.tsx`
  - Action: Import `PWAInstallBanner` and render it inside the layout, after `<AdminShell>`:
    ```tsx
    return (
      <>
        <AdminShell>{children}</AdminShell>
        <PWAInstallBanner mode="global" />
      </>
    )
    ```
  - Notes: The banner uses fixed positioning so it doesn't affect layout flow. z-50 matches the existing pattern.

- [ ] Task 6: Update scan page to use `mode="scan"`
  - File: `src/app/app/scan/page.tsx`
  - Action: Change `<PWAInstallBanner />` to `<PWAInstallBanner mode="scan" />`.
  - Notes: Since the app layout now renders a global banner, and the scan page renders a scan-mode banner, the scan page banner should take priority visually. The global banner's `localStorage` check means it won't show if already dismissed, so there shouldn't be double banners. However, if both could show: the scan page's banner has `bottom-20` positioning (above the scan tab bar) while the global one uses `bottom-4` on desktop / `bottom-20` on mobile — they would stack. To prevent this, the scan page should NOT render the global banner. Since the global banner is in the app layout (parent), we can conditionally hide it on the scan route by checking `usePathname()` in the banner component itself, OR accept that global mode won't show on scan because localStorage is set. Simplest: in global mode, check if pathname starts with `/app/scan` and skip rendering.

- [ ] Task 7: Add mock install prompt trigger to DevToolbar
  - File: `src/components/dev/DevToolbar.tsx`
  - Action: Add an "Install" button that dispatches a synthetic `beforeinstallprompt` event:
    ```tsx
    const triggerInstallPrompt = () => {
      const event = new Event('beforeinstallprompt', { cancelable: true })
      Object.assign(event, {
        prompt: async () => { console.log('[DevToolbar] Mock install prompt triggered') },
        userChoice: Promise.resolve({ outcome: 'dismissed' as const }),
      })
      window.dispatchEvent(event)
    }
    ```
    Add a button labeled "PWA" next to the role buttons with the same styling pattern.
  - Notes: This allows testing the banner UI in dev mode without a service worker. The mock `prompt()` logs to console instead of showing a real install dialog. `userChoice` resolves to `dismissed` so the banner can be re-triggered.

### Acceptance Criteria

- [ ] AC 1: Given a user visits any `/app/*` route for the first time (no localStorage dismiss) and the browser supports `beforeinstallprompt`, when 3 seconds elapse after the event fires, then the install banner appears with "Install EM . U" text and Install/Nanti buttons.

- [ ] AC 2: Given a user clicks "Nanti" on the global install banner, when they navigate to another `/app/*` page or revisit later, then the banner does not appear again (localStorage persists dismissal).

- [ ] AC 3: Given a user navigates to `/app/scan`, when `beforeinstallprompt` has fired, then the scan-mode install banner appears immediately (no 3-second delay) regardless of whether the global banner was previously dismissed.

- [ ] AC 4: Given a user clicks "Nanti" on the scan-mode banner, when they navigate away and return to `/app/scan`, then the banner appears again (no persistence).

- [ ] AC 5: Given the app is running in development mode, when a dev clicks the "PWA" button in the DevToolbar, then a synthetic `beforeinstallprompt` event is dispatched and the install banner appears after the appropriate delay.

- [ ] AC 6: Given the `public/manifest.json` file, when inspected, then `start_url` is `/app` and icon paths reference existing files in `public/icons/`.

- [ ] AC 7: Given the root layout renders, when the page HTML is inspected, then `<link rel="manifest" href="/manifest.json">` and `<meta name="theme-color" content="#2563eb">` are present.

- [ ] AC 8: Given the user is on `/app/scan` with the global banner already dismissed, when the page loads, then only the scan-mode banner is shown (no duplicate banners).

## Additional Context

### Dependencies

- No new npm packages required for runtime
- `canvas` npm package needed only to run the icon generation script (dev dependency, can also use any image editor instead)

### Testing Strategy

- **Manual testing (production build)**: Run `npm run build && npm start`, visit `/app` in Chrome, verify banner appears after 3 seconds, verify dismiss persists, navigate to `/app/scan` and verify scan banner appears independently.
- **Manual testing (dev mode)**: Use DevToolbar "PWA" button to trigger mock `beforeinstallprompt`, verify banner appears, verify dismiss behavior per mode.
- **TypeScript**: `npx tsc --noEmit` to verify all changes compile.
- **No automated tests**: PWA install prompt is browser-API dependent and not practical to unit test. The DevToolbar mock serves as the primary dev testing mechanism.

### Notes

- `beforeinstallprompt` is Chromium-only (Chrome, Edge, Samsung Internet). Firefox and Safari do not support it. The banner gracefully does not appear on unsupported browsers.
- The service worker is disabled in dev mode (`disable: process.env.NODE_ENV === 'development'`), hence the DevToolbar mock trigger.
- `reactStrictMode: true` means effects double-fire in dev — the `beforeinstallprompt` listener handles this cleanly via cleanup return. The `setTimeout` in global mode must also be cleaned up on unmount.
- If the user installs the app and later uninstalls, `localStorage` dismiss is still set — the global banner won't re-appear. This is acceptable; the scan-mode banner will still remind them.
