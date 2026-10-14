# Alugue Houses — Listagens de temporada e mensal (Etapa 8)

> Status: **aguardando aprovação**.

## Páginas

| Página       | Conteúdo                                                        |
| ------------ | --------------------------------------------------------------- |
| `/temporada` | Imóveis publicados que oferecem temporada (1 a 29 noites)       |
| `/mensal`    | Imóveis publicados que oferecem aluguel mensal (30 a 90 noites) |

Cada página tem um link para a outra modalidade, filtros, resumo do resultado
("3 imóveis encontrados em Ilhabela, de 10/01/2027 a 15/01/2027") e
paginação de 24 em 24.

## Filtros

| Filtro          | Parâmetro na URL        | Regra                                                                                                                                        |
| --------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Região          | `regiao`                | Uma das 5 regiões da linha da costa                                                                                                          |
| Chegada e saída | `chegada`, `saida`      | Esconde imóveis ocupados ou que não aceitam a estadia (mínimo de noites, por exemplo) e mostra o total estimado com tarifas sazonais e taxas |
| Hóspedes        | `hospedes`              | Capacidade do imóvel                                                                                                                         |
| Quartos         | `quartos`               | Quantidade mínima                                                                                                                            |
| Preço máximo    | `preco_max`             | Diária base (temporada) ou valor mensal                                                                                                      |
| Comodidades     | `comodidade` (repetido) | Todas as marcadas precisam estar presentes                                                                                                   |
| Ordenação       | `ordem`                 | `recentes`, `menor-preco`, `maior-preco`                                                                                                     |

- O formulário de filtros funciona sem JavaScript e deixa a busca na URL,
  pronta para compartilhar. A busca da página inicial usa os mesmos
  parâmetros.
- Valores inválidos na URL são ignorados; a página não quebra.
- Datas incompatíveis com a modalidade geram orientação ("Temporada vai até
  29 noites…").
- No celular, os filtros ficam recolhidos no botão "Filtros", que mostra
  quantos estão ativos.
- Com datas escolhidas, o link do cartão leva as datas e os hóspedes para a
  página do imóvel (Etapa 10).

## Banco de dados

- Nova coluna `properties.region`, escolhida no painel em "Região (linha da
  costa)". Sem região, o imóvel aparece só em "Qualquer região".
- Nova função `search_rentals`: considera apenas imóveis publicados, devolve
  apenas colunas públicas e não revela o motivo de datas ocupadas.

## Ajuste visual

Campos com texto de apoio esticavam a linha e desalinhavam os vizinhos.
Corrigido nos componentes de campo, valendo para todos os formulários.

## Verificação

| Teste                                                | Resultado                                                |
| ---------------------------------------------------- | -------------------------------------------------------- |
| Testes do banco (inclui 20 novos da busca)           | 111 de 111                                               |
| Testes unitários (inclui leitura dos filtros da URL) | 42 de 42                                                 |
| Testes de ponta a ponta (desktop, tablet e celular)  | 105 passando, 6 ignorados (específicos de outro tamanho) |
| Lint das funções SQL                                 | Sem avisos                                               |
| Build Cloudflare                                     | OK                                                       |

## Fora desta etapa

- **Mapa ao lado da lista**: depende da infraestrutura de mapas, prevista
  para a Etapa 10 (página do imóvel + mapa). Será acrescentado lá.
- Os cartões levam a `/imoveis/...`, criada na Etapa 10.
