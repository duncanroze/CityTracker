#!/usr/bin/env bash
set -euo pipefail

# ── CityTracker — one-command launcher ──
# Usage: ./start.sh
#   Starts PostgreSQL, runs migrations/seed if needed, then launches server + client.
#   Press Ctrl+C to stop everything.

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

cleanup() {
  echo ""
  echo "Shutting down..."
  kill $SERVER_PID $CLIENT_PID 2>/dev/null || true
  wait $SERVER_PID $CLIENT_PID 2>/dev/null || true
  echo "Done."
}
trap cleanup EXIT

# ── 1. Check prerequisites ──
for cmd in docker pnpm node; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: $cmd is not installed."
    exit 1
  fi
done

# ── 2. Install dependencies if needed ──
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  pnpm install
fi

# ── 3. Start PostgreSQL ──
echo "Starting PostgreSQL..."
docker compose up postgres -d

echo "Waiting for PostgreSQL to be ready..."
until docker compose exec -T postgres pg_isready -U citytracker -q 2>/dev/null; do
  sleep 1
done
echo "PostgreSQL is ready."

# ── 4. Generate Prisma client ──
echo "Generating Prisma client..."
pnpm --filter server db:generate

# ── 5. Run migrations ──
echo "Running database migrations..."
pnpm --filter server db:migrate

# ── 6. Seed if database is empty ──
STATION_COUNT=$(docker compose exec -T postgres psql -U citytracker -d citytracker -tAc "SELECT count(*) FROM \"Station\"" 2>/dev/null || echo "0")
if [ "$STATION_COUNT" = "0" ] || [ -z "$STATION_COUNT" ]; then
  echo "Seeding database..."
  pnpm --filter server db:seed
else
  echo "Database already seeded ($STATION_COUNT stations)."
fi

# ── 7. Start server ──
echo "Starting server on http://localhost:3000..."
cd "$ROOT_DIR/server"
pnpm dev &
SERVER_PID=$!
cd "$ROOT_DIR"

# Wait for server to be ready
echo "Waiting for server..."
for i in $(seq 1 30); do
  if curl -s http://localhost:3000/api/stations >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
echo "Server is ready."

# ── 8. Start client ──
echo "Starting client on http://localhost:5173..."
cd "$ROOT_DIR/client"
pnpm dev &
CLIENT_PID=$!
cd "$ROOT_DIR"

echo ""
echo "============================================"
echo "  CityTracker is running!"
echo "  Open http://localhost:5173"
echo "  Press Ctrl+C to stop."
echo "============================================"
echo ""

# Keep script alive
wait
