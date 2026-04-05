DEMO_COMPOSE = docker compose
APP_COMPOSE = docker compose -f docker-compose.app.yml
DEMO_COMPOSE_FILE = docker-compose.yml

# Run commands inside the api container
API_EXEC = $(DEMO_COMPOSE) exec -T api
API_EXEC_TTY = $(DEMO_COMPOSE) exec api

.PHONY: deploy-demo reset-demo stop-demo logs-demo migrate-demo seed-demo deploy-app stop-app logs-app

## Deploy demo from scratch (wipe data, pull images, migrate, seed)
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
	@until $(API_EXEC) curl -sf http://localhost:3000/api/health > /dev/null 2>&1; do printf "."; sleep 2; done
	@echo ""
	@echo "🔄 Running migrations..."
	$(API_EXEC_TTY) npx tsx scripts/migrate.ts
	@echo "🌱 Running seed..."
	$(API_EXEC_TTY) npx tsx scripts/seed.ts --demo
	@echo ""
	@echo "🧪 Running seed validation tests..."
	$(API_EXEC_TTY) npx vitest run scripts/seed.test.ts --reporter=verbose || (echo "❌ Seed validation failed!" && exit 1)
	@echo ""
	@echo "═══════════════════════════════════════════"
	@echo "✅ Demo deployed successfully!"
	@echo "🌐 URL: http://localhost:8888"
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
	@until $(API_EXEC) curl -sf http://localhost:3000/api/health > /dev/null 2>&1; do printf "."; sleep 2; done
	@echo ""
	@echo "🔄 Running migrations..."
	$(API_EXEC_TTY) npx tsx scripts/migrate.ts
	@echo "🌱 Running seed..."
	$(API_EXEC_TTY) npx tsx scripts/seed.ts --demo
	@echo ""
	@echo "🧪 Running seed validation tests..."
	$(API_EXEC_TTY) npx vitest run scripts/seed.test.ts --reporter=verbose || (echo "❌ Seed validation failed!" && exit 1)
	@echo ""
	@echo "═══════════════════════════════════════════"
	@echo "✅ Demo reset complete!"
	@echo "🌐 URL: http://localhost:8888"
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
	$(API_EXEC_TTY) npx tsx scripts/migrate.ts

## Run seed only (uses --demo for comprehensive demo data)
seed-demo:
	@echo "🌱 Running seed..."
	$(API_EXEC_TTY) npx tsx scripts/seed.ts --demo

# ─────────────────────────────────────────────
# App Preview (yorindo.dhanifudin.com)
# ─────────────────────────────────────────────

## Deploy app preview (pull + start)
deploy-app:
	$(APP_COMPOSE) pull
	$(APP_COMPOSE) up -d
	@echo "App preview deployed. http://localhost:5173"

## Stop app preview
stop-app:
	$(APP_COMPOSE) down

## Follow app preview logs
logs-app:
	$(APP_COMPOSE) logs -f
