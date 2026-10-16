import { addDaysISO } from "@/lib/format";

import { first, parseDate, type RawParams } from "./list-params";

/** Períodos rápidos da visão geral (valor na URL → dias). */
export const periodPresets = [
  { value: "7", label: "Últimos 7 dias", days: 7 },
  { value: "30", label: "Últimos 30 dias", days: 30 },
  { value: "90", label: "Últimos 90 dias", days: 90 },
  { value: "365", label: "Últimos 12 meses", days: 365 },
] as const;

export type DashboardPeriod = {
  from: string;
  to: string;
  /** Preset escolhido, ou "personalizado" quando vieram datas. */
  preset: string;
  label: string;
};

/** Mesmo limite da função no banco (até ~2 anos). */
const MAX_DAYS = 731;

/**
 * Período da visão geral: datas de/até válidas têm prioridade; senão o
 * preset (padrão: 30 dias). Sempre termina no máximo hoje.
 */
export function parseDashboardPeriod(params: RawParams, today: string): DashboardPeriod {
  const from = parseDate(params.de);
  const to = parseDate(params.ate);
  if (from && to && from <= to) {
    const end = to > today ? today : to;
    const start = from > end ? end : from;
    const days = Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1;
    if (days <= MAX_DAYS + 1) {
      return { from: start, to: end, preset: "personalizado", label: "Período personalizado" };
    }
  }
  const preset =
    periodPresets.find((item) => item.value === first(params.periodo)) ?? periodPresets[1];
  return {
    from: addDaysISO(today, -(preset.days - 1)),
    to: today,
    preset: preset.value,
    label: preset.label,
  };
}

export type Delta = {
  /** Variação relativa (0,25 = +25%) ou absoluta, conforme `kind`. */
  value: number;
  kind: "percent" | "points";
  /** Melhorou, piorou ou ficou igual, considerando o que é "bom". */
  trend: "up" | "down" | "flat";
  good: boolean | null;
};

/**
 * Comparação com o período anterior. Sem base (anterior zero ou ausente)
 * não há porcentagem honesta: devolve null e a tela diz "sem comparação".
 */
export function compare(
  current: number | null,
  previous: number | null,
  options: { kind?: "percent" | "points"; higherIsBetter?: boolean } = {},
): Delta | null {
  const { kind = "percent", higherIsBetter = true } = options;
  if (current === null || previous === null) return null;
  if (kind === "percent" && previous === 0) return null;
  const value = kind === "percent" ? (current - previous) / previous : current - previous;
  const trend = Math.abs(value) < 1e-9 ? "flat" : value > 0 ? "up" : "down";
  const good = trend === "flat" ? null : (trend === "up") === higherIsBetter;
  return { value, kind, trend, good };
}

/** Razão segura: null quando o denominador é zero. */
export function ratio(part: number, total: number): number | null {
  return total > 0 ? part / total : null;
}

const percent = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });
const signedPercent = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});
const signedNumber = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

export function formatPercent(value: number | null): string {
  return value === null ? "—" : percent.format(value);
}

export function formatDelta(delta: Delta): string {
  return delta.kind === "percent"
    ? signedPercent.format(delta.value)
    : `${signedNumber.format(delta.value * 100)} p.p.`;
}

/** Horas → "45 min", "3,5 h" ou "2,1 dias". */
export function formatDuration(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
  return hours < 48 ? `${fmt.format(hours)} h` : `${fmt.format(hours / 24)} dias`;
}

const shortDay = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});
const longDay = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });
const shortMonth = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});
const longMonth = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** Rótulos do eixo e da dica para cada ponto da série. */
export function bucketLabels(bucket: "day" | "week" | "month", start: string, end: string) {
  if (bucket === "day") {
    return { label: shortDay.format(utc(start)), longLabel: longDay.format(utc(start)) };
  }
  if (bucket === "week") {
    return {
      label: shortDay.format(utc(start)),
      longLabel: `${shortDay.format(utc(start))} a ${longDay.format(utc(end))}`,
    };
  }
  return {
    label: shortMonth.format(utc(start)).replace(". de ", "/").replace(" de ", "/"),
    longLabel: longMonth.format(utc(start)),
  };
}
