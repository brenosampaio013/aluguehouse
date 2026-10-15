#!/usr/bin/env bash
# Garante que nenhum segredo (nem o nome das variáveis do servidor) foi parar
# nos arquivos enviados ao navegador (.next/static). Rode depois do build.
set -euo pipefail
dir=".next/static"
[ -d "$dir" ] || { echo "Rode o build antes ($dir não existe)." >&2; exit 2; }

fail=0
for name in SUPABASE_SERVICE_ROLE_KEY TURNSTILE_SECRET_KEY RESEND_API_KEY ADMIN_NOTIFY_EMAIL MAILPIT_URL SITE_INDEXING; do
  if grep -rlq "$name" "$dir"; then
    echo "ERRO: o nome $name aparece no código do navegador." >&2
    fail=1
  fi
  value="${!name:-}"
  if [ -n "$value" ] && [ "${#value}" -ge 16 ] && grep -rlqF "$value" "$dir"; then
    echo "ERRO: o VALOR de $name aparece no código do navegador." >&2
    fail=1
  fi
done
[ "$fail" -eq 0 ] && echo "✓ Nenhum segredo do servidor no código do navegador."
exit "$fail"
