import "server-only";

import type { InquiryFilters } from "@/lib/admin/filters";
import { orIlike } from "@/lib/admin/list-params";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

import { pagedRows, withCount, type Paging } from "./paged";

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** Contatos com busca, filtros e paginação no banco. */
export async function searchInquiries(supabase: Client, filters: InquiryFilters, paging: Paging) {
  let query = supabase
    .from("inquiries")
    .select(
      "id, kind, name, email, phone, message, preferred_datetime, status, created_at, properties(id, title, slug)",
      { count: withCount(paging) },
    );
  if (filters.tab.status) query = query.eq("status", filters.tab.status);
  if (filters.kind) query = query.eq("kind", filters.kind);
  if (filters.propertyId) query = query.eq("property_id", filters.propertyId);
  if (filters.q) query = query.or(orIlike(["name", "email", "message"], filters.q));
  if (paging.kind === "after") {
    if (paging.afterId) query = query.gt("id", paging.afterId);
    return pagedRows(await query.order("id").limit(paging.size));
  }
  query = query.order("created_at", { ascending: filters.dir === "asc" }).order("id");
  return pagedRows(await query.range(paging.from, paging.to));
}
