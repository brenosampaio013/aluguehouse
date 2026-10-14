# Alugue Houses — SEO técnico e segurança do navegador (Etapa 17)

> Status: **aguardando aprovação**.

## Indexação: desligada até o lançamento

O site **não deve aparecer no Google** antes do domínio próprio e da
regularização para anunciar imóveis de terceiros (CRECI, risco R1). Por
isso, por padrão:

- `robots.txt` responde `Disallow: /` (sem sitemap);
- todas as páginas levam `<meta name="robots" content="noindex, nofollow">`.

**Para ligar** (Etapa 20, publicação): definir `SITE_INDEXING=on` nos
segredos do Worker. É lida a cada requisição — não precisa de novo build.
Com ela ligada, o `robots.txt` libera o site, bloqueia `/admin`, `/auth`,
`/entrar`, `/favoritos` e `/minhas-estadias` e aponta o sitemap; as páginas
privadas continuam com `noindex`. `NEXT_PUBLIC_SITE_URL` precisa ser o
domínio definitivo (é a base dos links canônicos e do sitemap).

## O que foi feito

| Item                 | Detalhe                                                                                                                                                                                                                                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sitemap.xml`        | Início, Temporada, Mensal, Venda, Contato e todos os imóveis publicados, com a data da última mudança. Gerado a cada acesso.                                                                                                                                                                                            |
| Canônicos            | Cada página aponta o próprio endereço sem filtros, páginas da busca, datas ou hóspedes — evita conteúdo duplicado.                                                                                                                                                                                                      |
| Open Graph / cartões | Nome do site, idioma pt-BR, título, descrição e a foto de capa do imóvel ao compartilhar (WhatsApp, redes).                                                                                                                                                                                                             |
| JSON-LD da empresa   | `Organization` na página inicial (nome, site, e-mail, telefone, área atendida).                                                                                                                                                                                                                                         |
| JSON-LD do imóvel    | `RealEstateListing` com o imóvel (`House`/`Apartment`/…: quartos, banheiros, área, capacidade, comodidades, cidade e **localização aproximada**), ofertas (diária, mês e venda em R$), nota média quando há avaliações publicadas, e `BreadcrumbList` (Início › modalidade › imóvel). Fotos ilustrativas ficam de fora. |
| 404                  | `noindex`.                                                                                                                                                                                                                                                                                                              |

Endereço, coordenada exata e dados internos nunca entram nos dados
estruturados (testado).

## Política de segurança de conteúdo (CSP)

Aplicada em todas as páginas pelo `proxy.ts`, com um **nonce novo por
requisição** (por isso todas as páginas são renderizadas a cada acesso):

```
default-src 'self';
script-src 'self' 'nonce-…' 'strict-dynamic' https://challenges.cloudflare.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: <Supabase> <mapa>;
font-src 'self';
connect-src 'self' <Supabase> <mapa> https://challenges.cloudflare.com;
worker-src 'self' blob:;
frame-src https://challenges.cloudflare.com;
object-src 'none'; base-uri 'self'; form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests   (só com o site em https)
```

- Scripts injetados (XSS) não executam: só os com o nonce da página e os que
  eles carregam (`strict-dynamic`, como o Turnstile).
- O site não pode ser exibido dentro de outro (`frame-ancestors`).
- `style-src 'unsafe-inline'`: necessário para estilos do React e do
  MapLibre; o risco relevante (scripts) continua bloqueado.
- Em desenvolvimento (`pnpm dev`) entram `'unsafe-eval'` e `ws:` (recarga
  automática).
- O zod roda em modo `jitless` (`src/lib/zod.ts`), que não usa `eval`; uma
  regra de lint obriga a importar o zod por esse módulo.
- Trocar o estilo do mapa (`NEXT_PUBLIC_MAP_STYLE_URL`) libera a nova origem
  automaticamente; outras origens novas exigem ajuste em `src/lib/seo/csp.ts`.

Os cabeçalhos da Etapa 3 continuam (HSTS, `nosniff`, `Referrer-Policy`,
`Permissions-Policy`, `X-Frame-Options`).

## Testes

- **Unitários**: diretivas da CSP (produção, desenvolvimento, origens),
  `SITE_INDEXING`, robots.txt nos dois modos, JSON-LD (escape de `</script>`,
  ofertas, nota, campos opcionais, trilha). Total: 95.
- **Ponta a ponta** (desktop, tablet e celular):
  - CSP no cabeçalho, nonce diferente a cada requisição e em todos os
    scripts da página;
  - **nenhuma violação de CSP** relatada pelo navegador no início, listagem
    com mapa, imóvel (mapa e fotos), contato, entrar, favoritos e painel
    (início, editor do imóvel, solicitações);
  - robots.txt e `noindex` com a indexação desligada; sitemap com imóveis
    publicados e sem rascunhos; canônicos sem filtros; JSON-LD do imóvel e
    da empresa sem dados privados.
  - Toda a suíte roda com a CSP ativa. Total: 272 aprovados.
- Conferido também no runtime da Cloudflare (workerd local): cabeçalho e
  nonce corretos, robots.txt e sitemap respondendo.
