# Painel administrativo

Reformulação do painel (`/admin`): estrutura de navegação, visão geral com
indicadores reais, listas com busca, filtros, ordenação, paginação e
exportação, e confirmações em todas as ações irreversíveis.

## Estrutura

- **Menu lateral** (`src/components/admin/shell/`): Visão geral,
  Solicitações, Imóveis, Contatos e Avaliações, com ícones e contadores de
  pendências. No computador pode ser recolhido (só ícones); a preferência
  fica no cookie `painel-menu`, lido no servidor para a página não "piscar".
  No celular e no tablet o menu abre numa gaveta (`<dialog>` nativo: foco
  preso, `Esc` fecha).
- **Cabeçalho**: trilha de navegação (Painel › Imóveis › Novo imóvel),
  usuário conectado e "Sair".
- **Componentes reutilizáveis** (`src/components/admin/ui/`): `AdminPage` e
  `PageHeader`, `Card`, `Badge`, `EmptyState`/`SectionError`, `DataTable`
  com cabeçalhos ordenáveis (`aria-sort`), `ListToolbar` (busca e filtros em
  formulário GET: funciona sem JavaScript e o link pode ser copiado),
  `StatusTabs` (abas com contagem), `ListPagination` e `useConfirmSubmit`
  (diálogo de confirmação).
- **Carregamento e erros**: `loading.tsx` mostra um esqueleto mantendo o
  menu; `error.tsx` explica a falha sem derrubar o painel. Na visão geral,
  cada seção carrega de forma independente (`settle`): se uma consulta
  falhar, só aquela seção mostra o aviso.

## Visão geral (`/admin`)

Os números vêm da função `public.admin_dashboard(p_from, p_to,
p_property_id)` (migration `20261016120000_admin_dashboard.sql`), numa só
chamada ao banco. Datas no fuso de São Paulo. Filtros: período (7, 30 e 90
dias, 12 meses ou datas personalizadas) e imóvel. Cada indicador é
comparado com o período anterior de mesmo tamanho; sem base (anterior
zerado) a tela diz "Sem base de comparação" em vez de inventar porcentagem.

| Indicador                 | Como é calculado                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| Solicitações recebidas    | Pedidos criados no período                                                                              |
| Taxa de aprovação         | Aprovadas ÷ recebidas no período (comparação em pontos percentuais)                                     |
| Valor estimado aprovado   | Soma dos orçamentos (`quoted_total`) dos pedidos do período que estão aprovados                         |
| Taxa de ocupação          | Noites reservadas **dos imóveis de aluguel publicados hoje** ÷ (esses mesmos imóveis × dias do período) |
| Contatos recebidos        | Mensagens, pedidos de visita e interesse em compra                                                      |
| Tempo médio de resposta   | Do pedido até aprovar ou recusar, para decisões tomadas no período                                      |
| Nota média das avaliações | Avaliações recebidas no período, exceto as não publicadas                                               |
| Noites reservadas         | Noites de reservas aprovadas dentro do período                                                          |

Também mostra: gráfico de evolução (solicitações e contatos por dia,
semana ou mês, com dica no mouse/teclado e tabela com os dados), pedidos
por situação e modalidade, imóveis mais procurados, pendências (pedidos
mais antigos primeiro, com alerta de chegada já passada), próximas chegadas
(14 dias contando hoje: de hoje a hoje+13), atividade recente e atalhos.

Ocupação: numerador e denominador usam o mesmo conjunto de imóveis
(publicados que oferecem temporada ou mensal), então arquivados, rascunhos
e imóveis só de venda não inflam a taxa, que nunca passa de 100%
(`occupied_nights`, migration `20261017120000_admin_dashboard_fixes.sql`).
Limitação: o conjunto é o de hoje (o banco não guarda o histórico de
publicação); em períodos antigos, um imóvel arquivado depois sai da conta.

Datas: os filtros comparam `created_at`/`decided_at` com a meia-noite de
São Paulo convertida para `timestamptz`, o que permite usar os índices
`*_created_at_idx` e mantém os limites exatos (00:00:00 a 23:59:59 locais).

Filtro de imóvel: o UUID é validado pelo formato (sem depender da lista do
seletor). Filtro inválido é ignorado com aviso; imóvel inexistente mostra
aviso e números zerados; nada é ignorado em silêncio.

## Listas

| Página       | Busca                  | Filtros                                       | Ordenação                       | CSV |
| ------------ | ---------------------- | --------------------------------------------- | ------------------------------- | --- |
| Solicitações | nome, e-mail, telefone | situação, imóvel, modalidade, recebida de/até | hóspede, datas, total, recebida | sim |
| Imóveis      | título, cidade, bairro | situação, modalidade                          | título, local, atualizado       | sim |
| Contatos     | nome, e-mail, mensagem | situação, tipo, imóvel                        | mais recentes / mais antigos    | sim |
| Avaliações   | —                      | situação, imóvel, nota                        | por data                        | —   |

- Paginação no banco (20 por página, `range` + `count`). Uma página além do
  fim (link antigo, ou depois de excluir o último item da última página)
  redireciona para a última página válida, mantendo filtros e aviso.
- Contagens das abas e do menu: uma só consulta agrupada
  (`public.admin_status_counts`), memorizada por requisição e compartilhada
  entre o layout, as abas e as pendências da visão geral. Cada tabela é
  contada à parte: se uma falhar, só ela volta `null` (aviso no log do
  Postgres) e as outras continuam. Sem contagem, a lista ainda abre (as abas
  só ficam sem números) e o menu só perde aquele contador.
- A busca escapa os curingas do `LIKE` e usa valores entre aspas no filtro
  do PostgREST: vírgulas, parênteses, `%` e `_` são procurados como texto.
- Exportação: `GET /admin/exportar/{imoveis|solicitacoes|contatos}` com os
  mesmos filtros da tela. As linhas são lidas em lotes de 1.000 (limite
  `max_rows` do PostgREST) por cursor (`id > último id lido`, índice da
  chave primária): registros criados ou excluídos durante a leitura não
  deslocam os demais, então nada que já existia é pulado ou repetido. O
  total é contado uma vez, no primeiro lote; depois as linhas são
  reordenadas como na tela (texto em português, vazios como no Postgres,
  desempate por id). Acima de 20.000 linhas a exportação é recusada (HTTP 413) pedindo para filtrar — o arquivo é montado em memória e o limite o
  mantém bem abaixo da memória de um Worker. CSV com `;`, BOM UTF-8 e CRLF
  (abre direto no Excel em português) e proteção contra injeção de fórmula
  (células que começam com `= + - @` recebem `'`).

## Ações e confirmações

Toda ação é gravada no Supabase antes da mensagem de sucesso; erros do banco
viram mensagens claras e os botões ficam desabilitados durante o envio.

- Pedem confirmação explícita: excluir imóvel, foto ou vídeo; aprovar,
  recusar ou cancelar reserva; excluir mensagem de contato.
- **Novo**: excluir mensagem de contato (por exemplo, a pedido do titular,
  LGPD). A política RLS `contatos: admin gerencia` já permitia; não houve
  mudança de permissões.
- Depois de excluir um imóvel ou mudar/excluir um contato, o painel volta à
  mesma lista (filtros e página) com o aviso. O caminho de volta é validado
  depois de normalizado (`safeReturnPath`): nunca leva para fora da lista.
- Contadores do menu e da visão geral são atualizados após cada ação
  (`revalidatePath("/admin", "layout")`).
- Salvar ou mudar a situação de um imóvel confere se a linha foi gravada:
  se ele foi excluído em outra aba, a tela avisa e nada é dado como salvo.
- Remover tarifa ou taxa pede confirmação e mostra o erro se o banco recusar.
- Excluir imóvel: os arquivos do Storage são listados por completo (em
  páginas) antes; se o Storage falhar, nada é excluído. Se a remoção dos
  arquivos falhar depois de apagar o imóvel, a tela avisa e o log registra
  o que ficou para limpeza.

## Segurança

- Nenhuma consulta nova usa `service_role`: tudo roda com a sessão do admin
  e passa pelas políticas RLS existentes (nenhuma política foi alterada).
- `admin_dashboard` e `admin_status_counts` são `security invoker` (RLS
  vale), recusam quem não é admin com MFA (`42501`) e só podem ser
  executadas por `authenticated`.
- A exportação confere a sessão (admin + MFA) no próprio handler; sem
  sessão, o proxy já redireciona para o login.

## Testes

- pgTAP: `15_painel_indicadores.test.sql` (acesso negado para hóspede,
  admin sem MFA e anônimo; contagens no fuso de São Paulo; valor aprovado;
  tempo de resposta; noites; filtro por imóvel; período inválido),
  `16_painel_ocupacao.test.sql` (ocupação com imóveis arquivados, rascunhos
  e só de venda; bordas da meia-noite) e `17_painel_contagens.test.sql`.
- Unitários: `tests/unit/admin-lists.test.ts`,
  `tests/unit/admin-dashboard.test.ts` e `tests/unit/paged.test.ts`
  (exportação em lotes).
- Ponta a ponta: `tests/e2e/painel.spec.ts` (menu, indicadores reais,
  busca, filtro, ordenação, estado vazio, CSV, exclusão com confirmação,
  página além do fim, exportação de mais de 1.000 linhas, exclusão do último
  item da última página, chegadas com 30+ estadias em andamento, filtro de
  imóvel válido/inválido/inexistente, menu recolhido salvo e acessibilidade WCAG 2.1 AA sem
  rolagem lateral em computador, tablet e celular), além dos testes
  existentes do painel atualizados para o novo menu e os diálogos.
