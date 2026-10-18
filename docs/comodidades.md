# Alugue Houses — Comodidades

> Status: **em revisão**.

## Visão geral

- **140 comodidades em 12 categorias**: Geral e conforto, Cozinha, Banheiro, Quarto e lavanderia, Lazer, Áreas externas, Estacionamento, Tecnologia, Segurança, Bebês e crianças, Sustentabilidade, Serviços e acessibilidade.
- **Ícone próprio para cada uma**: nenhuma repete ícone.
- **Painel**: seleção com busca, filtro por categoria e "só as marcadas", na criação (opcional) e na edição do imóvel.
- **Página pública**: seção "O que este lugar oferece".

## Onde está cada parte

| Parte                                                                           | Arquivo                                                                     |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Catálogo (slug, nome, categoria, sinônimos, destaque)                           | `src/lib/amenities.ts`                                                      |
| Ícones: mapa slug → ícone e componente `<AmenityIcon name="wi-fi" size={24} />` | `src/components/amenities/amenity-icon.tsx`                                 |
| Ícones próprios (55), no padrão da Lucide                                       | `src/components/amenities/custom-icons.ts`                                  |
| Seleção no painel                                                               | `src/components/admin/amenities-picker.tsx`                                 |
| Seção pública e diálogo "Mostrar todas"                                         | `src/components/property/amenities-section.tsx`, `all-amenities-dialog.tsx` |
| Banco                                                                           | `supabase/migrations/20261018120000_amenities_catalog.sql`                  |

## Identificadores

- **O slug é o identificador.** Ex.: `wi-fi`, `berco`, `estacionamento-gratuito-rua`. Ele é gravado no banco e nunca muda; trocar o nome exibido não afeta os imóveis já cadastrados.
- **As 15 comodidades antigas** continuam com o mesmo slug, id e nome.
- **Descrições com o mesmo significado** usam um único slug; os outros nomes viram sinônimos de busca no painel:

  | Descrição        | Slug usado         |
  | ---------------- | ------------------ |
  | "porteiro"       | `portaria-24h`     |
  | "cozinha"        | `cozinha-equipada` |
  | "pátio"          | `varanda`          |
  | "roupas de cama" | `roupa-de-cama`    |
  | "estacionamento" | `estacionamento`   |

- **Nova comodidade**:
  1. Acrescente o item em `src/lib/amenities.ts` e o ícone em `amenity-icon.tsx`.
  2. Crie uma migration nova com `insert ... on conflict (slug) do nothing`.

  Os testes conferem que o catálogo do código, as migrations e o banco têm os mesmos slugs e nomes, e que todo slug tem ícone próprio.

## Ícones

- **Fonte**: Lucide (licença ISC, uso comercial permitido) e 55 desenhos próprios para o que ela não cobre. Exemplos: bidê, berço, cadeirão, churrasqueira, fogão, secador, cabide, rede, varanda, painel solar, elevador.
- **Padrão de desenho**: grade 24×24, `stroke="currentColor"`, traço 1,75, pontas e junções arredondadas, sem preenchimento nem sombra. Funciona em 16, 20, 24 e 32 px e em fundo claro ou escuro (segue a cor do texto).
- **Acessibilidade**: decorativo por padrão (`aria-hidden`); com `aria-label`, vira imagem com nome. Slug desconhecido mostra um ícone genérico, sem quebrar a página.

## Banco de dados

- **Estrutura**: mantida a que já existia, normalizada: `amenities` (catálogo) e `property_amenities` (imóvel ↔ comodidade, chave primária dupla). Isso garante integridade referencial e impede duplicatas.
- **Por que não um array no imóvel**: a busca, as políticas RLS e o portal do proprietário já usam essa tabela.
- **Função nova `public.set_property_amenities(imóvel, slugs[])`**:
  - grava a lista numa transação só: ou tudo, ou nada;
  - ignora slugs repetidos;
  - recusa slug fora do catálogo (`unknown_amenity`) sem mexer no que estava salvo;
  - roda como quem chama (`security invoker`), então as políticas RLS continuam valendo;
  - só o admin com MFA grava; proprietário, hóspede e visitante não.
- **Leitura pública**: sem mudança. O visitante lê só as comodidades de imóveis publicados.
- **Migration**: só acrescenta (125 novas comodidades e a função); não apaga nem altera dados. Aplicada no banco local com `pnpm db:reset`. Em produção, ela é aplicada pelo workflow "Banco de dados (migrations)" depois do merge.

## Painel

- **Edição do imóvel → "Comodidades"**:
  - cards com ícone e nome;
  - a marcada fica com borda, fundo e um ✓ (não depende só da cor);
  - busca por nome ou sinônimo, sem acentos;
  - filtro por categoria e "Mostrar só as marcadas";
  - contador por categoria e no total;
  - "Desmarcar todas".
- **Filtrar não desmarca**: as marcadas vão no formulário como campos ocultos.
- **Novo imóvel**: "Comodidades (opcional)" recolhido. O rascunho é criado e as comodidades são gravadas em seguida. Se a gravação falhar, a edição avisa para marcar de novo.
- **Salvar outras seções** (dados gerais, fotos, localização) não mexe nas comodidades.

## Página do imóvel

- **"O que este lugar oferece"**: até 10 comodidades com ícone e nome, as mais procuradas primeiro.
- **Acima de 10**: "Mostrar todas as N comodidades" abre um diálogo com a lista por categoria. Esc fecha e o foco volta ao botão.
- **Sem comodidades**: a seção não aparece.

## Busca

- **Filtros da busca**: mostram só as comodidades em destaque (`featured`), mais as que já estiverem na URL, para não virar uma lista de 140.
- **Atalhos da lista**: piscina, ar-condicionado, Wi-Fi, estacionamento e aceita pets, agora com ícone.
