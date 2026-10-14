# Alugue Houses — Listagem de venda (Etapa 9)

> Status: **aguardando aprovação**.

## Página `/venda`

Imóveis publicados que oferecem venda e têm preço definido. Os cartões
mostram preço, quartos ou suítes e área (em vez da capacidade de hóspedes).

| Filtro       | Parâmetro na URL        | Regra                                                              |
| ------------ | ----------------------- | ------------------------------------------------------------------ |
| Região       | `regiao`                | Uma das 5 regiões da linha da costa                                |
| Tipo         | `tipo`                  | Casa, apartamento, cobertura, terreno ou outro                     |
| Preço máximo | `preco_max`             | Faixas de R$ 1 milhão a R$ 5 milhões (as mesmas da página inicial) |
| Quartos      | `quartos`               | Quantidade mínima                                                  |
| Área         | `area_min`              | Área mínima em m²                                                  |
| Comodidades  | `comodidade` (repetido) | Todas as marcadas precisam estar presentes                         |
| Ordenação    | `ordem`                 | `recentes`, `menor-preco`, `maior-preco`                           |

A busca de venda da página inicial (`/venda?tipo=casa&preco_max=2000000`)
chega com os filtros já aplicados. Mesmo comportamento das listagens de
aluguel: formulário GET, valores inválidos ignorados, filtros recolhidos no
celular e paginação de 24 em 24.

## Banco de dados

Nova função `search_sales`. Roda com as permissões do visitante (RLS), então
só enxerga imóveis publicados; não precisa ler o calendário.

## Reaproveitamento

- Paginação extraída para `src/components/search/pagination.tsx`, usada por
  aluguel e venda.
- Leitura segura de filtros da URL em `src/lib/search/shared.ts`.
- Busca de fotos de capa em uma única consulta, usada por aluguel e venda.

## CRECI (risco R1)

A página exibe "Intermediação: nome, CRECI número" assim que os campos
`responsible` forem preenchidos em `src/lib/site-config.ts`. Publicar imóveis
de terceiros à venda continua dependendo da regularização (veja
`docs/planejamento.md`).

## Verificação

| Teste                                               | Resultado                                                |
| --------------------------------------------------- | -------------------------------------------------------- |
| Testes do banco (inclui 11 novos da venda)          | 122 de 122                                               |
| Testes unitários                                    | 46 de 46                                                 |
| Testes de ponta a ponta (desktop, tablet e celular) | 123 passando, 6 ignorados (específicos de outro tamanho) |
| Build Cloudflare                                    | OK                                                       |

Os testes de ponta a ponta cobrem a lista, preço e área nos cartões, a busca
vinda da página inicial, cada filtro, a ordenação, o estado vazio,
acessibilidade (WCAG 2.1 AA) e ausência de rolagem horizontal.
