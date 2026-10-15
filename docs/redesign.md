# Alugue Houses — Redesign de alto padrão

Redesign conduzido em etapas, cada uma aprovada antes da seguinte. Substitui
a direção visual original (`docs/direcao-visual.md`) nas cores e na fonte de
interface; o restante daquele documento continua valendo.

## Etapa 2 — Identidade visual e cabeçalho

> Status: **aprovado**.

### Paleta

Os nomes dos tokens (`src/app/globals.css`) foram mantidos para que o site e
o painel mudem juntos sem reescrever os componentes.

| Token      | Hex       | Papel                                                       |
| ---------- | --------- | ----------------------------------------------------------- |
| `abismo`   | `#142B3A` | Azul-marinho: texto principal, títulos, rodapé              |
| `petroleo` | `#103B40` | Azul-petróleo: botões, links, foco                          |
| `marfim`   | `#F8F6F1` | Off-white: fundo das páginas (novo)                         |
| `areia`    | `#EAE0D0` | Faixas, chips, painel de reserva                            |
| `dourado`  | `#B79A69` | Dourado discreto: filetes e detalhes (novo, substitui duna) |
| `nevoa`    | `#DCE6E3` | Seleção de datas e filtros                                  |
| `junco`    | `#8A7856` | Bordas de campos                                            |
| `rocha`    | `#52666A` | Texto secundário                                            |
| `branco`   | `#FFFFFF` | Cartões, campos e painéis sobre o fundo off-white           |
| `erro`     | `#A8321F` | Erros                                                       |

### Contraste (WCAG 2.1)

| Combinação                       | Razão         | Uso permitido                                    |
| -------------------------------- | ------------- | ------------------------------------------------ |
| Marinho sobre off-white / branco | 13,54 / 14,62 | Qualquer texto                                   |
| Petróleo sobre off-white / areia | 11,29 / 9,33  | Qualquer texto                                   |
| Off-white sobre petróleo         | 11,29         | Texto de botões                                  |
| Rocha sobre off-white / areia    | 5,61 / 4,63   | Texto secundário                                 |
| Junco sobre off-white / areia    | 3,97 / 3,28   | Bordas de campos (≥ 3:1)                         |
| Dourado sobre marinho / petróleo | 5,46 / 4,55   | Texto e foco sobre fundo escuro                  |
| Dourado sobre off-white          | 2,48          | **Só decoração**, nunca texto ou borda funcional |

No rodapé (fundo marinho) o contorno de foco é dourado (`.sobre-escuro`).

### Tipografia

- Títulos e marca: **Newsreader** (serifada, mantida).
- Interface e texto: **Manrope** (substitui a Hanken Grotesk).

### Cabeçalho

- Filete dourado no topo, fundo off-white.
- Marca "Alugue Houses" com a linha "Riviera · Litoral Norte".
- Temporada, Mensal e Venda com a página atual marcada (negrito, traço
  dourado e `aria-current`).
- Favoritos e acesso à conta: **"Entrar"** para visitantes e **"Minha
  conta"** para quem já entrou (antes aparecia "Entrar" sempre). No celular,
  o menu ganhou Favoritos e a conta, e a barra inferior mostra "Conta"
  depois do login.
- Busca, rotas e demais páginas não mudaram.

## Etapa 3 — Topo da página inicial

> Status: **aprovado** (foto pendente).

- Título "Seu próximo capítulo começa aqui.", subtítulo e as chamadas
  **Explorar imóveis** (`/temporada`) e **Conheça a Riviera**
  (`/temporada?regiao=riviera-de-sao-lourenco`, a listagem real da região;
  pode apontar para a seção da Riviera quando ela existir, na Etapa 6).
- A busca atual foi mantida e sobe sobre a borda inferior do topo; ela será
  refeita na Etapa 4.
- Sem animações.

### Foto

**Ainda não há foto.** Não recebemos uma foto da casa e a rede do ambiente
de desenvolvimento bloqueia bancos de imagem (Unsplash, Pexels, Wikimedia).
Enquanto isso o topo usa um **fundo desenhado** (petróleo e marinho com
ondas douradas finas), sem simular uma foto.

Para colocar a foto:

1. Foto horizontal com pelo menos 1600 px de largura (ideal 2400 px ou mais),
   com direito de uso.
2. `pnpm hero:photo caminho/da/foto.jpg` — gera `public/inicio/capa-*.webp`
   (960, 1600 e 2400 px, sem metadados de localização).
3. Preencher `heroPhoto` em `src/lib/home/hero-photo.ts`:
   `{ basePath: "/inicio/capa", widths: [960, 1600, 2400], alt: "…",
illustrative: true }`. `illustrative: true` mostra o aviso "Foto
   ilustrativa" (obrigatório se a casa não for um imóvel anunciado).

O modo com foto foi testado com uma imagem sintética **bem clara** (pior
caso): um véu marinho mais forte à esquerda (computador) e embaixo (celular)
mantém o texto acima do contraste mínimo — pior caso medido 5,5:1 no texto
pequeno e 5,6:1 no título — sem violações de acessibilidade e sem rolagem
lateral. A foto é carregada com prioridade (é o maior elemento da tela).

## Etapa 4 — Barra de busca

> Status: **aprovado**.

Substitui a busca da página inicial (`src/components/home/hero-search.tsx`).
Lógica pura e testada em `src/lib/search/home-search.ts`; calendário em
`src/components/search/range-calendar.tsx`.

| Campo                    | Como funciona                                                                                                                                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Onde?**                | Campo com sugestões (padrão _combobox_ acessível): filtra os 5 destinos pelo nome ou pela cidade de referência ("Bertioga" → Riviera), sem diferenciar acentos. Setas e Enter.                                                                                |
| **Check-in / Check-out** | Calendário de período: 2 meses a partir de 768 px, 1 no celular; navegação entre meses; dias passados bloqueados; período destacado (com prévia ao passar o mouse); limpar e concluir; datas em português; teclado (setas, Home/End, PageUp/PageDown, Enter). |
| **Quem?**                | Adultos (13 anos ou mais) e crianças (até 12 anos), sem negativos; criança inclui um adulto; o total vai para a busca como `hospedes`.                                                                                                                        |
| **Buscar**               | Valida e envia para `/temporada`, `/mensal` ou `/venda` com os parâmetros que as listagens já entendem (`regiao`, `chegada`, `saida`, `hospedes`, `tipo`, `preco_max`).                                                                                       |

- **Modalidades**: Temporada aceita de 1 a 29 noites e Mensal a partir de 30
  (as outras datas ficam bloqueadas no calendário). Venda troca datas e
  hóspedes por tipo e preço máximo — sem calendário de hospedagem.
- **Capacidade**: o limite de hóspedes é a maior capacidade entre os imóveis
  publicados para aluguel (consulta ao banco), até 50.
- **Painéis**: abrem ao clicar, fecham ao clicar fora, com Esc (o foco volta
  ao campo) ou em Concluir; os valores ficam guardados. No computador
  flutuam sob a barra; no celular aparecem logo abaixo do campo, sem cortes.

### Limites do sistema (não simulados)

- **Destinos**: só as 5 regiões cadastradas. Não há busca por cidade, bairro
  ou condomínio no banco; texto que não corresponde a uma região pede para
  escolher da lista.
- **Crianças**: o banco guarda apenas o **total** de hóspedes. Adultos e
  crianças são somados; a divisão não chega à listagem nem à solicitação.
- **Bebês**: não incluídos — o sistema não tem regra para bebês (se contam
  ou não na capacidade). Precisa de decisão de negócio e de mudança no banco.
- **Disponibilidade na busca**: as datas filtram os imóveis livres na
  listagem (função `search_rentals`, já existente); o calendário da busca
  não mostra datas ocupadas, pois cada imóvel tem as suas.

## Etapa 5 — Cards de imóveis e destinos

> Status: **aprovado**.

### Cartão de imóvel

`src/components/property/property-card.tsx`, usado na página inicial, em
Temporada, Mensal, Venda e Favoritos.

- Foto grande (4:3) com leve zoom ao passar o mouse; sem foto, "Fotos em
  breve" em vez de um espaço vazio.
- Localização em versalete ("Riviera de São Lourenço · Bertioga"), título em
  serifa e uma linha de informações com ícones: **quartos**, **suítes** e
  **capacidade** (venda: área no lugar da capacidade). Itens com zero não
  aparecem.
- Preço real cadastrado (por noite, por mês ou à venda) ou o total da estadia
  quando há datas, abaixo de um filete dourado.
- Mantidos: coração de favoritos, selo "Foto ilustrativa", link para a página
  do imóvel (com as datas, nas listagens) e os filtros.

### Destinos

`src/components/home/destinations.tsx`, com os textos em
`src/lib/home/destinations.ts`. Substitui a linha da costa da página inicial,
que levava às mesmas cinco listagens.

- Riviera de São Lourenço em destaque (cartão maior), depois São Sebastião,
  Ilhabela, Caraguatatuba e Ubatuba, na ordem da Rio-Santos.
- Cada cartão leva a `/temporada?regiao=…` e mostra quantos imóveis a região
  tem para temporada (contagem do banco, mesmo critério da listagem). Sem
  imóveis, mostra só "Ver imóveis", sem número.
- Os textos descrevem apenas a geografia de cada região.

**Fotos dos destinos: ainda não há.** Cada cartão usa um desenho próprio em
traços dourados (praia com o sol, enseadas, a ilha, a baía, a serra), que não
simula foto. O desenho fica acima do texto e nunca passa por trás dele. Para
colocar uma foto: `pnpm hero:photo caminho/da/foto.jpg destino-<slug>` e
preencher `photo` do destino em `src/lib/home/destinations.ts` (com
`illustrative: true` se não for de um imóvel anunciado; aparece o selo "Foto
ilustrativa").

### O que não foi inventado

Nenhum imóvel, preço, avaliação ou disponibilidade fictícios: tudo vem do
banco. Os cartões não mostram nota de avaliação porque a listagem ainda não
traz esse dado (ele aparece na página do imóvel).

## Etapa 6 — Restante da página

> Status: **aprovado**.

Ordem da página inicial: topo, busca, **Em destaque**, **Destinos**,
**A experiência Riviera**, **Atendimento personalizado** e rodapé. Nenhuma
seção nova só para ocupar espaço: "Como funciona a reserva" passou a fazer
parte do atendimento.

- **A experiência Riviera** (`src/components/home/riviera-experience.tsx`):
  faixa escura com o que vale para o bairro todo — praia extensa, comércio e
  serviços no bairro, ciclovias e áreas verdes — sem números, prêmios ou
  promessas. Chamada "Ver imóveis na Riviera" com a contagem real de imóveis
  para temporada (some quando não há).
- **Atendimento personalizado** (`src/components/home/personal-service.tsx`):
  os 3 passos da reserva (agora citando fotos e vídeos) e um quadro de
  contato com os canais reais: WhatsApp, formulário e e-mail, mencionando a
  visita a imóveis à venda, que já existe na página do imóvel.
- **Rodapé** (`src/components/site/site-footer.tsx`): filete dourado, marca
  com "Riviera · Litoral Norte", colunas **Imóveis** (com Favoritos),
  **Destinos** (as 5 regiões) e **Atendimento**; políticas e termos
  mantidos; CRECI aparece quando for preenchido. No celular, Imóveis e
  Destinos lado a lado.

### Conteúdo que depende de você

- Os textos da Riviera descrevem só a geografia e a estrutura do bairro.
  Se quiser destacar algo específico (por exemplo, a distância de São Paulo
  ou certificações da praia), envie a informação para conferirmos.
- Sem depoimentos de clientes: só entram quando houver avaliações reais
  publicadas.

## Etapa 7 — Animações e microinterações

> Status: **aprovado**.

Animações em CSS, sem biblioteca (decisão: sem GSAP). Só `transform` e
`opacity`, que não deslocam o layout (CLS medido: 0). Tudo fica desligado
para quem ativou **"reduzir movimento"** no sistema — o site aparece pronto.

| Onde                     | O quê                                                                                                                                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Topo da página inicial   | Selo, título, subtítulo, botões e busca sobem em sequência (até ~1,2 s). O título só se desloca e nunca fica transparente, para não atrasar a medição de carregamento (LCP).                              |
| Ondas do topo            | As três linhas douradas oscilam devagar (9 a 15 s), como o mar ao longe.                                                                                                                                  |
| Seções da página inicial | Títulos, cards, destinos, itens da Riviera, passos e quadro de contato surgem ao entrar na tela, **uma vez** (0,7 s). O que já está visível ao abrir a página não anima; sem JavaScript, nada se esconde. |
| Cards                    | Imóveis: zoom leve da foto e sombra (já existia). Destinos: sobem 4 px com sombra.                                                                                                                        |
| Botões                   | Leve "afundar" ao clicar em todos os botões; setas de "Ver todos os imóveis" e "Ver imóveis na Riviera" deslizam ao passar o mouse.                                                                       |
| Galeria do imóvel        | Zoom leve (3%) da foto ao passar o mouse.                                                                                                                                                                 |

- Revelação: `src/components/home/reveal-on-scroll.tsx` observa os
  elementos `.revelar` e marca quando entram na tela; a animação é CSS
  (`src/app/globals.css`). A primeira tentativa, ligada diretamente à
  rolagem, deixava texto meio transparente parado na borda da tela (o teste
  de contraste pegou) e foi trocada.
- Testes: título sempre visível, revelação chega à opacidade total ao rolar,
  sem rolagem lateral, e **nenhuma animação** com "reduzir movimento". Os
  testes de acessibilidade esperam as animações curtas terminarem antes de
  medir o contraste (`tests/e2e/support/motion.ts`).

## Etapa 8 — Auditoria e finalização

> Status: **aguardando aprovação**.

Resultados completos em `docs/publicacao.md` ("Resultado dos testes
finais"). Problemas encontrados e corrigidos:

- **Visualizador baixava uma foto grande invisível** na página do imóvel
  (celular: Lighthouse 84–86, abaixo da faixa de antes do redesign). Agora
  o conteúdo do visualizador só existe quando ele está aberto (87–95). Teste
  novo impede a volta do problema.
- **Build registrava "Falha ao carregar favoritos"** em todas as páginas: os
  `try/catch` do layout e da página inicial capturavam o sinal interno do
  Next de "página dinâmica". Agora `unstable_rethrow` repassa esses sinais e
  só falhas reais são registradas; a build sai sem avisos.

Sem problemas: rotas e páginas 404, busca e filtros, calendário e hóspedes,
favoritos, imagens, vídeos, responsividade nos 3 tamanhos, acessibilidade
(WCAG 2.1 AA), console, dependências e segredos.
