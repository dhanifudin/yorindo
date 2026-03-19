# Story 3.6: Smart Filter — AI Industry Autocomplete

## Story
As an admin, I want to type a free-form industry term in the contact filter and have it mapped to a canonical slug.

## Acceptance Criteria
- [x] GET /api/contacts/industry-suggestions?q=... with 500ms debounce
- [x] If confidence >= 0.6, apply matched slug
- [x] If confidence < 0.6 or API fails, fall back to dropdown
- [x] MSW handler for /api/contacts/industry-suggestions

## Status: review
