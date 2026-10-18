import { regions, type RegionSlug } from "@/lib/regions";

/**
 * Destinos da busca: as regiões (src/lib/regions.ts) e as cidades e bairros
 * mais procurados dentro delas.
 *
 * - Região filtra pela coluna `properties.region`.
 * - Cidade e bairro filtram por `properties.city` / `properties.neighborhood`,
 *   sem diferenciar acentos e maiúsculas (função search_rentals_map).
 *
 * `view` é o enquadramento do mapa para o lugar (centro aproximado e zoom).
 * Serve SÓ para mostrar o lugar quando a busca não tem imóveis com
 * localização; nunca é usado como posição de imóvel.
 */
export type DestinationKind = "region" | "city" | "neighborhood";

export type MapView = { center: [lng: number, lat: number]; zoom: number };

export type SearchDestination = {
  slug: string;
  name: string;
  kind: DestinationKind;
  region: RegionSlug;
  /** Texto exibido abaixo do nome nas sugestões. */
  caption: string;
  /** Valor gravado no imóvel (cidade), para cidade e bairro. */
  city?: string;
  /** Valor gravado no imóvel (bairro). */
  neighborhood?: string;
  view: MapView;
};

const regionViews: Record<RegionSlug, MapView> = {
  "riviera-de-sao-lourenco": { center: [-46.012, -23.793], zoom: 13 },
  "sao-sebastiao": { center: [-45.62, -23.78], zoom: 10 },
  ilhabela: { center: [-45.358, -23.778], zoom: 11 },
  caraguatatuba: { center: [-45.413, -23.62], zoom: 11 },
  ubatuba: { center: [-45.071, -23.434], zoom: 11 },
};

/** Litoral inteiro atendido (Bertioga a Ubatuba): visão inicial sem destino. */
export const COAST_BOUNDS: [[number, number], [number, number]] = [
  [-46.25, -23.95],
  [-44.85, -23.3],
];

const places: SearchDestination[] = [
  {
    slug: "bertioga",
    name: "Bertioga",
    kind: "city",
    region: "riviera-de-sao-lourenco",
    caption: "Cidade",
    city: "Bertioga",
    view: { center: [-46.139, -23.854], zoom: 11 },
  },
  ...(
    [
      ["barra-do-una", "Barra do Una", -45.77, -23.763],
      ["juquehy", "Juquehy", -45.732, -23.768],
      ["barra-do-sahy", "Barra do Sahy", -45.695, -23.77],
      ["camburi", "Camburi", -45.645, -23.776],
      ["boicucanga", "Boiçucanga", -45.619, -23.785],
      ["maresias", "Maresias", -45.558, -23.791],
    ] as const
  ).map(([slug, name, lng, lat]): SearchDestination => ({
    slug,
    name,
    kind: "neighborhood",
    region: "sao-sebastiao",
    caption: "São Sebastião",
    city: "São Sebastião",
    neighborhood: name,
    view: { center: [lng, lat], zoom: 14 },
  })),
];

/** Regiões primeiro (na ordem da Rio-Santos), seguidas dos lugares de cada uma. */
export const searchDestinations: readonly SearchDestination[] = regions.flatMap((region) => [
  {
    slug: region.slug,
    name: region.name,
    kind: "region" as const,
    region: region.slug,
    caption: region.caption,
    view: regionViews[region.slug],
  },
  ...places.filter((place) => place.region === region.slug),
]);

const bySlug = new Map(searchDestinations.map((d) => [d.slug, d]));

export function findDestination(slug: string | undefined): SearchDestination | undefined {
  return slug ? bySlug.get(slug) : undefined;
}

export function normalizeText(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * Destinos que combinam com o texto digitado (nome ou legenda, sem
 * diferenciar acentos). Texto vazio mostra só as regiões.
 */
export function matchSearchDestinations(query: string): SearchDestination[] {
  const q = normalizeText(query);
  if (!q) return searchDestinations.filter((d) => d.kind === "region");
  return searchDestinations.filter(
    (d) => normalizeText(d.name).includes(q) || normalizeText(d.caption).includes(q),
  );
}

/** Opções agrupadas por região, para o seletor de destino dos filtros. */
export function destinationGroups() {
  return regions.map((region) => ({
    region,
    options: searchDestinations.filter((d) => d.region === region.slug),
  }));
}
