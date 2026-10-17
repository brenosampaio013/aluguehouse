import "server-only";

import { parseDateRange } from "@/lib/format";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/*
 * Proprietários e pedidos vistos pelo admin (sessão do admin, RLS "admin
 * gerencia"). O e-mail fica em auth.users e vem de admin_user_emails, que só
 * responde a admin com MFA.
 */

async function emailsFor(supabase: Client, ids: string[]) {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map<string, string>();
  const { data, error } = await supabase.rpc("admin_user_emails", { p_ids: unique });
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.id, row.email]));
}

/** Proprietários vinculados a um imóvel. */
export async function listPropertyOwners(supabase: Client, propertyId: string) {
  const { data, error } = await supabase
    .from("property_owners")
    .select("owner_id, created_at")
    .eq("property_id", propertyId)
    .order("created_at");
  if (error) throw error;
  const emails = await emailsFor(
    supabase,
    (data ?? []).map((row) => row.owner_id),
  );
  return (data ?? []).map((row) => ({
    ownerId: row.owner_id,
    email: emails.get(row.owner_id) ?? "(conta removida)",
    linkedAt: row.created_at,
  }));
}

/** Todos os proprietários com os imóveis vinculados a cada um. */
export async function listAllOwners(supabase: Client) {
  const { data, error } = await supabase
    .from("property_owners")
    .select("owner_id, property_id, properties(title)")
    .limit(1000);
  if (error) throw error;
  const emails = await emailsFor(
    supabase,
    (data ?? []).map((row) => row.owner_id),
  );
  const owners = new Map<
    string,
    { ownerId: string; email: string; properties: { id: string; title: string }[] }
  >();
  for (const row of data ?? []) {
    const owner = owners.get(row.owner_id) ?? {
      ownerId: row.owner_id,
      email: emails.get(row.owner_id) ?? "(conta removida)",
      properties: [],
    };
    owner.properties.push({ id: row.property_id, title: row.properties?.title ?? "" });
    owners.set(row.owner_id, owner);
  }
  return [...owners.values()].sort((a, b) => a.email.localeCompare(b.email, "pt-BR"));
}

/** Pedidos dos proprietários: pendentes primeiro (mais antigos antes). */
export async function listOwnerRequestsForAdmin(
  supabase: Client,
  { propertyId, status }: { propertyId?: string; status?: "pending" | "decided" } = {},
) {
  let query = supabase
    .from("owner_requests")
    .select(
      "id, property_id, requested_by, kind, stay, message, status, admin_reply, created_at, decided_at, properties(title)",
    )
    .limit(100);
  if (propertyId) query = query.eq("property_id", propertyId);
  if (status === "pending") query = query.eq("status", "pending").order("created_at");
  else if (status === "decided")
    query = query.neq("status", "pending").order("decided_at", { ascending: false });
  else query = query.order("created_at", { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  const emails = await emailsFor(
    supabase,
    (data ?? []).map((row) => row.requested_by),
  );
  return (data ?? []).map((row) => {
    const stay = row.stay ? parseDateRange(String(row.stay)) : null;
    return {
      ...row,
      stay: stay ? { start: stay.start, end: stay.endExclusive } : null,
      propertyTitle: row.properties?.title ?? "",
      requesterEmail: emails.get(row.requested_by) ?? "(conta removida)",
    };
  });
}

export type AdminOwnerRequest = Awaited<ReturnType<typeof listOwnerRequestsForAdmin>>[number];

/** Pedidos pendentes (contador do menu). */
export async function countPendingOwnerRequests(supabase: Client) {
  const { count, error } = await supabase
    .from("owner_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw error;
  return count ?? 0;
}
