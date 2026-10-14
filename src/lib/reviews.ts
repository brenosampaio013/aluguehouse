import { z } from "@/lib/zod";

import type { Database } from "@/types/database";

export type ReviewStatus = Database["public"]["Enums"]["review_status"];

export const reviewStatusLabels: Record<ReviewStatus, string> = {
  pending: "Em análise",
  approved: "Publicada",
  rejected: "Não publicada",
};

/** Abas do painel de avaliações (slug na URL → situação no banco). */
export const reviewTabs = [
  { slug: "pendentes", label: "Pendentes", status: "pending" },
  { slug: "publicadas", label: "Publicadas", status: "approved" },
  { slug: "nao-publicadas", label: "Não publicadas", status: "rejected" },
] as const satisfies readonly { slug: string; label: string; status: ReviewStatus }[];

export function parseReviewTab(value: string | string[] | undefined) {
  const slug = Array.isArray(value) ? value[0] : value;
  return reviewTabs.find((tab) => tab.slug === slug) ?? reviewTabs[0];
}

export const reviewSchema = z.object({
  bookingId: z.uuid(),
  rating: z.coerce
    .number({ error: "Escolha uma nota de 1 a 5 estrelas." })
    .int()
    .min(1, "Escolha uma nota de 1 a 5 estrelas.")
    .max(5, "Escolha uma nota de 1 a 5 estrelas."),
  comment: z.string().trim().max(2000, "Até 2.000 caracteres.").default(""),
});

/** Média com uma casa decimal, no formato brasileiro ("4,7"). */
export function averageRating(ratings: number[]): string | null {
  if (ratings.length === 0) return null;
  const average = ratings.reduce((sum, value) => sum + value, 0) / ratings.length;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.round(average * 10) / 10);
}
