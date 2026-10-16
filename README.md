# Alugue Houses

Aluguel por temporada, aluguel mensal e venda de imóveis na Riviera de São
Lourenço e no Litoral Norte de São Paulo.

- Planejamento técnico: [`docs/planejamento.md`](docs/planejamento.md)
- Direção visual: [`docs/direcao-visual.md`](docs/direcao-visual.md)
- Fundação do projeto: [`docs/fundacao.md`](docs/fundacao.md)
- Banco de dados e segurança: [`docs/banco.md`](docs/banco.md)
- Login e acesso ao painel: [`docs/autenticacao.md`](docs/autenticacao.md)
- Painel administrativo (visão geral, listas, exportação): [`docs/painel-admin.md`](docs/painel-admin.md)
- Cadastro de imóveis no painel: [`docs/painel-imoveis.md`](docs/painel-imoveis.md)
- Página inicial: [`docs/pagina-inicial.md`](docs/pagina-inicial.md)
- Listagens de temporada e mensal: [`docs/listagens-aluguel.md`](docs/listagens-aluguel.md)
- Listagem de venda: [`docs/listagem-venda.md`](docs/listagem-venda.md)
- Página do imóvel e mapa: [`docs/pagina-imovel.md`](docs/pagina-imovel.md)
- Calendário e solicitação de reserva: [`docs/reserva.md`](docs/reserva.md)
- Painel de solicitações e bloqueios: [`docs/painel-reservas.md`](docs/painel-reservas.md)
- Favoritos: [`docs/favoritos.md`](docs/favoritos.md)
- Avaliações moderadas: [`docs/avaliacoes.md`](docs/avaliacoes.md)
- Contato, visitas e avisos por e-mail: [`docs/contato.md`](docs/contato.md)
- Experiência "Percorra a casa": [`docs/percorra-a-casa.md`](docs/percorra-a-casa.md)
- SEO técnico e CSP: [`docs/seo.md`](docs/seo.md)
- Privacidade e LGPD: [`docs/privacidade.md`](docs/privacidade.md)
- Backups e restauração: [`docs/backups.md`](docs/backups.md)
- **Publicação (lista do que falta): [`docs/publicacao.md`](docs/publicacao.md)**

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

### Ver com dados de demonstração

```bash
pnpm demo:seed   # imóvel 01 (fotos reais, valores fictícios) e admin local
```

- Site: <http://localhost:3000> · imóvel: `/imoveis/imovel-01-demonstracao`
- Painel: <http://localhost:3000/admin> com `admin@alugue.local` /
  `SenhaLocal2026` (no primeiro acesso, leia o QR code com um app
  autenticador, como Google Authenticator).
- E-mails de login dos hóspedes chegam na caixa local: <http://127.0.0.1:54324>.
- O script só funciona com o Supabase local; nunca use essas credenciais em
  produção.
- Capturas de tela da demonstração: `docs/demonstracao/`.

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
