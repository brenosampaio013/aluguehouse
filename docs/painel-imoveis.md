# Alugue Houses — Cadastro de imóveis no painel (Etapa 6)

> Status: **aprovado**.

## O que o painel faz

| Tela                  | Função                                               |
| --------------------- | ---------------------------------------------------- |
| `/admin/imoveis`      | Lista com situação, modalidades e última atualização |
| `/admin/imoveis/novo` | Cria um rascunho com título, tipo e cidade           |
| `/admin/imoveis/[id]` | Edição completa, dividida em seções                  |

Seções da edição:

- **Publicação**: lista do que falta (modalidade, preço de cada modalidade,
  ao menos uma foto). Publicar, despublicar, arquivar e restaurar.
- **Dados gerais**: anúncio, endereço na web (slug), modalidades, preços,
  noites mínimas e máximas, características, horários e regras.
- **Fotos**: cada foto vira 3 versões WebP (640, 1280 e 1920 px) no navegador
  do admin antes do envio. A recodificação descarta metadados, inclusive GPS.
  Texto alternativo obrigatório, ordem, capa (a primeira foto vira capa) e
  marcação "foto ilustrativa". Excluir a foto remove também os arquivos.
- **Comodidades**: escolha na lista de referência.
- **Tarifas sazonais**: nome, primeiro e último dia, diária e mínimo de
  noites. Sobreposição é recusada pelo banco.
- **Taxas**: valor fixo, por noite, por hóspede por noite ou percentual;
  temporada, mensal ou ambos; caução marcada como reembolsável.
- **Localização privada**: endereço e coordenada exata (só no painel). A
  coordenada pública aproximada é calculada pelo banco e mostrada na tela.

Valores aceitam o formato brasileiro: `1.800,50`, `2.000` ou `1800`.

## Segurança

Todas as ações passam por `requireAdmin()` (admin com MFA) e usam a sessão
do próprio admin, sujeita às políticas RLS. A chave `service_role` não é
usada no painel. O envio de fotos vai do navegador direto para o Storage,
autorizado pela mesma política de admin.

## Problemas encontrados e corrigidos durante os testes

1. **Formulário perdia o que foi digitado após erro de validação.** O React 19
   reinicia o formulário ao concluir a ação. Todos os formulários do painel
   agora mantêm os valores; os de "adicionar" só limpam após salvar.
2. **Página alargava no celular depois de cadastrar uma taxa ou tarifa.** Os
   textos para leitores de tela dos botões "Remover" escapavam da área de
   rolagem da tabela. Corrigido.
3. **A verificação de rolagem horizontal não detectava o problema no
   celular** (inclusive o teste da Etapa 3), porque o navegador amplia a área
   de layout. Agora compara com a largura real da tela.

## Verificação

| Teste                                               | Resultado                                                       |
| --------------------------------------------------- | --------------------------------------------------------------- |
| Testes de ponta a ponta (desktop, tablet e celular) | 50 de 50, 1 ignorado (teclado no celular)                       |
| Fluxo do cadastro repetido 2 vezes nos 3 tamanhos   | 12 de 12                                                        |
| Testes unitários                                    | 35 de 35                                                        |
| Testes do banco                                     | 91 de 91                                                        |
| Build Cloudflare                                    | OK, worker com ~2,8 MB comprimido (limite do plano pago: 10 MB) |

O teste de ponta a ponta cria um imóvel, valida erros, envia a foto real
`media/recebidas/imovel-01/sala-jantar.jpg`, adiciona tarifa (e confirma a
recusa de sobreposição), taxa, comodidades e localização, publica, confere
pelo acesso de visitante que o imóvel aparece e os dados privados não,
arquiva, exclui a foto e confirma que o arquivo saiu do Storage.

## Fora desta etapa

- Vídeos e tours: o banco já aceita, mas o painel e o site ainda não. Etapa a definir (veja docs/pagina-imovel.md).
- Escolher a localização num mapa: junto com o mapa público.
- Excluir imóvel definitivamente: não implementado; use "Arquivar".
