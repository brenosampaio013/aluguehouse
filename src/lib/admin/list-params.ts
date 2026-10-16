/**
 * Leitura dos parâmetros de URL das listas do painel (busca, filtros,
 * ordenação e página). Tudo validado: valor desconhecido vira o padrão.
 * Sem dependências de servidor: também é usado em testes unitários.
 */

export const PAGE_SIZE = 20;
/** Limite de linhas por exportação CSV (evita consultas gigantes). */
export const EXPORT_LIMIT = 5000;

export type RawParams = Record<string, string | string[] | undefined>;
export type SortDir = "asc" | "desc";

export function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parsePage(value: string | string[] | undefined): number {
  const n = Number.parseInt(first(value) ?? "", 10);
  return Number.isFinite(n) && n >= 1 && n <= 100_000 ? n : 1;
}

export function parseSearch(value: string | string[] | undefined): string {
  return (first(value) ?? "").trim().replace(/\s+/g, " ").slice(0, 100);
}

export function parseEnum<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[],
): T | null {
  const v = first(value);
  return v && (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

/** "AAAA-MM-DD" válido (inclusive o dia existir no calendário) ou null. */
export function parseDate(value: string | string[] | undefined): string | null {
  const v = first(value);
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const date = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === v ? v : null;
}

export function parseSort<K extends string>(
  params: RawParams,
  allowed: readonly K[],
  fallback: { key: K; dir: SortDir },
): { key: K; dir: SortDir } {
  const key = parseEnum(params.ordem, allowed);
  if (!key) return fallback;
  const dir = first(params.dir) === "asc" ? "asc" : first(params.dir) === "desc" ? "desc" : null;
  return { key, dir: dir ?? (key === fallback.key ? fallback.dir : "asc") };
}

/** Faixa de linhas para .range(from, to) do Supabase (inclusiva). */
export function pageRange(page: number, size = PAGE_SIZE) {
  const from = (page - 1) * size;
  return { from, to: from + size - 1 };
}

export function totalPages(count: number, size = PAGE_SIZE) {
  return Math.max(1, Math.ceil(count / size));
}

/** Monta a URL mantendo só os parâmetros com valor. */
export function buildHref(
  path: string,
  params: Record<string, string | number | null | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

/**
 * Filtro PostgREST "or" com ilike em várias colunas, seguro para qualquer
 * texto digitado: curingas do LIKE (% _ \) viram literais e o valor vai
 * entre aspas, então vírgulas e parênteses não quebram o filtro.
 */
export function orIlike(columns: readonly string[], text: string): string {
  const like = `%${text.replace(/[\\%_]/g, "\\$&")}%`;
  const quoted = `"${like.replace(/["\\]/g, "\\$&")}"`;
  return columns.map((column) => `${column}.ilike.${quoted}`).join(",");
}
