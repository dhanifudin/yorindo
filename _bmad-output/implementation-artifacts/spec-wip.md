---
title: 'Fix banner gallery — replace mock data with real API calls'
type: 'bugfix'
created: '2026-04-11'
status: 'in-progress'
context: []
baseline_commit: e982e379f7018441f76824eb581d351ec6cb1a42
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The "Database Gallery" tab in the event banner picker displays 6 hardcoded Unsplash images (`MOCK_EXISTING_IMAGES` constant) instead of loading real uploaded images from the backend. The file upload also uses a local `mockUploadImage()` that creates blob URLs instead of calling `POST /api/uploads/image`.

**Approach:** Add a `GET /api/uploads` backend endpoint to list previously uploaded images. Replace the mock gallery with a real API fetch. Wire the file upload to call the real `POST /api/uploads/image` endpoint.

## Boundaries & Constraints

**Always:**
- Keep backward compatibility — if the gallery API fails, show an empty state (not a crash)
- Use React Query for data fetching (consistent with existing hooks pattern)
- Preserve the three-tab UI (Device, Database Gallery, URL Input)

**Never:**
- Do not remove MSW mock handlers — they should still work when `NEXT_PUBLIC_ENABLE_MOCKS=true`
- Do not change the visual design or UX of the gallery dialog

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Gallery opens | Dialog mounts | Fetches `GET /api/uploads`, displays returned images | Shows empty state if no images; loading spinner during fetch |
| Upload succeeds | `POST /api/uploads/image` returns `{ url }` | New image appears in gallery after upload | On error, shows toast with error message |
| Network error on gallery fetch | API returns 500 or unreachable | Shows empty gallery with "Failed to load" message | Non-blocking — user can still use URL input or device upload |
| No images uploaded yet | `GET /api/uploads` returns `[]` | Shows empty state with "No images yet — upload one" | N/A |

</frozen-after-approval>

## Code Map

- `yorindo-api/src/routes/uploads.routes.ts` -- Add `GET /api/uploads` list endpoint
- `yorindo-api/openapi.yaml` -- Document the new endpoint
- `yorindo-app/src/mocks/handlers/uploads.ts` -- Add mock `GET /api/uploads` handler
- `yorindo-app/src/components/features/events/EventCreateForm.tsx` -- Replace `MOCK_EXISTING_IMAGES` with API fetch, replace `mockUploadImage()` with real upload call

## Tasks & Acceptance

**Execution:**
- [x] `yorindo-api/src/routes/uploads.routes.ts` -- Add `GET /api/uploads` endpoint that scans uploads directory and returns `{ files: [{ filename, url, uploadedAt, size }] }` -- Gallery needs a real data source
- [x] `yorindo-api/openapi.yaml` -- Document `GET /api/uploads` endpoint in OpenAPI spec -- Contract validation requires it
- [x] `yorindo-app/src/mocks/handlers/uploads.ts` -- Add `GET /api/uploads` mock handler returning realistic test data -- Dev experience with MSW enabled
- [x] `yorindo-app/src/components/features/events/EventCreateForm.tsx` -- Replace `MOCK_EXISTING_IMAGES.map()` with API fetch via `fetch('/api/uploads')`, replace `mockUploadImage()` with `fetch('/api/uploads/image')` POST -- Real data flows

**Acceptance Criteria:**
- Given the banner dialog is open, when the "Database Gallery" tab is selected, then images are fetched from `GET /api/uploads` and displayed (not hardcoded)
- Given a user uploads a file via the "Dari Device" tab, when the upload completes, then the file is sent to `POST /api/uploads/image` and the returned URL is used as the banner
- Given the gallery API returns no images, when the gallery tab is open, then an empty state is shown (not the 6 mock images)
- Given the gallery API fails, when the gallery tab is open, then an error state is shown but the user can still use the other tabs

## Spec Change Log

## Design Notes

The `GET /api/uploads` endpoint will use `fs.readdirSync()` on the uploads directory to list files, returning metadata (filename, URL, size, mtime). No database tracking needed for Phase 1 — filesystem is the source of truth.

## Verification

**Commands:**
- `cd yorindo-api && npm test` -- expected: all 195+ tests pass
- `cd yorindo-api && npx tsc --noEmit` -- expected: zero type errors
- `cd yorindo-app && npx tsc --noEmit` -- expected: zero type errors

**Manual checks:**
- Open event create form → click banner upload → open Database Gallery tab → should show real uploaded images or empty state (not 6 hardcoded Unsplash images)
- Upload a file via "Dari Device" tab → should call real API and return `/api/uploads/<filename>` URL
