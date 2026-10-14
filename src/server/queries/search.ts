import "server-only";

import { createSupabasePublicClient } from "@/lib/supabase/public";
import { PAGE_SIZE, sortToDb, type RentalFilters, type RentalMode } from "@/lib/search/params";
import type { SaleFilters } from "@/lib/search/sale-params";

import type { PropertyCardData } from "./public-properties";

export type RentalResult = PropertyCardData & { stay: { nights: number; total: number } | null };

export type RentalSearch =
  { status: "ok"; items: RentalResult[]; total: number } | { status: "invalid"; message: string };

/** Mensagens para os códigos de erro da busca (docs/banco.md). */
const messages: Record<string, string> = {
  invalid_dates: "Informe a chegada e a saída, com a saída depois da chegada.",
  past_check_in: "A data de chegada já passou. Escolha uma data a partir de hoje.",
  seasonal_max_29: "Temporada vai até 29 noites. Para 30 noites ou mais, veja o aluguel mensal.",
  monthly_min_30: "Aluguel mensal começa em 30 noites. Para estadias menores, veja a temporada.",
  max_nights: "O período máximo é de 90 noites.",
};

export async function searchRentals(
  mode: RentalMode,
  filters: RentalFilters,
): Promise<RentalSearch> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.rpc("search_rentals", {
    p_mode: mode,
    p_region: filters.regiao,
    p_check_in: filters.chegada,
    p_check_out: filters.saida,
    p_guests: filters.hospedes,
    p_bedrooms: filters.quartos,
    p_price_max: filters.precoMax,
    p_amenities: filters.comodidades.length > 0 ? filters.comodidades : undefined,
    p_sort: sortToDb[filters.ordem],
    p_limit: PAGE_SIZE,
    p_offset: (filters.pagina - 1) * PAGE_SIZE,
  });

  if (error) {
    const message = messages[error.message];
    if (message) return { status: "invalid", message };
    throw error;
  }

  const rows = data ?? [];
  const ids = rows.map((row) => row.id);
  const [covers, locations] = await Promise.all([loadCovers(ids), loadLocations(ids)]);

  const items = rows.map((row): RentalResult => ({
    slug: row.slug,
    title: row.title,
    city: row.city,
    neighborhood: row.neighborhood,
    bedrooms: row.bedrooms,
    suites: row.suites,
    maxGuests: row.max_guests,
    price:
      row.base_price === null
        ? null
        : { kind: mode === "seasonal" ? "night" : "month", amount: row.base_price },
    cover: covers.get(row.id) ?? null,
    location: locations.get(row.id) ?? null,
    stay:
      row.nights && row.quote_total !== null
        ? { nights: row.nights, total: row.quote_total }
        : null,
  }));

  return { status: "ok", items, total: rows[0]?.total_count ?? 0 };
}

/** Foto de capa (ou a primeira) de cada imóvel, em uma única consulta. */
async function loadCovers(
  ids: string[],
): Promise<Map<string, NonNullable<PropertyCardData["cover"]>>> {
  const covers = new Map<string, NonNullable<PropertyCardData["cover"]>>();
  if (ids.length === 0) return covers;
  const { data, error } = await createSupabasePublicClient()
    .from("property_media")
    .select("property_id, storage_path, width, alt_text, is_cover, is_demo, position")
    .in("property_id", ids)
    .eq("kind", "image")
    .order("is_cover", { ascending: false })
    .order("position");
  if (error) throw error;
  for (const m of data) {
    if (!covers.has(m.property_id) && m.storage_path && m.width) {
      covers.set(m.property_id, {
        path: m.storage_path,
        width: m.width,
        alt: m.alt_text,
        isDemo: m.is_demo,
      });
    }
  }
  return covers;
}

/** Localização aproximada (pública) de cada imóvel, para o mapa da listagem. */
async function loadLocations(ids: string[]): Promise<Map<string, { lat: number; lng: number }>> {
  const locations = new Map<string, { lat: number; lng: number }>();
  if (ids.length === 0) return locations;
  const { data, error } = await createSupabasePublicClient()
    .from("properties")
    .select("id, approx_lat, approx_lng")
    .in("id", ids);
  if (error) throw error;
  for (const row of data) {
    if (row.approx_lat !== null && row.approx_lng !== null) {
      locations.set(row.id, { lat: row.approx_lat, lng: row.approx_lng });
    }
  }
  return locations;
}

export type SaleSearch = { items: PropertyCardData[]; total: number };

export async function searchSales(filters: SaleFilters): Promise<SaleSearch> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.rpc("search_sales", {
    p_region: filters.regiao,
    p_type: filters.tipo,
    p_price_max: filters.precoMax,
    p_bedrooms: filters.quartos,
    p_area_min: filters.areaMin,
    p_amenities: filters.comodidades.length > 0 ? filters.comodidades : undefined,
    p_sort: sortToDb[filters.ordem],
    p_limit: PAGE_SIZE,
    p_offset: (filters.pagina - 1) * PAGE_SIZE,
  });
  if (error) throw error;

  const ids = data.map((row) => row.id);
  const [covers, locations] = await Promise.all([loadCovers(ids), loadLocations(ids)]);
  const items = data.map((row): PropertyCardData => ({
    slug: row.slug,
    title: row.title,
    city: row.city,
    neighborhood: row.neighborhood,
    bedrooms: row.bedrooms,
    suites: row.suites,
    maxGuests: 0,
    areaM2: row.area_m2,
    price: { kind: "sale", amount: row.sale_price },
    cover: covers.get(row.id) ?? null,
    location: locations.get(row.id) ?? null,
  }));
  return { items, total: data[0]?.total_count ?? 0 };
}

export async function listAmenities() {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.from("amenities").select("slug, label").order("label");
  if (error) throw error;
  return data;
}
