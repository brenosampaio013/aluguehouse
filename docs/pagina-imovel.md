# Alugue Houses — Página do imóvel e mapa (Etapa 10)

> Status: **aprovado**.

## Página `/imoveis/[slug]`

Só imóveis publicados; rascunhos, arquivados e endereços inexistentes mostram
"Página não encontrada" (404).

- **Galeria**: desktop com 1 foto grande e até 4 menores; celular com
  carrossel deslizável (acessível pelo teclado); "Ver todas as fotos" abre uma
  janela com todas (Esc fecha). Fotos ilustrativas mostram o aviso.
- **Informações**: tipo e local, características (quartos, suítes,
  banheiros, hóspedes, vagas, área, distância da praia), descrição,
  comodidades, horários e regras.
- **Painel de valores**: preço de cada modalidade oferecida, com notas
  (mínimo de noites; condomínio e IPTU na venda).
- **Datas vindas da busca** (`?chegada=…&saida=…&hospedes=…`): confere se
  estão livres e mostra o total estimado detalhado (diárias, taxas, caução
  fora do total). Datas ocupadas, abaixo do mínimo ou acima da capacidade
  geram uma explicação.
- **WhatsApp** com mensagem preenchida (nome do imóvel, link e datas). Para
  imóvel só de venda, o botão é "Agendar visita pelo WhatsApp".
- **Celular**: barra fixa com o preço principal e o WhatsApp, no lugar da
  barra de atalhos.
- O pedido de reserva pelo site entrou na Etapa 11 (veja `docs/reserva.md`).

## Mapa

- **MapLibre 6.11.2 + OpenFreeMap** (estilo "positron"): gratuito, sem
  chave, permite uso comercial. O estilo é configurável por
  `NEXT_PUBLIC_MAP_STYLE_URL`, para trocar por mapas próprios no futuro.
- Mostra um **círculo de ~600 m** sobre a localização aproximada, nunca um
  ponto exato.
- O código do mapa só é baixado quando o mapa chega perto da tela.
- Gestos cooperativos: a rolagem da página não fica presa no mapa
  (Ctrl/⌘ + rolagem para aproximar; dois dedos no celular).
- **Listagens** (`/temporada`, `/mensal`, `/venda`): mapa fixo ao lado da
  lista a partir de 1024 px; abaixo disso, o botão "Ver mapa" alterna entre
  lista e mapa. Tocar numa área abre o link do imóvel.
- O worker do MapLibre 6 é publicado em `public/vendor/maplibre-gl-<versão>/`
  pelo script `scripts/copy-maplibre-worker.mjs`, que roda no `dev` e no
  `build`.

## Privacidade da localização

Teste de ponta a ponta confirma que o HTML da página, inclusive os dados
embutidos para o navegador, **não contém a coordenada exata nem o
endereço** cadastrados no painel, apenas a coordenada aproximada.

## Verificação

| Teste                                               | Resultado                                                  |
| --------------------------------------------------- | ---------------------------------------------------------- |
| Testes de ponta a ponta (desktop, tablet e celular) | 154 passando, 8 ignorados (específicos de outro tamanho)   |
| Testes unitários (inclui geometria do círculo)      | 49 de 49                                                   |
| Testes do banco                                     | 122 de 122                                                 |
| Runtime local do Cloudflare                         | Página do imóvel, 404, listagens e worker do mapa servidos |

**Não verificado visualmente**: a política de rede deste ambiente bloqueia
`tiles.openfreemap.org`, então os testes usam um estilo mínimo servido pelo
próprio teste. Eles confirmam que o mapa carrega, cria o círculo e fica
pronto; a aparência dos mapas reais precisa ser conferida no seu navegador.

## Correções feitas nesta etapa

- O worker do MapLibre 6 não era publicado pelo empacotador (erro 404 e mapa
  quebrado). Resolvido com a cópia para `public/vendor/`.
- O carrossel de fotos do celular não era alcançável pelo teclado (violação
  WCAG encontrada pelo axe). Corrigido.

## Pendências

- **Vídeos e tours**: o banco aceita, mas o painel e o site ainda não. O
  documento do painel indicava "Etapa 9" por engano; precisa de uma etapa
  definida.
- Favoritar imóvel: Etapa 13.
