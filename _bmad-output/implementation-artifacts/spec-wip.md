---
title: 'Registration source tracking — blast vs organic vs OTS breakdown'
type: 'feature'
created: '2026-04-11'
status: 'in-progress'
context: []
baseline_commit: 2983afdebb0ee699bd1f2251c8534f01f187d25e
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Admins cannot see how many participants registered from blast invitations vs organic discovery vs on-the-spot walk-in. The current funnel shows aggregate blast count and registration count with no linkage between them.

**Approach:** Add `registration_source` column to registrations table. Track blast recipients in a junction table. Update all registration creation paths to set the correct source. Add breakdown metrics to overview and report endpoints.

## Boundaries & Constraints

**Always:**
- `registration_source` values: `'blast'`, `'organic'`, `'ots'`
- OTS registrations always set source = `'ots'`
- Public form registrations default to `'organic'`
- Blast registrations determined by whether contact was in blast_log_recipients

**Ask First:**
- If blast recipient tracking requires a new table vs. modifying blast_logs

**Never:**
- Do not break existing registration creation paths
- Do not change existing blast_logs table structure (add new table instead)
- Do not retroactively set source on existing registrations (they default to NULL)

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| OTS registration | Admin creates walk-in registration | source='ots' set automatically | N/A |
| Public form registration | User registers via event landing page | source='organic' set automatically | N/A |
| Blast recipient registers | Contact who received blast clicks registration link | source='blast' set automatically | N/A |
| Overview endpoint | GET /api/events/:id/overview | Returns blastRegistered, organicRegistered, otsRegistered counts | N/A |
| Report endpoint | GET /api/events/:id/report | Returns source breakdown in response | N/A |
| Existing registrations | Old registrations without source column value | source=NULL, excluded from breakdown | Treated as 'unknown' in UI |

</frozen-after-approval>

## Code Map

- `yorindo-api/migrations/018_registration_source.sql` -- Add registration_source column + blast_log_recipients table
- `yorindo-api/src/types/domain.ts` -- Add registrationSource to Registration type
- `yorindo-api/src/repositories/postgres/EventRepository.ts` -- Add source breakdown to getOverviewMetrics
- `yorindo-api/src/routes/events.routes.ts` -- Update overview endpoint, OTS registration, analytics
- `yorindo-api/src/routes/registrations.routes.ts` -- Set source='organic' on public registration
- `yorindo-api/src/routes/blast.routes.ts` or blast.service.ts -- Record blast recipients
- `yorindo-app/src/app/app/events/[id]/_client.tsx` -- Display source breakdown in overview
- `yorindo-app/src/components/features/reports/MetricCards.tsx` -- Add source breakdown card

## Tasks & Acceptance

**Execution:**
- [ ] `yorindo-api/migrations/018_registration_source.sql` -- Add `registration_source TEXT` to registrations, create `blast_log_recipients` table
- [ ] `yorindo-api/src/types/domain.ts` -- Add `registrationSource: 'blast' | 'organic' | 'ots' | null` to Registration type
- [ ] `yorindo-api/src/routes/events.routes.ts` -- Update OTS endpoint to set source='ots', update overview endpoint to return source breakdown
- [ ] `yorindo-api/src/routes/registrations.routes.ts` -- Set source='organic' on public form registration
- [ ] `yorindo-api/src/services/blast.service.ts` -- Record each recipient in blast_log_recipients when blast is sent
- [ ] `yorindo-api/src/repositories/postgres/EventRepository.ts` -- Update getOverviewMetrics to return blast/organic/ots breakdown
- [ ] `yorindo-app/src/app/app/events/[id]/_client.tsx` -- Add source breakdown section to completed event dashboard

**Acceptance Criteria:**
- Given an OTS registration is created, when the registration is saved, then registration_source is set to 'ots'
- Given a user registers via public event form, when the registration is saved, then registration_source is set to 'organic'
- Given a contact who received a blast registers for the event, when the registration is saved, then registration_source is set to 'blast'
- Given the overview endpoint is called, when the response is returned, then it includes blastRegistered, organicRegistered, and otsRegistered counts
- Given the event is completed, when the admin views the overview page, then a source breakdown chart is displayed

## Spec Change Log

## Verification

**Commands:**
- `cd yorindo-api && npm test` -- expected: all tests pass
- `cd yorindo-api && npx tsc --noEmit` -- expected: zero type errors
- `cd yorindo-app && npx tsc --noEmit` -- expected: zero type errors

**Manual checks:**
- Create OTS registration → verify source='ots' in database
- View completed event overview → verify source breakdown is displayed
