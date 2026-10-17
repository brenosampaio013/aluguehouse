import type { BadgeTone } from "@/components/admin/ui/badge";
import { addDaysISO } from "@/lib/format";
import type { BlockKind, BookingStatus } from "@/lib/booking/labels";
import type { Database } from "@/types/database";

type Enums = Database["public"]["Enums"];

/**
 * Regras do portal do proprietário que não dependem do banco: etapa de
 * cada reserva, situação de cada dia no calendário (com tarifa e estadia
 * mínima) e o resumo de ocupação. Datas sempre AAAA-MM-DD no fuso de São
 * Paulo; estadias são [entrada, saída), como no banco.
 */

export type { BlockKind, BookingStatus };

/** Etapa que o proprietário vê: a situação do banco mais as datas. */
export type BookingStage =
  "pending" | "upcoming" | "in_progress" | "completed" | "cancelled" | "declined" | "expired";

export function bookingStage(
  booking: { status: BookingStatus; check_in: string; check_out: string },
  today: string,
): BookingStage {
  if (booking.status !== "approved") return booking.status;
  if (booking.check_in > today) return "upcoming";
  if (booking.check_out > today) return "in_progress";
  return "completed";
}

export const bookingStageLabels: Record<BookingStage, string> = {
  pending: "Aguardando aprovação",
  upcoming: "Confirmada",
  in_progress: "Hospedagem em andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
  declined: "Recusada",
  expired: "Expirada",
};

export const bookingStageTones: Record<BookingStage, BadgeTone> = {
  pending: "warning",
  upcoming: "info",
  in_progress: "success",
  completed: "neutral",
  cancelled: "muted",
  declined: "muted",
  expired: "muted",
};

/** Abas da lista de reservas. */
export const ownerBookingTabs = [
  { slug: "todas", label: "Todas" },
  { slug: "aguardando", label: "Aguardando aprovação" },
  { slug: "futuras", label: "Futuras" },
  { slug: "em-andamento", label: "Em andamento" },
  { slug: "concluidas", label: "Concluídas" },
  { slug: "canceladas", label: "Canceladas e recusadas" },
] as const;

export type OwnerBookingTab = (typeof ownerBookingTabs)[number]["slug"];

export function parseOwnerBookingTab(value: unknown): OwnerBookingTab {
  return ownerBookingTabs.find((tab) => tab.slug === value)?.slug ?? "todas";
}

export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Orçamento gravado no pedido (quote_stay). Lido com cuidado: é JSON. */
export type QuoteEstimate = {
  lines: { label: string; nights: number; unitPrice: number; amount: number }[];
  subtotal: number | null;
  fees: { label: string; amount: number }[];
  deposits: { label: string; amount: number }[];
  total: number | null;
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown) => (typeof v === "string" ? v : "");
const list = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);

export function parseQuote(raw: unknown): QuoteEstimate {
  const quote = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    lines: list(quote.lines)
      .map((l) => ({
        label: str(l.label),
        nights: num(l.nights) ?? 0,
        unitPrice: num(l.unit_price) ?? 0,
        amount: num(l.amount) ?? 0,
      }))
      .filter((l) => l.label),
    subtotal: num(quote.subtotal),
    fees: list(quote.fees)
      .map((f) => ({ label: str(f.label), amount: num(f.amount) ?? 0 }))
      .filter((f) => f.label),
    deposits: list(quote.deposits)
      .map((d) => ({ label: str(d.label), amount: num(d.amount) ?? 0 }))
      .filter((d) => d.label),
    total: num(quote.total),
  };
}

/** Período ocupado do calendário, como devolvido por owner_calendar. */
export type CalendarBlock = {
  property_id: string;
  start_date: string;
  end_date: string;
  kind: BlockKind;
  booking_request_id: string | null;
};

export type SeasonalRate = {
  label: string;
  start: string;
  end: string;
  nightlyPrice: number;
  minNights: number | null;
};

export type DayState = "free" | "booking" | "owner" | "maintenance";

export type DayInfo = {
  date: string;
  state: DayState;
  /** Pedido pendente que inclui esta noite (não bloqueia; o admin decide). */
  pending: boolean;
  /** Tarifa da noite (sazonal ou a base) e estadia mínima, se houver. */
  price: number | null;
  rateLabel: string | null;
  minNights: number;
};

/** Situação da noite que começa em `date`. */
export function dayInfo(
  date: string,
  {
    blocks,
    pendingStays,
    rates,
    basePrice,
    baseMinNights,
  }: {
    blocks: Pick<CalendarBlock, "start_date" | "end_date" | "kind">[];
    pendingStays: { check_in: string; check_out: string }[];
    rates: SeasonalRate[];
    basePrice: number | null;
    baseMinNights: number;
  },
): DayInfo {
  const block = blocks.find((b) => b.start_date <= date && date < b.end_date);
  const rate = rates.find((r) => r.start <= date && date < r.end);
  return {
    date,
    state: block ? block.kind : "free",
    pending: !block && pendingStays.some((s) => s.check_in <= date && date < s.check_out),
    price: rate ? rate.nightlyPrice : basePrice,
    rateLabel: rate ? rate.label : null,
    minNights: Math.max(baseMinNights, rate?.minNights ?? 0),
  };
}

export type Occupancy = Record<DayState, number> & { days: number };

/** Noites de cada tipo entre `from` (inclusive) e `from + days` (exclusive). */
export function occupancy(
  blocks: Pick<CalendarBlock, "start_date" | "end_date" | "kind">[],
  from: string,
  days: number,
): Occupancy {
  const result: Occupancy = { days, free: 0, booking: 0, owner: 0, maintenance: 0 };
  for (let i = 0; i < days; i++) {
    const date = addDaysISO(from, i);
    const block = blocks.find((b) => b.start_date <= date && date < b.end_date);
    result[block ? block.kind : "free"] += 1;
  }
  return result;
}

export const ownerRequestStatusLabels: Record<Enums["owner_request_status"], string> = {
  pending: "Em análise",
  approved: "Aprovado",
  rejected: "Recusado",
  cancelled: "Cancelado por você",
};

export const ownerRequestStatusTones: Record<Enums["owner_request_status"], BadgeTone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  cancelled: "muted",
};
