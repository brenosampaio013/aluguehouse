# Alugue Houses — Planejamento técnico (Etapa 1)

> Status: **aprovado**.
> Valores em dólar e limites de planos gratuitos são referências e devem ser
> confirmados no momento da contratação.

## 1. Negócio

| Item              | Definição                                                                   |
| ----------------- | --------------------------------------------------------------------------- |
| Marca             | Alugue Houses (logotipo ainda não existe — será criado na Etapa 2)          |
| Região            | Riviera de São Lourenço e Litoral Norte de São Paulo                        |
| Modalidades       | Temporada (até 29 noites), mensal (30 noites ou mais), venda                |
| Público           | Imóveis de alto padrão                                                      |
| WhatsApp          | +55 13 99619-5221 (`https://wa.me/5513996195221`)                           |
| E-mail de contato | contatoaluguehouses@gmail.com                                               |
| CRECI             | Não possui; os imóveis são **de terceiros** — ver risco R1                  |
| Domínio           | Ainda não registrado                                                        |
| Mídia             | Algumas fotos reais; o restante será demonstração **identificada como tal** |
| Airbnb/Booking    | Ainda não definido — ver risco R3                                           |

## 2. Decisões tomadas

1. **Aluguel mensal** usa o mesmo calendário, com mínimo de 30 noites.
2. **Reserva sem conta**: o hóspede informa nome, e-mail e telefone.
3. **Login por e-mail (link mágico)** apenas para favoritos e avaliações.
4. **Avaliação** só para quem tem estadia aprovada e já concluída. O vínculo é
   feito pelo e-mail verificado no login, igual ao e-mail da solicitação.
5. **Mapa** com MapLibre; o público vê apenas a localização aproximada.
6. **Tarifas sazonais e taxas configuráveis** pelo painel.
7. **Reserva mediante solicitação** e confirmação manual pelo único administrador.
8. **Orçamento de infraestrutura**: até R$ 100/mês.
9. **Hospedagem aprovada**: Cloudflare Workers (plano pago) + Supabase Free.
10. **Logotipo provisório tipográfico** autorizado, a ser criado na Etapa 2.

## 3. Arquitetura

```
Navegador ──► Next.js (App Router, TypeScript)
                 │  hospedado em Cloudflare Workers (adaptador OpenNext)
                 │  ├─ páginas públicas renderizadas no servidor (SEO)
                 │  ├─ /admin protegido (sessão + papel admin + MFA)
                 │  └─ Server Actions validadas com Zod + Turnstile + limite de envio
                 ▼
             Supabase
                 ├─ PostgreSQL com RLS em todas as tabelas
                 ├─ Auth (link mágico para hóspedes; senha + MFA para o admin)
                 └─ Storage (fotos, já redimensionadas no upload)
Apoio: Resend (e-mail), Cloudflare R2 (mapa PMTiles + backups),
       GitHub Actions (CI e backup diário)
```

Princípios:

- **Segurança no banco**: RLS protege os dados mesmo se a interface falhar.
- **Overbooking impossível no banco**: _exclusion constraint_ com `btree_gist`
  em `calendar_blocks`.
- **Chave `service_role` só no servidor**, em módulo `server-only`; nunca com
  prefixo `NEXT_PUBLIC_`.
- **Datas de estadia como `date`**, intervalo `[check-in, check-out)`, fuso
  `America/Sao_Paulo`.
- **Imagens redimensionadas no navegador do admin no momento do upload**
  (WebP, larguras fixas), para não depender de serviço pago de otimização.

## 4. Estrutura de diretórios

```
aluguehouse/
├─ src/
│  ├─ app/
│  │  ├─ (site)/
│  │  │  ├─ page.tsx                # home
│  │  │  ├─ temporada/              # até 29 noites
│  │  │  ├─ mensal/                 # 30 noites ou mais
│  │  │  ├─ venda/
│  │  │  ├─ imoveis/[slug]/
│  │  │  ├─ favoritos/
│  │  │  ├─ minhas-estadias/        # apenas para avaliar estadias concluídas
│  │  │  ├─ contato/
│  │  │  ├─ privacidade/  termos/
│  │  │  └─ entrar/
│  │  ├─ admin/
│  │  │  ├─ imoveis/  calendario/  solicitacoes/
│  │  │  ├─ tarifas/  avaliacoes/  contatos/
│  │  ├─ auth/callback/route.ts
│  │  ├─ sitemap.ts  robots.ts  not-found.tsx  error.tsx
│  ├─ components/ ui/ layout/ property/ search/ map/ calendar/
│  ├─ server/ actions/ queries/
│  ├─ lib/ supabase/ validation/ dates.ts pricing.ts whatsapp.ts seo.ts site-config.ts
│  ├─ types/database.ts             # gerado pela CLI do Supabase
│  └─ proxy.ts                     # renova a sessão e barra /admin (Next 16: antigo middleware)
├─ supabase/ config.toml migrations/ seed.sql tests/
├─ tests/ unit/ e2e/
├─ .github/workflows/ ci.yml backup.yml
├─ docs/
└─ .env.example                     # somente nomes de variáveis
```

## 5. Dependências

| Finalidade  | Pacotes                                                                               |
| ----------- | ------------------------------------------------------------------------------------- |
| Base        | `next`, `react`, `react-dom`, `typescript`                                            |
| Hospedagem  | `@opennextjs/cloudflare`, `wrangler` (dev)                                            |
| Supabase    | `@supabase/supabase-js`, `@supabase/ssr`, CLI `supabase` (dev)                        |
| Interface   | `tailwindcss`, `clsx`, `@radix-ui/react-*` (somente os usados)                        |
| Formulários | `react-hook-form`, `zod`, `@hookform/resolvers`                                       |
| Datas       | `date-fns`, `react-day-picker`                                                        |
| Mapa        | `maplibre-gl`, `pmtiles`                                                              |
| E-mail      | `resend`                                                                              |
| Segurança   | `server-only`, Cloudflare Turnstile                                                   |
| Testes      | `vitest`, `@testing-library/react`, `@playwright/test`, `@axe-core/playwright`, pgTAP |
| Qualidade   | `eslint`, `prettier`                                                                  |

## 6. Esquema do banco

```sql
-- extensões: btree_gist, pgcrypto

profiles          (id → auth.users, full_name, phone, created_at)

properties        (id, slug UNIQUE, title, summary, description,
                   property_type enum[casa, apartamento, cobertura, terreno, outro],
                   offers_seasonal, offers_monthly, offers_sale bool,
                   city, neighborhood, approx_lat, approx_lng,
                   bedrooms, suites, bathrooms, max_guests, parking_spots,
                   area_m2, distance_to_beach_m,
                   nightly_price,                 -- tarifa base
                   monthly_price,                 -- valor por 30 noites
                   min_nights, max_nights DEFAULT 90,
                   sale_price, condo_fee, iptu_yearly,
                   check_in_time, check_out_time, house_rules,
                   status enum[draft, published, archived],
                   created_at, updated_at)

property_private  (property_id PK, full_address, exact_lat, exact_lng, owner_notes)

property_media    (id, property_id, kind enum[image, video, tour],
                   storage_path | external_url, alt_text NOT NULL,
                   width, height, position, is_cover, is_demo bool)

amenities         (id, slug, label)
property_amenities(property_id, amenity_id)

seasonal_rates    (id, property_id, label, period daterange,
                   nightly_price, min_nights,
                   EXCLUDE USING gist (property_id WITH =, period WITH &&))

property_fees     (id, property_id, label,
                   calc enum[fixed, per_night, per_guest_per_night, percent],
                   amount, applies_to enum[seasonal, monthly, both],
                   is_refundable bool)          -- caução = reembolsável, informativa

booking_requests  (id, property_id, rental_mode enum[seasonal, monthly],
                   guest_name, guest_email, guest_phone,
                   stay daterange, guests_count, message,
                   quote_snapshot jsonb, quoted_total,
                   status enum[pending, approved, declined, cancelled, expired],
                   admin_notes, privacy_consent_at, created_at, decided_at)

calendar_blocks   (id, property_id, stay daterange,
                   kind enum[booking, owner, maintenance],
                   booking_request_id UNIQUE NULL, note,
                   EXCLUDE USING gist (property_id WITH =, stay WITH &&))

favorites         (user_id, property_id, created_at, PK(user_id, property_id))

reviews           (id, property_id, booking_request_id UNIQUE, author_id,
                   rating 1–5, comment,
                   status enum[pending, approved, rejected],
                   admin_reply, created_at)

inquiries         (id, kind enum[contact, visit, sale_interest],
                   property_id NULL, name, email, phone, message,
                   preferred_datetime NULL, status, privacy_consent_at, created_at)
```

### Regras de preço (proposta)

- **Temporada (1–29 noites)**: soma noite a noite; cada noite usa a tarifa
  sazonal do período, se houver, ou a tarifa base. O mínimo de noites é o maior
  entre o do imóvel e o de qualquer tarifa sazonal tocada pela estadia.
- **Mensal (30–90 noites)**: `monthly_price × noites ÷ 30`.
- **Taxas**: aplicadas conforme `calc` e `applies_to`.
- O cálculo roda numa função SQL `quote_stay(...)`, usada pelo site e pelo
  painel. O valor exibido ao hóspede é uma **estimativa**; o valor final é
  confirmado pelo admin.

### Fluxo de reserva

1. O hóspede envia a solicitação → `pending` (pendentes podem se sobrepor).
2. O admin aprova → `approve_booking_request(id)` em uma transação: valida
   `is_admin()`, trava a linha e insere em `calendar_blocks`.
3. Datas já ocupadas → a restrição recusa e nada é aprovado.
4. O painel lista as pendentes que conflitam, para recusa manual.

## 7. Segurança (RLS)

O admin é identificado por `app_metadata.role = 'admin'` (definido uma única vez
por SQL; o usuário não consegue alterar). `is_admin()` também exige sessão com
MFA (`aal2`).

| Tabela                                                   | Anônimo                                              | Logado                                 | Admin  |
| -------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------- | ------ |
| properties                                               | lê `published`                                       | igual                                  | tudo   |
| property_private                                         | —                                                    | —                                      | tudo   |
| property_media, amenities, seasonal_rates, property_fees | lê os de imóveis publicados                          | igual                                  | tudo   |
| calendar_blocks                                          | só períodos ocupados, via `get_unavailable_ranges()` | igual                                  | tudo   |
| booking_requests                                         | sem acesso direto (\*)                               | lê as próprias, pelo e-mail verificado | tudo   |
| favorites                                                | —                                                    | os próprios                            | lê     |
| reviews                                                  | lê `approved` (só primeiro nome)                     | cria para estadia própria concluída    | modera |
| inquiries                                                | sem acesso direto (\*)                               | —                                      | tudo   |
| profiles                                                 | —                                                    | o próprio                              | lê     |

(\*) Entrada apenas por Server Action com Zod, Turnstile e limite de envio.

Storage: bucket `property-media` com leitura pública e escrita só do admin,
restrito a tipos e tamanhos de imagem. Cabeçalhos CSP e HSTS, cookies
`httpOnly`, verificação de segredos no CI.

## 8. Infraestrutura dentro de R$ 100/mês

Câmbio de referência: R$ 5,50 por US$ (confirmar).

| Serviço              | Plano                                                | Custo estimado            |
| -------------------- | ---------------------------------------------------- | ------------------------- |
| Cloudflare Workers   | Paid (necessário pelo limite de CPU do plano grátis) | US$ 5 ≈ R$ 28/mês         |
| Supabase             | Free                                                 | R$ 0                      |
| Cloudflare R2        | Free (mapa e backups)                                | R$ 0                      |
| Resend               | Free                                                 | R$ 0                      |
| Cloudflare Turnstile | Free                                                 | R$ 0                      |
| GitHub Actions       | Free                                                 | R$ 0                      |
| Domínio `.com.br`    | registro.br                                          | ≈ R$ 40/ano ≈ R$ 3,50/mês |
| **Total**            |                                                      | **≈ R$ 32/mês**           |

Caminho de crescimento: migrar para Supabase Pro (≈ US$ 25 ≈ R$ 138/mês) quando
houver tráfego ou receita que justifique — ultrapassa o orçamento atual.

Por que não Vercel: o plano Hobby proíbe uso comercial, e o Pro (≈ US$ 20)
somado ao Supabase sairia do orçamento.

## 9. Riscos

| #   | Risco                                                                                                                                                                                                       | Mitigação                                                                                                                                                                                                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | **Sem CRECI e imóveis de terceiros.** A Lei 6.530/78 (art. 3º) atribui ao corretor a intermediação de compra, venda, permuta **e locação** de imóveis. Isso pode alcançar tanto a venda quanto os aluguéis. | **Requisito de publicação, não de desenvolvimento**: antes de colocar o site no ar com imóveis de terceiros, consultar CRECI-SP ou advogado e/ou firmar parceria com corretor credenciado. O site terá um campo de configuração para exibir nome e CRECI do responsável no rodapé e nas páginas de venda. |
| R2  | Limites do Supabase Free: pausa após 7 dias sem uso, sem backup, ~500 MB de banco, ~1 GB de storage, ~5 GB de tráfego.                                                                                      | Backup próprio diário; imagens leves; cache agressivo; monitorar uso; plano de migração para Pro.                                                                                                                                                                                                         |
| R3  | Overbooking com Airbnb/Booking.                                                                                                                                                                             | Até decidir, bloqueio manual no painel. Importação iCal fica fora do escopo e cabe no esquema atual sem migração destrutiva.                                                                                                                                                                              |
| R4  | Next.js no Cloudflare tem diferenças em relação à Vercel (otimização de imagem, alguns recursos).                                                                                                           | Imagens já otimizadas no upload; teste de deploy cedo, na Etapa 3.                                                                                                                                                                                                                                        |
| R5  | E-mail para hóspedes exige domínio verificado (SPF/DKIM).                                                                                                                                                   | Login por link mágico só funciona após registrar o domínio; antes disso, apenas avisos ao admin.                                                                                                                                                                                                          |
| R6  | Admin único é ponto único de falha.                                                                                                                                                                         | MFA com códigos de recuperação guardados e procedimento documentado.                                                                                                                                                                                                                                      |
| R7  | LGPD (dados de hóspedes e interessados).                                                                                                                                                                    | Consentimento registrado, política de privacidade, prazo de retenção e canal de exclusão.                                                                                                                                                                                                                 |
| R8  | Temporada acima de 90 dias deixa de ser locação por temporada (Lei 8.245/91).                                                                                                                               | `max_nights` padrão 90.                                                                                                                                                                                                                                                                                   |
| R9  | Direitos de imagem das fotos.                                                                                                                                                                               | Usar apenas fotos com autorização; demonstrações marcadas com `is_demo` e aviso visível.                                                                                                                                                                                                                  |

## 10. Etapas verificáveis

| #   | Etapa                                                                              | Verificação                                                        |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | Planejamento                                                                       | Este documento aprovado                                            |
| 2   | Direção visual + logotipo provisório                                               | Paleta com contraste AA comprovado, tipografia e esboços aprovados |
| 3   | Fundação (Next, Tailwind, lint, CI, Supabase local, deploy de teste no Cloudflare) | Build, lint e typecheck no CI; página “olá” publicada              |
| 4   | Banco + RLS + funções de preço e aprovação                                         | Testes pgTAP: RLS, sobreposição recusada, cálculo de preço         |
| 5   | Login de hóspede e acesso de admin com MFA                                         | E2E: anônimo e hóspede não acessam `/admin`                        |
| 6   | Admin: imóveis, mídia, tarifas e taxas                                             | E2E: criar, publicar e arquivar imóvel                             |
| 7   | Página inicial                                                                     | axe sem violações graves; Lighthouse                               |
| 8   | Listagens de temporada e mensal com filtros                                        | Testes unitários e E2E dos filtros                                 |
| 9   | Listagem de venda (condicionada ao R1)                                             | Idem                                                               |
| 10  | Página do imóvel + mapa                                                            | E2E; coordenadas exatas não vazam                                  |
| 11  | Calendário + solicitação de reserva                                                | Conflitos, preço sazonal, anti-spam                                |
| 12  | Admin: solicitações, aprovação e bloqueios                                         | Aprovação concorrente: só uma vence                                |
| 13  | Favoritos                                                                          | E2E                                                                |
| 14  | Avaliações moderadas                                                               | Só elegíveis avaliam; só aprovadas aparecem                        |
| 15  | Contato, interesse e WhatsApp                                                      | E-mail ao admin recebido em teste                                  |
| 16  | Experiência imersiva (fallback celular e movimento reduzido)                       | E2E em celular e `prefers-reduced-motion`                          |
| 17  | SEO técnico e dados estruturados                                                   | Sitemap, metatags e JSON-LD válidos                                |
| 18  | Privacidade/LGPD                                                                   | Lista de verificação revisada                                      |
| 19  | Backups automatizados                                                              | Restauração real em banco descartável                              |
| 20  | Testes finais, performance e publicação                                            | Suíte completa em desktop, tablet e celular                        |

## 11. Pendências

- [x] Imóveis próprios ou de terceiros → **de terceiros** (R1).
- [ ] Caminho de regularização do R1 (antes da publicação, Etapa 20).
- [x] Hospedagem Cloudflare Workers + Supabase Free → **aprovada**.
- [ ] Registro do domínio (exige CPF/CNPJ do titular no registro.br).
- [x] Regras de preço (seção 6) → **aprovadas**.
- [x] Logotipo provisório tipográfico na Etapa 2 → **aprovado**.
- [ ] Decisão sobre Airbnb/Booking.
