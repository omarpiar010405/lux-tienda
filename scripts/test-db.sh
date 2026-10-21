#!/usr/bin/env bash
# Aplica TODAS las migraciones en una base temporal y corre las pruebas SQL.
# Falla (código de salida distinto de 0) si cualquier migración o prueba falla.
# Requiere un PostgreSQL accesible con PGHOST/PGUSER/etc. (o local) y el cliente psql.
set -uo pipefail
cd "$(dirname "$0")/.."

DB="${TEST_DB_NAME:-boutique_test}"
PSQL="psql -v ON_ERROR_STOP=1 -q -X"

ejecutar() {
  local archivo="$1" salida
  echo "→ $archivo"
  if ! salida=$($PSQL -d "$DB" -f "$archivo" 2>&1); then
    echo "$salida" | grep -E "ERROR|FALLÓ|DEBIÓ" || echo "$salida" | tail -5
    echo "✖ falló $archivo"
    exit 1
  fi
  echo "$salida" | grep -E "PASARON" || true
}

$PSQL -d postgres -c "drop database if exists $DB" -c "create database $DB" || { echo "✖ no se pudo crear la base de prueba"; exit 1; }
ejecutar supabase/tests/00_stubs.sql
for f in supabase/migrations/*.sql; do ejecutar "$f"; done
for f in supabase/tests/[1-9]*.sql; do ejecutar "$f"; done

echo "✔ Base de datos OK"
