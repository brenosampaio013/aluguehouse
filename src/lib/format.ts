/**
 * Converte o que o admin digita em número: aceita "1.800,50", "1800,50",
 * "1800.50" e "1800". Vazio vira undefined; texto inválido vira NaN.
 */
export function parseDecimalInput(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const text = String(value)
    .trim()
    .replace(/\s|R\$/g, "");
  if (text === "") return undefined;
  let normalized = text;
  if (text.includes(",")) {
    normalized = text.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    // "2.000" ou "1.250.000": ponto como separador de milhar.
    normalized = text.replace(/\./g, "");
  }
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return Number.NaN;
  return Number(normalized);
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const brlWhole = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

/** Para preços em destaque: "R$ 1.800" (centavos só quando existem). */
export function formatPrice(value: number): string {
  return Number.isInteger(value) ? brlWhole.format(value) : brl.format(value);
}

export function formatBRL(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : brl.format(value);
}

/** Valor para preencher campos de preço: 1800.5 → "1800,50". */
export function toDecimalInput(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : value.toFixed(2).replace(".", ",");
}

/** "Casa Pé na Areia – Módulo 5" → "casa-pe-na-areia-modulo-5". */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/g, "");
}

/** Converte "AAAA-MM-DD" somando dias, sem fuso horário. */
export function addDaysISO(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return utc.toISOString().slice(0, 10);
}

const dateFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

export function formatDateISO(date: string): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return dateFormat.format(new Date(Date.UTC(y, m - 1, d)));
}

/** "[2026-12-28,2027-01-03)" → início e fim exclusivo. */
export function parseDateRange(range: string): { start: string; endExclusive: string } | null {
  const match = range.match(/^\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)$/);
  return match ? { start: match[1]!, endExclusive: match[2]! } : null;
}
