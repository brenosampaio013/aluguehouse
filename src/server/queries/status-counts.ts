import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "@/lib/zod";
import type { Database } from "@/types/database";

type Enums = Database["public"]["Enums"];

const statusLists = {
  properties: ["draft", "published", "archived"],
  booking_requests: ["pending", "approved", "declined", "cancelled", "expired"],
  inquiries: ["new", "in_progress", "closed"],
  reviews: ["pending", "approved", "rejected"],
} as const satisfies {
  properties: readonly Enums["property_status"][];
  booking_requests: readonly Enums["booking_status"][];
  inquiries: readonly Enums["inquiry_status"][];
  reviews: readonly Enums["review_status"][];
};

export type StatusCounts = {
  [T in keyof typeof statusLists]: Record<(typeof statusLists)[T][number], number>;
};

const countsSchema = z.record(z.string(), z.record(z.string(), z.coerce.number()));

/** Completa com zero as situações sem nenhum registro. */
export function normalizeStatusCounts(raw: unknown): StatusCounts {
  const parsed = countsSchema.parse(raw);
  const result = {} as Record<string, Record<string, number>>;
  for (const [table, statuses] of Object.entries(statusLists)) {
    result[table] = Object.fromEntries(statuses.map((s) => [s, parsed[table]?.[s] ?? 0]));
  }
  return result as StatusCounts;
}

/**
 * Contagens por situação de todas as listas do painel numa só chamada ao
 * banco (public.admin_status_counts). Memorizada por requisição: o menu
 * (layout) e as abas da página reutilizam o mesmo resultado.
 */
export const getStatusCounts = cache(async (): Promise<StatusCounts> => {
  // Sem argumentos: o cache do React compara argumentos por identidade, e
  // layout e página criam clientes diferentes. A sessão vem dos cookies.
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_status_counts");
  if (error) throw error;
  return normalizeStatusCounts(data);
});
