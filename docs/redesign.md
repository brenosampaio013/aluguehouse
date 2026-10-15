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

> Status: **aguardando aprovação**.

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
