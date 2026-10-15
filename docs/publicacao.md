# Alugue Houses — Testes finais, desempenho e publicação (Etapa 20)

> Status: **aguardando aprovação**.

O site está pronto e testado. A publicação depende de contas e decisões que
só você pode providenciar — nenhuma credencial foi criada ou inventada.
Esta página reúne **tudo o que falta, em ordem**.

## Resultado dos testes finais (auditoria do redesign, 15/10/2026)

| Verificação                                     | Resultado                                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------ |
| Lint, tipos, formatação, lint do banco          | sem erros                                                                      |
| Build de produção e build para Cloudflare       | aprovadas, sem avisos do site (só o aviso conhecido do `proxy.ts`, abaixo)     |
| Testes unitários                                | 128 aprovados                                                                  |
| Testes do banco (pgTAP)                         | 176 aprovados                                                                  |
| Ponta a ponta (desktop, tablet e celular)       | 356 aprovados, 19 ignorados de propósito (testes de um só tamanho de tela)     |
| Varredura de 27 páginas × 3 tamanhos            | sem erros no console, imagens quebradas, rolagem lateral ou falhas WCAG 2.1 AA |
| Backup → restauração → conferência              | aprovado (CI a cada push; agora inclui os vídeos)                              |
| Auditoria de dependências (`pnpm audit --prod`) | nenhuma vulnerabilidade conhecida                                              |
| Segredos no código do navegador                 | nenhum                                                                         |

A varredura cobriu: início, temporada (com e sem filtros e datas), mensal,
venda, imóvel (com e sem datas), contato (geral e de um imóvel), entrar,
favoritos, minhas estadias, privacidade, termos, páginas inexistentes (404)
e, logado, as páginas de hóspede e todas as do painel.

### Lighthouse (build de produção, fotos WebP reais do imóvel 01)

| Página    | Computador                                              | Celular                   |
| --------- | ------------------------------------------------------- | ------------------------- |
| Início    | Desempenho 100 · Acessibilidade 100 · Boas práticas 100 | Desempenho 98 · 100 · 100 |
| Temporada | 100 · 100 · 96¹                                         | 97 · 100 · 100            |
| Imóvel    | 97 · 100 · 100                                          | 88–95² · 100 · 100        |
| Contato   | 100 · 100 · 100                                         | 98 · 100 · 100            |

- Deslocamento de layout (CLS): **0** em todas as páginas, com as animações.
- SEO aparece como 66–69 só porque a **indexação está desligada de
  propósito** (`noindex`); com `SITE_INDEXING=on` esse item passa.
- ¹ O mapa não alcança o OpenFreeMap neste ambiente (rede bloqueada) e o
  Lighthouse registra o erro no console; publicado, não acontece.
- ² No celular, o Lighthouse simula 4G lento e as notas variam até 8
  pontos entre rodadas iguais nesta máquina. Repetir no site publicado.

### Otimizações feitas nesta etapa

- Fonte dos títulos: só os pesos usados (400 e 500) em vez da fonte variável
  com eixo óptico — de 129 KB para cerca de 57 KB.
- O zod (validação) não vai mais para o navegador no formulário de contato
  (−72 KB de JavaScript).
- A primeira foto das listagens carrega com prioridade alta; na página
  inicial, as fotos (abaixo da busca) não disputam banda com o título.
- As variáveis do servidor ficam num módulo separado: nem os nomes chegam ao
  navegador.
- Páginas de erro amigáveis ("Algo deu errado", tentar de novo, WhatsApp e
  código do erro), inclusive para falhas no layout.
- Sobre cache (ISR/R2): a política de segurança com nonce exige gerar cada
  página a cada acesso, então o cache de páginas inteiras não se aplica. As
  páginas respondem em 60–110 ms com o banco local; em produção, o tempo vai
  depender da distância entre o Cloudflare e o Supabase (escolha a região
  **São Paulo** ao criar o projeto). Se for preciso, o próximo passo é
  cachear consultas públicas por alguns segundos.

## Publicação automática

`.github/workflows/deploy.yml`, desligado até `DEPLOY_ENABLED=true`. Quando o
CI passa na branch `main` (ou pelo botão "Run workflow"):

1. aplica as migrations no Supabase de produção (`supabase db push`);
2. faz o build para o Cloudflare e confere que nenhum segredo foi para o
   navegador;
3. publica no Cloudflare Workers e grava os segredos do servidor no Worker;
4. roda `scripts/smoke-test.sh`: páginas principais respondendo, CSP, HSTS,
   `X-Frame-Options`, robots.txt, sitemap, `/admin` exigindo login e 404.

O ambiente `production` do GitHub permite exigir sua aprovação manual antes
de cada publicação (Settings → Environments → production → Required
reviewers).

## Pré-lançamento (endereço provisório)

Decisão de 15/10/2026: publicar primeiro em
`https://alugue-houses.<subdominio>.workers.dev`, **fora do Google**
(`SITE_INDEXING` vazio), para testar com o imóvel real. O lançamento oficial
(domínio, CRECI, LGPD, revisão jurídica, `SITE_INDEXING=on`) vem depois.

A branch `main` foi criada nesse dia com a versão aprovada; a publicação
automática parte dela. Mudanças seguintes chegam à `main` por pull request.

Mínimo para o pré-lançamento (itens das seções 3, 4 e 6 abaixo):

1. **Supabase**: projeto em São Paulo; URL Configuration com o endereço
   `workers.dev` (Site URL e `…/auth/callback`); MFA TOTP ligado; usuário
   administrador criado e promovido.
2. **Cloudflare**: subdomínio `workers.dev` da conta (Workers & Pages),
   API Token "Edit Cloudflare Workers" e Account ID; **Turnstile**
   (recomendado) com o hostname `alugue-houses.<subdominio>.workers.dev`.
3. **GitHub**: variáveis `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` e, por
   último, `DEPLOY_ENABLED=true`; segredos `CLOUDFLARE_API_TOKEN`,
   `CLOUDFLARE_ACCOUNT_ID`, `SUPABASE_DB_URL`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY` e `TURNSTILE_SECRET_KEY`.
4. Actions → **Publicar** → Run workflow (na `main`).
5. Antes de cadastrar dados reais: **backups** no R2 (`docs/backups.md`).

Pode esperar o lançamento oficial: domínio, Resend (sem ele, o login de
hóspedes usa o e-mail embutido do Supabase, limitado a poucos por hora, e os
avisos ao administrador ficam desligados), `SITE_INDEXING=on`.

## O que falta — em ordem

### 1. Decisões e pendências legais (antes de anunciar)

- [ ] **CRECI / regularização** para anunciar imóveis de terceiros (risco R1).
      Depois, preencher `responsible.name` e `responsible.creci` em
      `src/lib/site-config.ts` (aparecem no rodapé).
- [ ] **Controlador dos dados** (nome e CPF, ou razão social e CNPJ) em
      `legal.controllerName` e `legal.controllerDocument`.
- [ ] **Revisão jurídica** da política de privacidade e dos termos
      (pontos em `docs/privacidade.md`).
- [x] **Vídeos**: upload no painel e galeria do imóvel (`docs/videos.md`).
      Tours 360°: decidir se entram (o banco já suporta).
- [ ] **Conferir num iPhone**: enviar um vídeo pelo painel e assistir a um
      MP4 (H.264) no Safari (`docs/videos.md`).
- [ ] **Foto real da Riviera** em alta resolução para o topo da página
      inicial (hoje é um fundo gráfico).

### 2. Domínio

- [ ] Registrar o domínio (ex.: no Registro.br) e apontar os servidores de
      nome para a Cloudflare (a Cloudflare mostra os dois endereços ao adicionar
      o site). Até lá, dá para testar no endereço `alugue-houses.<conta>.workers.dev`.

### 3. Supabase de produção (plano Free)

- [ ] Criar o projeto na região **South America (São Paulo)**; guardar a
      senha do banco num gerenciador de senhas.
- [ ] Authentication → URL Configuration: Site URL = domínio; Redirect URLs =
      `https://SEU-DOMINIO/auth/callback`.
- [ ] Authentication → Emails: SMTP do Resend (após verificar o domínio no
      Resend) e o modelo de link mágico de `supabase/templates/magic-link.html`
      (detalhes em `docs/autenticacao.md`). Sem SMTP próprio, o Supabase envia
      poucos e-mails por hora — insuficiente para o login dos hóspedes.
- [ ] Authentication → MFA: TOTP ligado.
- [ ] Copiar: URL da API, chave anon, chave service_role e a conexão
      **Session pooler**.
- [ ] Criar o usuário administrador e promovê-lo (SQL em
      `docs/autenticacao.md`); no primeiro acesso, cadastrar o autenticador.

### 4. Cloudflare

- [ ] Conta Cloudflare com **Workers Paid** (US$ 5/mês, previsto no
      orçamento).
- [ ] API Token com as permissões "Edit Cloudflare Workers" (modelo pronto
      da Cloudflare) e o Account ID.
- [ ] Turnstile: criar o widget para o domínio (chave do site e secreta).
- [ ] R2: bucket privado para backups e token só desse bucket
      (`docs/backups.md`).
- [ ] Depois da primeira publicação: Workers → alugue-houses → Settings →
      Domains & Routes → adicionar o domínio.

### 5. Resend

- [ ] Conta com `contatoaluguehouses@gmail.com`; verificar o domínio
      (registros SPF/DKIM na Cloudflare); criar API key só de envio
      (`docs/contato.md`).

### 6. GitHub (Settings → Secrets and variables → Actions)

| Tipo     | Nome                                             | Para quê                                      |
| -------- | ------------------------------------------------ | --------------------------------------------- |
| Variável | `NEXT_PUBLIC_SITE_URL`                           | `https://SEU-DOMINIO`                         |
| Variável | `NEXT_PUBLIC_SUPABASE_URL`                       | URL da API do Supabase                        |
| Variável | `NEXT_PUBLIC_SUPABASE_ANON_KEY`                  | chave anon (pública)                          |
| Variável | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`                 | chave do site do Turnstile                    |
| Variável | `EMAIL_FROM`                                     | ex.: `Alugue Houses <avisos@SEU-DOMINIO>`     |
| Variável | `ADMIN_NOTIFY_EMAIL`                             | opcional (padrão: e-mail de contato)          |
| Variável | `SITE_INDEXING`                                  | deixe **vazio** até o lançamento; depois `on` |
| Variável | `DEPLOY_ENABLED`                                 | `true` para ligar a publicação                |
| Segredo  | `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` | publicação                                    |
| Segredo  | `SUPABASE_DB_URL`                                | migrations e backups (Session pooler)         |
| Segredo  | `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`     | servidor e backups                            |
| Segredo  | `TURNSTILE_SECRET_KEY`                           | anti-robô                                     |
| Segredo  | `RESEND_API_KEY`                                 | avisos por e-mail                             |
| —        | variáveis e segredos de backup                   | ver `docs/backups.md`                         |

### 7. Publicar

1. Abrir um pull request da branch de desenvolvimento para `main` e fazer o
   merge (eu posso abrir o PR quando você pedir).
2. O CI roda; passando, o workflow **Publicar** entra em ação (com sua
   aprovação, se configurou o ambiente `production`).
3. Conferir o resultado da verificação automática; entrar no painel,
   cadastrar o imóvel 01 com as fotos e publicá-lo.
4. Rodar o backup manualmente uma vez (Actions → Backup diário → Run
   workflow) e o simulado de restauração.
5. **Lançamento**: com CRECI, controlador e revisão jurídica resolvidos,
   definir `SITE_INDEXING=on` e enviar o sitemap no Google Search Console.

## Custos mensais previstos

| Serviço                 | Plano                    | Custo                                        |
| ----------------------- | ------------------------ | -------------------------------------------- |
| Cloudflare Workers      | Paid                     | US$ 5 (≈ R$ 28)                              |
| Supabase                | Free                     | R$ 0                                         |
| Cloudflare R2 (backups) | até 10 GB                | R$ 0                                         |
| Resend                  | Free (3.000 e-mails/mês) | R$ 0                                         |
| Turnstile               | Free                     | R$ 0                                         |
| GitHub Actions          | Free                     | R$ 0                                         |
| Domínio .com.br         | anual (≈ R$ 40/ano)      | ≈ R$ 3,50                                    |
| **Total**               |                          | **≈ R$ 32/mês** (dentro do limite de R$ 100) |
