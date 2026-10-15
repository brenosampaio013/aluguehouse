import { normalizePhone } from "@/lib/booking/schema";
import { isRealDate } from "@/lib/search/shared";
import { z } from "@/lib/zod";

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
