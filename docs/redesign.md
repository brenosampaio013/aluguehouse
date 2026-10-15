# Alugue Houses — Redesign de alto padrão

Redesign conduzido em etapas, cada uma aprovada antes da seguinte. Substitui
a direção visual original (`docs/direcao-visual.md`) nas cores e na fonte de
interface; o restante daquele documento continua valendo.

## Etapa 2 — Identidade visual e cabeçalho

> Status: **aguardando aprovação**.

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
