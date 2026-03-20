---
title: 'DevToolbar Vertical Collapsible Repositioning'
slug: 'devtoolbar-vertical-collapsible'
created: '2026-03-20'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['react', 'tailwindcss', 'next.js', 'zustand', 'vitest', 'testing-library']
files_to_modify: ['yorindo-app/src/components/dev/DevToolbar.tsx']
code_patterns: ['fixed positioning with z-50', 'tailwind responsive classes', 'client component with use client directive', 'zustand store hooks for state']
test_patterns: ['vitest + @testing-library/react', 'co-located test files (*.test.tsx)', 'useAuthStore.getState() for store integration tests']
---

# Tech-Spec: DevToolbar Vertical Collapsible Repositioning

**Created:** 2026-03-20

## Overview

### Problem Statement

The DevToolbar is currently positioned as a horizontal bar at `fixed bottom-4 right-4 z-50`, which overlaps the mobile bottom navigation (`fixed bottom-0 inset-x-0 z-50` in AdminShell). This makes bottom nav items partially obscured or unclickable when the DevToolbar is visible.

### Solution

Reposition the DevToolbar to the right-bottom side of the screen with a vertical layout (top-to-bottom). Make it collapsible — collapsed state shows only a small "DEV" toggle button on the right edge; expanded state reveals the role switcher buttons and PWA button stacked vertically. Same behavior on both desktop and mobile.

### Scope

**In Scope:**
- Reposition DevToolbar to right-bottom, vertical orientation
- Add collapsible toggle (collapsed by default showing "DEV" button)
- Stack buttons top-to-bottom when expanded: DEV label → Admin → Staff → Viewer → PWA
- Ensure no overlap with mobile bottom navigation

**Out of Scope:**
- Changes to the bottom navigation component itself
- Changes to AdminShell layout
- Desktop-specific alternative layout (same vertical layout for all viewports)

## Context for Development

### Codebase Patterns

- DevToolbar is a `'use client'` component rendered in root `layout.tsx`
- Uses Tailwind CSS utility classes for all styling
- Uses `useAuthStore` from zustand for role switching
- Conditional rendering based on `MOCKS_ENABLED` flag
- Bottom nav in AdminShell uses `min-h-[56px]` — DevToolbar bottom offset must clear this

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `yorindo-app/src/components/dev/DevToolbar.tsx` | Component to modify |
| `yorindo-app/src/components/layout/AdminShell.tsx` | Contains mobile bottom nav (lines 173-195) for reference on positioning |
| `yorindo-app/src/app/layout.tsx` | Renders DevToolbar at root level |
| `yorindo-app/src/components/dev/DevToolbar.test.tsx` | Existing tests (store integration, render guard) |

### Technical Decisions

- Collapsed by default to minimize screen real estate usage
- Use React `useState` for collapse toggle (no need for global state — dev-only ephemeral UI)
- Position with `fixed bottom-16 right-0` (or similar) to clear the 56px bottom nav
- Single file change — only `DevToolbar.tsx` needs modification
- Existing tests are minimal (only test null render in test env + store integration) — no layout assertions to update

## Implementation Plan

### Tasks

- [x] Task 1: Add collapse state and toggle logic
  - File: `yorindo-app/src/components/dev/DevToolbar.tsx`
  - Action: Add `useState<boolean>(false)` for `isExpanded` state (collapsed by default)
  - Notes: Place the hook after the existing `useAuthStore` hook. The `MOCKS_ENABLED` guard returns null before hooks, so keep the existing conditional-hook pattern (eslint-disable comment already in place).

- [x] Task 2: Replace horizontal layout with vertical collapsible layout
  - File: `yorindo-app/src/components/dev/DevToolbar.tsx`
  - Action: Replace the outer `<div>` with two elements:
    1. **Collapsed state** — A small "DEV" button fixed to the right-bottom side (`fixed bottom-16 right-0 z-50`). Styled as a vertical tab: narrow, yellow background, rotated or vertical text "DEV". On click, sets `isExpanded(true)`.
    2. **Expanded state** — A vertical panel fixed to the right-bottom side (`fixed bottom-16 right-0 z-50`). Contains buttons stacked top-to-bottom in a `flex flex-col` container:
       - "DEV" label/close button (clicking collapses back)
       - Admin button
       - Staff button
       - Viewer button
       - Divider
       - PWA button
  - Notes: Use `bottom-16` (64px) to clear the mobile bottom nav (56px + 8px buffer). Keep `right-0` to sit flush against the right edge. Maintain existing yellow/blue color scheme. Keep `z-50` to match existing layering.

- [x] Task 3: Preserve all existing functionality
  - File: `yorindo-app/src/components/dev/DevToolbar.tsx`
  - Action: Ensure all existing behavior is preserved:
    - Role switching via `setAccessToken` on button click
    - Active role highlighting (`bg-yellow-400` for current role)
    - PWA install prompt trigger via `triggerInstallPrompt`
    - `MOCKS_ENABLED` guard (return null when disabled)
  - Notes: No logic changes — only layout/positioning changes.

### Acceptance Criteria

- [x] AC 1: Given the DevToolbar is rendered on mobile, when the page loads, then only a small "DEV" toggle button is visible on the right-bottom edge, and the bottom navigation is fully visible and clickable without obstruction.
- [x] AC 2: Given the DevToolbar is collapsed, when the user taps the "DEV" toggle button, then the toolbar expands vertically showing role buttons (Admin, Staff, Viewer) and PWA button stacked top-to-bottom.
- [x] AC 3: Given the DevToolbar is expanded, when the user taps the "DEV" label/close area, then the toolbar collapses back to just the "DEV" toggle button.
- [x] AC 4: Given the DevToolbar is expanded, when the user taps a role button (e.g., Staff), then the mock user role switches correctly (same behavior as before).
- [x] AC 5: Given the DevToolbar is expanded, when the user taps the PWA button, then the mock install prompt event fires (same behavior as before).
- [x] AC 6: Given the app is running on desktop, when the DevToolbar is rendered, then it uses the same vertical collapsible layout as mobile (no desktop-specific variant).
- [x] AC 7: Given `MOCKS_ENABLED` is false, when the page loads, then the DevToolbar renders nothing (existing guard preserved).

## Additional Context

### Dependencies

- None — no new libraries or external dependencies required. Uses only existing React `useState` and Tailwind classes.

### Testing Strategy

- **Existing tests pass:** The two existing test cases (null render in test env, store integration) should continue to pass without modification since they don't assert on layout.
- **Manual testing:**
  1. Open app on mobile viewport — verify bottom nav is fully visible and DevToolbar collapsed "DEV" button is on the right side above the nav.
  2. Tap "DEV" — verify vertical expansion with all buttons.
  3. Tap role buttons — verify role switching works.
  4. Tap PWA — verify install prompt fires.
  5. Tap "DEV" again — verify collapse.
  6. Check desktop viewport — verify same vertical behavior.

### Notes

- The `bottom-16` offset (64px) provides 8px buffer above the 56px bottom nav. If the bottom nav height changes in the future, this offset may need adjustment.
- The collapsed "DEV" button should be small enough to not interfere with content interaction but visible enough to be discoverable by developers.

## Review Notes
- Adversarial review completed
- Findings: 7 total, 6 fixed, 1 skipped (noise)
- Resolution approach: auto-fix
- F1: Moved hooks before MOCKS_ENABLED guard to fix conditional hooks anti-pattern
- F2: Removed undefined `writing-mode-vertical` class, kept arbitrary property
- F3: Added aria-labels, aria-pressed, focus-visible styling
- F4: Replaced Unicode ✕ with HTML &amp;times;
- F5: Added note about bottom-16 hardcoding (already documented)
- F6: Skipped (noise) — replaced div separator with semantic hr anyway
- F7: Added Escape key handler to dismiss expanded toolbar
