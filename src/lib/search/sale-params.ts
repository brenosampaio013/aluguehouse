import { propertyTypeLabels } from "@/lib/properties/labels";
import type { RegionSlug } from "@/lib/regions";
import type { Database } from "@/types/database";

import {
  first,
  int,
  parseAmenities,
  parseRegion,
  parseSort,
  type RawParams,
  type SortOption,
} from "./shared";

type PropertyType = Database["public"]["Enums"]["property_type"];

export type SaleFilters = {
  regiao?: RegionSlug;
  tipo?: PropertyType;
  precoMax?: number;
  quartos?: number;
  areaMin?: number;
  comodidades: string[];
  ordem: SortOption;
  pagina: number;
};

/** Faixas de preço (as mesmas da busca da página inicial). */
export const salePriceOptions = [
  { value: "", label: "Qualquer valor" },
  { value: "1000000", label: "Até R$ 1 milhão" },
  { value: "2000000", label: "Até R$ 2 milhões" },
  { value: "3500000", label: "Até R$ 3,5 milhões" },
  { value: "5000000", label: "Até R$ 5 milhões" },
];

export const areaOptions = [
  { value: "", label: "Qualquer área" },
  ...[50, 100, 200, 300, 500].map((m2) => ({ value: String(m2), label: `${m2} m² ou mais` })),
];

const types = new Set(Object.keys(propertyTypeLabels));

/** Lê os filtros de venda da URL; valores inválidos são ignorados. */
export function parseSaleFilters(params: RawParams): SaleFilters {
  const tipo = first(params.tipo);
  const preco = first(params.preco_max);
  return {
    regiao: parseRegion(first(params.regiao)),
    tipo: tipo && types.has(tipo) ? (tipo as PropertyType) : undefined,
    precoMax: preco && /^\d{1,10}$/.test(preco) && Number(preco) > 0 ? Number(preco) : undefined,
    quartos: int(first(params.quartos), 1, 20),
    areaMin: int(first(params.area_min), 1, 100_000),
    comodidades: parseAmenities(params.comodidade),
    ordem: parseSort(first(params.ordem)),
    pagina: int(first(params.pagina), 1, 1000) ?? 1,
  };
}

export function saleHref(filters: SaleFilters, changes: Partial<SaleFilters> = {}): string {
  const f = { ...filters, ...changes };
  const params = new URLSearchParams();
  if (f.regiao) params.set("regiao", f.regiao);
  if (f.tipo) params.set("tipo", f.tipo);
  if (f.precoMax) params.set("preco_max", String(f.precoMax));
  if (f.quartos) params.set("quartos", String(f.quartos));
  if (f.areaMin) params.set("area_min", String(f.areaMin));
  for (const slug of f.comodidades) params.append("comodidade", slug);
  if (f.ordem !== "recentes") params.set("ordem", f.ordem);
  if (f.pagina > 1) params.set("pagina", String(f.pagina));
  const query = params.toString();
  return query ? `/venda?${query}` : "/venda";
}

export function activeSaleFilterCount(f: SaleFilters): number {
  return (
    [f.regiao, f.tipo, f.precoMax, f.quartos, f.areaMin].filter(Boolean).length +
    f.comodidades.length
  );
}
