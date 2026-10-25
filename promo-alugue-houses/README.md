# Alugue Houses — filme promocional (30 s, 1920 × 1080)

Apresentação audiovisual em HTML/CSS/JS com uma timeline GSAP de exatamente
30 segundos e 8 cenas. É independente do site: nada fora desta pasta foi
alterado.

| Arquivo | Conteúdo |
| --- | --- |
| `index.html` | Palco 1920 × 1080, as 8 cenas e as telas do aplicativo (`<template>`) |
| `styles.css` | Identidade visual, iPhone em CSS 3D, interfaces, efeitos |
| `script.js` | Timeline mestre GSAP, mapa de fotos, partículas, pontos de sincronia, modo de exportação |
| `tools/export.mjs` | Exportação quadro a quadro (Playwright + FFmpeg) |
| `assets/` | Logo, fotos, fontes, GSAP e trilha (opcional) |

## Ver a prévia

Qualquer servidor estático na pasta, por exemplo:

```bash
cd promo-alugue-houses
python3 -m http.server 8080      # http://localhost:8080
```

O filme começa sozinho. Os controles discretos (aparecem ao passar o mouse
na parte de baixo) reiniciam, pausam e percorrem a timeline; a barra de
espaço também pausa. Com `?render=1` os controles somem e a timeline fica
parada para a exportação.

## Exportar o MP4

Requisitos: Node 22, Playwright com Chromium e FFmpeg.

```bash
node tools/export.mjs                 # saida/alugue-houses-30s.mp4 (H.264, 30 fps, 900 quadros)
node tools/export.mjs --contact       # saida/previa/folha-de-contato.jpg (18 quadros)
node tools/export.mjs --stills=5,10   # quadros avulsos em saida/previa/
node tools/export.mjs --allow-missing # versão de teste mesmo com fotos pendentes
```

A exportação não grava a tela em tempo real: para cada quadro ela posiciona a
timeline em `i / 30` segundos e captura a imagem. Por isso o resultado tem
exatamente 30 s e não perde quadros, mesmo numa máquina lenta. Sem todas as
fotos da campanha, o exportador recusa gerar o MP4 final.

## Fotografias

O filme usa **só fotografias** nas cenas de imóveis. Ilustrações vetoriais
não são usadas no lugar das fotos. Cada posição tem um nome de arquivo fixo,
definido em `PHOTOS` no `script.js`. Para trocar uma foto, basta colocar
outra com o mesmo nome. Uma foto que falta aparece na prévia como um quadro
tracejado com o texto "foto pendente: nome-do-arquivo".

### Fotos reais já incluídas

`assets/fotos/imovel-01/`: cópias de `media/recebidas/imovel-01/` (Imóvel 01,
fotos reais com uso autorizado pelo proprietário). Aparecem na tela de
detalhes do celular e no card do mapa (cena 5).

### Fotos da campanha (pendentes)

Coloque em `assets/fotos/campanha/` (JPG, mínimo 1920 px de largura,
idealmente 2400 px ou mais, paisagem 16:9 ou 3:2):

| Arquivo | Cena | O que mostrar |
| --- | --- | --- |
| `mansao-piscina-infinita.jpg` | 2 (tela cheia) | Mansão contemporânea, piscina de borda infinita, vista para o mar. A fachada perto do centro, porque a câmera aproxima dela |
| `casa-vista-mar.jpg` | 3, 4, 7 | Casa contemporânea com piscina e vista para o mar |
| `mansao-area-gourmet.jpg` | 4, 7 | Mansão de alto padrão com área gourmet |
| `casa-praia-vegetacao.jpg` | 4, 7 | Casa de praia cercada por vegetação tropical |
| `piscina-entardecer.jpg` | 6 | Piscina iluminada ao entardecer |
| `sala-contemporanea.jpg` | 6 | Sala com arquitetura contemporânea, luz natural |
| `varanda-vista-mar.jpg` | 6 | Varanda com vista para o oceano |
| `area-gourmet.jpg` | 6 | Área gourmet preparada para receber a família |
| `fachada-jardim-tropical.jpg` | 6 | Fachada sofisticada com jardim tropical |

As 9 posições são fotos diferentes: nenhuma imagem se repete entre cenas
distintas. As fotos dos cards aparecem também dentro das telas do celular,
como num aplicativo de verdade.

Fontes aceitas, em ordem de preferência:

1. Fotos dos imóveis da própria Alugue Houses, com autorização do proprietário.
2. Bancos com licença comercial gratuita: [Unsplash](https://unsplash.com/license)
   e [Pexels](https://www.pexels.com/license/). Use fotos que retratem casas
   genéricas, sem marcas ou pessoas identificáveis.
3. Imagens fotorrealistas geradas para a campanha.

Registre cada foto na tabela abaixo (autor, link, licença). Como o filme
apresenta imóveis que não são necessariamente do catálogo, o quadro final
traz a nota "Imagens e informações ilustrativas".

| Arquivo | Autor | Origem | Licença |
| --- | --- | --- | --- |
| `imovel-01/*.jpg` | Proprietário do Imóvel 01 | `media/recebidas/imovel-01/` | Uso autorizado pelo proprietário |
| `campanha/mansao-area-gourmet.jpg` | Cliente Alugue Houses | `cliente/area-gourmet-piscina.webp` (enviada pelo cliente) | Fornecida pelo cliente para a campanha |
| `campanha/area-gourmet.jpg` | Cliente Alugue Houses | `cliente/area-gourmet-integrada.webp` (enviada pelo cliente) | Fornecida pelo cliente para a campanha |
| `campanha/sala-contemporanea.jpg` | Cliente Alugue Houses | `cliente/sala-jantar-jardim.png` (enviada pelo cliente) | Fornecida pelo cliente para a campanha |
| *(demais fotos da campanha)* | — | — | — |

`assets/fotos/cliente/` guarda os originais enviados. As versões em
`campanha/` foram ampliadas para 2400 px (Lanczos com nitidez leve), sem
outro tratamento. `sala-estar-jantar.png` fica de reserva. A foto da
lavanderia enviada junto não entrou no filme.

## Conteúdo e fidelidade ao produto

- As telas reproduzem funções que o site já tem: busca por destino, datas e
  hóspedes; modalidades Temporada, Mensal e Venda; filtros de comodidades
  (`Piscina`, `Vista para o mar`, `Pé na areia`, que existem em
  `src/lib/amenities.ts`); mapa; favoritos; reserva **por solicitação**
  ("Solicitar reserva"). O filme não promete reserva instantânea nem
  pagamento on-line.
- "Alto padrão" não é um filtro do site, por isso foi trocado por
  "Pé na areia".
- Sem preços, avaliações, depoimentos, disponibilidade ou métricas. Os cards
  mostram comodidades em vez de valores.
- Imóvel 01: quartos e hóspedes vêm do cadastro de demonstração
  (`scripts/demo-seed.mjs`).
- O site ainda não tem domínio próprio (`docs/publicacao.md`), então o
  encerramento não mostra endereço. Quando houver, acrescente-o em `#s8`.

## Trilha e sincronia

Sem áudio, o filme funciona normalmente. Para incluir uma trilha (licenciada
ou original), salve-a como `assets/audio/trilha.mp3` ou `trilha.wav`. A
prévia toca a trilha junto da timeline e o exportador a coloca no MP4, com
fade-out no último 1,5 s.

Pontos de sincronia para impactos sonoros: `CUES` em `script.js` (o
exportador também os grava em `saida/pontos-de-sincronia.json`). Os
principais: 1,25 s logo · 8,0 s iPhone · 11,4 s zoom na tela · 12,8 s cards ·
18,5 s clique no mapa · 20,0 s montagem · 24,2 s celulares · 27,5 s logo final ·
28,9 s brilho.

## Roteiro técnico

| Tempo | Cena | Destaques da animação |
| --- | --- | --- |
| 0–4 s | Marca | Volume de luz azul-petróleo, raios, reflexos, halo; logo surge em profundidade (z, rotationX, blur), brilho mascarado pela própria logo, frase letra a letra |
| 4–8 s | Desejo | Foto em tela cheia: zoom lento, deriva lateral, luz que cresce, título palavra a palavra; zoom em direção à fachada com blur |
| 8–12 s | Plataforma | iPhone em CSS 3D gira até ficar de frente; interface real em HTML entra em camadas; destino "digitado"; câmera mergulha na tela |
| 12–16 s | Imóveis | Celular com a galeria; três cards saem da tela em leque 3D e se alinham |
| 16–20 s | Reserva | Mapa da costa (Riviera a Ubatuba) com linha desenhada e marcadores; painel de busca com campos e filtros em sequência; cursor seleciona o Imóvel 01 |
| 20–24 s | Experiência | Montagem de 5 fotos com blur direcional, máscaras de revelação e zoom lento; títulos em duas etapas |
| 24–27 s | Produto | Três celulares em leque (busca, galeria, detalhes), luz que se expande, reflexos |
| 27–30 s | Encerramento | Celulares somem em profundidade; logo, tagline, chamada e brilho final; o último quadro fica limpo |

## Licenças de terceiros

- GSAP 3.15 (incl. SplitText e CustomEase), "Standard no-charge license":
  <https://gsap.com/standard-license>. Uso comercial gratuito.
- Newsreader e Manrope: SIL Open Font License 1.1 (`assets/fonts/LICENSE-*.txt`).
- Logo Alugue Houses: arquivo fornecido pelo cliente
  (`assets/logo/alugue-houses-original.jpg`). `alugue-houses.png` é a mesma
  arte com o fundo branco removido, sem redesenho, na cor original (#09333C).
