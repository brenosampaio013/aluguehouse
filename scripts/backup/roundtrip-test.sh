#!/usr/bin/env bash
# Teste de restauração (CI e local, com o Supabase local rodando):
# dados de exemplo → backup → banco zerado → restauração → conferência →
# prova de que a conferência detecta diferença.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
SUPABASE_BIN="${SUPABASE_BIN:-supabase}"

eval "$($SUPABASE_BIN status -o env | grep -E '^(API_URL|SERVICE_ROLE_KEY|DB_URL)=')"
export DB_URL SUPABASE_URL="$API_URL" SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" SUPABASE_BIN

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
age-keygen -o "$work/key.txt" 2> /dev/null
export BACKUP_AGE_RECIPIENT="$(age-keygen -y "$work/key.txt")"
export BACKUP_AGE_IDENTITY_FILE="$work/key.txt"

node "$here/seed-test.mjs"
psql "$DB_URL" -X -q -t -A -f "$here/manifest.sql" > "$work/before.json"

OUT_DIR="$work/out" "$here/backup.sh"
backup="$(cat "$work/out/LATEST")"

# O arquivo não pode ser lido sem a chave.
if tar -tzf "$backup" > /dev/null 2>&1; then
  echo "ERRO: o backup não está criptografado." >&2
  exit 1
fi

echo "→ Zerando o banco local (migrations reaplicadas, sem dados)"
$SUPABASE_BIN db reset --local --no-seed > /dev/null
psql "$DB_URL" -X -q -t -A -c "select count(*) from public.properties" | grep -qx 0

CONFIRM_RESTORE=sim "$here/restore.sh" "$backup"

psql "$DB_URL" -X -q -t -A -f "$here/manifest.sql" > "$work/after.json"
node "$here/verify.mjs" "$work/before.json" "$work/after.json"

echo "→ A conferência precisa acusar uma alteração"
psql "$DB_URL" -X -q -c "update public.properties set title = title || ' (alterado)' where slug like 'casa-backup-%'"
psql "$DB_URL" -X -q -t -A -f "$here/manifest.sql" > "$work/tampered.json"
if node "$here/verify.mjs" "$work/before.json" "$work/tampered.json" 2> /dev/null; then
  echo "ERRO: a conferência não detectou a alteração." >&2
  exit 1
fi
echo "✓ Teste de backup e restauração aprovado."
