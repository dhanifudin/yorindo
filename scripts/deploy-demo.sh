#!/usr/bin/env bash
# deploy-demo.sh — Deploy or reset the demo environment
#
# Usage:
#   ./scripts/deploy-demo.sh          # Full deploy (pull + migrate + seed)
#   ./scripts/deploy-demo.sh --reset  # Reset only (no pull, faster)
#
# This script is an alternative to `make deploy-demo` for environments
# where Make is not available.

set -euo pipefail

RESET_MODE=false
if [[ "${1:-}" == "--reset" ]]; then
  RESET_MODE=true
fi

COMPOSE="docker compose"
API_EXEC="$COMPOSE exec -T api"
API_EXEC_TTY="$COMPOSE exec api"

divider() {
  echo "═══════════════════════════════════════════"
}

step() {
  echo "$1"
}

error() {
  echo "❌ ERROR: $1" >&2
  exit 1
}

success() {
  echo "✅ $1"
}

wait_for_postgres() {
  step "⏳ Waiting for postgres to be healthy..."
  local retries=30
  while ! $COMPOSE exec postgres pg_isready -U yorindo -d yorindo > /dev/null 2>&1; do
    retries=$((retries - 1))
    if [[ $retries -le 0 ]]; then
      error "Postgres failed to start within 30 seconds"
    fi
    printf "."
    sleep 1
  done
  echo ""
}

wait_for_api() {
  step "⏳ Waiting for api to be ready..."
  local retries=60
  while ! $API_EXEC curl -sf http://localhost:3000/api/health > /dev/null 2>&1; do
    retries=$((retries - 1))
    if [[ $retries -le 0 ]]; then
      error "API failed to start within 120 seconds"
    fi
    printf "."
    sleep 2
  done
  echo ""
}

# ─── Main ───────────────────────────────────────────────────────────────

if [[ "$RESET_MODE" == true ]]; then
  divider
  step "🔄 Resetting Demo Data"
  divider
else
  divider
  step "🚀 Deploying Demo Environment"
  divider
fi

# Step 1: Stop and delete everything (including data)
step "⏹️  Stopping existing services..."
$COMPOSE down -v

# Step 2: Pull latest images (skip in reset mode)
if [[ "$RESET_MODE" == false ]]; then
  step "📦 Pulling latest images..."
  $COMPOSE pull || error "Failed to pull images"
fi

# Step 3: Start postgres and redis first
step "🔌 Starting postgres and redis..."
$COMPOSE up -d postgres redis

# Step 4: Wait for postgres
wait_for_postgres

# Step 5: Start api, app, and nginx
step "📂 Starting api, app, and nginx..."
$COMPOSE up -d api app nginx

# Step 6: Wait for api
wait_for_api

# Step 7: Run migrations
step "🔄 Running migrations..."
$API_EXEC_TTY npx tsx scripts/migrate.ts || error "Migrations failed"

# Step 8: Run seed
step "🌱 Running seed..."
$API_EXEC_TTY npx tsx scripts/seed.ts --demo || error "Seed failed"

# Step 9: Run seed validation tests
step "🧪 Running seed validation tests..."
$API_EXEC_TTY npx vitest run scripts/seed.test.ts --reporter=verbose || error "Seed validation tests failed"

# Step 10: Summary
divider
success "Demo deployed successfully!"
echo "🌐 URL: http://localhost:8888"
echo "👤 Admin:    admin@yorindo.id / Password123!"
echo "👤 Viewer:   viewer@yorindo.id / Password123!"
echo "👤 Staff:    staff@yorindo.id / Password123!"
divider
