/**
 * Catálogo de comodidades: fonte única de identificador, nome, categoria e
 * palavras de busca. Os ícones ficam em src/components/amenities/amenity-icon.tsx.
 *
 * - `slug` é o identificador gravado no banco (tabela public.amenities). Nunca
 *   muda: trocar o nome exibido não afeta os imóveis já cadastrados.
 * - `label` precisa ser igual ao do banco (conferido em teste de ponta a ponta).
 * - Comodidades com o mesmo significado usam um único slug; os outros nomes
 *   viram `keywords` (ex.: "porteiro" encontra "Portaria 24 horas").
 * - `featured`: aparece nos filtros da busca de imóveis.
 *
 * Novas comodidades: acrescente aqui e numa migration nova
 * (insert into public.amenities ... on conflict (slug) do nothing).
 */

export const amenityCategories = [
  { id: "conforto", label: "Geral e conforto" },
  { id: "cozinha", label: "Cozinha e alimentação" },
  { id: "banheiro", label: "Banheiro e higiene" },
  { id: "quarto-lavanderia", label: "Quarto e lavanderia" },
  { id: "lazer", label: "Lazer e entretenimento" },
  { id: "areas-externas", label: "Áreas externas e localização" },
  { id: "estacionamento", label: "Estacionamento e transporte" },
  { id: "tecnologia", label: "Tecnologia e conectividade" },
  { id: "seguranca", label: "Segurança" },
  { id: "criancas", label: "Bebês e crianças" },
  { id: "sustentabilidade", label: "Sustentabilidade" },
  { id: "servicos", label: "Serviços e acessibilidade" },
] as const;

export type AmenityCategory = (typeof amenityCategories)[number]["id"];

export type AmenityDefinition = {
  slug: string;
  label: string;
  category: AmenityCategory;
  keywords?: string[];
  featured?: boolean;
};

type Entry = [
  slug: string,
  label: string,
  extra?: Pick<AmenityDefinition, "keywords" | "featured">,
];

const byCategory: Record<AmenityCategory, Entry[]> = {
  conforto: [
    ["ar-condicionado", "Ar-condicionado", { featured: true, keywords: ["climatizado", "split"] }],
    ["aquecedor", "Aquecedor", { keywords: ["aquecimento"] }],
    ["ventilador-de-teto", "Ventilador de teto"],
    ["ventiladores-portateis", "Ventiladores portáteis"],
    ["cortinas-blackout", "Cortinas blackout", { keywords: ["persianas", "escurecer"] }],
    ["cobertores-travesseiros-extras", "Cobertores e travesseiros extras"],
    ["entrada-privada", "Entrada privada", { keywords: ["entrada independente"] }],
    ["casa-um-piso", "Casa de um piso", { keywords: ["térrea", "sem escadas"] }],
    [
      "estadias-longas",
      "Estadias de longa duração permitidas",
      { keywords: ["28 dias", "mensal"] },
    ],
    ["aceita-pets", "Aceita pets", { featured: true, keywords: ["animais", "cachorro", "gato"] }],
  ],
  cozinha: [
    ["cozinha-equipada", "Cozinha equipada", { featured: true, keywords: ["cozinha"] }],
    ["cozinha-pequena", "Cozinha pequena", { keywords: ["copa", "kitchenette"] }],
    ["churrasqueira", "Churrasqueira", { featured: true, keywords: ["churrasco", "grelha"] }],
    ["cozinha-externa", "Cozinha ao ar livre", { keywords: ["cozinha externa", "área gourmet"] }],
    ["fogao", "Fogão", { keywords: ["cooktop"] }],
    ["forno", "Forno"],
    ["micro-ondas", "Micro-ondas"],
    ["refrigerador", "Refrigerador", { keywords: ["geladeira"] }],
    ["freezer", "Freezer", { keywords: ["congelador"] }],
    ["frigobar", "Frigobar"],
    ["cafeteira", "Cafeteira", { keywords: ["máquina de café", "café expresso"] }],
    ["cafe", "Café", { keywords: ["café disponível"] }],
    ["cafe-da-manha", "Café da manhã"],
    ["chaleira-eletrica", "Chaleira elétrica"],
    ["liquidificador", "Liquidificador"],
    ["maquina-de-pao", "Máquina de pão", { keywords: ["panificadora"] }],
    ["panela-de-arroz", "Panela de arroz elétrica"],
    ["torradeira", "Torradeira"],
    ["lava-loucas", "Máquina de lavar louça", { keywords: ["lava-louças"] }],
    ["pratos-talheres", "Pratos e talheres", { keywords: ["louças", "utensílios"] }],
    ["assadeira", "Assadeira", { keywords: ["forma"] }],
    ["mesa-de-jantar", "Mesa de jantar"],
    ["tacas-de-vinho", "Taças de vinho"],
    ["utensilios-churrasco", "Utensílios para churrasco", { keywords: ["espetos", "carvão"] }],
    ["itens-basicos-cozinha", "Itens básicos de cozinha", { keywords: ["óleo", "sal", "pimenta"] }],
    ["lixeira-compactadora", "Lixeira compactadora"],
  ],
  banheiro: [
    ["agua-quente", "Água quente", { keywords: ["chuveiro quente"] }],
    ["banheira", "Banheira"],
    [
      "banheira-hidromassagem",
      "Banheira de hidromassagem",
      { keywords: ["jacuzzi", "ofurô", "spa"] },
    ],
    ["bide", "Bidê"],
    ["xampu", "Xampu", { keywords: ["shampoo"] }],
    ["condicionador", "Condicionador"],
    ["sabonete-corpo", "Sabonete para o corpo", { keywords: ["sabonete"] }],
    ["gel-de-banho", "Gel de banho"],
    ["secador-de-cabelo", "Secador de cabelo"],
    ["produtos-de-limpeza", "Produtos de limpeza"],
  ],
  "quarto-lavanderia": [
    [
      "roupa-de-cama",
      "Roupa de cama e banho",
      { keywords: ["toalhas", "lençóis", "roupas de cama"] },
    ],
    ["maquina-de-lavar", "Máquina de lavar", { featured: true, keywords: ["lavadora"] }],
    ["secadora", "Secadora", { keywords: ["secadora de roupas"] }],
    ["ferro-de-passar", "Ferro de passar"],
    ["cabides", "Cabides"],
    ["varal", "Varal para secar roupas", { keywords: ["estendal"] }],
    ["guarda-roupa", "Local para guardar as roupas", { keywords: ["armário", "cômoda"] }],
    ["mosquiteiro", "Mosquiteiro", { keywords: ["tela", "mosquito"] }],
  ],
  lazer: [
    ["piscina", "Piscina", { featured: true }],
    ["academia", "Academia", { keywords: ["ginástica"] }],
    ["equipamento-exercicios", "Equipamento para exercícios", { keywords: ["esteira", "pesos"] }],
    ["sauna", "Sauna"],
    ["cinema", "Cinema", { keywords: ["home theater", "projetor"] }],
    ["mesa-de-bilhar", "Mesa de bilhar", { keywords: ["sinuca"] }],
    ["pingue-pongue", "Mesa de pingue-pongue", { keywords: ["tênis de mesa"] }],
    ["boliche", "Pista de boliche"],
    ["minigolfe", "Minigolfe"],
    ["fliperama", "Fliperama", { keywords: ["arcade"] }],
    ["videogame", "Console de videogame", { keywords: ["playstation", "xbox"] }],
    ["jogos-de-tabuleiro", "Jogos de tabuleiro"],
    ["jogos-tamanho-real", "Jogos em tamanho real", { keywords: ["xadrez gigante"] }],
    ["sistema-de-som", "Sistema de som", { keywords: ["caixa de som"] }],
    ["piano", "Piano"],
    ["toca-discos", "Toca-discos", { keywords: ["vinil"] }],
    ["sala-tematica", "Sala temática"],
    ["sala-jogos-criancas", "Sala de jogos para crianças", { keywords: ["brinquedoteca"] }],
    ["livros", "Livros e material de leitura"],
    ["rampa-de-skate", "Rampa de skate"],
    ["parede-de-escalada", "Parede de escalada"],
    ["gaiola-beisebol", "Gaiola para treino de beisebol"],
    ["rinque-de-hoquei", "Rinque de hóquei"],
    ["laser-tag", "Laser tag"],
  ],
  "areas-externas": [
    ["pe-na-areia", "Pé na areia", { featured: true, keywords: ["frente para o mar"] }],
    ["vista-para-o-mar", "Vista para o mar", { featured: true }],
    ["acesso-praia", "Acesso à praia"],
    ["acesso-lago", "Acesso ao lago"],
    ["acesso-resort", "Acesso ao resort"],
    ["beira-da-agua", "Na beira da água", { keywords: ["beira-mar", "beira-rio"] }],
    ["varanda", "Varanda", { featured: true, keywords: ["pátio", "sacada", "terraço"] }],
    ["quintal", "Quintal", { keywords: ["jardim"] }],
    ["rede", "Rede", { keywords: ["rede de descanso"] }],
    ["moveis-externos", "Móveis na área externa", { keywords: ["espreguiçadeira"] }],
    ["jantar-externo", "Área de jantar externa"],
    ["lareira-externa", "Lareira externa", { keywords: ["fogueira", "fire pit"] }],
    ["lareira", "Lareira interna", { keywords: ["lareira"] }],
    ["chuveiro-externo", "Chuveiro externo", { keywords: ["ducha"] }],
    ["bicicletas", "Bicicletas"],
    ["caiaque", "Caiaque", { keywords: ["kayak"] }],
    ["pista-de-esqui", "Pista de esqui perto"],
    ["rampa-barcos", "Rampa para barcos", { keywords: ["marina", "píer"] }],
  ],
  estacionamento: [
    ["estacionamento", "Estacionamento", { featured: true, keywords: ["garagem", "vaga"] }],
    [
      "estacionamento-gratuito-local",
      "Estacionamento gratuito no local",
      { keywords: ["garagem"] },
    ],
    ["estacionamento-gratuito-rua", "Estacionamento gratuito na rua"],
    ["estacionamento-gratuito-fora", "Estacionamento gratuito fora da propriedade"],
    ["estacionamento-pago-local", "Estacionamento pago no local"],
    ["estacionamento-pago-fora", "Estacionamento pago fora da propriedade"],
    [
      "carregador-veiculo-eletrico",
      "Carregador de veículos elétricos",
      { keywords: ["carro elétrico"] },
    ],
    ["carregador-bicicleta-eletrica", "Carregador para bicicleta elétrica"],
  ],
  tecnologia: [
    ["wi-fi", "Wi-Fi", { featured: true, keywords: ["internet", "wifi"] }],
    ["wi-fi-portatil", "Wi-Fi portátil", { keywords: ["roteador portátil"] }],
    ["ethernet", "Conexão Ethernet", { keywords: ["cabo de rede"] }],
    ["tv", "TV", { keywords: ["televisão", "smart tv"] }],
    [
      "espaco-de-trabalho",
      "Espaço de trabalho exclusivo",
      { keywords: ["escritório", "home office"] },
    ],
  ],
  seguranca: [
    ["detector-fumaca", "Detector de fumaça"],
    ["detector-monoxido", "Detector de monóxido de carbono"],
    ["extintor", "Extintor de incêndio"],
    ["primeiros-socorros", "Kit de primeiros socorros"],
    ["cofre", "Cofre"],
    ["portaria-24h", "Portaria 24 horas", { keywords: ["porteiro", "segurança"] }],
  ],
  criancas: [
    ["berco", "Berço"],
    ["baba-eletronica", "Babá eletrônica"],
    ["cadeirao", "Cadeirão infantil", { keywords: ["cadeira de alimentação"] }],
    ["cercadinho", "Cercadinho portátil", { keywords: ["chiqueirinho"] }],
    ["trocador", "Trocador de bebê", { keywords: ["fraldário"] }],
    ["banheira-infantil", "Banheira infantil"],
    ["talheres-infantis", "Talheres para crianças", { keywords: ["pratos infantis"] }],
    ["livros-brinquedos-infantis", "Livros e brinquedos infantis"],
    ["bicicletas-infantis", "Bicicletas para crianças"],
    ["portao-seguranca-bebe", "Portões de segurança para bebês"],
    ["protetor-canto-mesa", "Protetores de canto de mesa"],
    ["protetor-tomada", "Protetores de tomada"],
    ["protetor-lareira", "Protetores de lareira"],
    ["protecao-janela", "Proteção de janela", { keywords: ["rede de proteção", "tela de janela"] }],
    ["recomendacao-baba", "Recomendações de babá"],
  ],
  sustentabilidade: [
    ["compostagem", "Compostagem"],
    ["reciclagem", "Reciclagem", { keywords: ["coleta seletiva"] }],
    ["paineis-solares", "Painéis solares", { keywords: ["energia solar"] }],
  ],
  servicos: [
    [
      "limpeza-durante-estadia",
      "Limpeza disponível durante a estadia",
      { keywords: ["faxina", "arrumação"] },
    ],
    ["lavanderia-proxima", "Lavanderia nas proximidades"],
    ["condominio-fechado", "Condomínio fechado"],
    ["area-de-lazer", "Área de lazer no condomínio", { featured: true }],
    ["elevador", "Elevador", { featured: true, keywords: ["acessibilidade"] }],
    ["sala-de-estar-privativa", "Sala de estar privativa"],
    ["guarda-bagagem", "Acesso para deixar as bagagens", { keywords: ["malas", "guarda-volumes"] }],
  ],
};

export const amenityCatalog: readonly AmenityDefinition[] = amenityCategories.flatMap(({ id }) =>
  byCategory[id].map(([slug, label, extra]) => ({ slug, label, category: id, ...extra })),
);

const bySlug = new Map(amenityCatalog.map((amenity) => [amenity.slug, amenity]));
const order = new Map(amenityCatalog.map((amenity, index) => [amenity.slug, index]));

export function findAmenity(slug: string): AmenityDefinition | undefined {
  return bySlug.get(slug);
}

export function isAmenitySlug(slug: string): boolean {
  return bySlug.has(slug);
}

export function categoryLabel(id: AmenityCategory): string {
  return amenityCategories.find((category) => category.id === id)!.label;
}

/** Ordena na ordem do catálogo (por categoria); fora do catálogo vai ao fim, por nome. */
export function sortByCatalog<T extends { slug: string; label: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      (order.get(a.slug) ?? Infinity) - (order.get(b.slug) ?? Infinity) ||
      a.label.localeCompare(b.label, "pt-BR"),
  );
}

/** Agrupa por categoria, na ordem do catálogo; itens fora do catálogo ficam em "Outras". */
export function groupByCategory<T extends { slug: string; label: string }>(items: T[]) {
  const groups = amenityCategories
    .map((category) => ({
      id: category.id as string,
      label: category.label as string,
      items: sortByCatalog(items.filter((item) => bySlug.get(item.slug)?.category === category.id)),
    }))
    .filter((group) => group.items.length > 0);
  const others = items.filter((item) => !bySlug.has(item.slug));
  if (others.length > 0)
    groups.push({ id: "outras", label: "Outras", items: sortByCatalog(others) });
  return groups;
}

function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Busca por nome ou palavra-chave, sem diferenciar acentos e maiúsculas. */
export function matchesAmenity(amenity: AmenityDefinition, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  return [amenity.label, ...(amenity.keywords ?? [])].some((text) => normalize(text).includes(q));
}

/** Ordem do resumo na página do imóvel: as mais procuradas (filtros) primeiro. */
export function sortForPreview<T extends { slug: string; label: string }>(items: T[]): T[] {
  const featured = (slug: string) => (bySlug.get(slug)?.featured ? 0 : 1);
  return sortByCatalog(items).sort((a, b) => featured(a.slug) - featured(b.slug));
}
