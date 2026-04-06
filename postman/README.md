# Postman / Newman Testing Guide

These artifacts are generated from `yorindo-api/openapi.yaml` and are intended to help the team run API-level E2E and smoke testing across all environments.

## Files

- `postman/yorindo-api.postman_collection.json` — 151 requests across 16 folders
- `postman/yorindo-local.postman_environment.json`
- `postman/yorindo-dev.postman_environment.json`
- `postman/yorindo-production.postman_environment.json`

Fastify also exposes direct OpenAPI integration routes for manual testing:

- `GET /api/openapi.json` — raw parsed OpenAPI document
- `GET /api/docs` — Swagger UI served by Fastify
- `GET /api/docs/json` — OpenAPI JSON served through the Fastify docs integration

## Environments

### Local

- Base URL: `http://localhost:3000/api`
- Environment file: `postman/yorindo-local.postman_environment.json`
- Use this when the API is running locally via Docker Compose

### Dev

- Base URL: `https://api.dhanifudin.com/api`
- Environment file: `postman/yorindo-dev.postman_environment.json`
- Use this for development/staging verification

### Production

- Base URL: `https://demo.dhanifudin.com/api`
- Environment file: `postman/yorindo-production.postman_environment.json`
- Use this for production smoke/E2E verification

## Collection Structure

The collection is organized into 16 folders covering all 60 API operations:

| Folder | Requests | Description |
|--------|----------|-------------|
| 00 - Setup (Login All Roles) | 4 | Login as admin, staff, viewer, participant — saves tokens to collection variables |
| 01 - Health | 1 | Service health check |
| 02 - Auth | 7 | Login, refresh, logout (positive + negative) |
| 03 - Contacts | 25 | CRUD, import, bulk-flag, flagged records, duplicates, merge, facets, health |
| 04 - Events | 32 | CRUD, clone, audience-preview, slug check, registrations, analytics, yorimind, blast |
| 05 - Event Sponsors | 7 | Attach, update, remove sponsors |
| 06 - Event Reports | 7 | Report, regenerate, download, vendor-link |
| 07 - Registrations | 15 | Public create, list, status, cancel, clear-flag, bulk-approve |
| 08 - Scan | 4 | QR ticket verification |
| 09 - ETL | 5 | Contact import jobs |
| 10 - Users | 17 | CRUD, event assignments, assigned-events |
| 11 - Vendors | 11 | CRUD with role-based tests |
| 12 - Templates (Blast) | 6 | Template CRUD |
| 13 - Smart Filter | 3 | AI industry mapping |
| 14 - Vendor Reports (Public) | 4 | Magic link report + DPA |
| 15 - Participants | 3 | Data erasure requests |

## Test Coverage

Each request includes `pm.test()` scripts. The collection covers:

- **Positive cases**: happy path with valid data, verifying status codes and response structure
- **Negative cases**: 401 (no auth), 403 (wrong role), 400 (validation), 404 (not found), 409 (conflict)
- **Role-based tests**: admin, staff, viewer, and participant access patterns

### Roles

| Role | Access |
|------|--------|
| admin | Full access to all endpoints |
| staff | Scan, attendance-stats, checkin/stats |
| viewer | Read-only events, reports, analytics |
| participant | Own dashboard only |

## Default Variables

The environments include commonly reused values:

- Auth: `loginEmail`, `loginPassword`, `accessToken`, `refreshCookie`
- Core IDs: `eventId`, `contactId`, `registrationId`, `userId`, `vendorId`, `templateId`
- Other IDs: `vendorReportToken`, `jobId`, `duplicateGroupId`
- Query helpers: `page`, `pageSize`, `sortBy`, `sortDir`, `format`
- Automation helpers: `invalidLoginPassword`, `invalidScanToken`, `adminUserId`, `assignableEventId`, `registrationEventId`, `positiveRegistrationEmail`, `invalidEventId`

Default seeded credentials:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@yorindo.id` | `Password123!` |
| Staff | `staff@yorindo.id` | `Password123!` |
| Viewer | `viewer@yorindo.id` | `Password123!` |
| Participant | `participant@yorindo.id` | `Password123!` |

## Recommended Team Testing Flow

1. Select the correct environment (Local, Dev, or Production).
2. Run **00 - Setup (Login All Roles)** to authenticate all four roles.
3. Confirm `adminToken`, `staffToken`, `viewerToken`, `participantToken` are set in collection variables.
4. Run the target folder or full collection.
5. If tokens expire, re-run the Setup folder.

## Running In Postman GUI

### Import

1. Open Postman.
2. Click `Import`.
3. Import:
   - `postman/yorindo-api.postman_collection.json`
   - one environment file:
     - `postman/yorindo-local.postman_environment.json`, or
     - `postman/yorindo-dev.postman_environment.json`, or
     - `postman/yorindo-production.postman_environment.json`
4. Select the imported environment in the top-right environment selector.

### Authenticate

Run the **00 - Setup** folder. This logs in all four roles and saves their tokens to collection variables. No manual token copy/paste is needed.

### Run Individual Requests

After setup, protected requests automatically use the appropriate role token via `Bearer {{adminToken}}` (or staff/viewer/participant variants depending on the test).

### Run A Folder Or Full Collection

Use the Postman Collection Runner to run:

- the full collection for comprehensive smoke testing
- a single folder like `02 - Auth`, `04 - Events`, `11 - Vendors`
- specific test categories (positive or negative cases within each folder)

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

### Run Against Dev

```bash
newman run "postman/yorindo-api.postman_collection.json" -e "postman/yorindo-dev.postman_environment.json"
```

### Run Against Production

```bash
newman run "postman/yorindo-api.postman_collection.json" -e "postman/yorindo-production.postman_environment.json"
```

### Run A Specific Folder

```bash
newman run "postman/yorindo-api.postman_collection.json" -e "postman/yorindo-local.postman_environment.json" --folder "02 - Auth"
```

```bash
newman run "postman/yorindo-api.postman_collection.json" -e "postman/yorindo-dev.postman_environment.json" --folder "11 - Vendors"
```

### Export Newman Results

```bash
newman run "postman/yorindo-api.postman_collection.json" -e "postman/yorindo-dev.postman_environment.json" --reporters cli,json --reporter-json-export "postman/newman-report.json"
```

With HTML report:

```bash
newman run "postman/yorindo-api.postman_collection.json" -e "postman/yorindo-production.postman_environment.json" --reporters cli,htmlextra --reporter-htmlextra-export "postman/newman-report.html"
```

## Recommended Smoke Subsets

### Deployment Smoke (minimal)

1. `01 - Health`
2. `00 - Setup` (login admin)
3. `04 - Events` > List events
4. `11 - Vendors` > List vendors
5. `02 - Auth` > Logout

### Auth Flow

1. Health check
2. Login (positive + negative)
3. Refresh token
4. Logout

### Vendor Flow

1. List vendors
2. Create vendor
3. Attach vendor to event
4. List event sponsors
5. Generate vendor magic link
6. Open vendor report by token
7. Accept DPA

### Contacts / Registration Flow

1. List contacts
2. Create registration (public)
3. List registrations
4. Update registration status
5. Bulk approve

## Important Notes

- `local` requires the API to be running via Docker Compose; otherwise health check fails.
- `dev` is reachable at `https://api.dhanifudin.com/api/health`.
- `production` is reachable at `https://demo.dhanifudin.com/api/health`.
- Swagger UI manual testing is available at `{{baseUrl}}/docs`.
- The Setup folder stores tokens in **collection variables** (not environment variables), so they persist across requests within a run.
- Some requests need valid IDs already present in the target environment. If a seeded ID does not exist, update the environment variable before running.
- The collection is generated from OpenAPI. When the API spec changes, regenerate to keep Postman/Newman in sync.

## Suggested Team Practice

- Use Postman GUI for exploratory testing and debugging.
- Use Newman for repeatable smoke checks in CI/CD or release verification.
- Keep one shared team environment for dev/production and a separate personal environment for local testing.
- Run the full collection after major API changes to catch regressions.
