#!/usr/bin/env bash
# CityTracker Dev Doctor — diagnose environment issues
# Usage: ./scripts/dev-doctor.sh

source "$(dirname "$0")/_common.sh"

banner "CityTracker Dev Doctor"

# ─── 1. Node.js ─────────────────────────────────────────────
header "Node.js"
if command -v node &>/dev/null; then
  NODE_VERSION=$(node -v | sed 's/^v//')
  if version_gte "$NODE_VERSION" "20.0.0"; then
    pass "Node.js v${NODE_VERSION}"
  else
    fail "Node.js v${NODE_VERSION} (need >= 20.0.0)"
  fi
else
  fail "Node.js not found (install via nvm: nvm install 20)"
fi

# ─── 2. pnpm ────────────────────────────────────────────────
header "pnpm"
if command -v pnpm &>/dev/null; then
  PNPM_VERSION=$(pnpm -v)
  if version_gte "$PNPM_VERSION" "9.0.0"; then
    pass "pnpm ${PNPM_VERSION}"
  else
    fail "pnpm ${PNPM_VERSION} (need >= 9.0.0)"
  fi
else
  fail "pnpm not installed (run: npm i -g pnpm)"
fi

# ─── 3. Docker ───────────────────────────────────────────────
header "Docker"
if command -v docker &>/dev/null; then
  if docker info &>/dev/null; then
    DOCKER_VERSION=$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "unknown")
    pass "Docker ${DOCKER_VERSION} (socket accessible)"
  else
    warn "Docker installed but socket not accessible"
    info "Fix: sudo usermod -aG docker \$USER && newgrp docker"
  fi
else
  warn "Docker not installed (only needed for local PostgreSQL with --local-db)"
fi

# ─── 4. Environment file ────────────────────────────────────
header "Environment"
ENV_FILE="${PROJECT_ROOT}/.env"
if [ -f "$ENV_FILE" ]; then
  pass ".env file found"

  DB_URL=$(read_env_var "DATABASE_URL")
  if [ -n "$DB_URL" ]; then
    pass "DATABASE_URL is set"
    if echo "$DB_URL" | grep -q "neon.tech"; then
      warn "DATABASE_URL points to Neon (production). Use --local-db for Docker dev DB."
    elif echo "$DB_URL" | grep -q "localhost"; then
      pass "DATABASE_URL points to localhost (local dev)"
    fi
  else
    fail "DATABASE_URL not set in .env"
  fi

  DIRECT=$(read_env_var "DIRECT_URL")
  if [ -n "$DIRECT" ]; then
    pass "DIRECT_URL is set"
  else
    warn "DIRECT_URL not set (needed for prisma migrate dev)"
  fi

  PRIM=$(read_env_var "PRIM_API_KEY")
  if [ -n "$PRIM" ]; then
    pass "PRIM_API_KEY is set"
  else
    warn "PRIM_API_KEY not set (real-time departures will be unavailable)"
  fi
else
  fail ".env not found (copy from .env.example: cp .env.example .env)"
fi

# ─── 5. Dependencies ────────────────────────────────────────
header "Dependencies"
if [ -d "${PROJECT_ROOT}/node_modules" ]; then
  pass "node_modules/ exists"
else
  fail "node_modules/ missing (run: pnpm install)"
fi

if node -e "require('@prisma/client')" 2>/dev/null; then
  pass "Prisma client generated"
elif [ -d "${PROJECT_ROOT}/node_modules" ]; then
  fail "Prisma client not generated (run: pnpm db:generate)"
fi

if [ -d "${PROJECT_ROOT}/dashboard/node_modules" ]; then
  pass "Dashboard dependencies installed"
else
  warn "Dashboard dependencies missing (run: cd dashboard && pnpm install)"
fi

# ─── 6. Database connectivity ───────────────────────────────
header "Database"
if [ -d "${PROJECT_ROOT}/node_modules" ] && [ -n "${DB_URL:-}" ]; then
  if echo "SELECT 1;" | timeout 10 npx prisma db execute --stdin --schema="${PROJECT_ROOT}/prisma/schema.prisma" &>/dev/null; then
    pass "Database reachable"

    # Check if DB has data
    LINE_COUNT=$(cd "$PROJECT_ROOT" && timeout 10 node --input-type=module -e "
      import{PrismaClient}from'@prisma/client';
      const p=new PrismaClient();
      const c=await p.line.count();
      console.log(c);
      await p.\$disconnect();
    " 2>/dev/null || echo "0")
    if [ "${LINE_COUNT:-0}" -gt 0 ] 2>/dev/null; then
      pass "Database has data (${LINE_COUNT} lines)"
    else
      warn "Database appears empty (run: pnpm db:seed)"
    fi
  else
    fail "Cannot connect to database (check DATABASE_URL in .env)"
    if echo "${DB_URL:-}" | grep -q "neon.tech"; then
      info "Neon databases may take a few seconds to wake up from cold start"
    fi
    if echo "${DB_URL:-}" | grep -q "localhost"; then
      info "Is Docker PostgreSQL running? Try: docker compose up -d"
    fi
  fi
else
  if [ -z "${DB_URL:-}" ]; then
    warn "Skipping DB check (no DATABASE_URL)"
  else
    warn "Skipping DB check (node_modules missing)"
  fi
fi

# ─── 7. Migration status ────────────────────────────────────
header "Migrations"
if [ -d "${PROJECT_ROOT}/node_modules" ] && [ -n "${DB_URL:-}" ]; then
  MIGRATE_OUTPUT=$(cd "$PROJECT_ROOT" && npx prisma migrate status 2>&1 || true)
  if echo "$MIGRATE_OUTPUT" | grep -q "Database schema is up to date"; then
    pass "All migrations applied"
  elif echo "$MIGRATE_OUTPUT" | grep -qi "following migration.*have not yet been applied"; then
    warn "Pending migrations detected"
    info "Run: pnpm db:migrate"
  elif echo "$MIGRATE_OUTPUT" | grep -qi "drift"; then
    warn "Schema drift detected"
    info "Run: npx prisma db push"
  else
    pass "Migration status OK"
  fi
else
  warn "Skipping migration check"
fi

# ─── 8. Port availability ───────────────────────────────────
header "Ports"
for port in 3000 3001 3002 5432; do
  if pid=$(check_port "$port"); then
    proc_name=$(ps -p "$pid" -o comm= 2>/dev/null || echo "unknown")
    warn "Port ${port} in use by ${proc_name} (PID: ${pid})"
  else
    pass "Port ${port} available"
  fi
done

# ─── Summary ────────────────────────────────────────────────
summary

if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi
exit 0
