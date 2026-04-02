# Backend Story 5.2: Segmented Blast Configuration & Audience Targeting

## AC
- `POST /api/events/:id/blast` needs to handle array-based target criteria inside `filters` corresponding to the latest frontend improvements (`industries`, `cities`, `companySizes`, `jobTitles`, `behavior`, `lastAttendedBefore`).
- `BlastJobData` passed into `BullMQ` should hold the richer filter structures.
- `BlastService` should dynamically apply these filters when executing the job instead of fetching an unfiltered page of 500 contacts.

## Tasks
- [x] Task 1: Update `BlastBodySchema` in `events.routes.ts` to support arrays of `industries`, `cities`, `companySizes`, `jobTitles`, `behavior`, and `lastAttendedBefore` within the `filters` body.
- [x] Task 2: Update `events.routes.ts` `POST /api/events/:id/blast` route to forward new filter criteria.
- [x] Task 3: Update `BlastJobData` in `blast.service.ts` to expect arrays for criteria.
- [x] Task 4: In `BlastService.processJob()`, actually execute filtering over the pool of contacts (matching `AudiencePreview` logic) instead of a naive `.findAll` fetch.
- [x] Task 5: Use `contactIds` if sent directly as part of the job without applying manual filters.

## Dev Agent Record
### Implementation Plan
- Adjusted `BlastBodySchema` arrays for multi-criteria mapping.
- Added corresponding elements to `IContactRepository.ts` internal typed filters.
- Re-architected `ContactRepository.ts` search to accept subset matching.
- Adjusted `BlastService` job handling to run true filters or explicit `contactIds`.

### Debug Log
- N/A

### Completion Notes
- All backend tests passed successfully with 131 tests executed. Types successfully infer.

## File List
- `yorindo-api/src/routes/events.routes.ts`
- `yorindo-api/src/services/blast.service.ts`
- `yorindo-api/src/interfaces/repositories/IContactRepository.ts`
- `yorindo-api/src/repositories/memory/ContactRepository.ts`

## Status
review
