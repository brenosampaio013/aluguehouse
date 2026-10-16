import "server-only";

import { listingStatus, type ListingStatus } from "@/lib/properties/listing";
import type { RegionSlug } from "@/lib/regions";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export type PropertyCardData = {
  id: string;
  slug: string;
  title: string;
  city: string;
  neighborhood: string | null;
  bedrooms: number;
  suites: number;
  maxGuests: number;
  areaM2?: number | null;
  /** Localização pública aproximada (nunca a exata). */
  location?: { lat: number; lng: number } | null;
  price: { kind: "night" | "month" | "sale"; amount: number } | null;
  cover: { path: string; width: number; alt: string; isDemo: boolean } | null;
  /** Selo sobre a foto (ex.: "CASA À VENDA"). */
  listing?: ListingStatus | null;
};

export type CardRow = {
  id: string;
  slug: string;
  title: string;
  city: string;
  neighborhood: string | null;
  bedrooms: number;
  suites: number;
  max_guests: number;
  offers_seasonal: boolean;
  offers_monthly: boolean;
  offers_sale: boolean;
  nightly_price: number | null;
  monthly_price: number | null;
  sale_price: number | null;
  property_media: {
    kind: string;
    storage_path: string | null;
    width: number | null;
    alt_text: string;
    is_cover: boolean;
    is_demo: boolean;
    position: number;
  }[];
};

/** Preço mostrado no cartão: diária, depois mensal, depois venda. */
export function cardPrice(
  row: Pick<
    CardRow,
    | "offers_seasonal"
    | "offers_monthly"
    | "offers_sale"
    | "nightly_price"
    | "monthly_price"
    | "sale_price"
  >,
): PropertyCardData["price"] {
  if (row.offers_seasonal && row.nightly_price !== null)
    return { kind: "night", amount: row.nightly_price };
  if (row.offers_monthly && row.monthly_price !== null)
    return { kind: "month", amount: row.monthly_price };
  if (row.offers_sale && row.sale_price !== null) return { kind: "sale", amount: row.sale_price };
  return null;
}

export function toCard(row: CardRow): PropertyCardData {
  const images = row.property_media
    .filter((m) => m.kind === "image" && m.storage_path && m.width)
    .sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.position - b.position);
  const cover = images[0];
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    city: row.city,
    neighborhood: row.neighborhood,
    bedrooms: row.bedrooms,
    suites: row.suites,
    maxGuests: row.max_guests,
    price: cardPrice(row),
    listing: listingStatus(row),
    cover: cover
      ? {
          path: cover.storage_path!,
          width: cover.width!,
          alt: cover.alt_text,
          isDemo: cover.is_demo,
        }
      : null,
  };
}

export const CARD_COLUMNS =
  "id, slug, title, city, neighborhood, bedrooms, suites, max_guests, offers_seasonal, offers_monthly, offers_sale, nightly_price, monthly_price, sale_price, property_media(kind, storage_path, width, alt_text, is_cover, is_demo, position)";

/** Imóveis publicados mais recentes, para a página inicial. */
export async function getFeaturedProperties(limit = 6): Promise<PropertyCardData[]> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("properties")
    .select(CARD_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as CardRow[]).map(toCard);
}

/**
 * Maior capacidade entre os imóveis publicados para aluguel: limite de
 * hóspedes da busca. `null` quando não há nenhum.
 */
export async function getMaxGuestCapacity(): Promise<number | null> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("properties")
    .select("max_guests")
    .eq("status", "published")
    .or("offers_seasonal.eq.true,offers_monthly.eq.true")
    .order("max_guests", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.max_guests ?? null;
}

/**
 * Quantos imóveis cada região tem na listagem de temporada (mesmo critério
 * de `search_rentals` sem filtros: publicado e com temporada).
 */
export async function getSeasonalCountsByRegion(): Promise<Partial<Record<RegionSlug, number>>> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("properties")
    .select("region")
    .eq("status", "published")
    .eq("offers_seasonal", true)
    .not("region", "is", null);
  if (error) throw error;
  const counts: Partial<Record<RegionSlug, number>> = {};
  for (const { region } of data as { region: RegionSlug }[]) {
    counts[region] = (counts[region] ?? 0) + 1;
  }
  return counts;
}
