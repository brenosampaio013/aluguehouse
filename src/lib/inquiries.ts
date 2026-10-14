import { z } from "@/lib/zod";

import { normalizePhone } from "@/lib/booking/schema";
import { isRealDate } from "@/lib/search/shared";
import type { Database } from "@/types/database";

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
] as const satisfies readonly { slug: string; label: string; status: InquiryStatus }[];

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

const optionalPhone = z
  .string()
  .transform(normalizePhone)
  .pipe(
    z.union([
      z.literal(""),
      z.string().regex(/^\d{10,13}$/, "Informe o telefone com DDD, ex.: (13) 99999-9999."),
    ]),
  );

/** Formulário de contato, visita ou interesse em compra. */
export function inquirySchema(today: string) {
  const common = {
    name: z.string().trim().min(2, "Informe seu nome.").max(120, "Nome muito longo."),
    email: z
      .string()
      .trim()
      .min(1, "Informe seu e-mail.")
      .max(254, "E-mail muito longo.")
      .pipe(z.email("Informe um e-mail válido, ex.: nome@exemplo.com.")),
    phone: optionalPhone.default(""),
    visitDate: z
      .string()
      .default("")
      .refine((value) => value === "" || isRealDate(value), "Data inválida.")
      .refine((value) => value === "" || value >= today, "Escolha uma data a partir de hoje."),
    visitPeriod: z.enum(["manha", "tarde"]).default("manha"),
    consent: z.literal("on", { error: "É preciso concordar para enviarmos a mensagem." }),
  };
  const message = z.string().trim().max(4000, "Mensagem muito longa (até 4.000 caracteres).");

  // Cada tipo tem as próprias regras, verificadas junto com os outros campos.
  return z.discriminatedUnion("kind", [
    z.object({
      ...common,
      kind: z.literal("contact"),
      propertyId: z.union([z.literal(""), z.uuid()]).default(""),
      message: message.min(1, "Escreva sua mensagem."),
    }),
    z.object({
      ...common,
      kind: z.enum(["visit", "sale_interest"]),
      propertyId: z.uuid({ error: "Imóvel inválido." }),
      message: message.default(""),
    }),
  ]);
}
