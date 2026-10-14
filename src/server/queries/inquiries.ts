import "server-only";

import type { InquiryStatus } from "@/lib/inquiries";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export async function countNewInquiries(supabase: Client) {
  const { count, error } = await supabase
    .from("inquiries")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");
  if (error) throw error;
  return count ?? 0;
}

export async function listInquiries(supabase: Client, status: InquiryStatus) {
  const { data, error } = await supabase
    .from("inquiries")
    .select(
      "id, kind, name, email, phone, message, preferred_datetime, status, created_at, properties(id, title, slug)",
    )
    .eq("status", status)
    .order("created_at", { ascending: status === "new" })
    .limit(200);
  if (error) throw error;
  return data;
}
