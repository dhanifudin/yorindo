---
title: 'Standard Industries/Job Titles + Contact Normalization'
type: 'feature'
created: '2026-04-12'
status: 'in-progress'
---

<frozen-after-approval reason="human-owned intent">

## Intent

**Problem:** Contacts imported via ETL have free-text `serviceType` and `jobTitle` values with inconsistent spellings (e.g., "IT", "Teknologi", "Teknologi Informasi" all mean the same). Admins cannot easily normalize or segment contacts by industry/job title.

**Approach:**
1. Admin manages standard industries and job titles from Settings UI
2. System flags contacts whose `serviceType`/`jobTitle` don't match any standard value
3. Admin reviews flagged contacts, accepts suggestions, or bulk-normalizes

## Boundaries & Constraints

**Always:**
- Standard values stored in `industries` and `job_titles` tables (already exist)
- Fuzzy match threshold: 80% (Jaro-Winkler)
- Flagged contacts use `flagCategory` enum extension
- Admin-only CRUD for standards

**Ask First:**
- If AI-based matching is needed beyond Jaro-Winkler

**Never:**
- Do not break existing free-text behavior — contacts still accept any value
- Do not auto-reject unmatched contacts — only flag for review

</frozen-after-approval>

## Code Map

- `migrations/021_contact_normalize_flags.sql` — Extend flagCategory enum
- `src/routes/industries.routes.ts` — CRUD for admin managing industries
- `src/routes/job-titles.routes.ts` — CRUD for admin managing job titles
- `src/services/NormalizationService.ts` — Fuzzy matching + flagging logic
- `src/components/settings/StandardValuesManager.tsx` — Settings UI
- `src/components/contacts/NormalizationTab.tsx` — Contacts normalize tab
- `src/hooks/useIndustries.ts`, `src/hooks/useJobTitles.ts` — Frontend hooks

## Tasks & Acceptance

- [ ] Migration 021 — Add 'industry-unmatched' and 'jobtitle-unmatched' to flagCategory
- [ ] Industries CRUD routes — GET/POST/PATCH/DELETE /api/industries
- [ ] Job Titles CRUD routes — GET/POST/PATCH/DELETE /api/job-titles
- [ ] NormalizationService — fuzzy match serviceType/jobTitle against standards
- [ ] ETL hook — flag contacts on import when no match found
- [ ] GET /api/contacts/flagged?type=industry-unmatched|jobtitle-unmatched
- [ ] PATCH /api/contacts/:id/normalize — apply suggested match
- [ ] POST /api/contacts/bulk-normalize — normalize multiple at once
- [ ] Settings UI — manage standard industries and job titles
- [ ] Contacts UI — "Perlu Normalisasi" tab with suggestions and bulk actions

## Verification

- `cd yorindo-api && npm test` — all tests pass
- `cd yorindo-api && npx tsc --noEmit` — zero errors
- `cd yorindo-app && npx tsc --noEmit` — zero errors
