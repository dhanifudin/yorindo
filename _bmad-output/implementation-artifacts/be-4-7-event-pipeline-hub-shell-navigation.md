# Story 4.7 Backend Supplements

## Story
Provides backend requirements to support 4.7 Frontend shell layout (Pipeline Hub), primarily ensuring the `Event` schema outputs analytics tracking.

## Tasks
- [x] Task 1: Update `openapi.yaml` to include `registeredCount` inside the `Event` schema for UI reference.
- [x] Task 2: Inject physical `registeredCount` query via `registrationRepository.findByEvent` and propagate to `toEventDto` helper in `events.routes.ts`.

## Dev Agent Record
### Implementation Plan
- Implemented `registeredCount` in API output arrays seamlessly.
- Used the `total` scalar inside `findByEvent` to prevent heavy N+1 loading queries on the in-memory array representation.

### Debug Log
- N/A

### Completion Notes
- All endpoints tested and pass OpenAPI payload validation.

## Status
review
