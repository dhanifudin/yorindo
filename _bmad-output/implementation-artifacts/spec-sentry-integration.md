---
title: 'Sentry Integration for yorindo-api'
type: 'chore'
created: '2026-03-27'
status: 'done'
baseline_commit: '5901b34a0f615d1d5c01e17813b1c5adc21302ee'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `yorindo-api` has no error monitoring — unhandled exceptions and 500-level errors in production are invisible unless someone checks server logs manually.

**Approach:** Install `@sentry/node`, initialize it at process start (before Fastify boots), and capture 500-level errors inside the existing global error handler. DSN is stored in `.env` so it can be rotated without a code change.

## Boundaries & Constraints

**Always:**
- Sentry must be initialized before `buildServer()` is called in `main.ts`
- DSN is loaded as an optional env var (`SENTRY_DSN`); if absent, Sentry init is skipped silently — Sentry does this by default when DSN is undefined
- Only capture errors with `statusCode >= 500` in the error handler — do not send 4xx user errors to Sentry
- Existing error handler response shape must remain unchanged

**Ask First:**
- If adding Sentry performance tracing (transactions, spans) — this spec is errors-only

**Never:**
- Add `@sentry/profiling-node` or performance tracing in this change
- Modify error response format (`{ error: { code, message, details } }`)
- Log the DSN value anywhere (logs, startup messages)

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Error captured | Request causes 500, `SENTRY_DSN` set | Error sent to Sentry; response unchanged | N/A |
| DSN absent | `SENTRY_DSN` not in env | Server starts normally, Sentry skipped | No error thrown |
| 4xx error | Auth failure, validation error | NOT sent to Sentry; response unchanged | N/A |

</frozen-after-approval>

## Code Map

- `yorindo-api/package.json` -- add `@sentry/node` dependency
- `yorindo-api/src/main.ts` -- init Sentry before buildServer (entry point)
- `yorindo-api/src/config/index.ts` -- expose `sentryDsn` optional config value
- `yorindo-api/src/server.ts` -- call `Sentry.captureException` in setErrorHandler for 500+ errors
- `yorindo-api/.env.example` -- document `SENTRY_DSN=` placeholder
- `yorindo-api/.env` -- add `SENTRY_DSN=<actual dsn>` (not committed)

## Tasks & Acceptance

**Execution:**
- [x] `yorindo-api/package.json` -- add `"@sentry/node": "^8"` to `dependencies`
- [x] `yorindo-api/src/config/index.ts` -- add `sentryDsn: optional('SENTRY_DSN')` export
- [x] `yorindo-api/src/main.ts` -- `import * as Sentry from '@sentry/node'`; call `Sentry.init(config.sentryDsn ? { dsn: config.sentryDsn } : {})` before `buildServer()` — conditional init satisfies `exactOptionalPropertyTypes`
- [x] `yorindo-api/src/server.ts` -- in `setErrorHandler`, after logging, add: `if (statusCode >= 500) Sentry.captureException(error)` — import Sentry at top of file
- [x] `yorindo-api/.env.example` -- append `SENTRY_DSN=` with a comment explaining its purpose
- [ ] `yorindo-api/.env` -- user action: add `SENTRY_DSN=https://0217f2183f5f68d66d5344ab1d37539e@o4511116411142144.ingest.us.sentry.io/4511116417302528` to local .env (file not in VCS)

**Acceptance Criteria:**
- Given `SENTRY_DSN` is set, when a request triggers a 500 error, then `Sentry.captureException` is called with that error
- Given `SENTRY_DSN` is not set, when the server starts, then no error is thrown and the server boots normally
- Given a 401 or 422 error, when the error handler runs, then `Sentry.captureException` is NOT called

## Design Notes

**ESM + Sentry v8:** `@sentry/node` v8 supports `NodeNext` ESM without special `--import` flags for basic error capture. `Sentry.init({ dsn: undefined })` is a documented no-op, so skipping the DSN check in code is intentional — no conditional wrapper needed.

**Init placement:** Sentry must run before any instrumented code. `main.ts` is the true process entry point; placing `Sentry.init()` there (before the `buildServer()` call) satisfies this without touching `server.ts` startup order.

## Verification

**Commands:**
- `cd yorindo-api && npm install` -- expected: `@sentry/node` resolved, no peer-dep warnings
- `cd yorindo-api && npm run build` -- expected: 0 TypeScript errors
- `cd yorindo-api && npm start` -- expected: server starts without Sentry error (DSN set via .env)

## Suggested Review Order

- Entry point: Sentry initialized conditionally before Fastify boots, with environment tag.
  [`main.ts:5`](../../yorindo-api/src/main.ts#L5)

- Listen-error path now captured before process.exit — previously a blind spot.
  [`main.ts:13`](../../yorindo-api/src/main.ts#L13)

- Error handler: only 500+ forwarded to Sentry; 4xx user errors excluded.
  [`server.ts:50`](../../yorindo-api/src/server.ts#L50)

- Optional DSN wired through config singleton; empty string coerced to undefined.
  [`config/index.ts:47`](../../yorindo-api/src/config/index.ts#L47)

- Template placeholder is commented out to prevent silent misconfiguration.
  [`.env.example:50`](../../yorindo-api/.env.example#L50)
