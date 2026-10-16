import "server-only";

import { notFound } from "next/navigation";

import type { PropertyFilters } from "@/lib/admin/filters";
import { orIlike } from "@/lib/admin/list-params";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

import { pagedRows, withCount, type Paging } from "./paged";

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export async function getPropertyForEdit(supabase: Client, id: string) {
  const [property, privateData, media, amenities, selected, rates, fees] = await Promise.all([
    supabase.from("properties").select("*").eq("id", id).maybeSingle(),
    supabase.from("property_private").select("*").eq("property_id", id).maybeSingle(),
    supabase
      .from("property_media")
      .select("*")
      .eq("property_id", id)
      .order("position")
      .order("created_at"),
    supabase.from("amenities").select("id, label").order("label"),
    supabase.from("property_amenities").select("amenity_id").eq("property_id", id),
    supabase.from("seasonal_rates").select("*").eq("property_id", id).order("period"),
    supabase
      .from("property_fees")
      .select("*")
      .eq("property_id", id)
      .order("position")
      .order("created_at"),
  ]);

  if (property.error) throw property.error;
  if (!property.data) notFound();

  return {
    property: property.data,
    privateData: privateData.data,
    media: media.data ?? [],
    amenities: amenities.data ?? [],
    selectedAmenityIds: new Set((selected.data ?? []).map((row) => row.amenity_id)),
    rates: rates.data ?? [],
    fees: fees.data ?? [],
  };
}

const propertySortColumns = {
  atualizado: "updated_at",
  titulo: "title",
  cidade: "city",
  criado: "created_at",
} as const;

const modeColumns = {
  temporada: "offers_seasonal",
  mensal: "offers_monthly",
  venda: "offers_sale",
} as const;

/**
 * Lista do painel com busca, filtros, ordenação e paginação no banco
 * (a exportação lê todas as páginas com fetchAllPages).
 */
export async function searchPropertiesForAdmin(
  supabase: Client,
  filters: PropertyFilters,
  paging: Paging,
) {
  let query = supabase
    .from("properties")
    .select(
      "id, slug, title, city, neighborhood, region, property_type, status, offers_seasonal, offers_monthly, offers_sale, nightly_price, monthly_price, sale_price, bedrooms, max_guests, created_at, updated_at, published_at",
      { count: withCount(paging) },
    );
  if (filters.q) query = query.or(orIlike(["title", "city", "neighborhood", "slug"], filters.q));
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.mode) query = query.eq(modeColumns[filters.mode], true);
  if (paging.kind === "after") {
    if (paging.afterId) query = query.gt("id", paging.afterId);
    return pagedRows(await query.order("id").limit(paging.size));
  }
  query = query
    .order(propertySortColumns[filters.sort.key], { ascending: filters.sort.dir === "asc" })
    .order("id");
  return pagedRows(await query.range(paging.from, paging.to));
}
