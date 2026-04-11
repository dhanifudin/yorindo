---
status: ready-for-dev
title: Wire up topicTags for audience targeting on events
slug: wire-topictags-targeting
created: 2026-04-11
baseline_commit: aef7f56
---

<frozen-after-approval>

## Intent

**Problem:** `topicTags` on events is collected in the form but silently dropped by the backend — no DB column on events, no domain type, no consumer logic. It cannot be used for audience targeting.

**Approach:** Add `topic_tags` column to both `events` and `contacts` tables. Update audience-preview and blast endpoints to match `event.topicTags` against `contact.topic_tags` as a secondary filter after industry matching.

## Boundaries & Constraints

**Always:**
- `topicTags` is optional — events without topicTags should still target by industry/city/jobTitle
- Topic matching is additive (AND) not replacement — contacts must match BOTH industry AND at least one topic tag when both are set
- Frontend UX stays the same (comma-separated input for events, and later for contacts)

**Never:**
- Do not break existing audience targeting logic
- Do not require topicTags on contacts for existing contact data to work

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Event has topicTags, contacts have matching topic_tags | topicTags=['ai'], contact.topic_tags=['ai'] | Contact included in audience preview | N/A |
| Event has topicTags, contact has no topic_tags | topicTags=['ai'], contact.topic_tags=null | Contact excluded (hasn't provided topic preferences) | N/A |
| Event has no topicTags | topicTags=null/[] | Falls back to industry/city/jobTitle only (current behavior) | N/A |
| Event create with topicTags | POST /api/events body includes topicTags | topicTags persisted to events table | Validation: array of strings |

</frozen-after-approval>

## Code Map

- `yorindo-api/migrations/017_topic_tags.sql` -- Add topic_tags columns
- `yorindo-api/src/types/domain.ts` -- Add topicTags to Event and Contact types
- `yorindo-api/src/repositories/postgres/EventRepository.ts` -- Map topic_tags column
- `yorindo-api/src/repositories/postgres/ContactRepository.ts` -- Map topic_tags column
- `yorindo-api/src/routes/events.routes.ts` -- Update audience-preview and blast to use topicTags
- `yorindo-app/src/types/api.ts` -- Verify topicTags type alignment

## Tasks & Acceptance

**Execution:**
- [ ] `yorindo-api/migrations/017_topic_tags.sql` -- Add `topic_tags TEXT[]` to events and contacts tables
- [ ] `yorindo-api/src/types/domain.ts` -- Add `topicTags: string[] | null` to Event and Contact types
- [ ] `yorindo-api/src/repositories/postgres/EventRepository.ts` -- Map `topic_tags` column in row mapping, create, update
- [ ] `yorindo-api/src/repositories/postgres/ContactRepository.ts` -- Map `topic_tags` column in row mapping, upsert
- [ ] `yorindo-api/src/routes/events.routes.ts` -- Update audience-preview endpoint to filter by topicTags when set
- [ ] `yorindo-app/src/components/features/events/EventCreateForm.tsx` -- Ensure topicTags is sent in create/update payload with proper structure

**Acceptance Criteria:**
- Given an event with topicTags set, when audience preview is fetched, then only contacts with matching topic_tags are included
- Given an event without topicTags, when audience preview is fetched, then behavior is unchanged (industry/city/jobTitle only)
- Given an event is created with topicTags, then they are persisted to the database and returned in the event detail response
- All existing tests pass

## Spec Change Log

## Verification

**Commands:**
- `cd yorindo-api && npm test` -- expected: all tests pass
- `cd yorindo-api && npx tsc --noEmit` -- expected: zero type errors
- `cd yorindo-app && npx tsc --noEmit` -- expected: zero type errors
