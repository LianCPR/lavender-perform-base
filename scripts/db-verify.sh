#!/usr/bin/env bash
# Applies the Supabase migrations to a throwaway PostgreSQL cluster and runs the
# RLS assertions in supabase/tests. Nothing is written outside .local-pg/.
#
# Usage: npm run test:db
# Override the binaries with PGBIN="/path/to/postgres/bin", port with PGTEST_PORT.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGBIN="${PGBIN:-/c/Program Files/PostgreSQL/18/bin}"
PORT="${PGTEST_PORT:-55432}"
BASE="$ROOT/.local-pg"
DATA="$BASE/data"
LOG="$BASE/server.log"

if [ ! -x "$PGBIN/initdb" ] && [ ! -x "$PGBIN/initdb.exe" ]; then
  echo "PostgreSQL binaries not found in $PGBIN (set PGBIN)." >&2
  exit 1
fi

export PATH="$PGBIN:$PATH"
mkdir -p "$BASE"

if [ ! -d "$DATA" ]; then
  echo "→ initdb $DATA"
  initdb -D "$DATA" -U postgres -A trust -E UTF8 --no-locale >/dev/null
fi

started=0
if ! psql -h 127.0.0.1 -p "$PORT" -U postgres -d postgres -c "select 1" >/dev/null 2>&1; then
  echo "→ starting PostgreSQL on port $PORT"
  pg_ctl -D "$DATA" -l "$LOG" -o "-p $PORT -h 127.0.0.1" -w start >/dev/null
  started=1
fi

cleanup() {
  if [ "$started" = "1" ]; then
    pg_ctl -D "$DATA" -m fast -w stop >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

PSQL=(psql -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$PORT" -U postgres)

"${PSQL[@]}" -d postgres -c "drop database if exists lavender_test" >/dev/null
"${PSQL[@]}" -d postgres -c "create database lavender_test" >/dev/null

echo "→ auth stub"
"${PSQL[@]}" -d lavender_test -q -f "$ROOT/supabase/tests/local_stub.sql"

for migration in "$ROOT"/supabase/migrations/*.sql; do
  echo "→ migration $(basename "$migration")"
  "${PSQL[@]}" -d lavender_test -q -f "$migration"
done

echo "→ seed"
"${PSQL[@]}" -d lavender_test -q -f "$ROOT/supabase/seed.sql"

# Seed rows must be present so playlists/favorites can reference catalog keys.
key_count=$("${PSQL[@]}" -d lavender_test -tAc "select count(*) from public.tracks where source = 'catalog'")
if [ "$key_count" -lt 1 ]; then
  echo "seed produced no catalog tracks" >&2
  exit 1
fi

echo "→ RLS tests"
"${PSQL[@]}" -d lavender_test -q -f "$ROOT/supabase/tests/rls.sql"
