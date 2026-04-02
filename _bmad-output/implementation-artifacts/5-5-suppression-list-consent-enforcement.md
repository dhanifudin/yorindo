# Story 5.5: Suppression List & Consent Enforcement

## Story
As an admin, I want to view the suppression list, search by email/phone, and manage the current suppression-list flow used by the implementation.

## Acceptance Criteria
- [x] /app/suppression shows paginated suppression list with search
- [x] FE/MSW suppression add/remove flow exists for manual management
- [x] Full backend suppression/unsubscribe contract remains follow-up work

## Status: review

## Dev Agent Record

### Completion Notes
- Implemented backend suppression list contract at `GET /api/contacts/suppression`, `POST /api/contacts/suppression`, and `DELETE /api/contacts/suppression/:id`.
- Added suppression repository support for email-based suppression, removal, and richer suppression entry metadata.
- Updated blast delivery suppression enforcement so email-only suppressions are respected during email blasts.
- Verified backend changes with `npm run lint` and `npm test`.

## File List
- `yorindo-api/src/interfaces/repositories/ISuppressionRepository.ts`
- `yorindo-api/src/repositories/memory/SuppressionRepository.ts`
- `yorindo-api/src/routes/contacts.routes.ts`
- `yorindo-api/src/services/blast.service.ts`
- `yorindo-api/src/tests/blast.service.test.ts`
- `yorindo-api/src/tests/contacts.routes.test.ts`
- `yorindo-api/src/tests/repositories.test.ts`
- `yorindo-api/src/types/domain.ts`
- `yorindo-api/openapi.yaml`

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-04-02 | Implemented backend suppression list API and consent enforcement in blast flow | Codex |
