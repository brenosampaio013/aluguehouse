# Alugue Houses — Listagens de temporada e mensal (Etapa 8)

> Status: **aprovado**.

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
| Destino         | `destino` ou `regiao`   | Região, cidade ou bairro do catálogo (ver `docs/busca-mapa.md`); `regiao` continua aceito                                                    |
| Área do mapa    | `area`                  | "Pesquisar nesta área": `oeste,sul,leste,norte`; substitui o destino                                                                         |
| Tipo de imóvel  | `tipo`                  | Casa, apartamento, cobertura ou outro                                                                                                        |
| Preço mínimo    | `preco_min`             | Mesma base do preço máximo                                                                                                                   |
| Chegada e saída | `chegada`, `saida`      | Esconde imóveis ocupados ou que não aceitam a estadia (mínimo de noites, por exemplo) e mostra o total estimado com tarifas sazonais e taxas |
| Hóspedes        | `hospedes`              | Capacidade do imóvel                                                                                                                         |
| Quartos         | `quartos`               | Quantidade mínima                                                                                                                            |
| Preço máximo    | `preco_max`             | Diária base (temporada) ou valor mensal; com datas, a média das diárias do período                                                           |
| Comodidades     | `comodidade` (repetido) | Todas as marcadas precisam estar presentes                                                                                                   |
| Ordenação       | `ordem`                 | `recentes`, `menor-preco`, `maior-preco`, `melhor-avaliados`                                                                                 |

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

- **Mapa ao lado da lista**: feito na busca com mapa (`docs/busca-mapa.md`).
- Os cartões levam a `/imoveis/...`, criada na Etapa 10.
