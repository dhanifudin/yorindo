# Story 6.8 — Social OG Meta Tags for Event Pages

**Epic:** 6 — Participant Registration & Approval Workflow
**Phase:** FE-only (Phase 1)
**Priority:** Low
**Depends on:** 6.1 (public event landing page), 4.7 (event banner)
**Sprint Change Proposal:** 2026-03-20

---

## Description

Add Open Graph meta tags to event landing pages so they display rich previews when shared on WhatsApp, Facebook, Twitter, and other social platforms. Uses the event banner image as the OG image.

---

## Acceptance Criteria

### OG Meta Tags
- [ ] Event landing pages (`/register/[slug]`) include Open Graph meta tags:
  - `og:title` = event name
  - `og:description` = event description (truncated to 200 characters)
  - `og:image` = event banner URL (or default Yorindo banner)
  - `og:url` = canonical URL
  - `og:type` = "website"
- [ ] WhatsApp compatibility: `og:image` dimensions ≥ 300×200
- [ ] Twitter card meta tags: `twitter:card` = "summary_large_image"

### Implementation
- [ ] Meta tags rendered via Next.js Metadata API (`generateMetadata` or `metadata` export)
- [ ] Static export compatible: use `generateStaticParams` for known event slugs
- [ ] Phase 1: metadata from MSW fixture data via `generateStaticParams`
- [ ] Phase 2: real API data via server-side `generateMetadata`

### Admin Preview
- [ ] OG preview card on event detail page (`/app/events/[id]`)
- [ ] Shows how the event will appear when shared (title, description, image thumbnail)

---

## MSW Changes

- No additional handlers needed (uses existing event data)
- Ensure event fixtures include `description` and `bannerUrl` for preview

---

## Technical Notes

- `generateMetadata` in `/register/[slug]/page.tsx`
- Static export limitation: meta tags are baked at build time
- Default OG image: Yorindo branded placeholder (e.g., `/images/og-default.png`)
- No `fb:app_id` required for basic sharing

---

## Out of Scope

- Dynamic server-side OG rendering (Phase 2)
- Custom OG images per event (banner is sufficient)
- Analytics on social shares
