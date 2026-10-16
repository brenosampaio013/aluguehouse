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

| Indicador                 | Como é calculado                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Solicitações recebidas    | Pedidos criados no período                                                                                  |
| Taxa de aprovação         | Aprovadas ÷ recebidas no período (comparação em pontos percentuais)                                         |
| Valor estimado aprovado   | Soma dos orçamentos (`quoted_total`) dos pedidos do período que estão aprovados                             |
| Taxa de ocupação          | Noites de reservas aprovadas dentro do período ÷ (imóveis de aluguel publicados **hoje** × dias do período) |
| Contatos recebidos        | Mensagens, pedidos de visita e interesse em compra                                                          |
| Tempo médio de resposta   | Do pedido até aprovar ou recusar, para decisões tomadas no período                                          |
| Nota média das avaliações | Avaliações recebidas no período, exceto as não publicadas                                                   |
| Noites reservadas         | Noites de reservas aprovadas dentro do período                                                              |

Também mostra: gráfico de evolução (solicitações e contatos por dia,
semana ou mês, com dica no mouse/teclado e tabela com os dados), pedidos
por situação e modalidade, imóveis mais procurados, pendências (pedidos
mais antigos primeiro, com alerta de chegada já passada), próximas chegadas
(14 dias), atividade recente e atalhos.

Limitação conhecida: a ocupação usa os imóveis publicados hoje (o banco não
guarda o histórico de publicação). Em períodos antigos, com imóveis que
foram publicados ou arquivados depois, o número é aproximado.

## Listas

| Página       | Busca                  | Filtros                                       | Ordenação                       | CSV |
| ------------ | ---------------------- | --------------------------------------------- | ------------------------------- | --- |
| Solicitações | nome, e-mail, telefone | situação, imóvel, modalidade, recebida de/até | hóspede, datas, total, recebida | sim |
| Imóveis      | título, cidade, bairro | situação, modalidade                          | título, local, atualizado       | sim |
| Contatos     | nome, e-mail, mensagem | situação, tipo, imóvel                        | mais recentes / mais antigos    | sim |
| Avaliações   | —                      | situação, imóvel, nota                        | por data                        | —   |

- Paginação no banco (20 por página, `range` + `count`). Uma página além do
  fim (link antigo) mostra a lista vazia com a paginação, sem erro.
- A busca escapa os curingas do `LIKE` e usa valores entre aspas no filtro
  do PostgREST: vírgulas, parênteses, `%` e `_` são procurados como texto.
- Exportação: `GET /admin/exportar/{imoveis|solicitacoes|contatos}` com os
  mesmos filtros da tela (até 5.000 linhas). CSV com `;`, BOM UTF-8 e CRLF
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

## Segurança

- Nenhuma consulta nova usa `service_role`: tudo roda com a sessão do admin
  e passa pelas políticas RLS existentes (nenhuma política foi alterada).
- `admin_dashboard` é `security invoker` (RLS vale), recusa quem não é admin
  com MFA (`42501`) e só pode ser executada por `authenticated`.
- A exportação confere a sessão (admin + MFA) no próprio handler; sem
  sessão, o proxy já redireciona para o login.

## Testes

- pgTAP: `supabase/tests/database/15_painel_indicadores.test.sql` (acesso
  negado para hóspede, admin sem MFA e anônimo; contagens no fuso de São
  Paulo; valor aprovado; tempo de resposta; noites; filtro por imóvel;
  período inválido).
- Unitários: `tests/unit/admin-lists.test.ts` e
  `tests/unit/admin-dashboard.test.ts`.
- Ponta a ponta: `tests/e2e/painel.spec.ts` (menu, indicadores reais,
  busca, filtro, ordenação, estado vazio, CSV, exclusão com confirmação,
  página além do fim, menu recolhido salvo e acessibilidade WCAG 2.1 AA sem
  rolagem lateral em computador, tablet e celular), além dos testes
  existentes do painel atualizados para o novo menu e os diálogos.
