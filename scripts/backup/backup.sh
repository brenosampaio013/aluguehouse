#!/usr/bin/env bash
# Backup completo e criptografado: dados do banco, estrutura (referência),
# fotos do Storage e manifesto para conferência. Ver docs/backups.md.
#
# Variáveis obrigatórias:
#   DB_URL                     conexão Postgres (percent-encoded)
#   SUPABASE_URL               URL da API do projeto
#   SUPABASE_SERVICE_ROLE_KEY  chave service_role (só para ler o Storage)
#   BACKUP_AGE_RECIPIENT       chave PÚBLICA age (age1...)
# Opcionais: OUT_DIR (padrão: backups), SUPABASE_BIN (padrão: supabase)
set -euo pipefail

: "${DB_URL:?Defina DB_URL}"
: "${SUPABASE_URL:?Defina SUPABASE_URL}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Defina SUPABASE_SERVICE_ROLE_KEY}"
: "${BACKUP_AGE_RECIPIENT:?Defina BACKUP_AGE_RECIPIENT}"
OUT_DIR="${OUT_DIR:-backups}"
SUPABASE_BIN="${SUPABASE_BIN:-supabase}"
here="$(cd "$(dirname "$0")" && pwd)"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/backup" "$OUT_DIR"

# Tabelas de autenticação transitórias (sessões, tokens, logs) ficam de fora.
exclude="auth.audit_log_entries,auth.flow_state,auth.sessions,auth.refresh_tokens,auth.one_time_tokens,auth.mfa_challenges,auth.mfa_amr_claims,auth.saml_relay_states,auth.oauth_authorizations,auth.oauth_client_states,auth.oauth_consents,auth.webauthn_challenges,private.rate_limit_hits"

echo "→ Dados do banco"
$SUPABASE_BIN db dump --db-url "$DB_URL" --data-only --use-copy \
  -s auth,public,private -x "$exclude" -f "$work/backup/data.sql"
echo "→ Estrutura do banco (referência; a restauração usa as migrations)"
$SUPABASE_BIN db dump --db-url "$DB_URL" -f "$work/backup/schema.sql"
echo "→ Manifesto"
psql "$DB_URL" -X -q -t -A -v ON_ERROR_STOP=1 -f "$here/manifest.sql" > "$work/backup/manifest.json"
echo "→ Fotos do Storage"
node "$here/storage.mjs" download "$work/backup/storage"

{
  echo "created_at=$stamp"
  echo "git_commit=$(git rev-parse HEAD 2>/dev/null || echo desconhecido)"
  echo "migrations=$(ls "$here/../../supabase/migrations" | tail -1)"
} > "$work/backup/INFO"

tar -C "$work" -czf "$work/backup.tar.gz" backup
file="$OUT_DIR/alugue-houses-$stamp.tar.gz.age"
age -r "$BACKUP_AGE_RECIPIENT" -o "$file" "$work/backup.tar.gz"
echo "✓ Backup criptografado: $file ($(du -h "$file" | cut -f1))"
echo "$file" > "$OUT_DIR/LATEST"
