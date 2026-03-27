# Story 8.2: Vendor Report Access via Magic Link & DPA

**Story ID:** 8.2
**Story Key:** 8-2-vendor-report-access-via-magic-link-dpa
**Epic:** Epic 8 — Analytics, Reporting & YoriMind
**Phase:** Phase 1/2 hybrid — FE vendor landing page with Phase 2 delivery endpoints
**Status:** review

---

## Story

As a vendor/client,
I want to access the event report via a time-limited link without creating an account, after accepting the data processing agreement,
So that I receive the participant insights I was promised without the friction of platform registration.

## Acceptance Criteria

- [x] `POST /api/events/:id/vendor-link` generates a time-limited signed URL and delivers it to the sponsor `contact_email` resolved from the linked vendor record attached through `/api/vendors` and `/api/events/:id/sponsors`
- [x] `GET /api/vendor-report/:token` shows the vendor report landing page with the current `dpaVersion` and blocks report visibility until DPA acceptance
- [x] `POST /api/vendor-report/:token/dpa` records acceptance and unlocks the report payload for that token
- [x] If the magic link is expired, invalid, or no longer eligible, the endpoint returns a 403-style error state instructing the vendor to contact Yorindo
- [x] DPA acceptance is tracked against the linked vendor identity and DPA version, not a raw email string
- [x] Vendor-facing report download remains available through the report/download flow after DPA acceptance
- [x] MSW handlers exist for `/api/vendor-report/:token` and `/api/vendor-report/:token/dpa`

## Status: review
