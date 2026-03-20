# Story 4.7 — Event Banner Image Support

**Epic:** 4 — Event Configuration & Management
**Phase:** FE-only (Phase 1)
**Priority:** Low
**Depends on:** None
**Sprint Change Proposal:** 2026-03-20

---

## Description

Enable admins to add a banner image to events. Phase 1 uses a URL input field; Phase 2 will add file upload to local storage. The banner is displayed on event detail pages, event landing pages, and dashboard event cards.

---

## Acceptance Criteria

### Event Form — Banner Section
- [ ] Event creation and edit forms include a "Banner" section
- [ ] URL input field for banner image URL
- [ ] Image preview rendered below the input (img tag with error fallback)
- [ ] Validation: must be a valid URL (basic URL pattern check)
- [ ] Optional field — events can be created without a banner

### Banner Display
- [ ] Event detail page (`/app/events/[id]`): full-width banner at top
- [ ] Event landing page (`/register/[slug]`): hero section background
- [ ] Dashboard event cards: thumbnail (aspect-ratio maintained)
- [ ] Default placeholder banner when no URL provided

### Data Model
- [ ] `bannerUrl` field added to `Event` type in `src/types/api.ts`
- [ ] MSW event fixtures include `bannerUrl` for 2–3 sample events

### Technical Constraints
- [ ] Image rendered via `next/image` with `unoptimized={true}` (static export)
- [ ] Aspect ratio: 16:9 recommended, enforced via CSS `object-fit: cover`
- [ ] No file upload in Phase 1 — URL-only

---

## MSW Changes

- Add `bannerUrl?: string` to Event type
- Add sample banner URLs to 2–3 event fixtures in `src/mocks/handlers/events.ts`

---

## Out of Scope

- File upload (Phase 2)
- Image optimization/resizing
- Multiple banner images per event
