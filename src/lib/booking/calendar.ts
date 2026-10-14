import { addDaysISO } from "@/lib/format";

/** Período ocupado: noites de `start` (inclusive) até `end` (exclusivo). */
export type BlockedRange = { start: string; end: string };

/** Limites de noites aceitos pelo imóvel para a reserva pelo site. */
export type StayLimits = { minNights: number; maxNights: number };

/** Diferença em noites entre duas datas ISO (AAAA-MM-DD). */
export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000);
}

/** Temporada vai até 29 noites; de 30 em diante é aluguel mensal. */
export function stayMode(checkIn: string, checkOut: string): "seasonal" | "monthly" {
  return nightsBetween(checkIn, checkOut) >= 30 ? "monthly" : "seasonal";
}

/**
 * Limites de noites conforme as modalidades oferecidas:
 * só temporada: mínimo do imóvel até 29; só mensal: 30 até o máximo;
 * as duas: do mínimo ao máximo.
 */
export function stayLimits(property: {
  offers_seasonal: boolean;
  offers_monthly: boolean;
  min_nights: number;
  max_nights: number;
}): StayLimits {
  const minNights = property.offers_seasonal ? property.min_nights : 30;
  const maxNights = property.offers_monthly
    ? property.max_nights
    : Math.min(29, property.max_nights);
  return { minNights, maxNights };
}

/** A noite que começa em `date` está ocupada? */
export function isNightBlocked(date: string, blocked: BlockedRange[]): boolean {
  return blocked.some((range) => date >= range.start && date < range.end);
}

/** Alguma noite entre chegada (inclusive) e saída (exclusivo) está ocupada? */
export function overlapsBlocked(checkIn: string, checkOut: string, blocked: BlockedRange[]) {
  return blocked.some((range) => checkIn < range.end && range.start < checkOut);
}

/** Pode ser data de chegada: não passou, cabe na janela e a noite está livre. */
export function canCheckIn(date: string, today: string, lastDate: string, blocked: BlockedRange[]) {
  return date >= today && date < lastDate && !isNightBlocked(date, blocked);
}

/** Pode ser data de saída para a chegada escolhida. */
export function canCheckOut(
  checkIn: string,
  date: string,
  lastDate: string,
  limits: StayLimits,
  blocked: BlockedRange[],
) {
  if (date <= checkIn || date > lastDate) return false;
  const nights = nightsBetween(checkIn, date);
  if (nights < limits.minNights || nights > limits.maxNights) return false;
  return !overlapsBlocked(checkIn, date, blocked);
}

/** Primeiro dia (ISO) do mês `offset` meses depois do mês de `date`. */
export function monthStart(date: string, offset = 0): string {
  const [y, m] = date.split("-").map(Number) as [number, number];
  const utc = new Date(Date.UTC(y, m - 1 + offset, 1));
  return utc.toISOString().slice(0, 10);
}

/** Meses entre o mês de `from` e o mês de `to`. */
export function monthsBetween(from: string, to: string): number {
  const [y1, m1] = from.split("-").map(Number) as [number, number];
  const [y2, m2] = to.split("-").map(Number) as [number, number];
  return (y2 - y1) * 12 + (m2 - m1);
}

/**
 * Semanas do mês (domingo a sábado), com `null` nos dias de outros meses.
 */
export function monthWeeks(firstDay: string): (string | null)[][] {
  const [y, m] = firstDay.split("-").map(Number) as [number, number];
  const leading = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();

  const cells: (string | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 0; day < daysInMonth; day += 1) cells.push(addDaysISO(firstDay, day));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
