#!/usr/bin/env bash
# CityTracker Dev Start — validate prerequisites and launch dev server
# Usage: ./scripts/dev-start.sh [--local-db] [--with-dashboard] [--skip-checks] [--seed]

source "$(dirname "$0")/_common.sh"

# ─── Flags ───────────────────────────────────────────────────
USE_LOCAL_DB=false
WITH_DASHBOARD=false
SKIP_CHECKS=false
SEED_FLAG=false
DASHBOARD_PID=""

usage() {
  cat <<EOF
Usage: ./scripts/dev-start.sh [OPTIONS]

Options:
  --local-db        Use Docker PostgreSQL instead of Neon
  --with-dashboard  Also start the pipeline dashboard (:3001 + :3002)
  --skip-checks     Skip prerequisite validation
  --seed            Force re-seed the database on startup
  --help            Show this help message

Examples:
  ./scripts/dev-start.sh                          # Neon DB, Next.js only
  ./scripts/dev-start.sh --local-db               # Docker DB, Next.js only
  ./scripts/dev-start.sh --local-db --seed        # Docker DB, seed data
  ./scripts/dev-start.sh --with-dashboard         # Next.js + dashboard
EOF
  exit 0
}

for arg in "$@"; do
  case "$arg" in
    --local-db)       USE_LOCAL_DB=true ;;
    --with-dashboard) WITH_DASHBOARD=true ;;
    --skip-checks)    SKIP_CHECKS=true ;;
    --seed)           SEED_FLAG=true ;;
    --help)           usage ;;
    *)                echo "Unknown option: $arg"; usage ;;
  esac
done

# ─── Cleanup handler ────────────────────────────────────────
cleanup() {
  info "Shutting down..."
  if [ -n "$DASHBOARD_PID" ]; then
    kill -- -"$DASHBOARD_PID" 2>/dev/null || kill "$DASHBOARD_PID" 2>/dev/null || true
  fi
  kill_port 3000
  if [ "$WITH_DASHBOARD" = true ]; then
    kill_port 3001
    kill_port 3002
  fi
}
trap cleanup EXIT INT TERM

banner "CityTracker Dev Start"

if [ "$USE_LOCAL_DB" = true ]; then
  info "Mode: Local Docker PostgreSQL"
else
  info "Mode: Neon (from .env)"
fi

# ─── Phase 1: Prerequisites ─────────────────────────────────
if [ "$SKIP_CHECKS" = false ]; then
  header "Checking prerequisites..."

  # Node.js
  if ! command -v node &>/dev/null; then
    fail "Node.js not found"; exit 1
  fi
  NODE_VERSION=$(node -v | sed 's/^v//')
  if ! version_gte "$NODE_VERSION" "20.0.0"; then
    fail "Node.js v${NODE_VERSION} too old (need >= 20)"; exit 1
  fi
  pass "Node.js v${NODE_VERSION}"

  # pnpm
  if ! command -v pnpm &>/dev/null; then
    fail "pnpm not found (run: npm i -g pnpm)"; exit 1
  fi
  pass "pnpm $(pnpm -v)"

  # .env
  if [ ! -f "${PROJECT_ROOT}/.env" ]; then
    fail ".env not found (cp .env.example .env)"; exit 1
  fi

  DB_URL=$(read_env_var "DATABASE_URL")
  if [ -z "$DB_URL" ] && [ "$USE_LOCAL_DB" = false ]; then
    fail "DATABASE_URL not set in .env"; exit 1
  fi
  pass ".env configured"

  # node_modules
  if [ ! -d "${PROJECT_ROOT}/node_modules" ]; then
    fail "Dependencies not installed (run: pnpm install)"; exit 1
  fi
  pass "Dependencies installed"

  # Prisma client (auto-fix if missing)
  if ! node -e "require('@prisma/client')" 2>/dev/null; then
    info "Prisma client missing, generating..."
    cd "$PROJECT_ROOT" && pnpm db:generate
    pass "Prisma client generated"
  fi

  # Dashboard deps check
  if [ "$WITH_DASHBOARD" = true ] && [ ! -d "${PROJECT_ROOT}/dashboard/node_modules" ]; then
    fail "Dashboard dependencies missing (run: cd dashboard && pnpm install)"; exit 1
  fi
fi

# ─── Phase 2: Docker (if --local-db) ────────────────────────
if [ "$USE_LOCAL_DB" = true ]; then
  header "Starting Docker PostgreSQL..."

  if ! command -v docker &>/dev/null; then
    fail "Docker not found (install Docker Desktop or docker-ce)"; exit 1
  fi
  if ! docker info &>/dev/null; then
    fail "Docker socket not accessible"
    info "Fix: sudo usermod -aG docker \$USER && newgrp docker"
    exit 1
  fi

  docker compose -f "$PROJECT_ROOT/docker-compose.yml" up -d 2>&1 | tail -1
  info "Waiting for PostgreSQL to be ready..."

  for i in $(seq 1 30); do
    if docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres pg_isready -U citytracker &>/dev/null; then
      pass "PostgreSQL ready"
      break
    fi
    if [ "$i" -eq 30 ]; then
      fail "PostgreSQL did not become ready within 30s"
      exit 1
    fi
    sleep 1
  done

  # Override env for this session
  export DATABASE_URL="postgresql://citytracker:citytracker@localhost:5432/citytracker"
  export DIRECT_URL="postgresql://citytracker:citytracker@localhost:5432/citytracker"
  pass "Using local DB: localhost:5432/citytracker"
fi

# ─── Phase 3: Database readiness ────────────────────────────
header "Checking database..."

cd "$PROJECT_ROOT"

if ! echo "SELECT 1;" | timeout 10 npx prisma db execute --stdin --schema="${PROJECT_ROOT}/prisma/schema.prisma" 2>/dev/null; then
  fail "Cannot connect to database"
  DB_URL_CHECK=$(read_env_var "DATABASE_URL")
  if [ "$USE_LOCAL_DB" = true ]; then
    info "Docker PostgreSQL may still be starting. Try again in a few seconds."
  elif echo "${DB_URL_CHECK:-}" | grep -q "neon.tech"; then
    info "Neon databases may take a few seconds to wake up (cold start)."
    info "Try again, or use --local-db for Docker PostgreSQL."
  fi
  exit 1
fi
pass "Database connected"

# Migration check
info "Checking migrations..."
MIGRATE_OUTPUT=$(npx prisma migrate status 2>&1 || true)
if echo "$MIGRATE_OUTPUT" | grep -qi "following migration.*have not yet been applied"; then
  info "Applying pending migrations..."
  npx prisma migrate deploy 2>&1 || {
    fail "prisma migrate deploy failed"; exit 1
  }
  pass "Migrations applied"
elif echo "$MIGRATE_OUTPUT" | grep -qi "drift"; then
  warn "Schema drift detected, pushing schema..."
  npx prisma db push 2>&1 || {
    fail "prisma db push failed"; exit 1
  }
  pass "Schema pushed"
else
  pass "Migrations up to date"
fi

# Check if DB has data
LINE_COUNT=$(timeout 10 node --input-type=module -e "
  import{PrismaClient}from'@prisma/client';
  const p=new PrismaClient();
  const c=await p.line.count();
  console.log(c);
  await p.\$disconnect();
" 2>/dev/null || echo "0")

if [ "$LINE_COUNT" = "0" ] || [ "$SEED_FLAG" = true ]; then
  if [ "$LINE_COUNT" = "0" ]; then
    warn "Database is empty"
  fi
  info "Running seed..."
  pnpm db:seed || {
    fail "Seed failed"; exit 1
  }
  pass "Database seeded"
else
  pass "Database has data (${LINE_COUNT} lines)"
fi

# ─── Phase 4: Kill stale processes ──────────────────────────
header "Cleaning up ports..."

PORTS=(3000)
if [ "$WITH_DASHBOARD" = true ]; then
  PORTS+=(3001 3002)
fi

for port in "${PORTS[@]}"; do
  if pid=$(check_port "$port"); then
    proc_name=$(ps -p "$pid" -o comm= 2>/dev/null || echo "unknown")
    warn "Port ${port} in use by ${proc_name} (PID: ${pid}), killing..."
    kill_port "$port"
    pass "Port ${port} freed"
  else
    pass "Port ${port} available"
  fi
done

# ─── Phase 5: Launch ────────────────────────────────────────
header "Starting servers..."

echo ""
echo "${DIM}----------------------------------------------${RESET}"
echo "  ${GREEN}CityTracker ready!${RESET}"
echo "  Main app:   ${BOLD}http://localhost:3000${RESET}"
if [ "$WITH_DASHBOARD" = true ]; then
  echo "  Dashboard:  ${BOLD}http://localhost:3001${RESET}"
  echo "  WS Server:  ${BOLD}http://localhost:3002${RESET}"
fi
if [ "$USE_LOCAL_DB" = true ]; then
  echo "  PostgreSQL: ${BOLD}localhost:5432${RESET} (Docker)"
else
  echo "  Database:   ${BOLD}Neon${RESET} (from .env)"
fi
echo "${DIM}----------------------------------------------${RESET}"
echo ""

if [ "$WITH_DASHBOARD" = true ]; then
  info "Starting dashboard..."
  cd "$PROJECT_ROOT/dashboard"
  pnpm dev &
  DASHBOARD_PID=$!
  cd "$PROJECT_ROOT"
fi

# exec replaces the shell — Ctrl+C goes directly to Next.js
exec pnpm dev
