import "server-only";

import { cache } from "react";

import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ReviewStatus } from "@/lib/reviews";

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * Avaliações publicadas de um imóvel. Usa o cliente anônimo: as políticas
 * entregam só as aprovadas e só as colunas públicas (sem autor nem reserva).
 */
export const getPublishedReviews = cache(async (propertyId: string) => {
  const { data, error } = await createSupabasePublicClient()
    .from("reviews")
    .select("id, author_display_name, rating, comment, admin_reply, created_at")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
});

/** Estadias de quem está conectado, com a avaliação já enviada (se houver). */
export async function getMyStays(supabase: Client, userId: string) {
  const [stays, reviews] = await Promise.all([
    supabase.rpc("get_my_stays"),
    supabase
      .from("reviews")
      .select("booking_request_id, rating, comment, status, admin_reply, created_at")
      .eq("author_id", userId),
  ]);
  if (stays.error) throw stays.error;
  if (reviews.error) throw reviews.error;
  const byBooking = new Map(reviews.data.map((review) => [review.booking_request_id, review]));
  return stays.data.map((stay) => ({
    ...stay,
    review: byBooking.get(stay.booking_request_id) ?? null,
  }));
}

export async function countPendingReviews(supabase: Client) {
  const { count, error } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw error;
  return count ?? 0;
}

export async function listReviewsForAdmin(supabase: Client, status: ReviewStatus) {
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id, booking_request_id, author_display_name, rating, comment, status, admin_reply, created_at, moderated_at, properties(id, title, slug)",
    )
    .eq("status", status)
    .order("created_at", { ascending: status === "pending" })
    .limit(200);
  if (error) throw error;
  return data;
}
