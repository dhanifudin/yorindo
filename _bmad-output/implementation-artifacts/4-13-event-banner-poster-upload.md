# Story 4.13: Event Banner & Poster — Shared Media Library

**Story ID:** 4.13
**Story Key:** 4-13-event-banner-poster-upload
**Epic:** Epic 4 — Event Configuration & Management
**Phase:** Phase 1 (FE) — wired to MSW media + events handlers
**Status:** ready-for-dev
**Created:** 2026-03-28
**Prerequisite:** Story 4.1 (event creation form) must be complete

---

## Story

As an admin,
I want to pick a banner and poster from a shared typed media library when creating or editing an event,
So that images are uploaded once and reused across multiple events without re-uploading.

---

## Acceptance Criteria

**AC1:** Given the event creation or edit form,
Then a **"Pilih Banner"** button opens `MediaPickerModal` pre-filtered to `type=banner`. Selected banner URL is shown as a 16:9 preview thumbnail. A remove (×) button clears the selection.

**AC2:** Given the event creation or edit form,
Then a **"Pilih Poster"** button opens `MediaPickerModal` pre-filtered to `type=poster`. Selected poster URL is shown as a 2:3 preview thumbnail. A remove (×) button clears the selection.

**AC3:** Given `MediaPickerModal` opens,
Then it displays a grid of existing images filtered by type (`banner` or `poster`). An **"Upload Baru"** button at the top allows uploading a new image (max 2MB, `image/jpeg,image/png,image/webp`). Newly uploaded images are added to the library and auto-selected. A dimension guidance chip is shown next to the upload button:
- Banner: `"Ukuran disarankan: 1200 × 675 px (rasio 16:9), maks. 2 MB"`
- Poster: `"Ukuran disarankan: 800 × 1200 px (rasio 2:3), maks. 2 MB"`

**AC4:** Given an image is uploaded via `MediaPickerModal`,
Then `POST /api/media` is called with `{ type, name, url }` and the image is stored in the shared media library (MSW in-memory). It is immediately available for selection in any event.

**AC5:** Given the event creation/edit form is submitted with a selected banner and/or poster,
Then `POST /api/events` or `PATCH /api/events/:id` includes `banner_url` and `poster_url` in the request body.

**AC6:** Given an event has `banner_url` set,
Then the public event landing page (`/register/[eventSlug]`) renders it as a full-width header image. If `banner_url` is null, a gradient placeholder using event name initials is shown.

**AC7:** Given an event has `banner_url` set,
Then it appears as a sticky visual strip at the top of the multi-step registration form throughout all 4 steps.

**AC8:** Given an event has `poster_url` set,
Then the checkout step (Story 6.2 AC8) shows the poster thumbnail in the order summary. If null, fallback to banner thumbnail; if both null, fallback to gradient placeholder.

**AC9:** Given either `banner_url` or `poster_url` is null,
Then all pages degrade gracefully — no broken images, no layout shifts.

---

## Tasks / Subtasks

- [ ] **Task 1: Add MSW media handler + seeded library**
  - [ ] Create `src/mocks/handlers/media.ts`
  - [ ] In-memory `mediaStore: MediaAsset[]` with 5 seeded assets: 3 banners + 2 posters (use `/placeholder-banner-1.jpg` etc. as URLs)
  - [ ] `GET /api/media?type=banner|poster` → returns filtered list
  - [ ] `POST /api/media` → accepts `{ type, name, url }`, stores new asset with CUID2 id + `uploadedAt`, returns 201
  - [ ] Register handler in `src/mocks/handlers/index.ts`
  - [ ] **UPDATE** (not create) `src/mocks/handlers/events.ts` — file already exists from Story 1.6. Add `banner_url: null` and `poster_url: null` to all seeded event fixtures. Seed at least 1 event with `banner_url: '/placeholder-banner.jpg'` to exercise the image display path.

- [ ] **Task 2: Add MediaAsset type to api.ts**
  - [ ] Add to `src/types/api.ts`:
    ```typescript
    export interface MediaAsset {
      id: string
      type: 'banner' | 'poster'
      name: string
      url: string
      uploadedAt: string
    }
    ```

- [ ] **Task 3: Build MediaPickerModal component**
  - [ ] Create `src/components/shared/MediaPickerModal.tsx`
  - [ ] Props: `type: 'banner' | 'poster'`, `open: boolean`, `onSelect: (url: string) => void`, `onClose: () => void`
  - [ ] Fetch `GET /api/media?type={type}` via React Query `useMedia(type)`
  - [ ] Render image grid (3-col on desktop, 2-col on mobile) using shadcn `AspectRatio` (16:9 for banner, 2:3 for poster)
  - [ ] Clicking an image calls `onSelect(asset.url)` and closes modal
  - [ ] "Upload Baru" button at top: hidden `<input type="file">`, on select validates size, creates object URL, calls `POST /api/media`, then `onSelect(url)`
  - [ ] Dimension guidance text next to upload button (shadcn `Badge` variant `outline`):
    - banner: `"1200 × 675 px · rasio 16:9 · maks. 2 MB"`
    - poster: `"800 × 1200 px · rasio 2:3 · maks. 2 MB"`
  - [ ] Empty state: "Belum ada {type} tersedia. Upload baru di atas."
  - [ ] Use shadcn `Dialog` for the modal shell

- [ ] **Task 4: Add image hooks**
  - [ ] Create `src/hooks/useMedia.ts`
  - [ ] `useMedia(type)` — `GET /api/media?type={type}` with React Query
  - [ ] `useUploadMedia()` — mutation: `POST /api/media`, invalidates `['media', type]` on success

- [ ] **Task 5: Wire MediaPickerModal into event creation/edit form**
  - [ ] Update `src/components/features/events/EventCreateForm.tsx`
  - [ ] Replace any previous upload UI with two picker buttons
  - [ ] Banner picker: shows 16:9 preview thumbnail when selected; "Pilih Banner" button
  - [ ] Poster picker: shows 2:3 preview thumbnail when selected; "Pilih Poster" button
  - [ ] Both fields use `z.string().nullable().optional()` in Zod schema
  - [ ] Include `banner_url` and `poster_url` in POST body

- [ ] **Task 6: Build GradientPlaceholder shared component**
  - [ ] Create `src/components/shared/GradientPlaceholder.tsx`
  - [ ] Props: `name: string`, `className?: string`
  - [ ] Deterministic gradient from name hash:
    ```typescript
    const hue = name.charCodeAt(0) % 360
    // background: linear-gradient(135deg, hsl(hue,60%,50%), hsl(hue+60,60%,50%))
    // Initials: name.split(' ').slice(0,2).map(w => w[0].toUpperCase()).join('')
    ```

- [ ] **Task 7: Update public event landing page** *(file owned by Story 6.1)*
  - [ ] **UPDATE** `src/app/(public)/register/[eventSlug]/page.tsx` — created in Story 6.1; follow its existing layout and `useEvent(slug)` hook pattern
  - [ ] Full-width banner with `<Image unoptimized>` if `banner_url` set; else `<GradientPlaceholder name={event.name} />`

- [ ] **Task 8: Add banner strip to registration form** *(file owned by Story 6.2)*
  - [ ] **UPDATE** the registration form shell — created in Story 6.2; identify the outer layout component wrapping the multi-step form
  - [ ] Sticky top strip (`h-16` mobile / `h-20` desktop): banner thumbnail left + event name right, visible on all 4 steps

- [ ] **Task 9: Add poster to checkout step** *(checkout step built in Story 6.2 AC8)*
  - [ ] **Depends on Story 6.2 AC8 being implemented first** — the checkout step component must exist before this task runs
  - [ ] In the checkout step: show poster thumbnail if set; fallback to banner; fallback to `<GradientPlaceholder>`

- [ ] **Task 11: Create `src/lib/media.ts`** *(new file — referenced in Dev Notes)*
  - [ ] Export `MEDIA_SPECS` constant (banner + poster dimensions/labels)
  - [ ] Import in `MediaPickerModal` for dimension guidance badge labels

- [ ] **Task 10: Write vitest tests**
  - [ ] MSW handler: `GET /api/media?type=banner` returns only banner assets; `POST /api/media` stores and returns new asset
  - [ ] `MediaPickerModal`: renders filtered grid; clicking image calls `onSelect`; upload creates new asset
  - [ ] Event form: banner_url and poster_url included in POST body after selection
  - [ ] `GradientPlaceholder`: renders initials from name; deterministic gradient class

---

## Dev Notes

### Media Library Data Shape

```typescript
// In-memory MSW store
interface MediaAsset {
  id: string          // CUID2
  type: 'banner' | 'poster'
  name: string        // human label, e.g. "Workshop Series 2026"
  url: string         // object URL in Phase 1; S3 signed URL in Phase 2
  uploadedAt: string  // ISO 8601
}
```

### Phase 1 vs Phase 2

**Phase 1 (this story — MSW):**
- Upload: `URL.createObjectURL(file)` → `POST /api/media` → stored in MSW `mediaStore`
- Images do not persist on page reload (acceptable for dev/test)
- Seeded assets use `/placeholder-banner-1.jpg` etc. (static files in `public/`)

**Phase 2 (BE — future):**
- `POST /api/media` becomes a multipart upload endpoint → S3 → returns signed URL
- `media` table: `id`, `type`, `name`, `url`, `uploaded_by`, `created_at`
- Migration 007: `CREATE TABLE media (...)`

### Recommended Dimensions (display in UI)

```typescript
export const MEDIA_SPECS = {
  banner: { width: 1200, height: 675,  ratio: '16/9', label: '1200 × 675 px · rasio 16:9 · maks. 2 MB' },
  poster: { width: 800,  height: 1200, ratio: '2/3',  label: '800 × 1200 px · rasio 2:3 · maks. 2 MB' },
} as const
```

Store in `src/lib/media.ts`. Import into `MediaPickerModal` and render the `label` as a shadcn `Badge` (variant `outline`) next to the Upload button. No enforcement — this is guidance only; admins can upload any dimension.

### shadcn Components to Use
- `Dialog` — modal shell for MediaPickerModal
- `AspectRatio` — enforce 16:9 / 2:3 in grid and preview
- `Card` — grid item container
- `Badge` (variant `outline`) — dimension guidance chip

### Key Anti-Patterns
- DO NOT use `<img>` directly — use Next.js `<Image unoptimized>` for object URLs in Phase 1
- DO NOT block form submission when no images selected — both fields are optional
- DO NOT store `File` objects in React state — only the URL string
- DO NOT re-fetch the full event list on every media upload — only invalidate `['media', type]`

---

## File List

**New files:**
- `src/mocks/handlers/media.ts`
- `src/components/shared/MediaPickerModal.tsx`
- `src/components/shared/GradientPlaceholder.tsx`
- `src/hooks/useMedia.ts`
- `src/lib/media.ts`

**Updated files (existing — do not recreate):**
- `src/mocks/handlers/events.ts` — add `banner_url`/`poster_url` to seeded events (Story 1.6 file)
- `src/mocks/handlers/index.ts` — register media handler
- `src/types/api.ts` — `MediaAsset` type (Story 1.5 file)
- `src/components/features/events/EventCreateForm.tsx` — banner/poster pickers (Story 4.1 file)
- `src/app/(public)/register/[eventSlug]/page.tsx` — banner header (Story 6.1 file)
- `src/app/(public)/register/[eventSlug]/form/` — banner strip (Story 6.2 file)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-28 | Story created (SCP-2026-03-28-E): per-event upload | bmad-correct-course |
| 2026-03-28 | Revised: per-event upload → shared typed media library (banner/poster separate) | bmad-correct-course |
