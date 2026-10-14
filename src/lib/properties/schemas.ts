import { z } from "zod";

import { parseDecimalInput } from "@/lib/format";

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use no máximo ${max} caracteres.`)
    .transform((value) => (value === "" ? null : value));

const decimal = (label: string) =>
  z.preprocess(
    parseDecimalInput,
    z
      .number({ error: `Informe ${label} em números, ex.: 1.800,00.` })
      .positive(`${label[0]!.toUpperCase()}${label.slice(1)} deve ser maior que zero.`)
      .max(999_999_999, "Valor alto demais.")
      .optional(),
  );

const nonNegativeDecimal = (label: string) =>
  z.preprocess(
    parseDecimalInput,
    z
      .number({ error: `Informe ${label} em números.` })
      .min(0, "Use zero ou mais.")
      .max(999_999_999)
      .optional(),
  );

const integer = (min: number, max: number) =>
  z.preprocess(
    (value) => (value === "" || value === null ? undefined : Number(value)),
    z
      .number({ error: "Informe um número inteiro." })
      .int("Informe um número inteiro.")
      .min(min, `Use ${min} ou mais.`)
      .max(max, `Use até ${max}.`),
  );

const optionalInteger = (min: number, max: number) =>
  z.preprocess(
    (value) => (value === "" || value === null ? undefined : Number(value)),
    z
      .number({ error: "Informe um número inteiro." })
      .int("Informe um número inteiro.")
      .min(min, `Use ${min} ou mais.`)
      .max(max, `Use até ${max}.`)
      .optional(),
  );

const checkbox = z.preprocess((value) => value === "on" || value === "true", z.boolean());

const propertyType = z.enum(["casa", "apartamento", "cobertura", "terreno", "outro"], {
  error: "Escolha o tipo do imóvel.",
});

const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Informe o horário, ex.: 15:00.");

export const createPropertySchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Use pelo menos 3 caracteres.")
    .max(120, "Use no máximo 120 caracteres."),
  property_type: propertyType,
  city: z.string().trim().min(2, "Informe a cidade.").max(80),
});

export const generalSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Use pelo menos 3 caracteres.")
      .max(120, "Use no máximo 120 caracteres."),
    slug: z
      .string()
      .trim()
      .regex(
        /^[a-z0-9]+(-[a-z0-9]+)*$/,
        "Use só letras minúsculas, números e hífens, ex.: casa-modulo-5.",
      )
      .max(100),
    summary: text(300),
    description: text(10000),
    property_type: propertyType,
    city: z.string().trim().min(2, "Informe a cidade.").max(80),
    neighborhood: text(80),
    region: z
      .enum(
        ["", "riviera-de-sao-lourenco", "sao-sebastiao", "ilhabela", "caraguatatuba", "ubatuba"],
        {
          error: "Escolha uma região da lista.",
        },
      )
      .transform((value) => (value === "" ? null : value)),
    offers_seasonal: checkbox,
    offers_monthly: checkbox,
    offers_sale: checkbox,
    bedrooms: integer(0, 50),
    suites: integer(0, 50),
    bathrooms: integer(0, 50),
    max_guests: integer(1, 50),
    parking_spots: integer(0, 50),
    area_m2: decimal("a área"),
    distance_to_beach_m: optionalInteger(0, 100_000),
    nightly_price: decimal("a diária"),
    monthly_price: decimal("o valor mensal"),
    min_nights: integer(1, 29),
    max_nights: integer(1, 90),
    sale_price: decimal("o preço de venda"),
    condo_fee: nonNegativeDecimal("o condomínio"),
    iptu_yearly: nonNegativeDecimal("o IPTU"),
    check_in_time: time,
    check_out_time: time,
    house_rules: text(5000),
  })
  .superRefine((data, ctx) => {
    if (data.suites > data.bedrooms) {
      ctx.addIssue({
        code: "custom",
        path: ["suites"],
        message: "Suítes não podem passar do número de quartos.",
      });
    }
    if (data.min_nights > data.max_nights) {
      ctx.addIssue({
        code: "custom",
        path: ["min_nights"],
        message: "O mínimo não pode passar do máximo de noites.",
      });
    }
    if (data.offers_seasonal && data.nightly_price === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["nightly_price"],
        message: "Informe a diária para oferecer temporada.",
      });
    }
    if (data.offers_monthly && data.monthly_price === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["monthly_price"],
        message: "Informe o valor mensal para oferecer aluguel mensal.",
      });
    }
    if (data.offers_sale && data.sale_price === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["sale_price"],
        message: "Informe o preço para oferecer venda.",
      });
    }
  });

const coordinate = (min: number, max: number) =>
  z.preprocess(
    parseDecimalInput,
    z
      .number({ error: "Informe a coordenada em graus decimais, ex.: -23,8012." })
      .min(min)
      .max(max)
      .optional(),
  );

export const privateSchema = z
  .object({
    full_address: text(300),
    exact_lat: coordinate(-90, 90),
    exact_lng: coordinate(-180, 180),
    owner_notes: text(5000),
  })
  .superRefine((data, ctx) => {
    if ((data.exact_lat === undefined) !== (data.exact_lng === undefined)) {
      ctx.addIssue({
        code: "custom",
        path: ["exact_lng"],
        message: "Informe latitude e longitude juntas.",
      });
    }
  });

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Escolha a data.");

export const seasonalRateSchema = z
  .object({
    label: z.string().trim().min(2, "Dê um nome, ex.: Réveillon.").max(60),
    start_date: isoDate,
    end_date: isoDate,
    nightly_price: decimal("a diária").refine((v) => v !== undefined, "Informe a diária."),
    min_nights: optionalInteger(1, 29),
  })
  .refine((data) => data.end_date >= data.start_date, {
    path: ["end_date"],
    message: "A data final deve ser igual ou posterior à inicial.",
  });

export const feeSchema = z
  .object({
    label: z.string().trim().min(2, "Dê um nome, ex.: Limpeza.").max(60),
    calc: z.enum(["fixed", "per_night", "per_guest_per_night", "percent"]),
    amount: z.preprocess(
      parseDecimalInput,
      z
        .number({ error: "Informe o valor em números." })
        .min(0, "Use zero ou mais.")
        .max(999_999_999),
    ),
    applies_to: z.enum(["both", "seasonal", "monthly"]),
    is_refundable: checkbox,
  })
  .refine((data) => data.calc !== "percent" || data.amount <= 100, {
    path: ["amount"],
    message: "Percentual deve ser até 100.",
  });

export const altTextSchema = z
  .string()
  .trim()
  .min(3, "Descreva a foto em pelo menos 3 caracteres, ex.: Sala de jantar com mesa redonda.")
  .max(250, "Use no máximo 250 caracteres.");

/** Primeira mensagem de cada campo, para exibir junto ao campo. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}
