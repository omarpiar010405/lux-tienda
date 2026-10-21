#!/usr/bin/env bash
# Prueba de la tienda en un navegador real con datos de ejemplo (no necesita Supabase).
# Requiere: python3 con `pip install playwright pillow` y `python3 -m playwright install chromium`.
set -euo pipefail
cd "$(dirname "$0")/../.."

export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
export NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy
export NEXT_PUBLIC_WHATSAPP_NUMERO=5215512345678

python3 scripts/e2e/mock_server.py >/dev/null 2>&1 </dev/null & MOCK=$!
trap 'kill $MOCK ${NEXT:-} 2>/dev/null || true' EXIT

npx next build >/dev/null
npx next start -p 3111 >/dev/null 2>&1 </dev/null & NEXT=$!
sleep 6
python3 scripts/e2e/tienda.py
