#!/usr/bin/env bash
# Confere se as migrations novas deste branch vêm DEPOIS da última migration
# da base (ex.: origin/main). O `supabase db push` do deploy recusa migrations
# com timestamp anterior à última já aplicada em produção; aqui o problema
# aparece no PR, antes do merge.
#
# Uso: scripts/check-migration-order.sh <ref-da-base>   (ex.: origin/main)
set -euo pipefail

base_ref="${1:?Informe a ref da base, ex.: origin/main}"
dir="supabase/migrations"

base_files=$(git ls-tree --name-only "$base_ref" "$dir/" | xargs -rn1 basename | grep -E '^[0-9]{14}_.*\.sql$' | sort || true)
head_files=$(ls "$dir" | grep -E '^[0-9]{14}_.*\.sql$' | sort)
last_base=$(printf '%s\n' "$base_files" | tail -n1)

new_files=$(comm -13 <(printf '%s\n' "$base_files") <(printf '%s\n' "$head_files"))
if [ -z "$new_files" ]; then
  echo "✓ Nenhuma migration nova."
  exit 0
fi

status=0
while IFS= read -r file; do
  if [[ -n "$last_base" && ! "$file" > "$last_base" ]]; then
    echo "::error file=$dir/$file::A migration $file vem antes da última da base ($last_base). Renomeie com um timestamp maior que ${last_base%%_*}."
    status=1
  else
    echo "✓ $file vem depois de ${last_base:-(nenhuma)}"
  fi
done <<< "$new_files"
exit "$status"
