# Alugue Houses — Fundação do projeto (Etapa 3)

> Status: **aguardando aprovação**.

## O que foi configurado

| Área        | Configuração                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------ |
| Framework   | Next.js **16.3.8** (App Router), React 19.3, TypeScript estrito                                              |
| Estilo      | Tailwind CSS 4 com os tokens aprovados na Etapa 2 em `src/app/globals.css`                                   |
| Fontes      | Newsreader (eixo óptico) e Hanken Grotesk via `next/font`                                                    |
| Componentes | `Button`, `TextField`, `Container`, `Wordmark`, `SkipLink` em `src/components/ui/`                           |
| Página      | Provisória "Site em construção" em `src/app/(site)/page.tsx`, 404 em português, ícone AH                     |
| Supabase    | `supabase/config.toml` (CLI 2.120), clientes de navegador, servidor e admin em `src/lib/supabase/`           |
| Variáveis   | Validadas com Zod em `src/lib/env.ts`; modelo em `.env.example` sem valores                                  |
| Cloudflare  | `@opennextjs/cloudflare` 1.20.11 + `wrangler.jsonc`                                                          |
| Segurança   | Cabeçalhos `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS; sem `X-Powered-By`   |
| Testes      | Vitest (unitários) e Playwright + axe (desktop, tablet e celular)                                            |
| CI          | GitHub Actions: lint, tipos, formatação, testes, build, E2E, build Cloudflare e busca de segredos (gitleaks) |

## Decisões técnicas desta etapa

1. **Next.js fixado em 16.3.8, não 16.4.0.** O adaptador do Cloudflare ainda
   não suporta a 16.4.0: o worker falhava ao carregar `preview-props.json`.
   Atualizar quando o `@opennextjs/cloudflare` declarar suporte.
2. **Cache Components desligado.** Com ele ativo, o runtime do Workers
   cancelava as requisições por considerar que o código travou. Sem impacto
   para o projeto: o cache será tratado por página.
3. **Node.js 22**, exigido pelo Vitest 5.
4. **`proxy.ts` em vez de `middleware.ts`**: convenção do Next.js 16. Entra na
   Etapa 5 (login e admin).

## Verificação

Executado nesta sessão:

| Verificação                                                 | Resultado                                                                                          |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `pnpm lint`                                                 | Sem erros                                                                                          |
| `pnpm typecheck`                                            | Sem erros                                                                                          |
| `pnpm format:check`                                         | OK                                                                                                 |
| `pnpm test`                                                 | 8 de 8 testes passando                                                                             |
| `pnpm build`                                                | OK                                                                                                 |
| `pnpm test:e2e`                                             | 17 passando, 1 ignorado (teclado no celular) — inclui axe WCAG 2.1 AA sem violações nos 3 tamanhos |
| `pnpm cf:build` + `wrangler dev` (runtime do Workers local) | Página 200, 404 correto, ícone servido, cabeçalhos presentes                                       |
| Tamanho do worker                                           | ≈ 1 MB comprimido (limite do plano pago: 10 MB)                                                    |

**Não verificado nesta sessão:**

- `pnpm db:start` (Supabase local): a configuração foi criada, mas os
  contêineres não foram iniciados. Serão usados e testados na Etapa 4, junto
  com as migrations.
- Publicação real no Cloudflare: depende da sua conta (ver abaixo).

## Para publicar a versão de teste no Cloudflare

Precisa ser feito por você, porque envolve sua conta e pagamento:

1. Criar conta em cloudflare.com e assinar o **Workers Paid** (US$ 5/mês).
2. Criar um **API Token** com permissão "Edit Cloudflare Workers" e anotar o
   **Account ID**.
3. Cadastrar os dois como segredos do repositório no GitHub
   (`CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`).

Com isso, adiciono a publicação automática ao CI. Até lá, o site pode ser
publicado manualmente com `pnpm cf:deploy` após `pnpm exec wrangler login`.
