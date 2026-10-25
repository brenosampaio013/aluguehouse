# Alugue Houses — filme promocional (21,7 s, 1920 × 1080)

Apresentação audiovisual em HTML/CSS/JS com uma timeline GSAP. A versão
publicada tem 21,7 s e começa no iPhone (cena 3). A abertura com a logo e a
foto da área gourmet em tela cheia (cenas 1 e 2) saiu a pedido do cliente,
mas continua no código: `?completo=1` mostra os 30 s originais.

É independente do site: nada fora desta pasta foi
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
node tools/export.mjs                 # saida/alugue-houses.mp4 (H.264, 30 fps, 651 quadros)
node tools/export.mjs --completo      # saida/alugue-houses-30s.mp4 (com as cenas 1 e 2)
node tools/export.mjs --contact       # saida/previa/folha-de-contato.jpg (18 quadros)
node tools/export.mjs --stills=5,10   # quadros avulsos em saida/previa/
node tools/export.mjs --allow-missing # versão de teste mesmo com fotos pendentes
```

A exportação não grava a tela em tempo real: para cada quadro ela posiciona a
timeline em `i / 30` segundos e captura a imagem. Por isso o resultado tem
a duração exata e não perde quadros, mesmo numa máquina lenta. Sem todas as
fotos da campanha, o exportador recusa gerar o MP4 final.

## Fotografias

O filme usa **só fotografias reais** nas cenas de imóveis, sem ilustrações.
Cada posição tem um nome de arquivo fixo, definido em `PHOTOS` no
`script.js`. Para trocar uma foto, basta colocar outra com o mesmo nome em
`assets/fotos/campanha/`. Uma foto que falta aparece na prévia como um
quadro tracejado, e o exportador se recusa a gerar o MP4.

| Arquivo | Origem | Onde aparece |
| --- | --- | --- |
| `campanha/area-gourmet-piscina.jpg` | Cliente (`cliente/area-gourmet-piscina.webp`) | Cena 2 (tela cheia), card central da cena 4, destaque e galeria nos celulares |
| `campanha/piscina-jardim.jpg` | Recorte da foto acima (piscina, espreguiçadeiras e jardim) | Cena 6 |
| `campanha/sala-estar-jantar.jpg` | Cliente (`cliente/sala-estar-jantar.png`) | Cena 6 |
| `campanha/area-gourmet-integrada.jpg` | Cliente (`cliente/area-gourmet-integrada.webp`) | Cena 6 |
| `campanha/sala-jantar-jardim.jpg` | Cliente (`cliente/sala-jantar-jardim.png`) | Card da esquerda na cena 4 e última tomada da cena 6 |
| `imovel-01/*.jpg` | `media/recebidas/imovel-01/` (uso autorizado pelo proprietário) | Card da direita na cena 4, card do mapa na cena 5, tela de detalhes e galeria nos celulares |

- As fotos do cliente vieram com 720 a 1200 px de largura. As versões em
  `campanha/` foram ampliadas com super-resolução EDSR (OpenCV
  `dnn_superres`, modelos de [Saafke/EDSR_Tensorflow](https://github.com/Saafke/EDSR_Tensorflow),
  licença Apache 2.0): ×2 nas de 1200 px e ×3 nas de 720 px. Cores e
  enquadramento não foram alterados, exceto o recorte da piscina.
- `cliente/` guarda os originais. A foto da lavanderia enviada junto não
  entrou no filme.
- As quatro fotos do cliente parecem ser do mesmo imóvel. Por isso a cena 4
  mostra dois imóveis: a casa com área gourmet e piscina (dois cards de
  ambientes) e o Imóvel 01. A localização da casa não foi informada, então
  os cards não citam região para ela.
- Com fotos em maior resolução, ou de outros imóveis (fachada, vista para
  o mar), basta substituir os arquivos ou acrescentar posições em `PHOTOS`.

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
