# Postman / Newman Testing Guide

These artifacts are generated from `yorindo-api/openapi.yaml` and are intended to help the team run API-level E2E and smoke testing in local development and on the deployed demo.

## Files

- `postman/yorindo-api.postman_collection.json`
- `postman/yorindo-local.postman_environment.json`
- `postman/yorindo-demo.postman_environment.json`

Fastify now exposes direct OpenAPI integration routes for manual implementation testing:

- `GET /api/openapi.json` — raw parsed OpenAPI document
- `GET /api/docs` — Swagger UI served by Fastify
- `GET /api/docs/json` — OpenAPI JSON served through the Fastify docs integration

## Environments

### Local

- Base URL: `http://localhost:3000/api`
- Environment file: `postman/yorindo-local.postman_environment.json`
- Use this when the API is running locally

### Demo

- Base URL: `https://demo.dhanifudin.com/api`
- Environment file: `postman/yorindo-demo.postman_environment.json`
- Use this for deployed smoke/E2E verification

## Default Variables

The environments already include commonly reused values:

- Auth: `loginEmail`, `loginPassword`, `accessToken`, `refreshCookie`
- Core IDs: `eventId`, `contactId`, `registrationId`, `userId`, `vendorId`, `templateId`
- Other IDs: `vendorReportToken`, `jobId`, `duplicateGroupId`
- Query helpers: `page`, `pageSize`, `sortBy`, `sortDir`, `format`
- Automation helpers: `invalidLoginPassword`, `invalidScanToken`, `adminUserId`, `assignableEventId`

Default seeded credentials:

- Email: `admin@yorindo.id`
- Password: `Password123!`

## Recommended Team Testing Flow

1. Select the correct environment.
2. Run `Health / Health check`.
3. Run `Auth / Login with email and password`.
4. Confirm `accessToken` and `refreshCookie` were written to the environment.
5. Run the target feature requests for the story, epic, or smoke suite you want to verify.
6. If access expires, run `Auth / Refresh access token using httpOnly refresh token cookie`.
7. Run `Auth / Logout and invalidate tokens` when finished.

## Running In Postman GUI

### Import

1. Open Postman.
2. Click `Import`.
3. Import:
   - `postman/yorindo-api.postman_collection.json`
   - one environment file:
     - `postman/yorindo-local.postman_environment.json`, or
     - `postman/yorindo-demo.postman_environment.json`
4. Select the imported environment in the top-right environment selector.

### Authenticate

Run:

- `Auth / Login with email and password`

That request automatically saves:

- `accessToken`
- `refreshCookie`
- `userId`

No manual token copy/paste should be needed for normal use.

### Run Individual Requests

After login, protected requests automatically use the collection-level Bearer token:

- `Authorization: Bearer {{accessToken}}`

You can override environment variables before sending requests if you want to test different IDs or query values.

### Run A Folder Or Full Collection

Use the Postman Collection Runner to run:

- the full collection for smoke testing
- a single folder like `Auth`, `Events`, `Vendors`, `Reports`, or `Registrations`
- `Automated Tests / Positive Cases`
- `Automated Tests / Negative Cases`

Recommended smoke subset for every deployment:

1. `Health / Health check`
2. `Auth / Login with email and password`
3. `Events / List events`
4. `Vendors / List vendors with pagination (admin/viewer)`
5. `Reports / Get post-event attendance report (admin/viewer)`
6. `Auth / Logout and invalidate tokens`

Recommended direct OpenAPI smoke subset:

1. `Automated Tests / Positive Cases / OpenAPI docs JSON is available`
2. `Automated Tests / Positive Cases / Swagger UI HTML is available`
3. `Automated Tests / Positive Cases / Login positive and store auth state`
4. `Automated Tests / Positive Cases / Authenticated users list succeeds`

## Running With Newman

### Install Newman

```bash
npm install -g newman
```

Optional HTML reporting:

```bash
npm install -g newman-reporter-htmlextra
```

### Run Against Local

```bash
newman run "postman/yorindo-api.postman_collection.json" -e "postman/yorindo-local.postman_environment.json"
```

### Run Against Demo

```bash
newman run "postman/yorindo-api.postman_collection.json" -e "postman/yorindo-demo.postman_environment.json"
```

### Run A Specific Folder

```bash
newman run "postman/yorindo-api.postman_collection.json" -e "postman/yorindo-demo.postman_environment.json" --folder "Auth"
```

```bash
newman run "postman/yorindo-api.postman_collection.json" -e "postman/yorindo-demo.postman_environment.json" --folder "Vendors"
```

### Run Automated Positive Cases

```bash
newman run "postman/yorindo-api.postman_collection.json" -e "postman/yorindo-local.postman_environment.json" --folder "Automated Tests" --folder "Positive Cases"
```

### Run Automated Negative Cases

```bash
newman run "postman/yorindo-api.postman_collection.json" -e "postman/yorindo-local.postman_environment.json" --folder "Automated Tests" --folder "Negative Cases"
```

### Export Newman Results

```bash
newman run "postman/yorindo-api.postman_collection.json" -e "postman/yorindo-demo.postman_environment.json" --reporters cli,json --reporter-json-export "postman/newman-report-demo.json"
```

With HTML report:

```bash
newman run "postman/yorindo-api.postman_collection.json" -e "postman/yorindo-demo.postman_environment.json" --reporters cli,htmlextra --reporter-htmlextra-export "postman/newman-report-demo.html"
```

## E2E Testing Recommendations

Use Postman/Newman mainly for API workflow verification. Good team scenarios include:

### OpenAPI Integration Smoke

- verify `GET /api/docs`
- verify `GET /api/docs/json`
- verify Fastify serves the current OpenAPI contract directly

### Automated Positive Cases

- OpenAPI docs JSON is available
- Swagger UI HTML is available
- login succeeds and stores auth state
- authenticated users list succeeds
- contacts list succeeds
- registrations list succeeds
- vendors list succeeds
- public registration creation succeeds

### Auth Smoke

- health check
- login
- refresh token
- logout

### Event Operations

- list events
- get event by ID
- get registrations for an event
- get event sponsors
- get event report

### Vendor Flow

- list vendors
- create vendor
- attach vendor to event
- list event sponsors
- generate vendor magic link
- open vendor report by token
- accept DPA

### Negative Cases

- invalid login returns `401 INVALID_CREDENTIALS`
- protected route without bearer auth returns `401`
- invalid scan token returns `401 INVALID_TICKET`
- assigning an event to an admin returns `403 FORBIDDEN`
- invalid registration payload returns `400 VALIDATION_ERROR`
- invalid event detail returns `404`
- contacts import without file is rejected

### Contacts / Registration Flow

- list contacts
- create registration
- list registrations
- update registration status

## Important Notes For The Team

- `local` currently requires the API to be running; otherwise health check fails.
- `demo` is reachable at `https://demo.dhanifudin.com/api/health`.
- Swagger UI manual testing is available at `{{baseUrl}}/docs`.
- The login flow stores the real cookie value returned by the API into `refreshCookie`.
- Some requests need valid IDs already present in the target environment. If a seeded ID does not exist in a specific deployment, update the environment variable before running that request.
- The collection is generated from OpenAPI, so when the API spec changes, regenerate these artifacts to keep Postman/Newman in sync.

## Suggested Team Practice

- Use Postman GUI for exploratory testing and debugging.
- Use Newman for repeatable smoke checks in CI/CD or release verification.
- Keep one shared team environment for demo/staging and a separate personal environment for local testing.
