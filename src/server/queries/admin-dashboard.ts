import "server-only";

import { addDaysISO } from "@/lib/format";
import type { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "@/lib/zod";

import { stayOf } from "./admin-bookings";

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const num = z.coerce.number();
const nullableNum = z.coerce.number().nullable();

const totalsSchema = z.object({
  requests: num,
  approved: num,
  approved_value: num,
  avg_response_hours: nullableNum,
  inquiries: num,
  reviews: num,
  rating_avg: nullableNum,
  booked_nights: num,
});

const dashboardSchema = z.object({
  period: z.object({
    from: z.string(),
    to: z.string(),
    days: num,
    previous_from: z.string(),
    previous_to: z.string(),
    bucket: z.enum(["day", "week", "month"]),
  }),
  rental_properties: num,
  current: totalsSchema,
  previous: totalsSchema,
  series: z.array(
    z.object({
      b_start: z.string(),
      b_end: z.string(),
      requests: num,
      approved: num,
      inquiries: num,
    }),
  ),
  by_status: z.record(z.string(), num),
  by_mode: z.record(z.string(), num),
  top_properties: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      requests: num,
      approved: num,
      approved_value: num,
    }),
  ),
});

export type DashboardMetrics = z.infer<typeof dashboardSchema>;

/** Indicadores calculados no banco (public.admin_dashboard). */
export async function getDashboardMetrics(
  supabase: Client,
  input: { from: string; to: string; propertyId: string | null },
): Promise<DashboardMetrics> {
  const { data, error } = await supabase.rpc("admin_dashboard", {
    p_from: input.from,
    p_to: input.to,
    ...(input.propertyId ? { p_property_id: input.propertyId } : {}),
  });
  if (error) throw error;
  return dashboardSchema.parse(data);
}

/** Itens que pedem ação: os mais antigos primeiro. */
export async function getPendingWork(supabase: Client) {
  const [bookings, inquiries, reviews, drafts] = await Promise.all([
    supabase
      .from("booking_requests")
      .select("id, guest_name, stay, created_at, properties(title)", { count: "exact" })
      .eq("status", "pending")
      .order("created_at")
      .limit(5),
    supabase
      .from("inquiries")
      .select("id, name, kind, created_at", { count: "exact" })
      .eq("status", "new")
      .order("created_at")
      .limit(5),
    supabase.from("reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("properties")
      .select("id, title, updated_at", { count: "exact" })
      .eq("status", "draft")
      .order("updated_at", { ascending: false })
      .limit(3),
  ]);
  for (const result of [bookings, inquiries, reviews, drafts]) if (result.error) throw result.error;
  return {
    bookings: (bookings.data ?? []).map((row) => ({ ...row, ...stayOf(row.stay) })),
    bookingsCount: bookings.count ?? 0,
    inquiries: inquiries.data ?? [],
    inquiriesCount: inquiries.count ?? 0,
    reviewsCount: reviews.count ?? 0,
    drafts: drafts.data ?? [],
    draftsCount: drafts.count ?? 0,
  };
}

/** Reservas aprovadas com chegada nos próximos `days` dias. */
export async function getUpcomingArrivals(supabase: Client, today: string, days = 14) {
  const until = addDaysISO(today, days + 1);
  const { data, error } = await supabase
    .from("booking_requests")
    .select("id, guest_name, guests_count, stay, rental_mode, properties(title)")
    .eq("status", "approved")
    .overlaps("stay", `[${today},${until})`)
    .order("stay")
    .limit(30);
  if (error) throw error;
  return data
    .map((row) => ({ ...row, ...stayOf(row.stay) }))
    .filter((row) => row.checkIn >= today && row.checkIn < until)
    .slice(0, 8);
}

export type Activity = {
  id: string;
  at: string;
  kind: "booking" | "decision" | "inquiry" | "review" | "property";
  title: string;
  detail: string;
  href: string;
};

/** Últimos acontecimentos: pedidos, decisões, contatos, avaliações e imóveis. */
export async function getRecentActivity(supabase: Client, limit = 10): Promise<Activity[]> {
  const [bookings, decisions, inquiries, reviews, properties] = await Promise.all([
    supabase
      .from("booking_requests")
      .select("id, guest_name, created_at, properties(title)")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("booking_requests")
      .select("id, guest_name, status, decided_at")
      .not("decided_at", "is", null)
      .order("decided_at", { ascending: false })
      .limit(limit),
    supabase
      .from("inquiries")
      .select("id, name, kind, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("reviews")
      .select("id, rating, created_at, properties(title)")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("properties")
      .select("id, title, status, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit),
  ]);
  for (const result of [bookings, decisions, inquiries, reviews, properties]) {
    if (result.error) throw result.error;
  }

  const decisionLabels: Record<string, string> = {
    approved: "Reserva aprovada",
    declined: "Solicitação recusada",
    cancelled: "Reserva cancelada",
    expired: "Solicitação expirada",
  };
  const inquiryLabels: Record<string, string> = {
    contact: "Nova mensagem",
    visit: "Pedido de visita",
    sale_interest: "Interesse em compra",
  };

  const items: Activity[] = [
    ...(bookings.data ?? []).map((row) => ({
      id: `b-${row.id}`,
      at: row.created_at,
      kind: "booking" as const,
      title: "Nova solicitação de reserva",
      detail: `${row.guest_name}${row.properties ? ` · ${row.properties.title}` : ""}`,
      href: `/admin/solicitacoes/${row.id}`,
    })),
    ...(decisions.data ?? []).map((row) => ({
      id: `d-${row.id}`,
      at: row.decided_at!,
      kind: "decision" as const,
      title: decisionLabels[row.status] ?? "Solicitação atualizada",
      detail: row.guest_name,
      href: `/admin/solicitacoes/${row.id}`,
    })),
    ...(inquiries.data ?? []).map((row) => ({
      id: `i-${row.id}`,
      at: row.created_at,
      kind: "inquiry" as const,
      title: inquiryLabels[row.kind] ?? "Novo contato",
      detail: row.name,
      href: `/admin/contatos?q=${encodeURIComponent(row.name)}&situacao=todos`,
    })),
    ...(reviews.data ?? []).map((row) => ({
      id: `r-${row.id}`,
      at: row.created_at,
      kind: "review" as const,
      title: `Avaliação de ${row.rating} ${row.rating === 1 ? "estrela" : "estrelas"}`,
      detail: row.properties?.title ?? "Imóvel removido",
      href: "/admin/avaliacoes",
    })),
    ...(properties.data ?? []).map((row) => ({
      id: `p-${row.id}`,
      at: row.updated_at,
      kind: "property" as const,
      title: "Imóvel atualizado",
      detail: row.title,
      href: `/admin/imoveis/${row.id}`,
    })),
  ];
  return items.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, limit);
}

/** Imóveis para os filtros (todos, inclusive rascunhos e arquivados). */
export async function listPropertyOptions(supabase: Client) {
  const { data, error } = await supabase
    .from("properties")
    .select("id, title")
    .order("title")
    .limit(500);
  if (error) throw error;
  return data.map((row) => ({ value: row.id, label: row.title }));
}
