# Alugue Houses — Página inicial (Etapa 7)

> Status: **aguardando aprovação**.

## Estrutura

1. **Cabeçalho**: modalidades sempre visíveis no desktop; no celular, menu
   (fecha com Esc e devolve o foco) e barra inferior fixa com Explorar,
   Favoritos e Entrar.
2. **Topo**: título, frase de apoio e busca. Seletor Temporada / Mensal /
   Venda; em Venda os campos viram região, tipo e preço máximo. No celular a
   busca abre ao tocar em "Onde e quando?". A busca avisa quando as datas não
   combinam com a modalidade (temporada até 29 noites, mensal a partir de 30).
3. **Linha da costa**: as 5 regiões aprovadas, em ordem geográfica. A linha se
   desenha ao entrar na tela; sem suporte do navegador ou com movimento
   reduzido, aparece pronta.
4. **Em destaque**: até 6 imóveis publicados, com foto de capa, local,
   características e preço. O aviso "Foto ilustrativa" aparece quando a foto
   foi marcada como demonstração. Sem imóveis publicados, a seção não aparece.
5. **Como funciona a reserva**: 3 passos do processo real, mais WhatsApp.
6. **Rodapé**: descrição, modalidades, WhatsApp e e-mail. O responsável e o
   CRECI aparecem quando forem preenchidos em `src/lib/site-config.ts`.

## Decisões

- **Topo sem foto**: não há foto real da Riviera. Em vez de usar imagem de
  banco, o topo é gráfico (mar em petróleo e faixa de areia). Quando houver
  uma foto real em alta resolução (2400 px ou mais), ela entra no lugar.
- **Página gerada a cada visita** (`connection()`), para os destaques
  refletirem o que está publicado. Cache com revalidação fica para a etapa de
  otimização.
- **Fontes só com o conjunto latino básico**, que já cobre acentos e cedilha.
  Reduziu o tempo de carregamento do título no celular.

## Problema encontrado e corrigido

Um arquivo `src/app/page.tsx` da Etapa 3 nunca tinha sido removido e
respondia por `/` no lugar de `src/app/(site)/page.tsx`. Por isso a página
ficava estática e com cache de um ano. Removido; confirmado que um imóvel
publicado aparece na hora e some ao ser removido.

## Verificação

| Teste                                               | Resultado                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------- |
| Testes de ponta a ponta (desktop, tablet e celular) | 71 passando, 4 ignorados (específicos de outro tamanho)                         |
| Testes unitários                                    | 35 de 35                                                                        |
| Testes do banco                                     | 91 de 91                                                                        |
| Lighthouse desktop                                  | Desempenho 100, Acessibilidade 100, Boas práticas 96, SEO 100                   |
| Lighthouse celular                                  | Desempenho 94–98 (LCP 2,4–2,9 s), Acessibilidade 100, Boas práticas 96, SEO 100 |
| Build Cloudflare                                    | OK                                                                              |

"Boas práticas 96" se deve a erros 404 no console ao pré-carregar
`/temporada`, `/mensal`, `/venda`, `/favoritos` e `/imoveis/...`, páginas das
próximas etapas.

## Pendências

- Foto real da Riviera em alta resolução para o topo.
- Links da busca, do menu, dos cartões e de Favoritos levam a páginas das
  Etapas 8 a 13 e, até lá, mostram "Página não encontrada".
- Como imóveis se ligam às regiões da linha da costa (cidade e bairro) será
  definido na Etapa 8, junto com os filtros.
