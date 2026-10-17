# Alugue Houses — Busca com lista e mapa

> Status: **em revisão**.

Busca de `/temporada` e `/mensal` no estilo "lista + mapa", com a identidade
visual atual.

## Como funciona

- **Computador (a partir de 1024 px)**: lista à esquerda e mapa à direita,
  metade da tela cada. O mapa fica fixo enquanto a lista rola. Cartões em 2
  colunas (3 em telas muito largas).
- **Celular e tablet**: botão "Lista | Mapa" acima da barra de navegação.
  Abrir o mapa leva a tela até ele.
- **Marcadores**: um marcador por imóvel com o preço. Imóveis próximos viram
  um círculo com a contagem; clicar no círculo aproxima o mapa.
- **Clique no marcador**: destaca o marcador e o cartão e mostra um resumo
  (foto, título, local, nota, preço e "Ver imóvel"). Esc ou clique fora fecha.
- **"Ver no mapa" no cartão**: seleciona o marcador e centraliza o mapa sem
  mudar o zoom. Só aproxima se o imóvel estiver dentro de um grupo.
- **Passar o cursor ou o foco num cartão** destaca o marcador.
- **"Pesquisar nesta área"** aparece depois que a pessoa move o mapa e só
  busca ao clicar, sem consulta a cada movimento. A área vai para a URL
  (`area`), substitui o destino e mantém os demais filtros. "Área do mapa ×"
  remove a área.
- **Enquadramento do mapa**, nesta ordem:
  1. a área pesquisada;
  2. os imóveis encontrados com localização;
  3. o destino escolhido;
  4. o litoral inteiro.

  Nunca há posição fixa.

- **Atalhos sobre a lista**: Piscina, Ar-condicionado, Wi-Fi, Estacionamento
  e Aceita pets. Ligam e desligam os mesmos filtros do formulário.
- **Formulário**: Destino, Chegada, Saída e Hóspedes ficam sempre à vista.
  Quartos, tipo, faixa de preço, ordenação e comodidades ficam em "Mais
  filtros", que abre sozinho quando algum está em uso. O formulário continua
  funcionando sem JavaScript.
- **URL**: toda a busca fica na URL. Voltar e avançar do navegador refazem a
  busca anterior.

## Destinos

O catálogo de destinos fica em `src/lib/destinations.ts`:

| Tipo   | Exemplos                                                            | Filtra por                |
| ------ | ------------------------------------------------------------------- | ------------------------- |
| Região | Riviera de São Lourenço, São Sebastião, Ilhabela, Caraguatatuba…    | `properties.region`       |
| Cidade | Bertioga                                                            | `properties.city`         |
| Bairro | Juquehy, Barra do Una, Barra do Sahy, Camburi, Boiçucanga, Maresias | `properties.neighborhood` |

- A comparação ignora acentos e maiúsculas: "Sao Sebastiao" encontra "São
  Sebastião".
- O centro e o zoom de cada destino servem **só** para enquadrar o mapa
  quando a busca não tem imóveis com localização. Nunca são usados como
  posição de imóvel.
- A busca da página inicial sugere regiões, cidades e bairros. Na venda,
  cidade e bairro levam à região deles, porque a busca de venda filtra só
  por região.
- **Condomínio**: não há coluna própria. Cidade, bairro e região cobrem os
  destinos pedidos. Se for preciso buscar por condomínio, a melhoria futura
  é uma coluna `condominium` no imóvel, preenchida no painel.

## Preços

| Situação             | Marcador e preço do cartão                                     | Cartão                                             |
| -------------------- | -------------------------------------------------------------- | -------------------------------------------------- |
| Temporada, sem datas | Diária base, sem taxas                                         | —                                                  |
| Temporada, com datas | Média das diárias do período, com tarifas sazonais e sem taxas | Total estimado com taxas (sem caução) e a média    |
| Mensal               | Valor do mês, sem taxas                                        | Com datas: total do período com taxas (sem caução) |

- Os valores vêm de `quote_stay`, a mesma função do orçamento da página do
  imóvel. Não há preço fixo nem de exemplo.
- O filtro de preço usa a mesma base do marcador.
- A legenda acima da lista explica a regra em vigor.

## Localização e privacidade

- Os marcadores usam `approx_lat` e `approx_lng`, a localização pública
  aproximada já exibida na página do imóvel (grade de ~550 m mais um
  deslocamento fixo por imóvel). A coordenada exata (`property_private`)
  nunca sai do banco.
- Imóvel sem localização continua na lista, com "Sem localização no mapa",
  e não ganha marcador. A busca por área não o inclui.
- Só imóveis publicados aparecem.

## Banco de dados

A migration `20261017160000_search_map.sql` não altera nem apaga nenhum dado
existente:

- `private.search_key(text)` compara textos sem acentos, sem maiúsculas e
  sem pontuação.
- `private.try_quote(...)` devolve a cotação completa, ou nada se a estadia
  não for aceita.
- `public.search_rentals_map(...)` é a busca nova. `search_rentals` continua
  igual.
  - Filtros: região, cidade, bairro, texto livre, área, datas, hóspedes,
    quartos, tipo, faixa de preço, comodidades e ordenação.
  - Devolve só colunas públicas: coordenadas aproximadas, capa, nota média
    das avaliações aprovadas, preço do período e total com taxas.
  - Até 300 imóveis por busca. Acima disso, a página avisa e sugere
    aproximar o mapa.
  - Roda como `security definer` com `status = 'published'` explícito.
    Executável por visitante e por usuário logado.

Testes: `supabase/tests/database/21_busca_mapa.test.sql` (25), sobre:

- só publicados;
- cidade e bairro sem acento;
- área do mapa e imóvel sem coordenadas;
- coordenada aproximada, nunca a exata;
- média com tarifa sazonal e total com taxas, sem caução;
- nota só de avaliações aprovadas e capa;
- gravação de imóvel pelo `service_role`.

## Mapa

- MapLibre com o estilo gratuito do OpenFreeMap, sem chave e sem serviço
  pago. `NEXT_PUBLIC_MAP_STYLE_URL` troca o estilo, se necessário.
- O MapLibre só é baixado quando o mapa aparece: no computador, logo; no
  celular, ao tocar em "Mapa".
- Estados: carregando, erro (com "Tentar de novo", e a lista continua
  funcionando) e "Nenhum imóvel com localização para mostrar aqui".
- Acessibilidade:
  - cada marcador é um botão com título, preço completo e nota;
  - Tab percorre os marcadores;
  - o resumo é um diálogo com nome;
  - os botões "Lista | Mapa" indicam o modo ativo (`aria-pressed`).

## Verificação

| Teste                                                    | Resultado                    |
| -------------------------------------------------------- | ---------------------------- |
| Banco (`pnpm db:test`)                                   | 327 de 327                   |
| Lint do banco (`pnpm db:lint`)                           | Sem erros                    |
| Unitários (`pnpm test`)                                  | Ver relatório do PR          |
| Ponta a ponta: `busca-mapa`, `listagem-aluguel`, `busca` | Computador, tablet e celular |
