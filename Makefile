DEMO_COMPOSE = docker compose
DEV_COMPOSE  = docker compose -f docker-compose.dev.yml
APP_COMPOSE  = docker compose -f docker-compose.app.yml
DEMO_COMPOSE_FILE = docker-compose.yml

# Run commands inside the api container
API_EXEC     = $(DEMO_COMPOSE) exec -T api
API_EXEC_TTY = $(DEMO_COMPOSE) exec api
DEV_API_EXEC = $(DEV_COMPOSE) exec -T api
DEV_API_TTY  = $(DEV_COMPOSE) exec api

.PHONY: deploy-demo reset-demo stop-demo logs-demo migrate-demo seed-demo \
        up-dev stop-dev clean-dev logs-dev migrate-dev seed-dev seed-dev-demo setup-dev reset-dev \
        deploy-app stop-app logs-app \
        lint lint-api lint-app test test-api test-app

## Deploy demo (tag release) — full deploy: down -v, pull, up, migrate, seed
deploy-demo:
	@echo "═══════════════════════════════════════════"
	@echo "🚀 Deploying Demo Environment"
	@echo "═══════════════════════════════════════════"
	$(DEMO_COMPOSE) down -v
	@echo "📦 Pulling latest images..."
	$(DEMO_COMPOSE) pull
	@echo "🔌 Starting postgres..."
	$(DEMO_COMPOSE) up -d postgres redis
	@echo "⏳ Waiting for postgres to be healthy..."
	@until $(DEMO_COMPOSE) exec postgres pg_isready -U yorindo -d yorindo > /dev/null 2>&1; do printf "."; sleep 1; done
	@echo ""
	@echo "📂 Starting api and app..."
	$(DEMO_COMPOSE) up -d api app nginx
	@echo "⏳ Waiting for api to be ready..."
	@until $(API_EXEC) wget -qO- http://localhost:3000/api/health > /dev/null 2>&1; do printf "."; sleep 2; done
	@echo ""
	@echo "🔄 Running migrations..."
	$(DEMO_COMPOSE) exec -T api node_modules/.bin/tsx scripts/migrate.ts
	@echo "🌱 Running seed..."
	$(DEMO_COMPOSE) exec -T -e ALLOW_SEED=true api node_modules/.bin/tsx scripts/seed.ts --demo
	@echo ""
	@echo "🧪 Running seed validation tests..."
	$(API_EXEC_TTY) npx vitest run scripts/seed.test.ts --reporter=verbose || (echo "❌ Seed validation failed!" && exit 1)
	@echo ""
	@echo "═══════════════════════════════════════════"
	@echo "✅ Demo deployed successfully!"
	@echo "🌐 URL: https://demo.dhanifudin.com"
	@echo "👤 Admin:    admin@yorindo.id / Password123!"
	@echo "👤 Viewer:   viewer@yorindo.id / Password123!"
	@echo "👤 Staff:    staff@yorindo.id / Password123!"
	@echo "═══════════════════════════════════════════"

## Re-seed demo (wipe data, restart, migrate, seed — no pull)
reset-demo:
	@echo "═══════════════════════════════════════════"
	@echo "🔄 Resetting Demo Data"
	@echo "═══════════════════════════════════════════"
	$(DEMO_COMPOSE) down -v
	@echo "🔌 Starting postgres..."
	$(DEMO_COMPOSE) up -d postgres redis
	@echo "⏳ Waiting for postgres to be healthy..."
	@until $(DEMO_COMPOSE) exec postgres pg_isready -U yorindo -d yorindo > /dev/null 2>&1; do printf "."; sleep 1; done
	@echo ""
	@echo "📂 Starting api and app..."
	$(DEMO_COMPOSE) up -d api app nginx
	@echo "⏳ Waiting for api to be ready..."
	@until $(API_EXEC) wget -qO- http://localhost:3000/api/health > /dev/null 2>&1; do printf "."; sleep 2; done
	@echo ""
	@echo "🔄 Running migrations..."
	$(DEMO_COMPOSE) exec -T api node_modules/.bin/tsx scripts/migrate.ts
	@echo "🌱 Running demo seed..."
	$(DEMO_COMPOSE) exec -T -e ALLOW_SEED=true api node_modules/.bin/tsx scripts/seed.ts --demo
	@echo ""
	@echo "🧪 Running seed validation tests..."
	$(API_EXEC_TTY) npx vitest run scripts/seed.test.ts --reporter=verbose || (echo "❌ Seed validation failed!" && exit 1)
	@echo ""
	@echo "═══════════════════════════════════════════"
	@echo "✅ Demo reset complete!"
	@echo "🌐 URL: https://demo.dhanifudin.com"
	@echo "═══════════════════════════════════════════"

## Stop demo (preserve data)
stop-demo:
	@echo "⏹️  Stopping demo services..."
	$(DEMO_COMPOSE) down
	@echo "✅ Demo stopped. Data preserved in volumes."

## Follow demo logs
logs-demo:
	$(DEMO_COMPOSE) logs -f

## Run migrations only
migrate-demo:
	@echo "🔄 Running migrations..."
	$(DEMO_COMPOSE) exec -T -e ALLOW_SEED=true api node_modules/.bin/tsx scripts/migrate.ts

## Run seed only (uses --demo for comprehensive demo data)
seed-demo:
	@echo "🌱 Running demo seed..."
	$(DEMO_COMPOSE) exec -T -e ALLOW_SEED=true api node_modules/.bin/tsx scripts/seed.ts --demo

## Force re-seed demo (wipe data, migrate, seed) — use with caution
reset-demo-data:
	@echo "⚠️  WARNING: This will WIPE ALL demo data and re-seed from scratch."
	@echo "Press Ctrl+C within 5 seconds to cancel..."
	@sleep 5
	@echo "🗑️  Truncating all data..."
	$(DEMO_COMPOSE) exec -T postgres psql -U yorindo -d yorindo -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" > /dev/null 2>&1 || true
	@echo "🔄 Running migrations..."
	$(DEMO_COMPOSE) exec -T -e ALLOW_SEED=true api node_modules/.bin/tsx scripts/migrate.ts
	@echo "🌱 Running demo seed..."
	$(DEMO_COMPOSE) exec -T -e ALLOW_SEED=true api node_modules/.bin/tsx scripts/seed.ts --demo
	@echo "✅ Demo data re-seeded successfully!"

# ─────────────────────────────────────────────
# Local Development (docker-compose.dev.yml)
# Hot-reload: API @ http://localhost:3000
#             App @ http://localhost:5173
# Note: node_modules mounted from host (run npm ci on host first)
# ─────────────────────────────────────────────

## Start local dev environment (hot-reload, no pre-built images)
up-dev:
	@echo "═══════════════════════════════════════════"
	@echo "🛠️  Starting Local Dev Environment"
	@echo "═══════════════════════════════════════════"
	$(DEV_COMPOSE) up -d
	@echo ""
	@echo "✅ Dev environment started."
	@echo "   API: http://localhost:3000"
	@echo "   App: http://localhost:5173"
	@echo "   Run 'make logs-dev' to follow logs."

## Stop local dev environment (preserve database data)
stop-dev:
	@echo "⏹️  Stopping dev services..."
	$(DEV_COMPOSE) down
	@echo "✅ Dev stopped. Database data preserved."

## Wipe all dev data (postgres volume) — full clean slate
clean-dev:
	@echo "🗑️  Removing all dev containers and volumes..."
	$(DEV_COMPOSE) down -v
	@echo "✅ Clean. Run 'make setup-dev' to start fresh."

## Follow dev logs (all services)
logs-dev:
	$(DEV_COMPOSE) logs -f

## Run migrations inside dev api container
migrate-dev:
	@echo "🔄 Running migrations in dev..."
	$(DEV_COMPOSE) exec api node_modules/.bin/tsx scripts/migrate.ts

## Run basic dev seed (10 contacts, 3 events)
seed-dev:
	@echo "🌱 Running dev seed..."
	$(DEV_COMPOSE) exec api node_modules/.bin/tsx scripts/seed.ts

## Run demo seed for dev (530 contacts, 15 duplicate pairs, missing data)
seed-dev-demo:
	@echo "🌱 Running demo seed in dev..."
	$(DEV_COMPOSE) exec api node_modules/.bin/tsx scripts/seed.ts --demo

## Wipe and re-seed dev database (migrate + demo seed) — no container restart
reset-dev:
	@echo "═══════════════════════════════════════════"
	@echo "🔄 Resetting Dev Database"
	@echo "═══════════════════════════════════════════"
	@echo "⏳ Waiting for postgres..."
	@until $(DEV_COMPOSE) exec -T postgres pg_isready -U yorindo -d yorindo > /dev/null 2>&1; do printf "."; sleep 1; done
	@echo ""
	@echo "🔄 Running migrations..."
	$(DEV_COMPOSE) exec -T api node_modules/.bin/tsx scripts/migrate.ts
	@echo "🌱 Running demo seed..."
	$(DEV_COMPOSE) exec -T api node_modules/.bin/tsx scripts/seed.ts --demo
	@echo ""
	@echo "✅ Dev database reset with demo data."
	@echo "   530 contacts · 15 duplicate pairs · 10 missing email · 10 missing phone"

## Migrate + seed in one step (first-time local setup)
setup-dev:
	@echo "═══════════════════════════════════════════"
	@echo "⚙️  Setting up Local Dev Database"
	@echo "═══════════════════════════════════════════"
	@echo "📦 Installing dependencies..."
	cd yorindo-api && npm ci
	cd yorindo-app && npm ci
	@echo "🔌 Starting services..."
	$(DEV_COMPOSE) up -d
	@echo "⏳ Waiting for postgres..."
	@until $(DEV_COMPOSE) exec -T postgres pg_isready -U yorindo -d yorindo > /dev/null 2>&1; do printf "."; sleep 1; done
	@echo ""
	@echo "⏳ Waiting for api to be ready..."
	@until $(DEV_COMPOSE) exec -T api node_modules/.bin/tsx --version > /dev/null 2>&1; do printf "."; sleep 2; done
	@echo ""
	@echo "🔄 Running migrations..."
	$(DEV_COMPOSE) exec api node_modules/.bin/tsx scripts/migrate.ts
	@echo "🌱 Running seed..."
	$(DEV_COMPOSE) exec api node_modules/.bin/tsx scripts/seed.ts
	@echo ""
	@echo "✅ Dev database ready."

# ─────────────────────────────────────────────
# App Preview (app.dhanifudin.com)
# Deployed on push to main (yorindo-app path).
# ─────────────────────────────────────────────

## Deploy app preview (pull + start)
deploy-app:
	$(APP_COMPOSE) pull
	$(APP_COMPOSE) up -d
	@echo "App preview deployed — https://app.dhanifudin.com"

## Stop app preview
stop-app:
	$(APP_COMPOSE) down

## Follow app preview logs
logs-app:
	$(APP_COMPOSE) logs -f

# ─────────────────────────────────────────────
# Lint & Test
# ─────────────────────────────────────────────

## Lint both api and app (runs inside dev containers)
lint: lint-api lint-app

## Lint api (TypeScript type-check)
lint-api:
	@echo "🔍 Linting yorindo-api..."
	$(DEV_COMPOSE) exec -T api npm run lint

## Lint app (ESLint + TypeScript type-check)
lint-app:
	@echo "🔍 Linting yorindo-app..."
	$(DEV_COMPOSE) exec -T app npm run lint
	@echo "📝 Typechecking yorindo-app..."
	$(DEV_COMPOSE) exec -T app npx tsc --noEmit

## Run all tests
test: test-api test-app

## Run api tests (vitest)
test-api:
	@echo "🧪 Testing yorindo-api..."
	$(DEV_COMPOSE) exec -T api npm test

## Run app tests (vitest)
test-app:
	@echo "🧪 Testing yorindo-app..."
	$(DEV_COMPOSE) exec -T app npm test
