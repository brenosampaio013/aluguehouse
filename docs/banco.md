# Alugue Houses — Banco de dados e segurança (Etapa 4)

> Status: **aprovado**.

## Migrations

| Arquivo                         | Conteúdo                                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------------- |
| `20261014150000_base.sql`       | `btree_gist`, esquema `private`, `is_admin()`, `today_sp()`, tipos, perfis                          |
| `20261014150100_properties.sql` | Imóveis, dados privados, localização aproximada, mídia, comodidades, tarifas sazonais, taxas        |
| `20261014150200_bookings.sql`   | Solicitações, calendário, `quote_stay`, `request_booking`, aprovar/recusar/cancelar, datas ocupadas |
| `20261014150300_engagement.sql` | Favoritos, avaliações, `get_my_stays`, contatos                                                     |
| `20261014150400_security.sql`   | RLS, permissões por coluna, execução de funções, bucket de fotos                                    |

Comodidades (piscina, Wi-Fi, vista para o mar…) são dados de referência e
entram pela migration, valendo também em produção.

## Regras garantidas pelo banco

- **Sem overbooking**: restrição de exclusão em `calendar_blocks`. Testado
  com duas aprovações simultâneas em sessões separadas: uma aprovou, a outra
  recebeu `unavailable`.
- **Check-out e check-in no mesmo dia** são permitidos (`[entrada, saída)`).
- **Temporada**: 1 a 29 noites. **Mensal**: 30 a 90 noites. Nada acima de 90.
- **Tarifas sazonais** não se sobrepõem no mesmo imóvel.
- **Imóvel publicado** precisa ter o preço de cada modalidade oferecida.
- **Localização pública** derivada da exata: grade de ~550 m mais um
  deslocamento fixo por imóvel. O endereço e a coordenada exata ficam em
  `property_private`, visível só ao admin.
- **Admin** = `app_metadata.role = 'admin'` **e** sessão com MFA (`aal2`).
  Admin sem MFA é tratado como usuário comum.

## Quem acessa o quê

| Recurso                        | Visitante                             | Hóspede logado                        | Admin (com MFA)   |
| ------------------------------ | ------------------------------------- | ------------------------------------- | ----------------- |
| Imóveis, mídia, tarifas, taxas | Só publicados                         | Só publicados                         | Tudo              |
| Endereço e coordenada exata    | —                                     | —                                     | Tudo              |
| Datas ocupadas                 | `get_unavailable_ranges` (sem motivo) | Idem                                  | Tudo              |
| Orçamento                      | `quote_stay` (só publicados)          | Idem                                  | Inclui rascunhos  |
| Solicitar reserva              | Pelo servidor (`request_booking`)     | Idem                                  | —                 |
| Solicitações e notas internas  | —                                     | Só via `get_my_stays` (sem notas)     | Tudo              |
| Aprovar, recusar, cancelar     | —                                     | —                                     | Funções dedicadas |
| Favoritos                      | —                                     | Os próprios, só de imóveis publicados | Lê                |
| Avaliações                     | Aprovadas, sem autor                  | Cria para estadia própria concluída   | Modera            |
| Contatos                       | Pelo servidor                         | —                                     | Tudo              |
| Upload de fotos                | —                                     | —                                     | Tudo              |

## Códigos de erro das funções

O site traduz estes códigos para mensagens em português:

| Código               | Situação                                     |
| -------------------- | -------------------------------------------- |
| `property_not_found` | Imóvel inexistente ou não publicado          |
| `mode_not_offered`   | Modalidade não oferecida pelo imóvel         |
| `invalid_dates`      | Saída igual ou anterior à entrada            |
| `past_check_in`      | Entrada no passado                           |
| `min_nights`         | Abaixo do mínimo (detalhe: mínimo exigido)   |
| `max_nights`         | Acima do máximo do imóvel                    |
| `seasonal_max_29`    | Temporada com 30 noites ou mais              |
| `monthly_min_30`     | Mensal com menos de 30 noites                |
| `guests_exceeded`    | Acima da capacidade (detalhe: capacidade)    |
| `price_unavailable`  | Falta preço para alguma noite                |
| `unavailable`        | Datas ocupadas                               |
| `consent_required`   | Sem consentimento de privacidade             |
| `forbidden`          | Ação exclusiva do admin                      |
| `invalid_status`     | Solicitação em estado que não permite a ação |
| `invalid_area`       | Área do mapa inválida (`search_rentals_map`) |
| `invalid_sort`       | Ordenação desconhecida na busca              |
| `unknown_amenity`    | Comodidade fora do catálogo (detalhe: slug)  |
| `too_many_amenities` | Mais de 200 comodidades numa gravação        |

## Verificação

| Verificação                            | Resultado                                  |
| -------------------------------------- | ------------------------------------------ |
| `pnpm db:test` (pgTAP)                 | **91 de 91** testes passando em 6 arquivos |
| `pnpm db:lint`                         | Sem erros nem avisos                       |
| Aprovação concorrente real (2 sessões) | Uma aprovada, outra recusada, 1 bloqueio   |
| `pnpm check` e `pnpm build`            | OK                                         |

Os testes pgTAP também rodam no CI (job "Banco de dados").

## Ainda não coberto nesta etapa

- Expiração automática de pedidos pendentes cuja data já passou (o status
  `expired` existe, mas a rotina não foi criada).
- Projeto Supabase de produção: precisa ser criado na sua conta.
