import "server-only";

import { notFound } from "next/navigation";

import type { BookingStatus } from "@/lib/booking/labels";
import { parseDateRange } from "@/lib/format";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** Período [chegada, saída) de uma coluna daterange. */
function stayOf(value: unknown) {
  const range = parseDateRange(String(value));
  if (!range) throw new Error(`Período inválido: ${String(value)}`);
  return { checkIn: range.start, checkOut: range.endExclusive };
}

export async function countPendingBookings(supabase: Client) {
  const { count, error } = await supabase
    .from("booking_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw error;
  return count ?? 0;
}

export async function listBookingRequests(supabase: Client, status: BookingStatus | null) {
  let query = supabase
    .from("booking_requests")
    .select(
      "id, status, rental_mode, guest_name, stay, guests_count, quoted_total, created_at, properties(id, title)",
    )
    .order("created_at", { ascending: status !== "pending" ? false : true })
    .limit(200);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return data.map((row) => ({ ...row, ...stayOf(row.stay) }));
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
