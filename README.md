# Alugue Houses

Aluguel por temporada, aluguel mensal e venda de imóveis na Riviera de São
Lourenço e no Litoral Norte de São Paulo.

- Planejamento técnico: [`docs/planejamento.md`](docs/planejamento.md)
- Direção visual: [`docs/direcao-visual.md`](docs/direcao-visual.md)
- Fundação do projeto: [`docs/fundacao.md`](docs/fundacao.md)
- Banco de dados e segurança: [`docs/banco.md`](docs/banco.md)
- Login e acesso ao painel: [`docs/autenticacao.md`](docs/autenticacao.md)
- Cadastro de imóveis no painel: [`docs/painel-imoveis.md`](docs/painel-imoveis.md)

## Requisitos

- Node.js 22 (veja `.nvmrc`) e pnpm 10
- Docker, para o Supabase local

## Começando

```bash
pnpm install
cp .env.example .env.local   # preencha com os valores do Supabase local
pnpm db:start                # sobe o Supabase local (Docker)
pnpm dev                     # http://localhost:3000
```

## Comandos

| Comando                     | O que faz                                                            |
| --------------------------- | -------------------------------------------------------------------- |
| `pnpm dev`                  | Servidor de desenvolvimento                                          |
| `pnpm check`                | Lint, tipos, formatação e testes unitários                           |
| `pnpm build`                | Build de produção do Next.js                                         |
| `pnpm test:e2e`             | Testes Playwright em desktop, tablet e celular (requer `pnpm build`) |
| `pnpm cf:preview`           | Build para Cloudflare e execução local no runtime do Workers         |
| `pnpm cf:deploy`            | Build e publicação no Cloudflare (requer conta configurada)          |
| `pnpm db:start` / `db:stop` | Liga e desliga o Supabase local                                      |
| `pnpm db:reset`             | Recria o banco local a partir das migrations                         |
| `pnpm db:types`             | Gera os tipos TypeScript do banco                                    |
| `pnpm db:test`              | Testes pgTAP do banco (RLS, calendário, preços)                      |
| `pnpm db:lint`              | Verifica as funções SQL                                              |

## Segurança

- Nunca versione `.env.local` nem valores reais de chaves.
- `SUPABASE_SERVICE_ROLE_KEY` é exclusiva do servidor e ignora o RLS; só é
  usada em `src/lib/supabase/admin.ts`, protegido por `server-only`.
