#!/usr/bin/env bash
# Shared helpers for CityTracker dev scripts
# Source this file: source "$(dirname "$0")/_common.sh"

set -euo pipefail

# Project root detection
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors (respects NO_COLOR: https://no-color.org/)
# Use $'...' so variables contain actual ESC bytes (safe with printf)
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  RED=$'\033[0;31m'
  GREEN=$'\033[0;32m'
  YELLOW=$'\033[0;33m'
  BLUE=$'\033[0;34m'
  BOLD=$'\033[1m'
  DIM=$'\033[2m'
  RESET=$'\033[0m'
else
  RED='' GREEN='' YELLOW='' BLUE='' BOLD='' DIM='' RESET=''
fi

# Counters
PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  echo "${GREEN}  ✓${RESET} $1"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  echo "${RED}  ✗${RESET} $1"
}

warn() {
  WARN_COUNT=$((WARN_COUNT + 1))
  echo "${YELLOW}  !${RESET} $1"
}

info() {
  echo "${BLUE}  ›${RESET} $1"
}

header() {
  echo ""
  echo "${BOLD}$1${RESET}"
}

banner() {
  echo ""
  echo "${BOLD}=============================================="
  echo "  $1"
  echo "==============================================${RESET}"
  echo ""
}

summary() {
  echo ""
  echo "${DIM}----------------------------------------------${RESET}"
  echo "  Results: ${GREEN}${PASS_COUNT} passed${RESET}, ${YELLOW}${WARN_COUNT} warnings${RESET}, ${RED}${FAIL_COUNT} failed${RESET}"
  echo "${DIM}----------------------------------------------${RESET}"
}

# Check if a port is in use. Prints PID if occupied, returns 0.
# Returns 1 if port is free.
check_port() {
  local port=$1
  local pid
  pid=$(lsof -ti ":${port}" 2>/dev/null | head -1 || true)
  if [ -n "$pid" ]; then
    echo "$pid"
    return 0
  fi
  return 1
}

# Kill processes on a port (SIGTERM, then SIGKILL after 1s)
kill_port() {
  local port=$1
  local pids
  pids=$(lsof -ti ":${port}" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill -TERM 2>/dev/null || true
    sleep 1
    pids=$(lsof -ti ":${port}" 2>/dev/null || true)
    if [ -n "$pids" ]; then
      echo "$pids" | xargs kill -9 2>/dev/null || true
    fi
  fi
}

# Read a var from .env file (without exporting to current shell)
read_env_var() {
  local var_name=$1
  local env_file="${PROJECT_ROOT}/.env"
  if [ -f "$env_file" ]; then
    grep -E "^${var_name}=" "$env_file" 2>/dev/null | head -1 | cut -d'=' -f2-
  fi
}

# Compare semver: returns 0 if $1 >= $2
version_gte() {
  local v1=$1 v2=$2
  # Sort versions, pick the lower one. If lower == v2, then v1 >= v2.
  local lower
  lower=$(printf '%s\n%s' "$v1" "$v2" | sort -V | head -1)
  [ "$lower" = "$v2" ]
}
