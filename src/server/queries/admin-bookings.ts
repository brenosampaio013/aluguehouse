import "server-only";

import { notFound } from "next/navigation";

import type { BookingFilters } from "@/lib/admin/filters";
import { orIlike } from "@/lib/admin/list-params";
import { addDaysISO, parseDateRange } from "@/lib/format";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

import { pagedRows, withCount, type Paging } from "./paged";

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** Período [chegada, saída) de uma coluna daterange. */
export function stayOf(value: unknown) {
  const range = parseDateRange(String(value));
  if (!range) throw new Error(`Período inválido: ${String(value)}`);
  return { checkIn: range.start, checkOut: range.endExclusive };
}

export async function getBookingRequest(supabase: Client, id: string) {
  const { data, error } = await supabase
    .from("booking_requests")
    .select("*, properties(id, title, slug)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  const stay = stayOf(data.stay);
  const range = `[${stay.checkIn},${stay.checkOut})`;

  // Conflitos: períodos ocupados e outros pedidos pendentes nas mesmas datas.
  const [blocks, pending] = await Promise.all([
    supabase
      .from("calendar_blocks")
      .select("id, kind, stay, note, booking_request_id")
      .eq("property_id", data.property_id)
      .overlaps("stay", range)
      .order("stay"),
    supabase
      .from("booking_requests")
      .select("id, guest_name, stay, created_at")
      .eq("property_id", data.property_id)
      .eq("status", "pending")
      .neq("id", id)
      .overlaps("stay", range)
      .order("created_at"),
  ]);
  if (blocks.error) throw blocks.error;
  if (pending.error) throw pending.error;

  return {
    request: { ...data, ...stay },
    blockConflicts: blocks.data
      .filter((block) => block.booking_request_id !== id)
      .map((block) => ({ ...block, ...stayOf(block.stay) })),
    pendingConflicts: pending.data.map((row) => ({ ...row, ...stayOf(row.stay) })),
  };
}

/** Bloqueios do imóvel que ainda não terminaram (para o editor do imóvel). */
export async function listUpcomingBlocks(supabase: Client, propertyId: string, today: string) {
  const { data, error } = await supabase
    .from("calendar_blocks")
    .select("id, kind, stay, note, booking_request_id, booking_requests(guest_name)")
    .eq("property_id", propertyId)
    .order("stay");
  if (error) throw error;
  return data
    .map((block) => ({ ...block, ...stayOf(block.stay) }))
    .filter((block) => block.checkOut > today);
}

const bookingSortColumns = {
  recebida: "created_at",
  chegada: "stay",
  total: "quoted_total",
  hospede: "guest_name",
} as const;

/** Início do dia seguinte em São Paulo (sem horário de verão desde 2019). */
function endOfDaySP(date: string) {
  return `${addDaysISO(date, 1)}T00:00:00-03:00`;
}

/** Lista de solicitações com busca, filtros, ordenação e paginação no banco. */
export async function searchBookingRequests(
  supabase: Client,
  filters: BookingFilters,
  paging: Paging,
) {
  let query = supabase
    .from("booking_requests")
    .select(
      "id, status, rental_mode, guest_name, guest_email, guest_phone, stay, guests_count, quoted_total, created_at, decided_at, properties(id, title)",
      { count: withCount(paging) },
    );
  if (filters.tab.status) query = query.eq("status", filters.tab.status);
  if (filters.q) {
    const digits = filters.q.replace(/\D/g, "");
    const columns = ["guest_name", "guest_email"];
    query = query.or(
      [orIlike(columns, filters.q), digits.length >= 4 ? orIlike(["guest_phone"], digits) : null]
        .filter(Boolean)
        .join(","),
    );
  }
  if (filters.propertyId) query = query.eq("property_id", filters.propertyId);
  if (filters.mode) query = query.eq("rental_mode", filters.mode);
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00-03:00`);
  if (filters.to) query = query.lt("created_at", endOfDaySP(filters.to));
  let result;
  if (paging.kind === "after") {
    if (paging.afterId) query = query.gt("id", paging.afterId);
    result = pagedRows(await query.order("id").limit(paging.size));
  } else {
    query = query
      .order(bookingSortColumns[filters.sort.key], { ascending: filters.sort.dir === "asc" })
      .order("id");
    result = pagedRows(await query.range(paging.from, paging.to));
  }
  const { rows, count } = result;
  return { rows: rows.map((row) => ({ ...row, ...stayOf(row.stay) })), count };
}
