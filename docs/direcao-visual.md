# Alugue Houses — Direção visual (Etapa 2)

> Status: **aprovado**. Cores e fonte de interface substituídas pelo
> redesign (`docs/redesign.md`). Prancha visual de referência:
> `docs/direcao-visual/prancha.html` (HTML estático, não faz parte do site),
> com capturas em `prancha-desktop.png` e `prancha-celular.png`.
> Toda imagem da prancha é **ilustrativa** e será substituída por fotos reais.

## 1. Conceito: "beira-mar organizada"

A Riviera de São Lourenço é conhecida pela ordem: módulos numerados, orla
limpa, jundu preservado entre a areia e as casas. O Litoral Norte segue em
linha pela Rio-Santos, praia após praia, até Ubatuba.

A direção visual traduz isso em três ideias:

1. **Calma e ordem.** Fundo branco, muito respiro, grade regular. A foto do
   imóvel é sempre a protagonista; a interface fica quieta em volta dela.
2. **Materiais do lugar.** Azul-petróleo do mar fundo, areia da faixa de
   praia, branco da espuma e da arquitetura. Nada de gradientes ou brilhos.
3. **A costa como navegação.** O único elemento ousado do site: uma
   **linha da costa** que apresenta as regiões em ordem geográfica, da
   Riviera a Ubatuba, e funciona como filtro de região na página inicial.

Facilidade de uso inspirada no Airbnb (busca em um só lugar, fotos grandes,
reserva sempre à vista), mas com identidade própria: tipografia serifada
editorial nos títulos, tons de petróleo em vez de cinza, e a linha da costa.

## 2. Logotipo provisório

- **Marca nominativa**: "Alugue Houses" em Newsreader, peso 500, com o "H"
  alinhado à mesma linha de base e espaçamento levemente fechado (−0,01em).
- **Monograma** para favicon e avatar: "AH" sobre quadrado petróleo com
  cantos de 22%.
- Versões: petróleo-abismo sobre branco, branco sobre petróleo, abismo sobre
  areia.
- É **provisório** e pode ser trocado por um logotipo definitivo sem mudar o
  restante do sistema.

## 3. Paleta

| Nome     | Hex       | Uso                                                 |
| -------- | --------- | --------------------------------------------------- |
| Abismo   | `#0D3B45` | Texto principal, títulos, rodapé                    |
| Petróleo | `#13606E` | Botões primários, links, foco, datas selecionadas   |
| Névoa    | `#DCEBEC` | Fundo de seleção (intervalo de datas, filtro ativo) |
| Areia    | `#EFE6D6` | Faixas de seção, chips, fundo do painel de reserva  |
| Junco    | `#8A7856` | Bordas de campos de formulário                      |
| Duna     | `#CDB894` | Linhas e detalhes **apenas decorativos**            |
| Rocha    | `#52666A` | Texto secundário                                    |
| Branco   | `#FFFFFF` | Fundo base                                          |
| Erro     | `#A8321F` | Mensagens de erro e validação                       |

### Contraste verificado (WCAG 2.1)

| Combinação                                    | Razão       | Resultado                                        |
| --------------------------------------------- | ----------- | ------------------------------------------------ |
| Abismo sobre branco                           | 12,15       | AAA                                              |
| Abismo sobre areia                            | 9,81        | AAA                                              |
| Petróleo sobre branco / branco sobre petróleo | 7,18        | AAA                                              |
| Petróleo sobre areia                          | 5,80        | AA                                               |
| Petróleo sobre névoa                          | 5,86        | AA                                               |
| Rocha sobre branco                            | 6,06        | AA                                               |
| Rocha sobre areia                             | 4,89        | AA                                               |
| Erro sobre branco                             | 6,69        | AA                                               |
| Junco (borda) sobre branco / areia            | 4,28 / 3,46 | ≥ 3:1 para componentes                           |
| Duna sobre branco                             | 1,93        | **Só decoração**, nunca texto ou borda funcional |

Regra: estado nunca é comunicado só por cor. Datas ocupadas têm risco
diagonal e texto riscado; erros têm ícone e mensagem.

## 4. Tipografia

| Papel             | Fonte                                                | Observação                                               |
| ----------------- | ---------------------------------------------------- | -------------------------------------------------------- |
| Títulos e marca   | **Newsreader** (Google Fonts, variável, eixo óptico) | Editorial, sereno; usado de 25 px para cima              |
| Interface e texto | **Hanken Grotesk** (Google Fonts, variável)          | Clara em telas pequenas; algarismos tabulares nos preços |

Escala (razão 1,25, base 16 px):

| Token     | Tamanho / entrelinha      | Uso                                          |
| --------- | ------------------------- | -------------------------------------------- |
| `display` | 61 / 1,02, Newsreader 400 | Título da home (desktop)                     |
| `h1`      | 39 / 1,1, Newsreader 400  | Título de página e do imóvel                 |
| `h2`      | 31 / 1,15, Newsreader 400 | Seções                                       |
| `h3`      | 20 / 1,3, Hanken 600      | Títulos de cartão e blocos                   |
| `body`    | 16 / 1,6, Hanken 400      | Texto corrido (máx. 68 caracteres por linha) |
| `small`   | 13 / 1,45, Hanken 500     | Legendas e metadados                         |

Sem rótulos em caixa alta, sem palavra destacada em cor dentro de títulos.

## 5. Espaço, forma e profundidade

- **Espaçamento**: base de 4 px — 4, 8, 12, 16, 24, 32, 48, 64, 96.
- **Grade**: 12 colunas, largura máxima de 1240 px, margem lateral de 16 px
  no celular, 24 px no tablet e 40 px no desktop.
- **Raios** com hierarquia: 8 px em botões e campos; 14 px em fotos;
  totalmente arredondado só na barra de busca e no seletor de modalidade.
- **Sombra** única, tingida de petróleo, apenas em elementos que flutuam
  (barra de busca fixa, popovers, painel de reserva fixo):
  `0 6px 24px rgb(13 59 69 / 0.12)`. Cartões de imóvel não têm sombra.
- **Foco**: contorno de 2 px petróleo com 2 px de afastamento branco,
  sempre visível na navegação por teclado.
- **Alvos de toque**: mínimo de 44 × 44 px.

## 6. Imagens

- Proporção 4:3 nos cartões; galeria do imóvel com 1 foto grande + 4 menores
  no desktop e carrossel deslizável no celular.
- Fotos reais têm prioridade. Imagens de demonstração recebem o selo visível
  "Foto ilustrativa".
- Texto alternativo obrigatório, descrevendo o ambiente ("Varanda com vista
  para o mar e redes"), nunca "imagem 1".

## 7. Layouts

### Página inicial

```
DESKTOP
┌──────────────────────────────────────────────────────────────┐
│ Alugue Houses     Temporada  Mensal  Venda      ♡  Entrar    │
├──────────────────────────────────────────────────────────────┤
│  [ foto real ampla da Riviera, 70% da altura da tela ]        │
│  Casas de alto padrão na Riviera e no Litoral Norte           │
│  ( Temporada | Mensal | Venda )                               │
│  ( Onde?        | Chegada  | Saída  | Hóspedes |  Buscar )    │
├──────────────────────────────────────────────────────────────┤
│  Da Riviera a Ubatuba                                         │
│  ●────────●──────────●─────────●───────────●                  │
│  Riviera  São Seb.   Ilhabela  Caraguá     Ubatuba            │
├──────────────────────────────────────────────────────────────┤
│  Em destaque                                                  │
│  [foto] [foto] [foto] [foto]                                  │
│  título, região, quartos · preço                              │
├──────────────────────────────────────────────────────────────┤
│  Faixa areia: como funciona a reserva (3 passos reais)        │
├──────────────────────────────────────────────────────────────┤
│  Rodapé abismo: contato, WhatsApp, responsável/CRECI, LGPD    │
└──────────────────────────────────────────────────────────────┘

CELULAR
┌────────────────────┐
│ Alugue Houses   ☰  │
│ [foto]             │
│ Título             │
│ ( Onde? Datas  🔍 )│  ← abre busca em tela cheia
│ linha da costa  →  │  ← rolagem horizontal
│ [cartão]           │
│ [cartão]           │
├────────────────────┤
│ Explorar ♡ Entrar  │  ← barra inferior fixa
└────────────────────┘
```

### Listagem (temporada, mensal, venda)

```
DESKTOP                                         CELULAR
┌─────────────────────────────┬──────────────┐  ┌────────────────┐
│ busca compacta  │ Filtros   │              │  │ busca | Filtros│
│ 24 casas na Riviera         │   MAPA       │  │ [cartão]       │
│ [card] [card]               │   (fixo)     │  │ [cartão]       │
│ [card] [card]               │              │  │   ( Mapa )     │ ← botão
└─────────────────────────────┴──────────────┘  └────────────────┘
```

### Página do imóvel

```
DESKTOP
┌──────────────────────────────────────────────────────────────┐
│ Título do imóvel                               ♡ Salvar       │
│ [ foto grande      ][foto][foto]                               │
│ [                  ][foto][foto]                               │
├──────────────────────────────────────┬───────────────────────┤
│ 4 suítes · 10 hóspedes · 180 m da praia │ ┌─ painel areia ───┐ │
│ Descrição                             │ │ R$ 1.800 / noite  │ │
│ Comodidades                           │ │ Chegada | Saída   │ │
│ Calendário                            │ │ Hóspedes          │ │
│ Mapa (área aproximada)                │ │ [Solicitar reserva]│ │
│ Avaliações                            │ │ WhatsApp          │ │
│                                       │ └──── fixo ────────┘ │
└──────────────────────────────────────┴───────────────────────┘
CELULAR: carrossel de fotos; barra inferior fixa com preço,
"Solicitar reserva" e botão de WhatsApp.
```

### Painel administrativo

Mesma paleta e tipografia, com densidade maior: menu lateral fixo
(Imóveis, Calendário, Solicitações, Tarifas, Avaliações, Contatos), tabelas
com texto à esquerda e números à direita, sem fotos grandes.

## 8. Navegação

- Cabeçalho com Temporada e Venda no desktop (Mensal fica no rodapé e na
  listagem de temporada; ver `docs/redesign.md`).
- No celular, barra inferior com **Explorar**, **Favoritos** e **Entrar**.
- WhatsApp no cabeçalho, no rodapé e no painel de reserva do imóvel. Sem
  botão flutuante cobrindo conteúdo.
- Busca única com seletor de modalidade. Para **Venda**, os campos mudam
  para Região, Tipo e Faixa de preço.
- Alinhamento à esquerda em todo texto corrido; centralização só no
  bloco de busca.

## 9. Movimento

- Um único momento orquestrado na home: a linha da costa se desenha ao
  entrar na tela.
- Transições apenas em resposta a ações (abrir filtro, selecionar data,
  salvar favorito).
- `prefers-reduced-motion` desativa toda animação não essencial.
- O efeito de scroll storytelling fica para a etapa da experiência imersiva.

## 10. Microtexto

Voz direta, educada e sem exageros. Exemplos:

- Botão: "Solicitar reserva" → confirmação "Solicitação enviada. Você
  receberá a resposta por e-mail ou WhatsApp."
- Datas ocupadas: "Indisponível".
- Estado vazio: "Nenhuma casa com esses filtros. Tente outras datas ou remova
  um filtro."

## 11. Pendências desta etapa

- [x] Lista e ordem das regiões da linha da costa → **aprovadas**.
- [ ] Receber as fotos reais (com autorização de uso) para a home e os imóveis.
