---
title: 'AI Audience Recommendations — YoriMind Scoring Engine'
slug: 'ai-audience-recommendations'
created: '2026-03-20'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['react', 'next.js', 'tailwindcss', 'zustand', 'react-query', 'msw', 'zod', 'shadcn/ui', 'tanstack-table', 'sonner']
files_to_modify: ['src/types/api.ts', 'src/app/app/events/[id]/_client.tsx', 'src/app/app/blast/page.tsx', 'src/components/features/contacts/ContactsTable.tsx', 'src/mocks/handlers/events.ts', 'src/mocks/handlers/contacts.ts', 'src/hooks/useEvents.ts', 'src/hooks/useContacts.ts', '_bmad-output/implementation-artifacts/1-4-openapi-30-specification.md']
code_patterns: ['expandable card with lazy-load query (YoriMindPanel/AnalyticsDashboard pattern)', 'React Query keys: [resource] or [resource, id] or [resource, {filters}]', 'MSW handlers: http.get/post with delay(300-700ms) and in-memory stores', 'useMutation with queryClient.invalidateQueries + toast feedback', 'mobile Sheet + desktop Sheet (same component) for contact detail views', 'zustand stores for filter state (filterStore pattern)']
test_patterns: ['vitest + @testing-library/react', 'renderHook with QueryClient wrapper (retry: false)', 'waitFor with timeout: 3000 for async queries', 'MSW seeded data verification (deterministic faker.seed(42))']
---

# Tech-Spec: AI Audience Recommendations — YoriMind Scoring Engine

**Created:** 2026-03-20

## Overview

### Problem Statement

Blast targeting in Yorindo is fully manual — admins select filters (industry, city, company size) from dropdowns on `/app/blast` with no intelligence about which contacts are most suitable for a given event. There is no AI-driven audience discovery, no contact-event suitability scoring, and no way to see recommended audiences from within the event management flow. Additionally, the Event model lacks industry/category tags, both critical data gaps for any recommendation engine.

### Solution

Build a three-phased AI Audience Recommendations system powered by a weighted scoring engine (YoriMind Recommendations v1):

1. **Phase 1 — Event-Centric:** "Recommended Audience" card on the event detail page showing AI-scored contacts with match factors. "Preview & Blast" action pre-fills the blast page with selected contact IDs via sessionStorage.
2. **Phase 2 — Contact-Centric:** "Suggested Events" section inside the contact detail Sheet showing events the contact would likely attend, with match scores.
3. **Phase 3 — YoriMind Dashboard:** Cross-event recommendations panel showing top matches across active events (limited to 5 events to avoid N-request fan-out).

### Scope

**In Scope:**
- Extend Event type with `industryTags: string[]`, `eventType` enum (see Task 1 for values), `topicTags: string[]`
- Scoring API: `GET /api/events/:id/audience-recommendations` with scored contacts + match factors
- Reverse API: `GET /api/contacts/:id/recommended-events` with scored events + match factors
- Event detail page: new "Recommended Audience" card + revamp card ordering for optimal event management UX
- Contact detail: "Suggested Events" section inside the contact Sheet (used by both mobile and desktop — desktop also uses Sheet, not inline expansion)
- YoriMind Dashboard at `src/app/app/yorimind/page.tsx` (URL: `/app/yorimind`), admin-only
- MSW mock handlers for all new endpoints, registered in correct order within existing handler files
- TypeScript types for all new API contracts
- Extend blast page to accept pre-filled audience via sessionStorage (written by Recommended Audience card, read by blast page)
- Extend blast API types to accept `contactIds?: string[]` and `scheduledAt?: string`
- Blast flow supports both immediate send and scheduled blast (`scheduledAt` in ISO 8601 UTC, must be in the future)
- Add `/app/yorimind` to AdminShell nav items (admin role only) and to `VIEWER_ALLOWED_PATHS` exclusion
- Add hook tests for `useAudienceRecommendations` and `useRecommendedEvents`
- Update OpenAPI specification document at `_bmad-output/implementation-artifacts/1-4-openapi-30-specification.md`

**Out of Scope:**
- Backend ML model or training pipeline (v1 = weighted scoring, no ML)
- Real backend AI API integration (FE phase, MSW mocks only)
- Actual blast delivery/scheduling execution (Story 5.3) — UI sends `scheduledAt`, mock responds with `status:'scheduled'`, no worker
- Participation history model (existing `Registration` type with `status:'attended'` and `attendedAt` already covers FE needs — backend scoring will use this data)

## Context for Development

### Codebase Patterns

- **Expandable card pattern:** YoriMindPanel and AnalyticsDashboard use a toggle-expand pattern with lazy-loaded React Query fetch triggered only when expanded (`enabled: isExpanded && !!id`). New recommendation cards must follow the same pattern — do NOT fire on mount.
- **React Query conventions:** Keys follow `['resource']`, `['resource', id]`, `['resource', {filters}]`. Mutations invalidate related query keys + show sonner toast
- **MSW mock structure:** In-memory stores with seeded data, `delay(300-700ms)`, per-domain handler files in `src/mocks/handlers/`. **Static routes must be registered BEFORE dynamic `:id` routes** (e.g. `/api/contacts/flagged` before `/api/contacts/:id`) to prevent MSW wildcard conflicts. New handlers for `GET /api/events/:id/audience-recommendations` and `GET /api/contacts/:id/recommended-events` must be added inside the existing `events.ts` and `contacts.ts` files respectively, after any static sub-routes.
- **Contact detail:** Both mobile AND desktop open the same bottom `Sheet` component (max-h-[65vh]). There is no inline row expansion on desktop — both viewports use the Sheet. Task 14 only modifies the Sheet content.
- **Event detail:** Single `src/app/app/events/[id]/_client.tsx` file renders all cards sequentially. Components live in `src/components/features/events/`
- **Hooks:** One file per domain (`useEvents.ts`, `useContacts.ts`). Custom hooks wrap `useQuery`/`useMutation`
- **Existing Registration type** already has: `status: 'pending'|'confirmed'|'approved'|'rejected'|'waitlisted'|'attended'|'cancelled'`, `attendedAt?`, `contactId`, `eventId` — participation data is already modeled; no new Participation type needed
- **Naming convention:** Use `YoriMind` (camelCase Y and M) consistently across all file names, component names, type names, and labels. Do not use `Yorimind` (lowercase m).
- **Event seeds:** Existing seeded events have hardcoded `eventDate` strings. Do NOT change them — changing status-affecting dates will break existing tests. Only add the new `industryTags`, `eventType`, `topicTags` fields to existing seeds. For any NEW seeded events added, use relative dates.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/types/api.ts` | All type definitions — extend with AudienceRecommendation types and event tags |
| `src/app/app/events/[id]/_client.tsx` | Event detail page — revamp card ordering, add AudienceRecommendationsCard |
| `src/app/app/blast/page.tsx` | Blast page — add contactIds read from sessionStorage, scheduledAt picker, refactor blastMutation |
| `src/components/features/contacts/ContactsTable.tsx` | Contact detail Sheet — add "Suggested Events" section |
| `src/components/features/events/YoriMindPanel.tsx` | Reference for expandable AI card pattern (error state, loading state, expand toggle) |
| `src/components/features/events/AnalyticsDashboard.tsx` | Reference for expandable card with lazy query |
| `src/mocks/handlers/events.ts` | Add audience-recommendations GET handler; update blast handler; update event seeds |
| `src/mocks/handlers/contacts.ts` | Add recommended-events GET handler; import contactsPool for flagged exclusion logic |
| `src/hooks/useEvents.ts` | Add useAudienceRecommendations hook |
| `src/hooks/useContacts.ts` | Add useRecommendedEvents hook |
| `_bmad-output/implementation-artifacts/1-4-openapi-30-specification.md` | OpenAPI spec — add new GET endpoints, update Event schema and blast request/response schemas |

### Technical Decisions

- **Scoring weights (for backend reference; FE renders whatever the API returns):** past attendance +35, industry match +25, location +15, recency +15, company size +10
- **Reliability factor:** `attendance_rate = checked_in / registered` — backend penalizes contacts with attendance rate < 30%
- **Flagged contacts:** `not-potential` and `spam` contacts are excluded by backend (-100 disqualification). FE shows "X matched · Y excluded (flagged)"
- **`factors` array:** Each item is a colon-namespaced string: `'industry:teknologi'`, `'attended:similar-event'`, `'location:jakarta'`
- **Endpoint is GET not POST:** `GET /api/events/:id/audience-recommendations` — no request body, eventId in path is sufficient for scoring. This aligns with React Query's `useQuery` semantic (idempotent, cacheable, lazy-loadable on expand)
- **Event detail card ordering:** Event Info → Recommended Audience (CTA) → AttendanceMonitor (if active) → Analytics → YoriMind Insights → Survey Builder
- **YoriMindPanel stays separate** from AudienceRecommendationsCard — different concerns (outcome analysis vs. audience targeting)
- **contactIds handoff to blast page:** Use `sessionStorage` with key `'blast:prefilledAudience'` → `{ eventId, contactIds: string[], count: number }`. This avoids URL length limits (247 UUIDs × 36 chars = 8,892 chars, exceeds safe URL limits). Blast page reads and clears this key on mount.
- **Blast page layout in AI-mode:** When `sessionStorage` has `blast:prefilledAudience`, the event dropdown is pre-selected and disabled, the manual filter section (industry/city/companySize) is replaced by an "AI-recommended audience" banner showing contact count. Channel and template selectors remain visible.
- **scheduledAt format:** ISO 8601 UTC string. Validation: must be in the future (>= now + 5 minutes). UI uses `<input type="datetime-local">` and converts to UTC before sending. No timezone selector needed — use user's local time implicitly.
- **YoriMind Dashboard data strategy:** Fetch all events via `useEvents()`. Render recommendation cards for up to 5 events (published/active, sorted by eventDate asc). Each card uses `useAudienceRecommendations(eventId)` triggered on mount (not on expand — dashboard is already an overview page). Show top 5 contacts per event card.
- **Score badge thresholds:** score >= 70 → green, score >= 40 and < 70 → yellow, score < 40 → red
- **"Select All":** Selects all contacts in the visible list (capped at 20). Label reads "Select All (20)" to be explicit about the cap. Not "Select all 150 matched."
- **YoriMind Dashboard role:** Admin only. Add `'/app/yorimind'` to `VIEWER_ALLOWED_PATHS` exclusion list (do not add it to allowed paths). Add nav item with `roles: ['admin']` in AdminShell nav config.
- **Error state:** AudienceRecommendationsCard shows "Gagal memuat rekomendasi." on error, matching YoriMindPanel's error copy pattern.
- **Empty state:** AudienceRecommendationsCard shows "Tidak ada kontak yang cocok untuk event ini." when `totalMatched === 0`.
- **Mock score determinism:** Use djb2-style hash: `(contactId + eventId).split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 100, 0)` to produce a 0–99 score. This is reproducible across sessions without external seeding.

## Implementation Plan

### Tasks

#### Data Model & Types (Foundation)

- [ ] Task 1: Extend Event type with category tags
  - File: `src/types/api.ts`
  - Action: Add optional fields to `Event` interface:
    ```typescript
    industryTags?: string[]   // e.g. ['teknologi', 'keuangan']
    eventType?: 'conference' | 'workshop' | 'networking' | 'seminar' | 'webinar'
    topicTags?: string[]      // e.g. ['fintech', 'digital-banking']
    ```
  - Action: Add the same optional fields to `CreateEventBody`

- [ ] Task 2: Add Audience Recommendation types
  - File: `src/types/api.ts`
  - Action: Add new interfaces:
    ```typescript
    export interface AudienceRecommendation {
      contactId: string
      name: string
      email: string
      phone: string
      industryId: string      // matches Contact.industryId (normalized ID, not display string)
      city: string
      companySize: string
      score: number           // 0-100
      factors: string[]       // e.g. ['industry:teknologi', 'attended:similar-event', 'location:jakarta']
      reliabilityRate?: number // 0.0–1.0 (checked_in / registered ratio)
    }

    export interface AudienceRecommendationsResponse {
      recommendations: AudienceRecommendation[]
      totalMatched: number
      totalExcluded: number
      excludedReasons: Record<string, number>  // e.g. { 'not-potential': 5, 'spam': 3 }
    }

    export interface RecommendedEvent {
      eventId: string          // NOTE: field is eventId, not id — use event.eventId for link construction
      name: string
      eventDate: string
      status: string
      score: number
      factors: string[]
    }

    export interface RecommendedEventsResponse {
      recommendations: RecommendedEvent[]
      totalMatched: number
    }
    ```

- [ ] Task 3: Add/update blast-related types
  - File: `src/types/api.ts`
  - Action: Add new interfaces:
    ```typescript
    export interface BlastPayload {
      filters?: { industry?: string; city?: string; companySize?: string }
      contactIds?: string[]   // AI-curated list from sessionStorage
      templateId: string
      channel: 'whatsapp' | 'email'
      scheduledAt?: string    // ISO 8601 UTC; must be >= now + 5 minutes if provided
    }

    export interface BlastResponse {
      jobId: string
      status: 'queued' | 'scheduled'
      scheduledAt?: string
      recipientCount?: number
    }

    export interface BlastPrefilledAudience {
      eventId: string
      contactIds: string[]
      count: number
    }
    ```

#### MSW Mock Handlers

- [ ] Task 4: Add audience-recommendations GET mock handler
  - File: `src/mocks/handlers/events.ts`
  - Action: Add handler inside the existing events handlers array, **after static sub-routes** (`/blast`, `/clone`, `/audience-preview`, etc.) but **before** any catch-all:
    ```
    GET /api/events/:id/audience-recommendations
    ```
  - Mock logic:
    - Import `contactsPool` from `contacts.ts` (or the seeded contacts array)
    - For each contact: compute score using djb2 hash: `(contact.id + eventId).split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 100, 0)`
    - Exclude contacts where `flagCategory === 'not-potential' || flagCategory === 'spam'` — count them into `excludedReasons`
    - Sort remaining by score descending
    - Apply `factors` based on contact fields: if `industryId` matches event `industryTags[0]`, push `'industry:{industryId}'`; if `city` is 'Jakarta', push `'location:jakarta'`; add `'completeness:high'` if `completenessScore > 0.7`
    - Set `reliabilityRate` to `(score % 10) / 10` (deterministic mock approximation)
    - Return `AudienceRecommendationsResponse` with top 20 recommendations
    - Use `delay(600)`
    - No request body needed (GET endpoint)

- [ ] Task 5: Add recommended-events GET mock handler
  - File: `src/mocks/handlers/contacts.ts`
  - Action: Add handler **after** static sub-routes (`/flagged`, `/duplicates`, `/count`, `/lookup`, `/suppression`) but **before** any dynamic `:id` handler:
    ```
    GET /api/contacts/:id/recommended-events
    ```
  - Mock logic:
    - Read events from `eventsStore`
    - Filter to `status === 'published' || status === 'active'`
    - For each event: compute score using djb2 hash: `(contactId + event.id).split('').reduce(...)`
    - Sort by score descending
    - Map to `RecommendedEvent` shape using `event.id` as `eventId` field
    - Return `RecommendedEventsResponse` with all matched events and `totalMatched`
    - Use `delay(400)`

- [ ] Task 6: Update blast mock handler
  - File: `src/mocks/handlers/events.ts`
  - Action: Update existing `POST /api/events/:id/blast` handler:
    - Parse request body as `BlastPayload`
    - Accept `contactIds` (use its length as `recipientCount` if present, else use existing filter-based count logic)
    - Accept `scheduledAt`: if present, return `{ jobId: crypto.randomUUID(), status: 'scheduled', scheduledAt, recipientCount }`; else return `{ jobId: crypto.randomUUID(), status: 'queued', recipientCount }`

- [ ] Task 7: Update event mock seeds with new fields
  - File: `src/mocks/handlers/events.ts`
  - Action: Add `industryTags`, `eventType`, `topicTags` to the **existing** 5 seeded events only. Do NOT change `eventDate` values — changing them will break existing status-based tests.
    - event-001 (published): `{ industryTags: ['teknologi'], eventType: 'conference', topicTags: ['cloud', 'ai'] }`
    - event-002 (active): `{ industryTags: ['kesehatan'], eventType: 'seminar', topicTags: ['medtech', 'diagnostics'] }`
    - event-003 (draft): `{ industryTags: ['keuangan', 'teknologi'], eventType: 'workshop', topicTags: ['fintech'] }`
    - event-004 (completed): `{ industryTags: ['retail'], eventType: 'networking', topicTags: ['ecommerce'] }`
    - event-005 (cancelled): `{ industryTags: ['manufaktur'], eventType: 'webinar', topicTags: ['industry40'] }`

#### React Query Hooks

- [ ] Task 8: Add useAudienceRecommendations hook
  - File: `src/hooks/useEvents.ts`
  - Action: Add hook — note `enabled` takes `isExpanded` param so fetch is lazy (only fires when card is expanded):
    ```typescript
    export function useAudienceRecommendations(eventId: string | undefined, enabled: boolean) {
      return useQuery({
        queryKey: ['audience-recommendations', eventId],
        queryFn: () =>
          fetch(`/api/events/${eventId}/audience-recommendations`)
            .then(r => r.json()) as Promise<AudienceRecommendationsResponse>,
        enabled: !!eventId && enabled,
        staleTime: 5 * 60 * 1000,
      })
    }
    ```

- [ ] Task 9: Add useRecommendedEvents hook
  - File: `src/hooks/useContacts.ts`
  - Action: Add hook — also lazy via `enabled` param:
    ```typescript
    export function useRecommendedEvents(contactId: string | undefined, enabled: boolean) {
      return useQuery({
        queryKey: ['recommended-events', contactId],
        queryFn: () =>
          fetch(`/api/contacts/${contactId}/recommended-events`)
            .then(r => r.json()) as Promise<RecommendedEventsResponse>,
        enabled: !!contactId && enabled,
        staleTime: 5 * 60 * 1000,
      })
    }
    ```

#### UI Components — Phase 1 (Event-Centric)

- [ ] Task 10: Create AudienceRecommendationsCard component
  - File: `src/components/features/events/AudienceRecommendationsCard.tsx` (NEW)
  - Action: Create expandable card component following YoriMindPanel pattern exactly:
    - Internal `const [isExpanded, setIsExpanded] = useState(false)`
    - Pass `isExpanded` as `enabled` to `useAudienceRecommendations(eventId, isExpanded)`
    - **Collapsed state (default):**
      - Card header: "Rekomendasi Audiens" title + "YoriMind AI" badge
      - Summary line: "🤖 **{totalMatched} potensi peserta ditemukan** · {totalExcluded} dikecualikan (ditandai)"
      - Shown even before expand (from a lightweight summary — use `totalMatched: 0` as default before data loads)
      - Toggle button to expand
    - **Loading state (expanded, fetching):** Skeleton rows (follow YoriMindPanel skeleton pattern)
    - **Error state (expanded, error):** "Gagal memuat rekomendasi." with retry button (follow YoriMindPanel error pattern)
    - **Empty state (expanded, totalMatched === 0):** "Tidak ada kontak yang cocok untuk event ini."
    - **Expanded state (data loaded):**
      - Scrollable list of top 20 recommended contacts:
        - Contact name, `industryId`, city
        - Score badge: score >= 70 → green bg, score >= 40 → yellow bg, score < 40 → red bg. Format: "{score}%"
        - Factor pills (small tags): each `factors` item displayed as a pill
        - Checkbox per contact for selection
      - "Select All (20)" / "Deselect All" controls
      - **"Preview & Blast" button** (primary, disabled if no contacts selected):
        - On click: write `{ eventId, contactIds: selectedIds, count: selectedIds.length }` to `sessionStorage` with key `'blast:prefilledAudience'`
        - Then `router.push('/app/blast')`
    - Props: `eventId: string`

- [ ] Task 11: Revamp event detail page card ordering
  - File: `src/app/app/events/[id]/_client.tsx`
  - Action: Reorder components:
    1. Event Banner (unchanged)
    2. Event Info + Lifecycle Controls (unchanged)
    3. `<AudienceRecommendationsCard eventId={event.id} />` **(NEW)**
    4. `{event.status === 'active' && <AttendanceMonitor />}` (unchanged)
    5. `<AnalyticsDashboard />` (unchanged)
    6. `<YoriMindPanel />` (unchanged)
    7. `<SurveyBuilder />` (moved to bottom)
  - Import `AudienceRecommendationsCard` from `@/components/features/events/AudienceRecommendationsCard`

#### UI Components — Phase 1 (Blast Enhancement)

- [ ] Task 12: Refactor blast mutation and add scheduledAt picker
  - File: `src/app/app/blast/page.tsx`
  - Action:
    - Add `const [scheduledAt, setScheduledAt] = useState<string | undefined>(undefined)`
    - Add `const [scheduleEnabled, setScheduleEnabled] = useState(false)`
    - Add UI: toggle switch labelled "Jadwalkan Blast" → when on, show `<input type="datetime-local">`. Convert selected local datetime to UTC ISO string and store in `scheduledAt`
    - Validation: if `scheduledAt` is set, it must be >= `new Date(Date.now() + 5 * 60 * 1000)`. Show inline error "Jadwal harus minimal 5 menit dari sekarang." if invalid
    - **Refactor `blastMutation` mutationFn** to send `BlastPayload` shape — include `scheduledAt` when set, `contactIds` when in AI mode (see Task 13)
    - Update success toast: if scheduled → `"Blast dijadwalkan untuk {format(scheduledAt, 'dd MMM yyyy HH:mm')}"`, else → existing "Blast dikirim!" toast

- [ ] Task 13: Add AI-mode (prefilledAudience) support to blast page
  - File: `src/app/app/blast/page.tsx`
  - Action:
    - On component mount (`useEffect`), read `sessionStorage.getItem('blast:prefilledAudience')`:
      - If present: parse as `BlastPrefilledAudience`, set `prefilledAudience` state, pre-select `eventId` in event dropdown (set as default value + disabled), then `sessionStorage.removeItem('blast:prefilledAudience')` to clear
    - Add state: `const [prefilledAudience, setPrefilledAudience] = useState<BlastPrefilledAudience | null>(null)`
    - **Conditional UI:**
      - If `prefilledAudience !== null`: replace the manual filter section (industry/city/companySize inputs + audience preview button) with a banner:
        ```
        🤖 Audiens dari rekomendasi YoriMind: {prefilledAudience.count} kontak terpilih
        [Hapus pilihan]  ← clears prefilledAudience and restores manual filters
        ```
      - The event dropdown remains visible but is pre-selected and disabled
      - Channel and template selectors remain visible and interactive
    - **Blast mutation in AI mode:** send `{ contactIds: prefilledAudience.contactIds, templateId, channel, scheduledAt? }` (omit `filters`)
    - **Blast mutation in manual mode:** send `{ filters, templateId, channel, scheduledAt? }` (omit `contactIds`)

#### UI Components — Phase 2 (Contact-Centric)

- [ ] Task 14: Add Suggested Events section to contact detail Sheet
  - File: `src/components/features/contacts/ContactsTable.tsx`
  - Action: In the Sheet content (used by BOTH mobile and desktop — there is no separate desktop expansion, both use the same Sheet component):
    - Add `const [eventsExpanded, setEventsExpanded] = useState(false)` inside the Sheet content
    - Add section below existing flag actions:
      ```
      [Suggested Events section header with toggle button]
      ```
    - When expanded: call `useRecommendedEvents(selectedContact?.id, eventsExpanded)`
    - Loading: skeleton rows
    - Error: "Gagal memuat event yang direkomendasikan."
    - Empty: "Tidak ada rekomendasi event untuk kontak ini."
    - Data: list of event cards, each showing:
      - Event name (linked to `/app/events/{event.eventId}` — use `event.eventId` field, NOT `event.id`)
      - Event date (relative format)
      - Score badge (same color coding as AudienceRecommendationsCard)
      - Factor pills

#### UI Components — Phase 3 (YoriMind Dashboard)

- [ ] Task 15: Create YoriMind Recommendations Dashboard page
  - File: `src/app/app/yorimind/page.tsx` (NEW — filesystem path is `src/app/app/yorimind/page.tsx`, URL is `/app/yorimind`)
  - Action: Create page component:
    - Do NOT use `force-static` or `generateStaticParams` — use default dynamic rendering
    - Fetch all events via `useEvents()`
    - Filter to `status === 'published' || status === 'active'`, take first 5 (sorted by `eventDate` asc)
    - For each of the (up to) 5 events, render a `<YoriMindDashboardEventCard eventId={event.id} />` sub-component
    - Each sub-component calls `useAudienceRecommendations(eventId, true)` (enabled immediately — dashboard is already an overview, no expand needed)
    - Sub-component displays: event name, date, status badge, top 5 contacts with scores, "Lihat Semua Rekomendasi" link → `/app/events/{event.id}`
    - Page header: "YoriMind — Rekomendasi Audiens"
  - Action: Add nav item in AdminShell nav config:
    - `{ href: '/app/yorimind', label: 'YoriMind', icon: SparklesIcon, roles: ['admin'] }`
    - Do NOT add `/app/yorimind` to `VIEWER_ALLOWED_PATHS` — it is admin-only

#### Hook Tests

- [ ] Task 16: Add hook tests for new recommendation hooks
  - Files: `src/hooks/useAudienceRecommendations.test.ts` (NEW), `src/hooks/useRecommendedEvents.test.ts` (NEW)
  - Action: Follow `useEvents.test.ts` pattern exactly (renderHook + QueryClient wrapper with `retry: false`, `waitFor` with `timeout: 3000`):
    - `useAudienceRecommendations`:
      - Test: returns `AudienceRecommendationsResponse` shape (has `recommendations`, `totalMatched`, `totalExcluded`, `excludedReasons`)
      - Test: `recommendations` is sorted by score descending
      - Test: no contact in `recommendations` has `flagCategory === 'not-potential'` or `'spam'`
      - Test: does NOT fetch when `enabled = false`
    - `useRecommendedEvents`:
      - Test: returns `RecommendedEventsResponse` shape
      - Test: all events in `recommendations` have `status === 'published'` or `'active'`
      - Test: does NOT fetch when `enabled = false`

#### OpenAPI Specification

- [ ] Task 17: Update OpenAPI specification document
  - File: `_bmad-output/implementation-artifacts/1-4-openapi-30-specification.md`
  - Action: Add/update following the existing markdown schema documentation style in the file:
    1. **`GET /api/events/{id}/audience-recommendations`** (NEW — add under Events section)
       - Summary: Get AI-scored audience recommendations for an event
       - Path param: `id` (event ID)
       - Query params: `limit?: number` (default 20, max 50), `minScore?: number` (default 0)
       - Response 200: `AudienceRecommendationsResponse` schema
    2. **`GET /api/contacts/{id}/recommended-events`** (NEW — add under Contacts section, after static sub-paths)
       - Summary: Get AI-recommended events for a contact
       - Path param: `id` (contact ID)
       - Response 200: `RecommendedEventsResponse` schema
    3. **`POST /api/events/{id}/blast`** (UPDATE request and response schemas)
       - Request body: add `contactIds?: string[]`, add `scheduledAt?: string` (ISO 8601 UTC)
       - Response 202: update to include `status: 'queued' | 'scheduled'` and `scheduledAt?: string`
    4. **`Event` schema** (UPDATE)
       - Add `industryTags?: string[]`
       - Add `eventType?: 'conference' | 'workshop' | 'networking' | 'seminar' | 'webinar'`
       - Add `topicTags?: string[]`

### Acceptance Criteria

- [ ] AC 1: Given an event detail page, when the admin views it, then cards appear in order: Event Info/Controls → Recommended Audience → AttendanceMonitor (if active) → Analytics → YoriMind Insights → Survey Builder.
- [ ] AC 2: Given the Recommended Audience card, when the admin expands it, then it shows up to 20 AI-scored contacts with score badges (color-coded ≥70 green, ≥40 yellow, <40 red), factor pills, and summary showing totalMatched and totalExcluded counts.
- [ ] AC 3: Given the Recommended Audience card expanded with contacts selected, when the admin clicks "Preview & Blast", then `sessionStorage['blast:prefilledAudience']` is written and the admin is navigated to `/app/blast`.
- [ ] AC 4: Given the blast page is opened with `sessionStorage['blast:prefilledAudience']` set, when it mounts, then the event dropdown is pre-selected/disabled, manual filters are replaced by the AI audience banner showing contact count, and sessionStorage key is cleared.
- [ ] AC 5: Given the blast page in AI-mode, when the admin sends the blast, then the mutation sends `contactIds` array (not `filters`) in the payload.
- [ ] AC 6: Given the blast page, when the admin enables "Jadwalkan Blast" and picks a valid future datetime, then the mutation sends `scheduledAt` in ISO 8601 UTC and the mock returns `status: 'scheduled'`.
- [ ] AC 7: Given the blast page, when the admin tries to schedule with a datetime less than 5 minutes in the future, then an inline validation error is shown and the blast button is disabled.
- [ ] AC 8: Given the blast page without scheduling enabled, when the admin sends, then `scheduledAt` is omitted and mock returns `status: 'queued'` (existing behavior preserved).
- [ ] AC 9: Given a contact detail Sheet (opened via table row click on mobile or desktop), when the "Suggested Events" section is expanded, then it shows recommended events with event name links, score badges, and factor pills.
- [ ] AC 10: Given the YoriMind Dashboard (`/app/yorimind`), when an admin loads it, then up to 5 published/active events are shown, each with top 5 recommended contacts and their scores.
- [ ] AC 11: Given a viewer role user, when navigating to `/app/yorimind`, then they are redirected (route is admin-only).
- [ ] AC 12: Given a flagged contact (`not-potential` or `spam`), when the recommendations endpoint is called, then they do not appear in `recommendations` and are counted in `totalExcluded` and `excludedReasons`.
- [ ] AC 13: Given the Event TypeScript interface, when a developer accesses an event object, then `industryTags`, `eventType`, and `topicTags` fields are available (optional).
- [ ] AC 14: Given all new hook tests, when run with `vitest run`, then all pass with the MSW mock server.

## Additional Context

### Dependencies

- No new external libraries required — uses existing shadcn/ui, React Query, MSW, Zustand, Sonner
- `<input type="datetime-local">` for scheduling (native HTML, no date picker library needed)
- `sessionStorage` for audience handoff (built-in browser API, no library)
- `SparklesIcon` from Lucide for YoriMind nav item (already in project dependencies)

### Testing Strategy

- **Hook tests (Task 16):** New test files following `useEvents.test.ts` pattern exactly
- **Existing tests:** All existing tests must continue to pass — type changes are additive (optional fields), event seeds only gain new optional fields, blast handler is backward-compatible
- **Manual testing checklist:**
  1. Event detail: verify card ordering, expand recommendations, check score colors and factor pills
  2. Select 3+ contacts → "Preview & Blast" → verify sessionStorage written, blast page AI-mode loads
  3. Blast AI-mode: verify event pre-selected, filters hidden, banner shows count
  4. Schedule blast: toggle on, pick datetime >5min future → send → toast shows scheduled time
  5. Schedule blast: pick datetime <5min future → verify inline error + disabled button
  6. Contact Sheet: click any row → expand "Suggested Events" → verify event links and scores
  7. `/app/yorimind`: verify up to 5 events shown with top 5 contacts each
  8. Viewer role: verify redirect away from `/app/yorimind`

### Notes

- **Scope clarification (L-1):** "Blast supports scheduled blast" means the FE UI sends `scheduledAt` and the mock responds with `status:'scheduled'`. No actual delivery worker is built (that is Story 5.3). These are compatible — the FE contract is complete, the backend execution is deferred.
- **Participation history:** The existing `Registration` type (`status:'attended'`, `attendedAt`) already covers what the backend scoring engine needs. No new `Participation` type is required on the FE.
- **Scoring weights** (past attendance +35, industry +25, location +15, recency +15, company size +10) are documented for backend reference. The FE is agnostic — it renders whatever `score` and `factors` the API returns.
- **Future enhancement:** If contact list grows beyond 50 selectable contacts, replace the sessionStorage handoff with a server-side saved audience list (POST /api/audiences) and pass only the audience ID in the URL.
