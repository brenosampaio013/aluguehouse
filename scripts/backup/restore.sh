#!/usr/bin/env bash
# Restaura um backup em um projeto Supabase com as migrations já aplicadas e
# confere o resultado. APAGA os dados atuais das tabelas do backup.
# Ver docs/backups.md.
#
# Uso: scripts/backup/restore.sh <arquivo.tar.gz.age>
# Variáveis obrigatórias:
#   DB_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (projeto de DESTINO)
#   BACKUP_AGE_IDENTITY_FILE   arquivo com a chave PRIVADA age
#   CONFIRM_RESTORE=sim        confirmação explícita (a restauração apaga dados)
set -euo pipefail

backup_file="${1:?Informe o arquivo do backup}"
: "${DB_URL:?Defina DB_URL}"
: "${SUPABASE_URL:?Defina SUPABASE_URL}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Defina SUPABASE_SERVICE_ROLE_KEY}"
: "${BACKUP_AGE_IDENTITY_FILE:?Defina BACKUP_AGE_IDENTITY_FILE}"
if [ "${CONFIRM_RESTORE:-}" != "sim" ]; then
  echo "A restauração apaga os dados atuais do destino. Rode com CONFIRM_RESTORE=sim." >&2
  exit 2
fi
here="$(cd "$(dirname "$0")" && pwd)"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

echo "→ Descriptografando"
age -d -i "$BACKUP_AGE_IDENTITY_FILE" -o "$work/backup.tar.gz" "$backup_file"
tar -C "$work" -xzf "$work/backup.tar.gz"
cat "$work/backup/INFO"

# Esvazia exatamente as tabelas presentes no backup (com CASCADE para as
# transitórias que dependem delas) e carrega os dados numa única transação,
# sem disparar gatilhos (os dados já vêm completos).
tables="$(grep -oE '^COPY "[^"]+"\."[^"]+"' "$work/backup/data.sql" | sed 's/^COPY //' | paste -sd, -)"
echo "→ Restaurando o banco ($(echo "$tables" | tr ',' '\n' | wc -l) tabelas)"
psql "$DB_URL" -X -q -v ON_ERROR_STOP=1 --single-transaction \
  -c "set client_min_messages = warning" \
  -c "set session_replication_role = replica" \
  -c "truncate $tables cascade" \
  -f "$work/backup/data.sql" > /dev/null

echo "→ Enviando as fotos"
node "$here/storage.mjs" upload "$work/backup/storage"

echo "→ Conferindo"
psql "$DB_URL" -X -q -t -A -v ON_ERROR_STOP=1 -f "$here/manifest.sql" > "$work/restored.json"
node "$here/verify.mjs" "$work/backup/manifest.json" "$work/restored.json"
node "$here/storage.mjs" verify "$work/backup/storage"
echo "✓ Restauração concluída e conferida."
