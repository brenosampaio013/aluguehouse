import { regions } from "@/lib/regions";

/** Auxiliares para ler filtros da URL com segurança (aluguel e venda). */
export type RawParams = Record<string, string | string[] | undefined>;

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const regionSlugs = new Set<string>(regions.map((r) => r.slug));

export function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function all(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value]).flatMap((v) => v.split(","));
}

export function int(value: string | undefined, min: number, max: number): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const n = Number(value);
  return n >= min && n <= max ? n : undefined;
}

export function isRealDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export type SortOption = "recentes" | "menor-preco" | "maior-preco";

export const sorts: SortOption[] = ["recentes", "menor-preco", "maior-preco"];

export const sortToDb: Record<SortOption, "recent" | "price_asc" | "price_desc"> = {
  recentes: "recent",
  "menor-preco": "price_asc",
  "maior-preco": "price_desc",
};

export function parseSort(value: string | undefined): SortOption {
  return value && sorts.includes(value as SortOption) ? (value as SortOption) : "recentes";
}

/** Comodidades da URL: aceita repetição e vírgulas, remove repetidas e inválidas. */
export function parseAmenities(value: string | string[] | undefined): string[] {
  return [...new Set(all(value).filter((slug) => SLUG.test(slug)))].slice(0, 15);
}

export function parseRegion(value: string | undefined) {
  return value && regionSlugs.has(value) ? (value as (typeof regions)[number]["slug"]) : undefined;
}
