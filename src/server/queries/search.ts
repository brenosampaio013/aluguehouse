import "server-only";

import { createSupabasePublicClient } from "@/lib/supabase/public";
import { listingStatus } from "@/lib/properties/listing";
import { findDestination } from "@/lib/destinations";
import {
  MAP_RESULTS_LIMIT,
  PAGE_SIZE,
  sortToDb,
  type RentalFilters,
  type RentalMode,
} from "@/lib/search/params";
import { sortToDb as saleSortToDb } from "@/lib/search/shared";
import type { SaleFilters } from "@/lib/search/sale-params";

import type { PropertyCardData } from "./public-properties";

export type RentalStay = { nights: number; total: number; nightlyAverage: number | null };

export type RentalResult = PropertyCardData & { stay: RentalStay | null };

/** Ponto do mapa: só imóveis com localização aproximada cadastrada. */
export type RentalMarker = {
  id: string;
  slug: string;
  title: string;
  place: string;
  lat: number;
  lng: number;
  /** Diária (média do período, com datas) ou valor do mês; sem taxas. */
  price: number | null;
  priceKind: "night" | "month";
  /** Total com taxas, quando há datas. */
  total: number | null;
  nights: number | null;
  rating: { average: number; count: number } | null;
  cover: PropertyCardData["cover"];
};

export type RentalSearch =
  | {
      status: "ok";
      /** Imóveis da página atual. */
      items: RentalResult[];
      /** Todos os imóveis encontrados com localização (até MAP_RESULTS_LIMIT). */
      markers: RentalMarker[];
      total: number;
      /** Encontrou mais que MAP_RESULTS_LIMIT: a lista mostra só os primeiros. */
      capped: boolean;
      /** Imóveis encontrados sem localização (aparecem só na lista). */
      withoutLocation: number;
    }
  | { status: "invalid"; message: string };

/** Mensagens para os códigos de erro da busca (docs/banco.md). */
const messages: Record<string, string> = {
  invalid_dates: "Informe a chegada e a saída, com a saída depois da chegada.",
  past_check_in: "A data de chegada já passou. Escolha uma data a partir de hoje.",
  seasonal_max_29: "Temporada vai até 29 noites. Para 30 noites ou mais, veja o aluguel mensal.",
  monthly_min_30: "Aluguel mensal começa em 30 noites. Para estadias menores, veja a temporada.",
  max_nights: "O período máximo é de 90 noites.",
  invalid_area: "A área do mapa é inválida. Mova o mapa e pesquise de novo.",
};

/**
 * Busca de aluguel (temporada e mensal) com mapa: uma consulta traz todos os
 * imóveis encontrados (até MAP_RESULTS_LIMIT), com coordenadas aproximadas,
 * preço do período, avaliação e capa. A lista mostra a página atual; o mapa,
 * todos os que têm localização.
 */
export async function searchRentals(
  mode: RentalMode,
  filters: RentalFilters,
): Promise<RentalSearch> {
  const destination = findDestination(filters.destino);
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.rpc("search_rentals_map", {
    p_mode: mode,
    p_region: filters.regiao,
    p_city: destination?.city,
    p_neighborhood: destination?.neighborhood,
    p_bbox: filters.area,
    p_check_in: filters.chegada,
    p_check_out: filters.saida,
    p_guests: filters.hospedes,
    p_bedrooms: filters.quartos,
    p_type: filters.tipo,
    p_price_min: filters.precoMin,
    p_price_max: filters.precoMax,
    p_amenities: filters.comodidades.length > 0 ? filters.comodidades : undefined,
    p_sort: sortToDb[filters.ordem],
    p_limit: MAP_RESULTS_LIMIT,
  });

  if (error) {
    const message = messages[error.message];
    if (message) return { status: "invalid", message };
    throw error;
  }

  const rows = data ?? [];
  const priceKind = mode === "seasonal" ? "night" : "month";

  const results = rows.map((row): RentalResult => {
    const location =
      row.approx_lat !== null && row.approx_lng !== null
        ? { lat: Number(row.approx_lat), lng: Number(row.approx_lng) }
        : null;
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      city: row.city,
      neighborhood: row.neighborhood,
      bedrooms: row.bedrooms,
      suites: row.suites,
      maxGuests: row.max_guests,
      price: row.unit_price === null ? null : { kind: priceKind, amount: row.unit_price },
      cover:
        row.cover_path && row.cover_width
          ? {
              path: row.cover_path,
              width: row.cover_width,
              alt: row.cover_alt ?? row.title,
              isDemo: row.cover_is_demo ?? false,
            }
          : null,
      location,
      listing: listingStatus({ offers_sale: row.offers_sale }),
      rating:
        row.rating_avg !== null && row.rating_count > 0
          ? { average: Number(row.rating_avg), count: row.rating_count }
          : null,
      stay:
        row.nights && row.quote_total !== null
          ? {
              nights: row.nights,
              total: row.quote_total,
              nightlyAverage: mode === "seasonal" ? row.unit_price : null,
            }
          : null,
    };
  });

  const markers = results.flatMap((item): RentalMarker[] =>
    item.location
      ? [
          {
            id: item.id,
            slug: item.slug,
            title: item.title,
            place: [item.neighborhood, item.city].filter(Boolean).join(" · "),
            lat: item.location.lat,
            lng: item.location.lng,
            price: item.price?.amount ?? null,
            priceKind,
            total: item.stay?.total ?? null,
            nights: item.stay?.nights ?? null,
            rating: item.rating ?? null,
            cover: item.cover,
          },
        ]
      : [],
  );

  const offset = (filters.pagina - 1) * PAGE_SIZE;
  const total = rows[0]?.total_count ?? 0;
  return {
    status: "ok",
    items: results.slice(offset, offset + PAGE_SIZE),
    markers,
    total,
    capped: total > rows.length,
    withoutLocation: results.length - markers.length,
  };
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

type CardDetails = Pick<PropertyCardData, "location" | "listing">;

/**
 * Localização aproximada (pública), para o mapa da listagem, e selo sobre a
 * foto (imóvel de aluguel que também está à venda) de cada imóvel.
 */
async function loadDetails(ids: string[]): Promise<Map<string, CardDetails>> {
  const details = new Map<string, CardDetails>();
  if (ids.length === 0) return details;
  const { data, error } = await createSupabasePublicClient()
    .from("properties")
    .select("id, approx_lat, approx_lng, offers_sale")
    .in("id", ids);
  if (error) throw error;
  for (const row of data) {
    details.set(row.id, {
      location:
        row.approx_lat !== null && row.approx_lng !== null
          ? { lat: row.approx_lat, lng: row.approx_lng }
          : null,
      listing: listingStatus(row),
    });
  }
  return details;
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
    p_sort: saleSortToDb[filters.ordem],
    p_limit: PAGE_SIZE,
    p_offset: (filters.pagina - 1) * PAGE_SIZE,
  });
  if (error) throw error;

  const ids = data.map((row) => row.id);
  const [covers, details] = await Promise.all([loadCovers(ids), loadDetails(ids)]);
  const items = data.map((row): PropertyCardData => ({
    id: row.id,
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
    location: details.get(row.id)?.location ?? null,
    listing: "sale",
  }));
  return { items, total: data[0]?.total_count ?? 0 };
}

export async function listAmenities() {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.from("amenities").select("slug, label").order("label");
  if (error) throw error;
  return data;
}
