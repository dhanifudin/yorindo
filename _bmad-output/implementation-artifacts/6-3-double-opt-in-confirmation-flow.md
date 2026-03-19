# Story 6.3: Double Opt-In Confirmation Flow

## Story
Public page /register/confirm/[token]: verify token and show success/error state.

## Acceptance Criteria
- [x] GET /api/registrations/confirm/:token verifies token
- [x] Success: "Registrasi dikonfirmasi" state
- [x] Error: "Token tidak valid atau kadaluarsa" state
- [x] MSW handler for confirm endpoint

## Status: review
