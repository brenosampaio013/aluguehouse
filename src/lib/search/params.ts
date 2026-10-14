import { regions, type RegionSlug } from "@/lib/regions";

export type RentalMode = "seasonal" | "monthly";
export type SortOption = "recentes" | "menor-preco" | "maior-preco";

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

type RawParams = Record<string, string | string[] | undefined>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const regionSlugs = new Set<string>(regions.map((r) => r.slug));
const sorts: SortOption[] = ["recentes", "menor-preco", "maior-preco"];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function all(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value]).flatMap((v) => v.split(","));
}

function int(value: string | undefined, min: number, max: number): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const n = Number(value);
  return n >= min && n <= max ? n : undefined;
}

function isRealDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * Lê os filtros da URL. Valores inválidos são ignorados (a busca continua
 * funcionando), nunca repassados ao banco.
 */
export function parseRentalFilters(params: RawParams): RentalFilters {
  const regiao = first(params.regiao);
  const chegada = first(params.chegada);
  const saida = first(params.saida);
  const precoRaw = first(params.preco_max);
  const ordem = first(params.ordem) as SortOption | undefined;

  const validDate = (v?: string) => (v && ISO_DATE.test(v) && isRealDate(v) ? v : undefined);
  const precoMax =
    precoRaw && /^\d{1,9}$/.test(precoRaw) && Number(precoRaw) > 0 ? Number(precoRaw) : undefined;

  return {
    regiao: regiao && regionSlugs.has(regiao) ? (regiao as RegionSlug) : undefined,
    chegada: validDate(chegada),
    saida: validDate(saida),
    hospedes: int(first(params.hospedes), 1, 50),
    quartos: int(first(params.quartos), 1, 20),
    precoMax,
    comodidades: [...new Set(all(params.comodidade).filter((slug) => SLUG.test(slug)))].slice(
      0,
      15,
    ),
    ordem: ordem && sorts.includes(ordem) ? ordem : "recentes",
    pagina: int(first(params.pagina), 1, 1000) ?? 1,
  };
}

export const sortToDb: Record<SortOption, "recent" | "price_asc" | "price_desc"> = {
  recentes: "recent",
  "menor-preco": "price_asc",
  "maior-preco": "price_desc",
};

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
