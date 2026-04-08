# Deferred Work

## From spec-1-7-cicd-pipeline-update (2026-03-26)

- **nginx `/api/` prefix forwarding**: nginx passes the `/api/` prefix verbatim to the BE container. The BE must mount all routes under `/api/` for proxying to work correctly. If the Fastify app listens at `/` (default), all proxied requests will 404. Confirm or set route prefix when implementing `yorindo-api` (Story 1.1/1.8).
- **`docker compose pull` partial failure**: In some Docker versions, `docker compose pull` exits 0 even if one image fails. Consider adding explicit image verification or switching to `docker compose up -d --pull always` when the API is real.
- **Health check sleep duration**: The 15-second sleep before the health check may be too short on a cold VPS. Consider a retry loop (`for i in {1..5}; do ... && break; sleep 5; done`) when API startup time becomes non-trivial.
- **VPS config drift**: `docker-compose.yml` and `nginx/nginx.conf` are not automatically synced to the VPS on tag pushes — they must be manually copied after config changes. Consider adding a `scp` step to the deploy job when config changes are frequent.

## From spec-seed-memory-repositories-with-dummy-data (2026-03-27)

- **`suppress()` API contract**: `SuppressionRepository.suppress(contactId, reason)` — callers must pass the contact's phone number as `contactId` for `isSuppressed(phone)` to work. Method signature is misleading. Pre-existing.
- **`saveResponse()` eventId stub**: `SurveyRepository.saveResponse()` stores `eventId: 'unknown'` under a `'default'` key; responses submitted at runtime are unretrievable via `getResponsesByEvent()`. Pre-existing limitation.
- **`getUpcomingUncontacted()` magic number**: Returns hardcoded `uncontactedCount: 42`. Pre-existing stub.
- **`findAll` with page < 1**: Multiple repositories compute `start = (page - 1) * pageSize` — a `page=0` call yields a negative slice start and returns empty silently. Pre-existing across ContactRepository, RegistrationRepository, SuppressionRepository.
- **`bulkApprove` with duplicate IDs**: No deduplication; `approved` count is inflated and `approvedAt` overwritten per duplicate pass. Pre-existing.
- **`aiScoreMin = 0` includes null-score registrations**: `aiScore ?? 0` means records with `aiScore: null` pass a `>= 0` filter. Pre-existing.
- **`SURVEY_SCHEMA_IDS` exported from `EventRepository`**: Cross-repo constant lives in EventRepository rather than `_seeds.ts`. Not a bug, but creates a one-way dependency SurveyRepository → EventRepository. Pre-existing design.

## From spec-sentry-integration (2026-03-27)

- **No `Sentry.flush()` on shutdown**: `SIGTERM`/`SIGINT` handlers don't call `await Sentry.close(2000)` — buffered events may be dropped on container stop. Add to graceful shutdown sequence when implemented.
- **`start()` unhandled rejection**: `buildServer()` throw propagates out of `start()` as an unhandled promise rejection; no `process.on('unhandledRejection')` captures it. Low risk in Phase 1 but worth hardening before production.
- **`auth.routes.ts` inline catch bypasses `setErrorHandler`**: Login and refresh handlers catch errors internally and call `reply.status(500).send()` directly — these 500s never reach `setErrorHandler` and are invisible to Sentry. Pre-existing pattern.
- **No Fastify request-context integration**: `Sentry.captureException` is called without Fastify's Sentry integration (`setupFastifyErrorHandler`) — captured errors lack HTTP request URL, method, and headers. Consider `@sentry/node` Fastify integration when richer error context is needed.
- **No release tagging**: `Sentry.init` has no `release` field — Sentry cannot correlate errors to deployments or use source maps. Add when a versioning/release pipeline is established.

## Deferred from: code review of be-4-5-audience-preview (2026-04-02)

- **Endpoint accessible on soft-deleted events**: `requireEventOr404` may return soft-deleted events depending on repository implementation. If `findById` doesn't filter `deletedAt`, deleted events can still be previewed. Pre-existing repository-level concern.
- **No rate limiting or cost guard on audience-preview**: The endpoint fetches up to 1000 contacts per call with no debounce, cache, or rate limit. Pre-existing pattern across all endpoints — address when implementing production performance hardening.

## BlastModal render memoization (deferred from spec-3-13-blast-modal-revamp)
`sortedEvents` and `selectedTemplate` are recomputed on every render. Low priority — query results are stable references from React Query. Consider `useMemo` if the event list grows large or the component re-renders frequently due to parent state.

## Deferred from spec-contacts-drop-unique-phone-email (2026-04-08)

**Concurrent upsert race condition:** Two simultaneous `upsert` calls with the same phone/email can both pass the SELECT collision check before either INSERT completes, producing two non-flagged duplicate rows. Fix requires `SELECT ... FOR UPDATE` or a PostgreSQL advisory lock in the `upsert` transaction. Low risk in current single-instance deployment; revisit before horizontal scaling.
