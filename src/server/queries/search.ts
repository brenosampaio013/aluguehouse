import "server-only";

import { createSupabasePublicClient } from "@/lib/supabase/public";
import { PAGE_SIZE, sortToDb, type RentalFilters, type RentalMode } from "@/lib/search/params";

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
  const { data: media, error: mediaError } = ids.length
    ? await supabase
        .from("property_media")
        .select("property_id, storage_path, width, alt_text, is_cover, is_demo, position")
        .in("property_id", ids)
        .eq("kind", "image")
    : { data: [], error: null };
  if (mediaError) throw mediaError;

  const items = rows.map((row): RentalResult => {
    const cover = (media ?? [])
      .filter((m) => m.property_id === row.id && m.storage_path && m.width)
      .sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.position - b.position)[0];
    return {
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
      cover: cover
        ? {
            path: cover.storage_path!,
            width: cover.width!,
            alt: cover.alt_text,
            isDemo: cover.is_demo,
          }
        : null,
      stay:
        row.nights && row.quote_total !== null
          ? { nights: row.nights, total: row.quote_total }
          : null,
    };
  });

  return { status: "ok", items, total: rows[0]?.total_count ?? 0 };
}

export async function listAmenities() {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.from("amenities").select("slug, label").order("label");
  if (error) throw error;
  return data;
}
