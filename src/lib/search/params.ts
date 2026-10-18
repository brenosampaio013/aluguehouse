import { findDestination } from "@/lib/destinations";
import type { RegionSlug } from "@/lib/regions";

import {
  ISO_DATE,
  first,
  int,
  isRealDate,
  parseAmenities,
  parseRegion,
  sortToDb as sharedSortToDb,
  sorts as sharedSorts,
  type RawParams,
} from "./shared";

export type RentalMode = "seasonal" | "monthly";

export type RentalSort = "recentes" | "menor-preco" | "maior-preco" | "melhor-avaliados";

const rentalSorts: RentalSort[] = [...sharedSorts, "melhor-avaliados"];

export const sortToDb: Record<RentalSort, "recent" | "price_asc" | "price_desc" | "rating"> = {
  ...sharedSortToDb,
  "melhor-avaliados": "rating",
};

/** Tipos aceitos no filtro de aluguel (terreno não se aluga por temporada). */
export const rentalTypes = ["casa", "apartamento", "cobertura", "outro"] as const;
export type RentalType = (typeof rentalTypes)[number];

/** Área do mapa: [oeste, sul, leste, norte], em graus. */
export type MapArea = [west: number, south: number, east: number, north: number];

export type RentalFilters = {
  regiao?: RegionSlug;
  /** Cidade ou bairro do catálogo (src/lib/destinations.ts). */
  destino?: string;
  area?: MapArea;
  chegada?: string;
  saida?: string;
  hospedes?: number;
  quartos?: number;
  tipo?: RentalType;
  precoMin?: number;
  precoMax?: number;
  comodidades: string[];
  ordem: RentalSort;
  pagina: number;
};

export const PAGE_SIZE = 24;

/** Máximo de imóveis por busca (o mapa mostra todos de uma vez). */
export const MAP_RESULTS_LIMIT = 300;

/** Maior área aceita: cobre o litoral atendido com folga. */
export const MAX_AREA_SPAN_DEG = 5;

function parsePrice(value: string | undefined) {
  return value && /^\d{1,9}$/.test(value) && Number(value) > 0 ? Number(value) : undefined;
}

export function parseArea(value: string | undefined): MapArea | undefined {
  if (!value) return undefined;
  const parts = value.split(",");
  if (parts.length !== 4 || !parts.every((p) => /^-?\d{1,3}(\.\d{1,6})?$/.test(p))) {
    return undefined;
  }
  const [w, s, e, n] = parts.map(Number) as MapArea;
  const valid =
    w >= -180 &&
    e <= 180 &&
    s >= -90 &&
    n <= 90 &&
    w < e &&
    s < n &&
    e - w <= MAX_AREA_SPAN_DEG &&
    n - s <= MAX_AREA_SPAN_DEG;
  return valid ? [w, s, e, n] : undefined;
}

/** Área com 4 casas decimais (~10 m): URL curta e estável. */
export function formatArea(area: MapArea): string {
  return area.map((v) => Number(v.toFixed(4))).join(",");
}

/**
 * Lê os filtros da URL. Valores inválidos são ignorados (a busca continua
 * funcionando), nunca repassados ao banco.
 *
 * `destino` aceita região, cidade ou bairro do catálogo; `regiao` continua
 * aceito (links antigos).
 */
export function parseRentalFilters(params: RawParams): RentalFilters {
  const chegada = first(params.chegada);
  const saida = first(params.saida);
  const tipo = first(params.tipo);
  const ordem = first(params.ordem);

  const destination = findDestination(first(params.destino));
  const regiao =
    destination?.kind === "region"
      ? destination.region
      : destination
        ? undefined
        : parseRegion(first(params.regiao));

  const validDate = (v?: string) => (v && ISO_DATE.test(v) && isRealDate(v) ? v : undefined);

  return {
    regiao,
    destino: destination && destination.kind !== "region" ? destination.slug : undefined,
    area: parseArea(first(params.area)),
    chegada: validDate(chegada),
    saida: validDate(saida),
    hospedes: int(first(params.hospedes), 1, 50),
    quartos: int(first(params.quartos), 1, 20),
    tipo:
      tipo && (rentalTypes as readonly string[]).includes(tipo) ? (tipo as RentalType) : undefined,
    precoMin: parsePrice(first(params.preco_min)),
    precoMax: parsePrice(first(params.preco_max)),
    comodidades: parseAmenities(params.comodidade),
    ordem: ordem && rentalSorts.includes(ordem as RentalSort) ? (ordem as RentalSort) : "recentes",
    pagina: int(first(params.pagina), 1, 1000) ?? 1,
  };
}

/** Parâmetros da URL da listagem com os filtros atuais e alterações pontuais. */
export function rentalParams(
  filters: RentalFilters,
  changes: Partial<RentalFilters> = {},
): URLSearchParams {
  const f = { ...filters, ...changes };
  const params = new URLSearchParams();
  if (f.destino) params.set("destino", f.destino);
  else if (f.regiao) params.set("regiao", f.regiao);
  if (f.area) params.set("area", formatArea(f.area));
  if (f.chegada) params.set("chegada", f.chegada);
  if (f.saida) params.set("saida", f.saida);
  if (f.hospedes) params.set("hospedes", String(f.hospedes));
  if (f.quartos) params.set("quartos", String(f.quartos));
  if (f.tipo) params.set("tipo", f.tipo);
  if (f.precoMin) params.set("preco_min", String(f.precoMin));
  if (f.precoMax) params.set("preco_max", String(f.precoMax));
  for (const slug of f.comodidades) params.append("comodidade", slug);
  if (f.ordem !== "recentes") params.set("ordem", f.ordem);
  if (f.pagina > 1) params.set("pagina", String(f.pagina));
  return params;
}

/** Monta a URL da listagem com os filtros atuais e alterações pontuais. */
export function rentalHref(
  path: string,
  filters: RentalFilters,
  changes: Partial<RentalFilters> = {},
): string {
  const query = rentalParams(filters, changes).toString();
  return query ? `${path}?${query}` : path;
}

/** Quantos filtros (além do destino, da área, da ordenação e da página) estão ativos. */
export function activeFilterCount(f: RentalFilters): number {
  return (
    [
      f.regiao ?? f.destino,
      f.chegada,
      f.hospedes,
      f.quartos,
      f.tipo,
      f.precoMin,
      f.precoMax,
    ].filter(Boolean).length + f.comodidades.length
  );
}
