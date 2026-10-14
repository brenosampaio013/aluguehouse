import type { RegionSlug } from "@/lib/regions";

import {
  ISO_DATE,
  first,
  int,
  isRealDate,
  parseAmenities,
  parseRegion,
  parseSort,
  type RawParams,
  type SortOption,
} from "./shared";

export { sortToDb, type SortOption } from "./shared";

export type RentalMode = "seasonal" | "monthly";

export type RentalFilters = {
  regiao?: RegionSlug;
  chegada?: string;
  saida?: string;
  hospedes?: number;
  quartos?: number;
  precoMax?: number;
  comodidades: string[];
  ordem: SortOption;
  pagina: number;
};

export const PAGE_SIZE = 24;

/**
 * Lê os filtros da URL. Valores inválidos são ignorados (a busca continua
 * funcionando), nunca repassados ao banco.
 */
export function parseRentalFilters(params: RawParams): RentalFilters {
  const regiao = first(params.regiao);
  const chegada = first(params.chegada);
  const saida = first(params.saida);
  const precoRaw = first(params.preco_max);

  const validDate = (v?: string) => (v && ISO_DATE.test(v) && isRealDate(v) ? v : undefined);
  const precoMax =
    precoRaw && /^\d{1,9}$/.test(precoRaw) && Number(precoRaw) > 0 ? Number(precoRaw) : undefined;

  return {
    regiao: parseRegion(regiao),
    chegada: validDate(chegada),
    saida: validDate(saida),
    hospedes: int(first(params.hospedes), 1, 50),
    quartos: int(first(params.quartos), 1, 20),
    precoMax,
    comodidades: parseAmenities(params.comodidade),
    ordem: parseSort(first(params.ordem)),
    pagina: int(first(params.pagina), 1, 1000) ?? 1,
  };
}

/** Monta a URL da listagem com os filtros atuais e alterações pontuais. */
export function rentalHref(
  path: string,
  filters: RentalFilters,
  changes: Partial<RentalFilters> = {},
): string {
  const f = { ...filters, ...changes };
  const params = new URLSearchParams();
  if (f.regiao) params.set("regiao", f.regiao);
  if (f.chegada) params.set("chegada", f.chegada);
  if (f.saida) params.set("saida", f.saida);
  if (f.hospedes) params.set("hospedes", String(f.hospedes));
  if (f.quartos) params.set("quartos", String(f.quartos));
  if (f.precoMax) params.set("preco_max", String(f.precoMax));
  for (const slug of f.comodidades) params.append("comodidade", slug);
  if (f.ordem !== "recentes") params.set("ordem", f.ordem);
  if (f.pagina > 1) params.set("pagina", String(f.pagina));
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

/** Quantos filtros (além da ordenação e da página) estão ativos. */
export function activeFilterCount(f: RentalFilters): number {
  return (
    [f.regiao, f.chegada, f.hospedes, f.quartos, f.precoMax].filter(Boolean).length +
    f.comodidades.length
  );
}
