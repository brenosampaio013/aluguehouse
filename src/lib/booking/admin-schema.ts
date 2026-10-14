import { z } from "@/lib/zod";

import { isRealDate } from "@/lib/search/shared";

const isoDate = z.string().refine(isRealDate, "Informe a data.");

/** Bloqueio manual: primeira e última noite (inclusivas). */
export const blockSchema = z
  .object({
    kind: z.enum(["owner", "maintenance"], { error: "Escolha o motivo." }),
    start_date: isoDate,
    end_date: isoDate,
    note: z.string().trim().max(500, "Até 500 caracteres.").default(""),
  })
  .refine((data) => data.end_date >= data.start_date, {
    path: ["end_date"],
    message: "A última noite deve ser igual ou posterior à primeira.",
  });
