# EM · U

Event management platform — admin portal, participant registration, QR check-in, and analytics.

## Repository Structure

```
yorindo/
├── yorindo-api/           # Fastify REST API (TypeScript)
├── yorindo-app/           # Next.js frontend (TypeScript)
├── docker-compose.yml     # Demo deployment (demo.dhanifudin.com)
├── docker-compose.app.yml # App preview (app.dhanifudin.com)
├── docker-compose.dev.yml # Local development
└── .env.example           # Root env template
```

## Environments

| URL | Purpose | Deploy Trigger |
|-----|---------|----------------|
| `https://demo.dhanifudin.com` | Stable demo | Tag push (`v*.*.*`) |
| `https://app.dhanifudin.com` | Preview / staging | Push to `main` (`yorindo-app/**`) |

---

## Local Development

### Prerequisites

- **Docker** + **Docker Compose**

No database or Node.js installation required — everything runs inside containers.

### 1. Set up env files

```bash
cp yorindo-api/.env.example yorindo-api/.env
cp yorindo-app/.env.example yorindo-app/.env.local
```

Edit `yorindo-api/.env` and set the two required JWT secrets:

```env
JWT_SECRET=any_string_at_least_32_chars
JWT_REFRESH_SECRET=a_different_string_at_least_32_chars
```

Everything else uses safe defaults for local development.

### 2. Start

```bash
docker compose -f docker-compose.dev.yml up
```

| Service | URL |
|---------|-----|
| App (Next.js) | http://localhost:5173 |
| API (Fastify) | http://localhost:3000 |
| Redis | localhost:6379 |

Both services hot-reload on file changes. The app uses MSW mock handlers by default so the API is optional for frontend development.

**First start** installs npm dependencies inside the containers — this takes a minute. Subsequent starts are fast.

### Useful commands

```bash
# Run in background
docker compose -f docker-compose.dev.yml up -d

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Rebuild after adding/removing npm packages
docker compose -f docker-compose.dev.yml up --build

# Stop
docker compose -f docker-compose.dev.yml down
```

### Running tests

```bash
# API
docker compose -f docker-compose.dev.yml exec api npm test

# App
docker compose -f docker-compose.dev.yml exec app npm test
```

---

## Without Docker

If you prefer to run services directly:

**API** — requires Node.js 24+

```bash
cd yorindo-api
cp .env.example .env   # edit JWT secrets
npm install
npm run dev            # http://localhost:3000
```

**App** — requires Node.js 24+

```bash
cd yorindo-app
cp .env.example .env.local
npm install
npm run dev            # http://localhost:5173
```

---

## Key Environment Variables

### `yorindo-api/.env`

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | — | Access token signing key (**required**, ≥32 chars) |
| `JWT_REFRESH_SECRET` | — | Refresh token signing key (**required**, ≥32 chars) |
| `PORT` | `3000` | API server port |
| `BASE_URL` | `http://localhost:3000` | Public URL for QR code links |
| `REPOSITORY_IMPL` | `memory` | `memory` (Phase 1) \| `postgres` (Phase 2) |
| `EMAIL_PROVIDER` | `mock` | `mock` \| `brevo` \| `mailtrap` |
| `WHATSAPP_PROVIDER` | `mock` | `mock` \| `everpro` |
| `AI_PROVIDER` | `disabled` | `disabled` \| `mock` \| `openai` \| `anthropic` |
| `SENTRY_DSN` | — | Sentry DSN for server error monitoring (optional) |

### `yorindo-app/.env.local`

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_ENABLE_MOCKS` | `true` | Enable MSW browser mocks (local dev only) |
| `NEXT_PUBLIC_BASE_PATH` | — | Subdirectory base path (e.g. `/yorindo`) |
| `NEXT_PUBLIC_SENTRY_DSN` | — | Sentry DSN for browser error monitoring (optional) |
| `SENTRY_DSN` | — | Sentry DSN for server/edge runtimes (optional) |

---

## Production Deployment

Production runs via Docker Compose using pre-built images from CI/CD.

```bash
cp .env.example .env
# Edit .env — set JWT secrets, POSTGRES_PASSWORD, and Sentry DSNs
docker compose up -d
```

See `.env.example` for all available variables. The app image bakes `NEXT_PUBLIC_SENTRY_DSN` at build time from the `APP_SENTRY_DSN` GitHub secret.
