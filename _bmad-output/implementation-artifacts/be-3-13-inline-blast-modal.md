# Backend Story 3.13: Inline Blast Composer Custom Message Support

## AC
- `POST /api/events/:id/blast` needs to be updated to support the new payload introduced by frontend's Inline Blast composer.
- Support `customMessage?: string` inside the `BlastBodySchema` and make `templateId` optional.
- Ensure validation guarantees either `templateId` or `customMessage` is provided.
- Ensure `openapi.yaml` reflects these changes.
- Update `BlastJobData` and `blast.service.ts` to consume `customMessage`. If `customMessage` is sent, bypass fetching template properties and use it directly as the body.

## Tasks
- [x] Task 1: Update `BlastBodySchema` in `events.routes.ts` to allow `customMessage` and make `templateId` optional. Ensure refiner.
- [x] Task 2: Pass `customMessage` into the BullMQ `queueService.enqueue()` in `events.routes.ts`.
- [x] Task 3: In `blast.service.ts`, adjust `BlastJobData` to allow `customMessage?: string` and update `processJob` to resolve the `personalizedBody` using `customMessage` over `job.templateBody` if available.
- [x] Task 4: Update `openapi.yaml` `StandaloneBlastBody` to include `customMessage`.

## Dev Agent Record
### Implementation Plan
- Adjusted `BlastBodySchema` to make `templateId` optional. Add `customMessage` as an optional string. Added conditional schema refiner so that either a template ID or custom message exists.
- Modified `/events/:id/blast` logic in `events.routes.ts` to construct the `templateBody` dynamically prioritizing `customMessage` or mocking it if no template repo exists.
- Injected `customMessage` as an explicit field inside the queue structure for BullMQ processors to access.
- Synced `openapi.yaml`.

### Debug Log
- N/A

### Completion Notes
- Types all pass safely, validation guarantees one field. Waiter checks are bypassed successfully.

## File List
- `yorindo-api/src/routes/events.routes.ts`
- `yorindo-api/src/services/blast.service.ts`
- `yorindo-api/openapi.yaml`

## Status
review
