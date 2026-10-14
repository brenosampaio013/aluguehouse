import type { Database } from "@/types/database";

type Enums = Database["public"]["Enums"];
export type BookingStatus = Enums["booking_status"];
export type BlockKind = Enums["block_kind"];

export const bookingStatusLabels: Record<BookingStatus, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  declined: "Recusada",
  cancelled: "Cancelada",
  expired: "Expirada",
};

export const blockKindLabels: Record<BlockKind, string> = {
  booking: "Reserva",
  owner: "Uso do proprietário",
  maintenance: "Manutenção",
};

export const rentalModeLabels: Record<Enums["rental_mode"], string> = {
  seasonal: "Temporada",
  monthly: "Mensal",
};

/** Abas da lista de solicitações (slug na URL → situação no banco). */
export const bookingTabs = [
  { slug: "pendentes", label: "Pendentes", status: "pending" },
  { slug: "aprovadas", label: "Aprovadas", status: "approved" },
  { slug: "recusadas", label: "Recusadas", status: "declined" },
  { slug: "canceladas", label: "Canceladas", status: "cancelled" },
  { slug: "todas", label: "Todas", status: null },
] as const satisfies readonly { slug: string; label: string; status: BookingStatus | null }[];

export type BookingTab = (typeof bookingTabs)[number];

export function parseBookingTab(value: string | string[] | undefined): BookingTab {
  const slug = Array.isArray(value) ? value[0] : value;
  return bookingTabs.find((tab) => tab.slug === slug) ?? bookingTabs[0];
}
