import "server-only";

import { addDaysISO, parseDateRange } from "@/lib/format";
import { PAGE_SIZE } from "@/lib/admin/list-params";
import type { CalendarBlock, OwnerBookingTab, SeasonalRate } from "@/lib/owner/portal";
import type { createSupabaseServerClient } from "@/lib/supabase/server";
import { CARD_COLUMNS, toCard, type CardRow } from "@/server/queries/public-properties";

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/*
 * Consultas do portal do proprietário. Sempre com a sessão dele (RLS) e
 * sempre a partir do vínculo em property_owners: a política pública também
 * deixa ler imóveis publicados de outros donos, então nenhuma página do
 * portal confia só na leitura de `properties`.
 */

const LIST_COLUMNS = `${CARD_COLUMNS}, status, property_type, min_nights`;

type OwnerPropertyRow = CardRow & {
  status: "draft" | "published" | "archived";
  property_type: string;
  min_nights: number;
};

/** Imóveis vinculados ao proprietário logado, por título. */
export async function listOwnerProperties(supabase: Client) {
  const { data, error } = await supabase
    .from("property_owners")
    .select(`property_id, properties(${LIST_COLUMNS})`);
  if (error) throw error;
  return (data ?? [])
    .map((row) => row.properties as unknown as OwnerPropertyRow | null)
    .filter((p): p is OwnerPropertyRow => p !== null)
    .map((p) => ({
      ...toCard(p),
      status: p.status,
      propertyType: p.property_type,
      offersSeasonal: p.offers_seasonal,
      offersMonthly: p.offers_monthly,
      offersSale: p.offers_sale,
    }))
    .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
}

export type OwnerPropertySummary = Awaited<ReturnType<typeof listOwnerProperties>>[number];

/** O imóvel só existe para o proprietário se estiver vinculado a ele. */
export async function isLinkedProperty(supabase: Client, propertyId: string) {
  const { data, error } = await supabase
    .from("property_owners")
    .select("property_id")
    .eq("property_id", propertyId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

/** Ficha completa de um imóvel do proprietário, ou null se não for dele. */
export async function getOwnerProperty(supabase: Client, propertyId: string) {
  if (!(await isLinkedProperty(supabase, propertyId))) return null;
  const { data, error } = await supabase
    .from("properties")
    .select(
      `id, slug, title, summary, description, property_type, status, city, neighborhood,
       bedrooms, suites, bathrooms, max_guests, parking_spots, area_m2, distance_to_beach_m,
       offers_seasonal, offers_monthly, offers_sale, nightly_price, monthly_price, sale_price,
       min_nights, max_nights, condo_fee, iptu_yearly, check_in_time, check_out_time, house_rules,
       published_at, updated_at,
       property_media(id, kind, storage_path, width, alt_text, is_cover, is_demo, position),
       property_amenities(amenities(slug, label)),
       seasonal_rates(id, label, period, nightly_price, min_nights),
       property_fees(id, label, calc, amount, applies_to, is_refundable, position)`,
    )
    .eq("id", propertyId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    images: data.property_media
      .filter((m) => m.kind === "image" && m.storage_path && m.width)
      .sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.position - b.position),
    amenities: data.property_amenities
      .map((a) => a.amenities?.label)
      .filter((label): label is string => Boolean(label))
      .sort((a, b) => a.localeCompare(b, "pt-BR")),
    rates: toRates(data.seasonal_rates),
    fees: [...data.property_fees].sort((a, b) => a.position - b.position),
  };
}

export type OwnerProperty = NonNullable<Awaited<ReturnType<typeof getOwnerProperty>>>;

function toRates(
  rows: { label: string; period: unknown; nightly_price: number; min_nights: number | null }[],
): SeasonalRate[] {
  return rows
    .flatMap((r) => {
      const range = parseDateRange(String(r.period));
      return range
        ? [
            {
              label: r.label,
              start: range.start,
              end: range.endExclusive,
              nightlyPrice: r.nightly_price,
              minNights: r.min_nights,
            },
          ]
        : [];
    })
    .sort((a, b) => a.start.localeCompare(b.start));
}

/** Tarifas e regras de um imóvel do proprietário (para o calendário). */
export async function getPricingRules(supabase: Client, propertyId: string) {
  const { data, error } = await supabase
    .from("properties")
    .select(
      "id, title, nightly_price, min_nights, max_nights, offers_seasonal, seasonal_rates(label, period, nightly_price, min_nights)",
    )
    .eq("id", propertyId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    nightlyPrice: data.offers_seasonal ? data.nightly_price : null,
    minNights: data.min_nights,
    maxNights: data.max_nights,
    rates: toRates(data.seasonal_rates),
  };
}

// Reservas ------------------------------------------------------------------

export type OwnerBooking = {
  id: string;
  property_id: string;
  property_title: string;
  rental_mode: "seasonal" | "monthly";
  check_in: string;
  check_out: string;
  guests_count: number;
  guest_first_name: string;
  status: "pending" | "approved" | "declined" | "cancelled" | "expired";
  quote: unknown;
  quoted_total: number;
  created_at: string;
  decided_at: string | null;
};

/** Reservas por aba (etapa), imóvel e página, mais o total para a paginação. */
export async function listOwnerBookings(
  supabase: Client,
  {
    tab,
    propertyId,
    today,
    page,
  }: { tab: OwnerBookingTab; propertyId: string | null; today: string; page: number },
) {
  let query = supabase.rpc(
    "owner_bookings",
    { p_property_id: propertyId ?? undefined },
    {
      count: "exact",
    },
  );
  let ascending = false;
  switch (tab) {
    case "aguardando":
      query = query.eq("status", "pending");
      ascending = true;
      break;
    case "futuras":
      query = query.eq("status", "approved").gt("check_in", today);
      ascending = true;
      break;
    case "em-andamento":
      query = query.eq("status", "approved").lte("check_in", today).gt("check_out", today);
      ascending = true;
      break;
    case "concluidas":
      query = query.eq("status", "approved").lte("check_out", today);
      break;
    case "canceladas":
      query = query.in("status", ["cancelled", "declined", "expired"]);
      break;
  }
  const from = (page - 1) * PAGE_SIZE;
  const { data, error, count } = await query
    .order("check_in", { ascending })
    .order("id")
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw error;
  return { rows: (data ?? []) as OwnerBooking[], count: count ?? 0 };
}

/** Uma reserva de imóvel do proprietário, ou null (inexistente ou de outro dono). */
export async function getOwnerBooking(supabase: Client, id: string) {
  const { data, error } = await supabase.rpc("owner_bookings").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as OwnerBooking | null) ?? null;
}

/** Números da visão geral, cada um contado no banco. */
export async function getOwnerBookingCounts(supabase: Client, today: string) {
  const count = async (
    build: (q: ReturnType<typeof base>) => ReturnType<typeof base>,
  ): Promise<number> => {
    const { count: n, error } = await build(base());
    if (error) throw error;
    return n ?? 0;
  };
  const base = () => supabase.rpc("owner_bookings", {}, { count: "exact", head: true });
  const [pending, upcoming, inProgress, completed, cancelled] = await Promise.all([
    count((q) => q.eq("status", "pending").gte("check_in", today)),
    count((q) => q.eq("status", "approved").gt("check_in", today)),
    count((q) => q.eq("status", "approved").lte("check_in", today).gt("check_out", today)),
    count((q) => q.eq("status", "approved").lte("check_out", today)),
    count((q) => q.eq("status", "cancelled")),
  ]);
  return { pending, upcoming, inProgress, completed, cancelled };
}

/** Entradas e saídas confirmadas entre hoje e hoje + `days`. */
export async function getOwnerMovements(supabase: Client, today: string, days = 30) {
  const until = addDaysISO(today, days);
  const columns = "id, property_title, check_in, check_out, guests_count, guest_first_name";
  const [arrivals, departures] = await Promise.all([
    supabase
      .rpc("owner_bookings")
      .select(columns)
      .eq("status", "approved")
      .gte("check_in", today)
      .lt("check_in", until)
      .order("check_in")
      .limit(10),
    supabase
      .rpc("owner_bookings")
      .select(columns)
      .eq("status", "approved")
      .gte("check_out", today)
      .lt("check_out", until)
      .order("check_out")
      .limit(10),
  ]);
  if (arrivals.error) throw arrivals.error;
  if (departures.error) throw departures.error;
  type Movement = Pick<
    OwnerBooking,
    "id" | "property_title" | "check_in" | "check_out" | "guests_count" | "guest_first_name"
  >;
  return {
    arrivals: (arrivals.data ?? []) as Movement[],
    departures: (departures.data ?? []) as Movement[],
  };
}

/** Pedidos pendentes de um imóvel (ou de todos), para o calendário. */
export async function listPendingStays(
  supabase: Client,
  { propertyId, from, to }: { propertyId: string | null; from: string; to: string },
) {
  const { data, error } = await supabase
    .rpc("owner_bookings", { p_property_id: propertyId ?? undefined })
    .select("property_id, check_in, check_out")
    .eq("status", "pending")
    .lt("check_in", to)
    .gt("check_out", from);
  if (error) throw error;
  return (data ?? []) as { property_id: string; check_in: string; check_out: string }[];
}

// Calendário ----------------------------------------------------------------

export async function getOwnerCalendar(
  supabase: Client,
  { from, to, propertyId }: { from: string; to: string; propertyId: string | null },
) {
  const { data, error } = await supabase.rpc("owner_calendar", {
    p_from: from,
    p_to: to,
    p_property_id: propertyId ?? undefined,
  });
  if (error) throw error;
  return (data ?? []) as CalendarBlock[];
}

// Pedidos ao admin ----------------------------------------------------------

export async function listOwnerRequests(supabase: Client, propertyId: string | null, limit = 30) {
  let query = supabase
    .from("owner_requests")
    .select(
      "id, property_id, kind, stay, message, status, admin_reply, created_at, decided_at, properties(title)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (propertyId) query = query.eq("property_id", propertyId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...r,
    stay: r.stay ? parseDateRange(String(r.stay)) : null,
    propertyTitle: r.properties?.title ?? "",
  }));
}

export type OwnerRequest = Awaited<ReturnType<typeof listOwnerRequests>>[number];
