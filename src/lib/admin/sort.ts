import type { SortDir } from "./list-params";

export type SortValue = string | number | null | undefined;

const collator = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

function compareValues(a: SortValue, b: SortValue): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return collator.compare(String(a), String(b));
}

/**
 * Ordena em memória como a lista do banco: crescente com vazios no fim,
 * decrescente com vazios no começo (padrão do Postgres) e desempate por id.
 * Usado na exportação, que lê por cursor (ordem de id) e reordena aqui.
 */
export function sortRows<T extends { id: string }>(
  rows: T[],
  value: (row: T) => SortValue,
  dir: SortDir,
): T[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((x, y) => {
    const a = value(x);
    const b = value(y);
    const aNull = a === null || a === undefined;
    const bNull = b === null || b === undefined;
    if (aNull !== bNull) return (aNull ? 1 : -1) * sign;
    const byValue = aNull ? 0 : compareValues(a, b) * sign;
    return byValue !== 0 ? byValue : x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
  });
}

/** Data/hora ISO → milissegundos (ordem cronológica real, sem depender do texto). */
export function timeValue(value: string | null | undefined): number | null {
  return value ? Date.parse(value) : null;
}
