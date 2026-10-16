import type { Database } from "@/types/database";

// Sem zod aqui: este arquivo também é usado no navegador (formulário de
// contato e painel). A validação fica em inquiry-schema.ts (servidor).

type Enums = Database["public"]["Enums"];
export type InquiryKind = Enums["inquiry_kind"];
export type InquiryStatus = Enums["inquiry_status"];

export const inquiryKindLabels: Record<InquiryKind, string> = {
  contact: "Mensagem",
  visit: "Pedido de visita",
  sale_interest: "Interesse em compra",
};

export const inquiryStatusLabels: Record<InquiryStatus, string> = {
  new: "Novo",
  in_progress: "Em andamento",
  closed: "Encerrado",
};

export const inquiryTabs = [
  { slug: "novos", label: "Novos", status: "new" },
  { slug: "em-andamento", label: "Em andamento", status: "in_progress" },
  { slug: "encerrados", label: "Encerrados", status: "closed" },
  { slug: "todos", label: "Todos", status: null },
] as const satisfies readonly { slug: string; label: string; status: InquiryStatus | null }[];

export function parseInquiryTab(value: string | string[] | undefined) {
  const slug = Array.isArray(value) ? value[0] : value;
  return inquiryTabs.find((tab) => tab.slug === slug) ?? inquiryTabs[0];
}

/** Período preferido da visita → horário de referência gravado (São Paulo). */
export const visitPeriods = {
  manha: { label: "Manhã", hour: "10:00" },
  tarde: { label: "Tarde", hour: "15:00" },
} as const;

export type VisitPeriod = keyof typeof visitPeriods;

/** Data e período → timestamp com fuso de São Paulo (-03:00). */
export function visitDateTime(date: string, period: VisitPeriod) {
  return `${date}T${visitPeriods[period].hour}:00-03:00`;
}

/** Timestamp gravado → "sábado, 14/11/2026, à tarde". */
export function formatVisit(value: string) {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(date);
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", { hour: "numeric", timeZone: "America/Sao_Paulo" }).format(
      date,
    ),
  );
  return `${day}, ${hour < 12 ? "pela manhã" : "à tarde"}`;
}
