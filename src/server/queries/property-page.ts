import "server-only";

import { cache } from "react";

import { createSupabasePublicClient } from "@/lib/supabase/public";

/**
 * Dados públicos de um imóvel publicado. Usa o cliente anônimo: as políticas
 * RLS garantem que rascunhos e dados privados nunca chegam aqui.
 */
export const getPublicProperty = cache(async (slug: string) => {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("properties")
    .select(
      `id, slug, title, summary, description, property_type, city, neighborhood, region,
       approx_lat, approx_lng, bedrooms, suites, bathrooms, max_guests, parking_spots, area_m2,
       distance_to_beach_m, offers_seasonal, offers_monthly, offers_sale, nightly_price, monthly_price,
       min_nights, max_nights, sale_price, condo_fee, iptu_yearly, check_in_time, check_out_time, house_rules,
       published_at,
       property_media(id, kind, storage_path, width, height, alt_text, is_cover, is_demo, position),
       property_amenities(amenities(slug, label))`,
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { property_media: media, property_amenities: amenityRows, ...property } = data;

  const images = media
    .filter((m) => m.kind === "image" && m.storage_path && m.width)
    .sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.position - b.position)
    .map((m) => ({
      id: m.id,
      path: m.storage_path!,
      width: m.width!,
      height: m.height,
      alt: m.alt_text,
      isDemo: m.is_demo,
    }));

  const amenities = amenityRows
    .flatMap((row) => (row.amenities ? [row.amenities] : []))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

  return { ...property, images, amenities };
});

export type PublicProperty = NonNullable<Awaited<ReturnType<typeof getPublicProperty>>>;

export type StayQuote = {
  nights: number;
  lines: { label: string; nights: number; unit_price: number; amount: number }[];
  subtotal: number;
  fees: { label: string; amount: number }[];
  total: number;
  deposits: { label: string; amount: number }[];
};

/** Orçamento para as datas vindas da busca, ou o motivo de não ser possível. */
export async function quoteForSearch(
  propertyId: string,
  mode: "seasonal" | "monthly",
  checkIn: string,
  checkOut: string,
  guests: number,
): Promise<{ ok: true; quote: StayQuote } | { ok: false; reason: string; detail?: string }> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.rpc("quote_stay", {
    p_property_id: propertyId,
    p_mode: mode,
    p_check_in: checkIn,
    p_check_out: checkOut,
    p_guests: guests,
  });
  if (error) return { ok: false, reason: error.message, detail: error.details ?? undefined };
  return { ok: true, quote: data as unknown as StayQuote };
}

/** Datas ocupadas no intervalo (sem motivo nem dados de hóspedes). */
export async function isRangeAvailable(propertyId: string, checkIn: string, checkOut: string) {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.rpc("get_unavailable_ranges", {
    p_property_id: propertyId,
    p_from: checkIn,
    p_to: checkOut,
  });
  if (error) throw error;
  return data.length === 0;
}

/** Períodos ocupados na janela (para o calendário público). */
export async function getUnavailableRanges(propertyId: string, from: string, to: string) {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.rpc("get_unavailable_ranges", {
    p_property_id: propertyId,
    p_from: from,
    p_to: to,
  });
  if (error) throw error;
  return data.map((row) => ({ start: row.start_date, end: row.end_date }));
}
