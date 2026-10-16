import "server-only";

import type { InquiryFilters } from "@/lib/admin/filters";
import { EXPORT_LIMIT, orIlike } from "@/lib/admin/list-params";
import type { InquiryStatus } from "@/lib/inquiries";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

import { pagedRows } from "./paged";

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export async function countNewInquiries(supabase: Client) {
  const { count, error } = await supabase
    .from("inquiries")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");
  if (error) throw error;
  return count ?? 0;
}

/** Contatos com busca, filtros e paginação no banco. */
export async function searchInquiries(
  supabase: Client,
  filters: InquiryFilters,
  range: { from: number; to: number } | null,
) {
  let query = supabase
    .from("inquiries")
    .select(
      "id, kind, name, email, phone, message, preferred_datetime, status, created_at, properties(id, title, slug)",
      { count: "exact" },
    );
  if (filters.tab.status) query = query.eq("status", filters.tab.status);
  if (filters.kind) query = query.eq("kind", filters.kind);
  if (filters.propertyId) query = query.eq("property_id", filters.propertyId);
  if (filters.q) query = query.or(orIlike(["name", "email", "message"], filters.q));
  query = query.order("created_at", { ascending: filters.dir === "asc" }).order("id");
  query = range ? query.range(range.from, range.to) : query.limit(EXPORT_LIMIT);
  return pagedRows(await query);
}

/** Quantos contatos em cada situação (para as abas). */
export async function countInquiriesByStatus(supabase: Client) {
  const statuses = ["new", "in_progress", "closed"] as const;
  const results = await Promise.all(
    statuses.map((status) =>
      supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("status", status),
    ),
  );
  const counts: Record<InquiryStatus, number> = { new: 0, in_progress: 0, closed: 0 };
  results.forEach((result, index) => {
    if (result.error) throw result.error;
    counts[statuses[index]!] = result.count ?? 0;
  });
  return counts;
}
