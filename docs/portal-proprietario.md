# Portal do proprietário

Área autenticada (`/proprietario`) para cada proprietário acompanhar os
imóveis dele: disponibilidade, reservas e, depois, financeiro, documentos e
avisos. Desenvolvido em fases; este documento registra decisões, segurança e
o que falta.

| Fase | Conteúdo                                                                  | Situação         |
| ---- | ------------------------------------------------------------------------- | ---------------- |
| A    | Auditoria e plano                                                         | concluída        |
| B    | Segurança no banco: vínculo, isolamento, funções, testes                  | concluída        |
| C    | Portal: visão geral, meus imóveis, calendário, reservas; vínculo no admin | concluída        |
| D    | Financeiro e repasses                                                     | regras pendentes |
| E    | Documentos, notificações, perfil                                          | depois da C      |

## Decisões (17/10/2026)

| Tema                      | Decisão                                                               |
| ------------------------- | --------------------------------------------------------------------- |
| Acesso                    | Link por e-mail + código do aplicativo autenticador (MFA obrigatório) |
| Dados do hóspede          | Primeiro nome, quantidade de hóspedes e datas. Sem e-mail ou telefone |
| Reservas pendentes        | Aparecem como "aguardando aprovação"                                  |
| Bloqueio para uso próprio | Pedido do proprietário, aprovado pelo admin                           |
| Valores nas reservas      | Orçamento de diárias e taxas, sempre identificado como **estimativa** |
| Quem cobra o hóspede      | Alugue Houses                                                         |
| Comissão                  | 15% sobre as **diárias** (não sobre as taxas)                         |
| Repasse                   | Até 2 dias após o check-in                                            |
| Registro dos recebimentos | Sistema automático + administrador                                    |
| Taxas (limpeza etc.)      | **Não definido** — de quem é cada taxa                                |
| Despesas descontadas      | **Não definido**                                                      |
| Cancelamento e reembolso  | **Não definido**                                                      |

## Segurança (Fase B)

Migration `20261017130000_owner_portal_security.sql` — só acrescenta; nenhuma
política existente foi alterada e o admin mantém o mesmo acesso.

- **Quem é proprietário**: `private.is_owner()` = `app_metadata.role =
"owner"` (o usuário não consegue alterar; quem define é o admin) **e**
  sessão com MFA (`aal2`). Mesmo modelo do admin.
- **Vínculo** `public.property_owners (property_id, owner_id)`: um imóvel pode
  ter mais de um proprietário. Só o admin cria ou remove. Um gatilho recusa
  vincular quem não tem o papel de proprietário (hóspede ou admin por
  engano). Nada é concedido automaticamente.
- **`private.owns_property(id)`**: proprietário com MFA **e** vinculado ao
  imóvel. Todas as regras do portal passam por ela, no banco.
- **Leitura direta (RLS)**: imóveis vinculados (inclusive rascunhos e
  arquivados), fotos, comodidades, tarifas sazonais e taxas. Políticas novas,
  somadas às existentes. O site público continua filtrando
  `status = 'published'` explicitamente em todas as consultas.
- **Sem acesso direto**: `property_private` (endereço exato e anotações
  internas), `booking_requests` e `calendar_blocks`. Reservas e calendário só
  por funções que conferem o vínculo:
  - `owner_bookings(imóvel?)`: id, imóvel, modalidade, datas, hóspedes,
    **primeiro nome**, situação (inclusive pendente), orçamento estimado
    (`quote`, `quoted_total`), datas do pedido e da decisão. Nunca e-mail,
    telefone, nome completo, mensagem ou anotações do admin.
  - `owner_calendar(de, até, imóvel?)`: períodos ocupados e o motivo
    (reserva, uso do proprietário, manutenção), sem anotações. Até 400 dias.
- **Pedidos** `public.owner_requests` (bloqueio de datas ou alteração do
  anúncio). O proprietário só grava pelas funções:
  - `request_owner_block(imóvel, entrada, saída, motivo?)`: datas futuras,
    até 365 dias, recusa período já ocupado;
  - `request_property_change(imóvel, descrição)`;
  - `cancel_owner_request(id)`: só pedidos pendentes do próprio imóvel;
  - no máximo 20 pedidos pendentes por imóvel.
  - Coproprietários do mesmo imóvel veem os pedidos uns dos outros.
- **Decisão do admin**: `approve_owner_request(id, resposta?)` e
  `reject_owner_request(id, resposta?)`. Aprovar um bloqueio grava "uso do
  proprietário" no calendário **na mesma transação**; se as datas tiverem
  sido ocupadas nesse meio-tempo, a restrição de exclusão do calendário
  recusa e o pedido continua pendente. Aprovar uma alteração só registra que
  o admin a fez pelo painel: o anúncio nunca muda sozinho.
- **IDs na URL**: trocar o ID de imóvel, reserva ou pedido não abre nada,
  porque cada linha é conferida no banco (testado).
- **Desvincular** tira o acesso na hora. Trocar o papel do usuário vale a
  partir da próxima renovação da sessão (até 1 hora, `jwt_expiry`); para
  cortar na hora, desvincule.

### Testes (`supabase/tests/database/18_portal_proprietario.test.sql`, 55)

Usuários: admin, proprietário A (dois imóveis, um rascunho), proprietário B,
proprietário sem imóveis, hóspede e visitante. Cobrem: vínculo só com papel
de proprietário; A lê só os seus imóveis, tarifas e taxas (inclusive do
rascunho) e nada de B, mesmo pedindo pelo ID; nada de endereço exato,
anotações, tabela de reservas ou calendário; reservas com primeiro nome e
sem campos privados; escrita direta negada (anúncio, vínculos, calendário,
pedidos); pedidos com validação de datas e limite; B não cancela pedido de
A sabendo o ID; sem MFA, sem vínculo, hóspede e visitante sem acesso; admin
com acesso preservado, aprova bloqueio (grava no calendário), recusa
sobreposto e recusa alteração; desvincular corta o acesso.

## Portal (Fase C)

### Acesso

1. O admin abre o imóvel (`/admin/imoveis/{id}#proprietarios`), informa o
   e-mail e confirma que é do proprietário. O servidor (depois de exigir
   admin com MFA) procura a conta (`admin_find_user_by_email`); se não
   existir, cria; se for de hóspede, passa a ser de proprietário; conta de
   admin é recusada. Só essa troca de papel usa a chave `service_role`, no
   servidor. O vínculo é gravado com a sessão do admin (RLS).
2. O proprietário entra em `/entrar` com o link enviado ao e-mail e, no
   primeiro acesso, cadastra o aplicativo autenticador em
   `/proprietario/verificacao` (mesmos componentes do admin). Sem o código,
   nenhuma página do portal abre e o banco não entrega nada (`aal2`).
3. Remover o acesso (botão no imóvel) vale na hora.

Proteção em camadas: o proxy manda quem não está logado para
`/entrar?next=/proprietario`; o layout do portal e cada página/ação chamam
`requireOwner()`; cada página confere o vínculo (`property_owners`) antes
de mostrar um imóvel, porque a política pública também deixa ler imóveis
publicados de outros donos; e o banco confere de novo em cada função.
IDs de outro proprietário na URL mostram "Página não encontrada"; nos
filtros (calendário, reservas) são ignorados.

### Telas (`src/app/proprietario/`)

Mesma estrutura do painel (menu lateral recolhível, gaveta no celular,
trilha de navegação): `AdminShell` agora recebe a área (`admin` ou
`owner`), sem duplicar componentes.

| Menu         | Conteúdo                                                                                                                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visão geral  | Imóveis vinculados; reservas futuras, em andamento, aguardando aprovação, concluídas e canceladas (contadas no banco); próximas entradas e saídas (30 dias); ocupação dos próximos 30 dias por imóvel; pedidos em análise |
| Meus imóveis | Cartões com foto, situação do anúncio, local, capacidade e preço; ficha com fotos, características, comodidades, tarifas (base e sazonais), taxas, regras, disponibilidade (60 dias) e pedido de alteração                |
| Calendário   | Mês a mês (±24 meses): livre, reservado, uso do proprietário, manutenção e pedido pendente; tarifa de cada noite (sazonal ou base) e estadia mínima quando a temporada exige mais; pedido de bloqueio                     |
| Reservas     | Abas por etapa, filtro por imóvel, paginação; detalhe com datas, hóspedes (primeiro nome), situação e valores **estimados**                                                                                               |
| Financeiro   | Aviso de que ainda não há lançamentos e do que vai aparecer (Fase D). Nenhum valor estimado                                                                                                                               |
| Documentos   | Em preparação (Fase E)                                                                                                                                                                                                    |
| Notificações | Em preparação (Fase E)                                                                                                                                                                                                    |
| Meu perfil   | E-mail de acesso, nome e telefone (gravados em `profiles`), situação do segundo fator                                                                                                                                     |

Etapas da reserva (`src/lib/owner/portal.ts`): pendente → "Aguardando
aprovação"; aprovada com entrada depois de hoje → "Confirmada"; aprovada
com hoje dentro da estadia → "Hospedagem em andamento"; aprovada com saída
até hoje → "Concluída"; recusada, cancelada, expirada como no banco.

### Admin

- **Imóvel → Proprietários**: dar e remover acesso; pedidos daquele imóvel.
- **Menu → Proprietários** (`/admin/proprietarios`): pedidos pendentes de
  todos os imóveis (contador no menu), quem tem acesso a quê e os pedidos
  já decididos. Aprovar um bloqueio grava "uso do proprietário" no
  calendário; se as datas foram ocupadas, o banco recusa e o pedido segue
  pendente. Aprovar uma alteração só registra que o admin já editou o
  anúncio.
- Migration `20261017140000_owner_portal_admin.sql`: `admin_user_emails` e
  `admin_find_user_by_email` (só admin com MFA; devolvem id, e-mail e papel).

### Testes (Fase C)

- pgTAP `19_portal_admin.test.sql` (8): busca de conta e e-mails só para
  admin com MFA; proprietário, hóspede e admin sem MFA recebem 42501.
- Unitários `owner-portal.test.ts` e `owner-actions.test.ts` (19): etapas,
  calendário (limites da estadia, tarifa e mínimo sazonais, pedido
  pendente), ocupação, orçamento com JSON estranho, menu e trilha; ações
  com banco recusando, imóvel de outro dono, falha de rede e sucesso só
  depois da gravação.
- Ponta a ponta `tests/e2e/proprietario.spec.ts` (computador, tablet e
  celular), com usuários reais do Supabase local: visitante e hóspede
  barrados; proprietário sem o código barrado (inclusive no `/admin`);
  proprietário sem imóveis; números reais da visão geral; só imóveis
  vinculados (com rascunho); IDs de outro dono na URL e nos filtros;
  reservas por etapa sem e-mail, telefone ou nome completo; pedido de
  alteração e cancelamento gravados no banco sem mudar o anúncio; bloqueio
  sobre reserva recusado; bloqueio aprovado pelo admin aparece no
  calendário; tarifa sazonal e mínimo no calendário; perfil gravado; admin
  dá e remove acesso (com confirmação obrigatória); WCAG 2.1 AA e sem
  rolagem lateral nas páginas do portal.

## Financeiro (Fase D) — pendências

Hoje o site **não cobra nada** (os Termos dizem isso): não há pagamentos,
recebimentos nem repasses registrados. O único valor é o orçamento do pedido.

Antes de calcular qualquer valor, falta definir:

1. De quem é cada taxa (limpeza e outras): do proprietário, da Alugue Houses
   ou repassada ao prestador?
2. Quais despesas podem ser descontadas do repasse e quem as lança.
3. Regra de cancelamento e reembolso (e o efeito na comissão e no repasse).
4. "Sistema automático" de recebimentos: qual meio de pagamento (gateway)
   será integrado. Sem ele, só o lançamento manual pelo admin é possível.
5. Revisão dos Termos de uso, que hoje dizem que nada é cobrado pelo site.

Com as regras já definidas (15% sobre diárias; repasse até 2 dias após o
check-in), a estrutura da Fase D terá lançamentos confirmados pelo admin
(ou pelo gateway), somente leitura para o proprietário.
