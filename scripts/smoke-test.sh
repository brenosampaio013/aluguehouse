#!/usr/bin/env bash
# Verificação rápida depois de publicar. Uso: scripts/smoke-test.sh https://seu-dominio
set -euo pipefail
site="${1:?Informe a URL do site}"
site="${site%/}"
fail=0
check() { echo "✓ $1"; }
problem() { echo "✗ $1" >&2; fail=1; }

for path in / /temporada /mensal /venda /contato /privacidade /termos; do
  code="$(curl -s -o /dev/null -w '%{http_code}' "$site$path")"
  [ "$code" = 200 ] && check "$path responde 200" || problem "$path respondeu $code"
done

headers="$(curl -s -D - -o /dev/null "$site/")"
grep -qi "^content-security-policy:.*nonce-" <<< "$headers" && check "CSP com nonce" || problem "CSP ausente"
grep -qi "^strict-transport-security:" <<< "$headers" && check "HSTS" || problem "HSTS ausente"
grep -qi "^x-frame-options: deny" <<< "$headers" && check "X-Frame-Options" || problem "X-Frame-Options ausente"

robots="$(curl -s "$site/robots.txt")"
grep -q "User-Agent: \*" <<< "$robots" && check "robots.txt ($(grep -c Disallow <<< "$robots") regra(s) Disallow)" || problem "robots.txt inválido"
code="$(curl -s -o /dev/null -w '%{http_code}' "$site/sitemap.xml")"
[ "$code" = 200 ] && check "sitemap.xml" || problem "sitemap.xml respondeu $code"

code="$(curl -s -o /dev/null -w '%{http_code}' "$site/admin")"
location="$(curl -s -o /dev/null -w '%{redirect_url}' "$site/admin")"
[[ "$code" =~ ^30[78]$ && "$location" == */admin/entrar ]] && check "/admin exige login" || problem "/admin não redirecionou para o login ($code)"

code="$(curl -s -o /dev/null -w '%{http_code}' "$site/pagina-que-nao-existe-$$")"
[ "$code" = 404 ] && check "404 para endereço inexistente" || problem "endereço inexistente respondeu $code"

exit "$fail"
