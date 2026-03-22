---
title: 'AI-Graded Registration Review'
slug: 'ai-graded-registration-review'
created: '2026-03-20'
status: 'complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['react', 'next.js', 'tailwindcss', 'react-query', 'msw', 'tanstack-table']
files_to_modify:
  - src/types/api.ts
  - src/lib/djb2.ts (new)
  - src/mocks/handlers/registrations.ts
  - src/mocks/handlers/events.ts
  - src/app/app/events/[id]/registrations/_client.tsx
  - yorindo-api/openapi.yaml
---

# Tech-Spec: AI-Graded Registration Review

**Created:** 2026-03-20

## Overview

### Problem Statement

The registrations management page at `/app/events/:id/registrations` shows only raw registration IDs — no participant identity (name, email, phone), no AI guidance on suitability, and no visibility of flagged contacts during review. Admins must manually cross-reference the contacts list to make approval decisions, and contacts flagged as `not-potential` or `spam` can slip through undetected.

### Solution

Enrich `GET /api/events/:id/registrations` with resolved contact details and a deterministic AI suitability score (djb2 on `contactId + eventId`). Update the registrations table to show participant identity, color-coded AI score badges, and inherited flag badges. Enrich the row detail Sheet with contact info + survey answers. AI scores are advisory only. Flag clearing uses `POST /api/registrations/:id/clear-flag` with true optimistic update (instant badge removal, rollback on error).

### Scope

**In Scope:**
- `RegistrationWithContact` type extending `Registration` (6 new fields)
- Shared `src/lib/djb2.ts` utility (eliminates duplication)
- MSW: fix registrationsStore to use contactsPool IDs; add clear-flag handler
- Enrich `GET /api/events/:id/registrations` handler
- Table: Peserta column (name+email+flag badge), Skor AI column (all tabs), keep Posisi on waitlisted tab
- Detail Sheet: contact fields + raw survey answer key-values
- Pending tab: true client-side sort by aiScore descending
- OpenAPI: RegistrationWithContact schema + 2 missing endpoints

**Out of Scope:**
- Bulk AI approve; modifying contact flagCategory; score factor display; configurable thresholds

---

## Context for Development

### Codebase Patterns

- **djb2** (events.ts:325): `(s: string) => s.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 100, 0)` — range is **0–99**, not 0–100
- **contactsPool** (contacts.ts:21): exported, 247 contacts, `faker.seed(42)` for determinism. Direct top-level import in registrations.ts is safe — no circular dep between registrations.ts ↔ contacts.ts
- **Circular dep only**: events.ts → contacts.ts (events needs contactsPool); contacts.ts → events.ts (contacts needs eventsStore for recommended-events). Use `await import('./contacts')` inside events.ts handlers only
- **Score badge** (AudienceRecommendationsCard.tsx:15–19): `scoreBadgeClass(score)` + numeric score display (e.g. "85") — reuse this pattern, no text labels
- **Status mutation pattern**: `useMutation` → invalidate `['event-registrations', id]`
- **Optimistic update pattern**: `onMutate` sets cache immediately → `onError` restores previous cache + toast → `onSuccess` no-op (cache already correct)

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/types/api.ts` | Add `RegistrationWithContact`; `FlagCategory` at line 4 |
| `src/lib/djb2.ts` | New shared utility — extract from events.ts |
| `src/mocks/handlers/registrations.ts` | Update store + add clear-flag handler |
| `src/mocks/handlers/events.ts` | Enrich GET registrations handler; existing djb2 at line 325 |
| `src/mocks/handlers/contacts.ts` | `contactsPool` export at line 21 |
| `src/app/app/events/[id]/registrations/_client.tsx` | Full update: types, columns, sort, optimistic mutation, Sheet |
| `src/components/features/events/AudienceRecommendationsCard.tsx` | Reference for `scoreBadgeClass` |
| `yorindo-api/openapi.yaml` | Add schema + endpoints |

### Technical Decisions

- **Endpoint**: `POST /api/registrations/:id/clear-flag` — no body, returns `RegistrationWithContact`. Action sub-resource, consistent with `POST /api/registrations/:id/cancel`.
- **djb2 extraction**: Move to `src/lib/djb2.ts`; import in events.ts and registrations.ts. Eliminates copy-paste.
- **Score range**: 0–99 (djb2 `% 100`). Type: `number`. OpenAPI: `integer, minimum: 0, maximum: 99`.
- **Score display**: Numeric (e.g. "85"), colored badge. ≥70 green, ≥40 yellow, <40 red. No text labels.
- **contactsPool import in registrations.ts**: Top-level `import { contactsPool } from './contacts'` — no circular dep.
- **flagOverride in MSW store**: `StoredRegistration = Registration & { flagOverride: boolean }`. registrationsStore typed as `StoredRegistration[]`. Spread in enrichment handler carries flagOverride automatically. events.ts import of registrationsStore must be updated to `StoredRegistration[]` type after T2.
- **Optimistic clear-flag**: `onMutate` flips flagOverride in cache immediately. `onError` restores snapshot + `toast.error`. `onSuccess` is no-op.
- **Survey answers**: `Object.entries(reg.surveyAnswers ?? {})` — raw keys shown as-is. No `useEvent` call needed (surveySchema not used for v1 Sheet).
- **colSpan**: Non-waitlisted tabs = 6 columns; waitlisted = 7 (adds Posisi). Use `colSpan={activeTab === 'waitlisted' ? 7 : 6}` in empty-state row.

---

## Implementation Plan

### Tasks

#### T1 — Create `src/lib/djb2.ts`

```typescript
export function djb2(s: string): number {
  return s.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 100, 0)
}
```

#### T2 — Add `RegistrationWithContact` to `src/types/api.ts`

Add after the `Registration` interface:

```typescript
export interface RegistrationWithContact extends Registration {
  contactName: string
  contactEmail: string
  contactPhone: string
  contactFlagCategory: FlagCategory
  aiScore: number      // 0–99
  flagOverride: boolean
}
```

#### T3 — Update `src/mocks/handlers/registrations.ts`

1. Add imports at top:
   ```typescript
   import { contactsPool } from './contacts'
   import { djb2 } from '@/lib/djb2'
   import type { RegistrationWithContact } from '@/types/api'
   ```
2. Add local type: `type StoredRegistration = Registration & { flagOverride: boolean }`
3. Change `registrationsStore` type to `StoredRegistration[]`
4. In store factory: replace `contactId: faker.string.uuid()` with `contactId: contactsPool[i % contactsPool.length].id` and add `flagOverride: false`
5. Add `POST /api/registrations/:id/clear-flag` handler **before** existing handlers:

```typescript
http.post('/api/registrations/:id/clear-flag', async ({ params }) => {
  await delay(300)
  const idx = registrationsStore.findIndex((r) => r.id === params.id)
  if (idx === -1) {
    return HttpResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Registration not found', details: [] } },
      { status: 404 }
    )
  }
  registrationsStore[idx] = { ...registrationsStore[idx], flagOverride: true }
  const reg = registrationsStore[idx]
  const contact = contactsPool.find((c) => c.id === reg.contactId) ?? contactsPool[0]
  const enriched: RegistrationWithContact = {
    ...reg,
    contactName: contact.name,
    contactEmail: contact.email,
    contactPhone: contact.phone,
    contactFlagCategory: contact.flagCategory,
    aiScore: djb2(contact.id + reg.eventId),
  }
  return HttpResponse.json(enriched)
}),
```

#### T4 — Enrich `GET /api/events/:id/registrations` in `src/mocks/handlers/events.ts`

1. Add import at top: `import { djb2 } from '@/lib/djb2'`
2. Update `registrationsStore` import type to `StoredRegistration` (or cast via type assertion)
3. Add `RegistrationWithContact` to type imports from `@/types/api`
4. In the handler, replace the `data` slice + response with enriched version:

```typescript
const { contactsPool } = await import('./contacts')

const enriched: RegistrationWithContact[] = filtered
  .slice((page - 1) * pageSize, page * pageSize)
  .map((reg) => {
    const contact = contactsPool.find((c) => c.id === reg.contactId) ?? contactsPool[0]
    return {
      ...reg,
      contactName: contact.name,
      contactEmail: contact.email,
      contactPhone: contact.phone,
      contactFlagCategory: contact.flagCategory,
      aiScore: djb2(contact.id + eventId),
    }
  })

const response: PaginatedResponse<RegistrationWithContact> = {
  data: enriched,
  pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
}
return HttpResponse.json(response)
```

Note: `...reg` spread carries `flagOverride` from `StoredRegistration` — no explicit field needed.

Also update the existing local `djb2` definition in events.ts (line 325) — **remove it**, now imported from `@/lib/djb2`.

#### T5 — Update `src/app/app/events/[id]/registrations/_client.tsx`

1. **Imports**: Replace `Registration` with `RegistrationWithContact`; add `useEvent` import; add `Flag, X` from lucide-react; add `djb2` import (not needed — scores come from API)

2. **Remove** unused `registrations` / `setRegistrations` state (lines 72–75). Use `data?.data ?? []` directly.

3. **Add `scoreBadgeClass` helper**:
   ```typescript
   function scoreBadgeClass(score: number) {
     if (score >= 70) return 'bg-green-100 text-green-700'
     if (score >= 40) return 'bg-yellow-100 text-yellow-700'
     return 'bg-red-100 text-red-700'
   }
   ```

4. **Add `clearFlagMutation`** with true optimistic update:
   ```typescript
   const clearFlagMutation = useMutation({
     mutationFn: async (regId: string) => {
       const res = await fetch(`/api/registrations/${regId}/clear-flag`, { method: 'POST' })
       if (!res.ok) throw new Error('Gagal menghapus flag')
       return res.json() as Promise<RegistrationWithContact>
     },
     onMutate: async (regId) => {
       await queryClient.cancelQueries({ queryKey: ['event-registrations', id, activeTab] })
       const previous = queryClient.getQueryData(['event-registrations', id, activeTab])
       queryClient.setQueryData(
         ['event-registrations', id, activeTab],
         (old: { data: RegistrationWithContact[]; pagination: { total: number } } | undefined) => ({
           ...old,
           data: (old?.data ?? []).map((r) => r.id === regId ? { ...r, flagOverride: true } : r),
         })
       )
       return { previous }
     },
     onError: (_err, _regId, context) => {
       queryClient.setQueryData(['event-registrations', id, activeTab], context?.previous)
       toast.error('Gagal menghapus flag')
     },
   })
   ```

5. **Change all `Registration` types** → `RegistrationWithContact` (query type, `detailReg` state)

6. **Sorted data** for render:
   ```typescript
   const sortedData = activeTab === 'pending'
     ? [...(data?.data ?? [])].sort((a, b) => b.aiScore - a.aiScore)
     : (data?.data ?? [])
   ```

7. **Table columns**:
   ```
   # | Peserta | Skor AI | Status | Terdaftar | [Posisi — waitlisted only] | Aksi
   ```
   Header:
   ```tsx
   <TableHead className="hidden md:table-cell">#</TableHead>
   <TableHead>Peserta</TableHead>
   <TableHead>Skor AI</TableHead>
   <TableHead>Status</TableHead>
   <TableHead className="hidden md:table-cell">Terdaftar</TableHead>
   {activeTab === 'waitlisted' && <TableHead className="hidden md:table-cell">Posisi</TableHead>}
   <TableHead>Aksi</TableHead>
   ```

8. **Empty state colSpan**:
   ```tsx
   <TableCell colSpan={activeTab === 'waitlisted' ? 7 : 6} className="text-center ...">
   ```

9. **Peserta cell** (name + email + optional flag badge):
   ```tsx
   <TableCell>
     <div className="flex flex-col gap-0.5">
       <span className="text-sm font-medium">{reg.contactName}</span>
       <span className="text-xs text-muted-foreground">{reg.contactEmail}</span>
       {(reg.contactFlagCategory === 'spam' || reg.contactFlagCategory === 'not-potential') && !reg.flagOverride && (
         <button
           onClick={(e) => { e.stopPropagation(); clearFlagMutation.mutate(reg.id) }}
           title="Klik untuk hapus flag"
           className="self-start"
         >
           <Badge className="bg-orange-100 text-orange-700 text-xs gap-1 cursor-pointer hover:bg-orange-200">
             <Flag className="h-3 w-3" />
             {reg.contactFlagCategory}
             <X className="h-3 w-3" />
           </Badge>
         </button>
       )}
     </div>
   </TableCell>
   ```

10. **Skor AI cell**:
    ```tsx
    <TableCell>
      <Badge className={`${scoreBadgeClass(reg.aiScore)} text-xs`}>{reg.aiScore}</Badge>
    </TableCell>
    ```

11. **Sheet enrichment** — add contact section before existing fields:
    ```tsx
    <div><span className="text-muted-foreground">Nama: </span><span className="font-medium">{detailReg?.contactName}</span></div>
    <div><span className="text-muted-foreground">Email: </span>{detailReg?.contactEmail}</div>
    <div><span className="text-muted-foreground">Telepon: </span>{detailReg?.contactPhone}</div>
    <div><span className="text-muted-foreground">Skor AI: </span>
      {detailReg && <Badge className={`${scoreBadgeClass(detailReg.aiScore)} text-xs`}>{detailReg.aiScore}</Badge>}
    </div>
    {Object.keys(detailReg?.surveyAnswers ?? {}).length > 0 && (
      <div className="border-t pt-3 mt-1">
        <p className="text-xs text-muted-foreground uppercase font-medium mb-2">Jawaban Survey</p>
        {Object.entries(detailReg?.surveyAnswers ?? {}).map(([key, value]) => (
          <div key={key}><span className="text-muted-foreground capitalize">{key}: </span>{String(value)}</div>
        ))}
      </div>
    )}
    ```

    **Do not add `useEvent(id)`** — surveySchema is not used; surveyAnswers keys are rendered directly.

12. **Update `displayData` references** → replace with `sortedData` throughout the render.

#### T6 — Update `yorindo-api/openapi.yaml`

1. **Add `RegistrationWithContact` schema** in `components/schemas` after `Registration`:
   ```yaml
   RegistrationWithContact:
     allOf:
       - $ref: '#/components/schemas/Registration'
       - type: object
         required: [contactName, contactEmail, contactPhone, contactFlagCategory, aiScore, flagOverride]
         properties:
           contactName:
             type: string
           contactEmail:
             type: string
             format: email
           contactPhone:
             type: string
           contactFlagCategory:
             type: string
             nullable: true
             enum: [spam, not-potential, invalid-data, duplicate]
           aiScore:
             type: integer
             minimum: 0
             maximum: 99
           flagOverride:
             type: boolean
             description: When true, inherited flag badge is suppressed for this registration
   ```

2. **Update `GET /events/{id}/registrations`** response schema — change `Registration` ref to `RegistrationWithContact` in the paginated wrapper.

3. **Add `POST /registrations/{id}/cancel`**:
   ```yaml
   /registrations/{id}/cancel:
     post:
       summary: Cancel a registration
       operationId: cancelRegistration
       tags: [Registrations]
       security:
         - BearerAuth: []
       parameters:
         - name: id
           in: path
           required: true
           schema: { type: string, format: uuid }
       responses:
         '200':
           description: Registration cancelled
           content:
             application/json:
               schema: { $ref: '#/components/schemas/Registration' }
         '404':
           description: Not found
           content:
             application/json:
               schema: { $ref: '#/components/schemas/ApiError' }
   ```

4. **Add `POST /registrations/{id}/clear-flag`**:
   ```yaml
   /registrations/{id}/clear-flag:
     post:
       summary: Clear inherited contact flag for a registration
       operationId: clearRegistrationFlag
       description: >
         Suppresses the inherited contact flag badge for this registration without
         modifying the contact record. Sets flagOverride=true. Idempotent.
       tags: [Registrations]
       security:
         - BearerAuth: []
       parameters:
         - name: id
           in: path
           required: true
           schema: { type: string, format: uuid }
       responses:
         '200':
           description: Flag cleared; returns enriched registration
           content:
             application/json:
               schema: { $ref: '#/components/schemas/RegistrationWithContact' }
         '404':
           description: Not found
           content:
             application/json:
               schema: { $ref: '#/components/schemas/ApiError' }
   ```

---

### Acceptance Criteria

**AC-1 — Type safety**: `RegistrationWithContact` in `src/types/api.ts` extends `Registration`, all 6 new fields typed correctly (`aiScore: number` range note in comment, `contactFlagCategory: FlagCategory`). `npx tsc --noEmit` exits 0.

**AC-2 — Deterministic join**: `registrationsStore[i].contactId === contactsPool[i % contactsPool.length].id` for all 60 records.

**AC-3 — Enriched API response**: `GET /api/events/event-001/registrations?status=pending` returns records with all 6 enriched fields. `contactName`/`contactEmail`/`contactPhone` are non-empty strings. `aiScore` is an integer 0–99. `flagOverride` is a boolean.

**AC-4 — AI score determinism**: Same registration fetched twice returns identical `aiScore`.

**AC-5 — Pending tab sort**: Pending tab rows are ordered by `aiScore` descending on initial load.

**AC-6 — Score badge visible all tabs**: AI score badge appears on every row across all status tabs.

**AC-7 — Score badge colors**: ≥70 → green, 40–69 → yellow, <40 → red. Numeric score shown (e.g. "85").

**AC-8 — Flag badge shown**: Row with `contactFlagCategory === 'spam'` or `'not-potential'` and `flagOverride === false` shows orange flag badge with category name and ✕ icon.

**AC-9 — Flag badge suppressed**: Row with `flagOverride === true` shows no flag badge.

**AC-10 — Optimistic clear flag**: Clicking flag badge causes badge to disappear **instantly** (before server response). If server returns an error, badge reappears and `toast.error` is shown.

**AC-11 — Flag clear persists**: After page reload, a previously cleared flag remains hidden (`flagOverride` persisted in MSW store).

**AC-12 — Sheet contact info**: Detail Sheet shows Nama, Email, Telepon, and Skor AI badge populated from `RegistrationWithContact` fields.

**AC-13 — colSpan correct**: Empty-state row spans correct column count (6 non-waitlisted, 7 waitlisted). No broken layout.

**AC-14 — OpenAPI complete**: `RegistrationWithContact` schema, `POST /registrations/{id}/clear-flag`, `POST /registrations/{id}/cancel` all documented. `GET /events/{id}/registrations` response references `RegistrationWithContact`.

**AC-15 — All tests pass**: All existing tests pass. `npx tsc --noEmit` exits 0.

---

## Additional Context

### Dependencies

- `contactsPool` — already exported from contacts.ts; top-level import in registrations.ts is safe
- `registrationsStore` used in events.ts — type widens to `StoredRegistration[]`; events.ts must update its import type annotation
- `useEvent` — NOT needed in registrations page (surveySchema unused in v1)
- `djb2` — extract to `src/lib/djb2.ts`; remove inline definition from events.ts line 325

### Testing Strategy

No new test files required. Verify via:
- `npx tsc --noEmit`
- Manual smoke: `/app/events/event-001/registrations` — check all ACs visually
- Flag badge on a `spam`/`not-potential` contact row → click → instant disappear → reload → still gone

### Notes

- `surveyAnswers` seed data is `{}` for all 60 registrations — survey section in Sheet will be hidden (correct — conditional render on non-empty entries)
- `PATCH /api/registrations/:id/status` in openapi.yaml left as-is (PATCH preference applies to new endpoints only)
- `invalid-data` and `duplicate` flagCategories do NOT trigger a flag badge
- djb2 extraction from events.ts: remove the local `const djb2 = ...` at line 325 after adding the `@/lib/djb2` import
