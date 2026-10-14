import { z } from "@/lib/zod";

import { isRealDate } from "@/lib/search/shared";

const isoDate = z.string().refine(isRealDate, "Data inválida.");

/** Mantém só os dígitos; aceita "(13) 99619-5221" e "+55 13 99619-5221". */
export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

/** Dados do formulário de solicitação de reserva. */
export const bookingRequestSchema = z
  .object({
    propertyId: z.uuid(),
    checkIn: isoDate,
    checkOut: isoDate,
    guests: z.coerce.number().int().min(1).max(50),
    name: z
      .string()
      .trim()
      .min(2, "Informe seu nome.")
      .max(120, "Nome muito longo (até 120 caracteres)."),
    email: z
      .string()
      .trim()
      .min(1, "Informe seu e-mail.")
      .max(254, "E-mail muito longo.")
      .pipe(z.email("Informe um e-mail válido, ex.: nome@exemplo.com.")),
    phone: z
      .string()
      .transform(normalizePhone)
      .pipe(z.string().regex(/^\d{10,13}$/, "Informe o telefone com DDD, ex.: (13) 99999-9999.")),
    message: z
      .string()
      .trim()
      .max(2000, "Mensagem muito longa (até 2.000 caracteres).")
      .default(""),
    consent: z.literal("on", { error: "É preciso concordar para enviarmos a solicitação." }),
  })
  .refine((data) => data.checkOut > data.checkIn, {
    path: ["checkOut"],
    message: "A saída precisa ser depois da chegada.",
  });

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;

/** Mensagens para os códigos de erro do orçamento e da solicitação no banco. */
export const bookingErrorMessages: Record<string, (detail?: string) => string> = {
  min_nights: (d) => `Nessas datas, este imóvel pede no mínimo ${d} noites.`,
  max_nights: (d) => `Este imóvel aceita no máximo ${d} noites.`,
  guests_exceeded: (d) => `Este imóvel recebe no máximo ${d} hóspedes.`,
  mode_not_offered: () =>
    "Este imóvel não está disponível nessa modalidade para o período escolhido.",
  seasonal_max_29: () => "Temporada vai até 29 noites.",
  monthly_min_30: () => "Aluguel mensal começa em 30 noites.",
  price_unavailable: () =>
    "Ainda não há preço para todas as noites desse período. Fale com a gente.",
  past_check_in: () => "A data de chegada já passou.",
  invalid_dates: () => "A saída precisa ser depois da chegada.",
  unavailable: () => "Essas datas acabaram de ficar indisponíveis. Escolha outro período.",
  property_not_found: () => "Este imóvel não está mais disponível.",
  consent_required: () => "É preciso concordar para enviarmos a solicitação.",
};

export function bookingErrorMessage(
  code: string,
  detail?: string,
  fallback = "Não foi possível calcular o valor para essas datas.",
) {
  return bookingErrorMessages[code]?.(detail) ?? fallback;
}
