# Alugue Houses — Vídeos dos imóveis

Implementação em partes, cada uma aprovada antes da seguinte:

| Parte | O quê                                              | Status                              |
| ----- | -------------------------------------------------- | ----------------------------------- |
| A + C | Banco de dados e **upload de arquivo** no painel   | Concluído                           |
| B     | Links do YouTube e do Vimeo no painel              | **Descartado** (decisão do cliente) |
| D     | Galeria e visualizador na página pública do imóvel | Concluído                           |
| E     | Revisão final e testes completos                   | Concluído                           |

## Na página do imóvel (parte D)

- **Galeria (computador e tablet)**: o último quadro do mosaico vira a
  miniatura do primeiro vídeo — foto do quadro, botão de play e o selo
  "Vídeo · 0:42" (com "+1", "+2"… quando há mais vídeos).
- **Celular**: o vídeo é o 2º item do carrossel de fotos.
- **Botão "Vídeos (n)"** ao lado de "Ver todas as fotos".
- **Visualizador em tela cheia** (fotos e vídeos juntos; clicar numa foto
  também abre): contador ("Vídeo 1 de 2"), setas, teclado (← →), deslizar
  no celular, faixa de miniaturas com o ícone de play nos vídeos, título e
  duração do vídeo, Esc ou ✕ para fechar e voltar à galeria.
- **Carregamento sob demanda**: abrir a página ou o visualizador não baixa
  nenhum vídeo — só a miniatura. O player é criado quando o visitante clica
  em reproduzir e removido ao trocar de item ou fechar (o vídeo para).
  **Nada toca sozinho**; o som só existe depois do clique do visitante.
- O player respeita a proporção do vídeo (vertical ou horizontal), sem
  distorcer e sem passar da altura da tela.
- Anúncios sem vídeos ficam exatamente como antes. A janela "Ver todas as
  fotos" continua só com as fotos.

## Como cadastrar um vídeo (painel)

1. Painel → Imóveis → abra o imóvel → seção **Vídeos do imóvel**.
2. Escolha o arquivo (**MP4 com H.264** ou **WebM**, até 50 MB).
3. Confira a **prévia** e a **miniatura** geradas na hora (nada foi salvo
   ainda). Se quiser, escreva um título ou legenda.
4. **Salvar vídeo**: o envio mostra o progresso; depois o servidor confere o
   arquivo e o vídeo aparece na lista.
5. Na lista: editar o título, **Mover para cima/baixo** (ordem da galeria) e
   **Remover** (apaga o registro e os arquivos).

Dicas: vídeos curtos e horizontais (arquitetura, piscina, paisagismo,
ambientes). Vídeos `.MOV` do iPhone costumam estar em HEVC, que não toca no
Chrome: exporte como MP4 (H.264) — no iPhone, Ajustes → Câmera → Formatos →
"Mais compatível", ou converta no computador. Se o navegador não conseguir
abrir o vídeo na prévia, o painel avisa e não deixa salvar.

## Como funciona

- **Banco**: os vídeos ficam na tabela `property_media` (a mesma das fotos),
  com `kind = 'video'`. Campos novos, todos opcionais e só para vídeos:
  `video_source` (sempre `file`), `video_ref`,
  `caption`, `poster_path` e `duration_seconds`. `storage_path` guarda o
  caminho do arquivo; `width`/`height` a proporção (o player não distorce).
  Fotos e vídeos têm ordens separadas.
- **Arquivos**: o vídeo vai para o bucket **`property-videos`** do Supabase
  Storage (leitura pública pela URL, como as fotos) e a miniatura WebP para o
  bucket de fotos. **O banco guarda só os caminhos**, nunca o arquivo.
- **Envio**: o servidor confere que é o admin (com MFA), o formato, o tamanho
  e o limite de vídeos, e devolve URLs de envio **assinadas para caminhos
  definidos por ele**. O navegador envia direto ao Storage (o site não
  recebe o arquivo).
- **Conferência no servidor** antes de registrar: arquivo e miniatura
  existem, tamanho dentro do limite e **tipo real pelos primeiros bytes**
  (assinatura MP4/WebM, não a extensão). Se algo falhar, os arquivos são
  apagados e nada é gravado.

## Revisão final (parte E)

Feita sobre o upload (partes A + C). Problemas encontrados e corrigidos:

- **Backup sem vídeos**: o backup diário só copiava o bucket de fotos.
  Agora inclui `property-videos` (e restaura backups antigos, sem ele).
- **Registro repetido apagava o vídeo**: se o registro fosse chamado duas
  vezes (nova tentativa da rede), a segunda chamada apagava os arquivos do
  vídeo já salvo. Agora a repetição é inofensiva.
- **Conferência do tipo**: lê só os primeiros bytes e interrompe a conexão
  (no máximo 10 s), mesmo que o Storage ignore o pedido parcial — nunca
  carrega o vídeo inteiro na memória do servidor.
- **Envio interrompido**: se a conexão cai no meio, a miniatura e o vídeo
  parcial são apagados.
- **iPhone**: o Safari só carrega quadros após um "play"; a leitura da
  prévia agora dá um play sem som, fora da tela, e pausa. **Não foi possível
  testar num iPhone real aqui** — confira enviando um vídeo pelo celular.

Os vídeos entram só por upload de arquivo: links do YouTube/Vimeo (parte B)
foram descartados.

## Segurança

- Só o administrador com verificação em duas etapas envia, edita ou remove
  (políticas RLS do banco e do Storage, além da checagem nas ações do
  servidor). Visitantes e hóspedes não conseguem gravar no bucket.
- O bucket só aceita `video/mp4` e `video/webm`, até 50 MB, e só no caminho
  `<imóvel>/<mídia>/video.mp4|webm`.
- Regras no banco: vídeo enviado precisa de arquivo e miniatura; foto não
  aceita campos de vídeo;
  **no máximo 20 vídeos por imóvel**.
- Política de segurança (CSP): `media-src` liberado só para o próprio site,
  o Supabase e `blob:` (prévia local no painel).

## Configuração

| Variável (servidor)      | Padrão | O que faz                             |
| ------------------------ | ------ | ------------------------------------- |
| `VIDEO_MAX_UPLOAD_MB`    | 50     | Tamanho máximo de cada vídeo          |
| `VIDEO_MAX_PER_PROPERTY` | 6      | Vídeos por imóvel (máximo aceito: 20) |

**Para subir o limite de tamanho**, mude também o limite do bucket (o mais
baixo dos dois vale): no Supabase, Storage → `property-videos` → Edit bucket
→ "Restrict file size". O **plano gratuito aceita no máximo 50 MB por
arquivo**; no Pro, o limite global é configurável.

**Custos**: cada reprodução de um vídeo enviado conta no tráfego de saída do
Supabase (o plano gratuito tem cota mensal pequena). Para vídeos longos ou
muito acessados, considere reduzir a resolução e a duração antes de enviar,
para economizar o seu
tráfego.

**Sem conversão de vídeo**: não há serviço de conversão; o vídeo é exibido
como foi enviado. Por isso a orientação de MP4 (H.264).

**Links do YouTube/Vimeo não são usados.** A migração já previa esses
valores em `video_source` (e a coluna `video_ref`), mas nada no site os grava
nem os exibe: o painel só envia arquivos e a página só mostra vídeos com
`video_source = 'file'`. Ficam sem uso; removê-los exigiria outra migração
sem ganho prático.

## Migração do banco

Arquivo: `supabase/migrations/20261015120000_property_videos.sql`. Só
acrescenta colunas, regras, o bucket e as políticas — **não altera nem apaga
dados**. As regras novas valem para o que for gravado a partir dela.

- **Produção**: o fluxo de publicação já aplica as migrações
  (`docs/publicacao.md`). Manualmente: `pnpm exec supabase link` (uma vez) e
  `pnpm exec supabase db push`.
- **Local**: `pnpm exec supabase migration up` (mantém os dados) e depois
  `pnpm db:types`.

## Testes

- **Backup**: os dados de exemplo do teste de restauração
  (`scripts/backup/roundtrip-test.sh`, roda no CI) incluem um vídeo.
- **Banco (pgTAP)** `supabase/tests/database/14_videos.test.sql`: bucket,
  regras dos campos, teto de 20 vídeos e permissões.
- **Unitários** `tests/unit/videos.test.ts`: formatos, extensão, tamanho,
  tipo real pelo conteúdo (MP4, WebM, QuickTime e HTML disfarçado),
  duração; `tests/unit/env.test.ts`: limites configuráveis.
- **Ponta a ponta** `tests/e2e/admin-videos.spec.ts` (computador, tablet e
  celular):
  - enviar MP4 com título e WebM vertical; prévia e miniatura antes de
    salvar; arquivo e miniatura conferidos no Storage;
  - recarregar e continuar tudo associado ao imóvel certo;
  - reordenar, editar o título e remover (some do banco e do Storage);
  - formato não aceito e arquivo falso recusados no navegador; envio
    adulterado (HTML no lugar do vídeo) recusado **pelo servidor**, sem
    sobrar arquivo;
  - envio interrompido sem sobras; registro repetido sem apagar o vídeo;
  - limite de vídeos por imóvel; visitante não envia ao bucket;
  - acessibilidade (WCAG 2.1 AA) e sem rolagem lateral.
- **Página pública** `tests/e2e/galeria-videos.spec.ts` (3 tamanhos):
  - miniatura com play e selo; no celular, 2º item do carrossel;
  - **nenhum arquivo de vídeo pedido** ao abrir a página nem o
    visualizador — só depois do clique em reproduzir;
  - o vídeo toca de fato (o tempo avança), na proporção certa;
  - trocar de item para o vídeo; setas, teclado, miniaturas, deslizar
    (celular), Esc e ✕;
  - "Vídeos (n)", fotos ampliadas no mesmo visualizador e "Ver todas as
    fotos" inalterado;
  - anúncio sem vídeos igual ao de antes;
  - acessibilidade com o visualizador aberto e sem rolagem lateral.

O Chromium dos testes é a versão aberta, sem H.264; por isso o MP4 de teste
(`tests/e2e/fixtures/`) usa VP9 dentro do contêiner MP4. Chrome, Edge,
Safari e Firefox tocam MP4 com H.264.
