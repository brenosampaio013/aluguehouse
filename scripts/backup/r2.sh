#!/usr/bin/env bash
# Envio, busca e limpeza dos backups no Cloudflare R2 (API compatível com S3).
# Uso:
#   scripts/backup/r2.sh enviar <arquivo>
#   scripts/backup/r2.sh baixar-ultimo <pasta>     (imprime o caminho baixado)
#   scripts/backup/r2.sh limpar                    (apaga os mais antigos que BACKUP_RETENTION_DAYS)
# Variáveis: R2_ACCOUNT_ID, R2_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
set -euo pipefail

: "${R2_ACCOUNT_ID:?Defina R2_ACCOUNT_ID}"
: "${R2_BUCKET:?Defina R2_BUCKET}"
export AWS_DEFAULT_REGION=auto
# O R2 não exige as somas de verificação novas do AWS CLI.
export AWS_REQUEST_CHECKSUM_CALCULATION=WHEN_REQUIRED
export AWS_RESPONSE_CHECKSUM_VALIDATION=WHEN_REQUIRED
endpoint="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
prefix="s3://${R2_BUCKET}/diarios/"
s3() { aws s3 --endpoint-url "$endpoint" "$@"; }

case "${1:-}" in
  enviar)
    s3 cp "${2:?Informe o arquivo}" "$prefix" --only-show-errors
    echo "✓ Enviado: ${prefix}$(basename "$2")"
    ;;
  baixar-ultimo)
    latest="$(s3 ls "$prefix" | awk '{print $4}' | grep -E '^alugue-houses-.*\.tar\.gz\.age$' | sort | tail -1)"
    [ -n "$latest" ] || { echo "Nenhum backup encontrado no R2." >&2; exit 1; }
    mkdir -p "${2:?Informe a pasta}"
    s3 cp "${prefix}${latest}" "$2/$latest" --only-show-errors
    echo "$2/$latest"
    ;;
  limpar)
    days="${BACKUP_RETENTION_DAYS:-30}"
    cutoff="$(date -u -d "-${days} days" +%Y%m%d)"
    s3 ls "$prefix" | awk '{print $4}' | grep -E '^alugue-houses-[0-9]{8}T' | while read -r name; do
      day="${name#alugue-houses-}"
      day="${day:0:8}"
      if [ "$day" -lt "$cutoff" ]; then
        s3 rm "${prefix}${name}" --only-show-errors
        echo "Apagado (mais de ${days} dias): $name"
      fi
    done
    ;;
  *)
    echo "Uso: r2.sh <enviar|baixar-ultimo|limpar> ..." >&2
    exit 2
    ;;
esac
