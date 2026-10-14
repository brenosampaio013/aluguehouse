import "server-only";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { getSessionState } from "./session";

/**
 * Exige admin com MFA antes de qualquer ação do painel. Devolve um cliente
 * com a sessão do admin, sujeito às políticas RLS (não usa service_role).
 */
export async function requireAdmin() {
  const session = await getSessionState();
  if (session.status === "admin_needs_mfa") redirect("/admin/mfa");
  if (session.status !== "admin") redirect("/admin/entrar");
  return { supabase: await createSupabaseServerClient(), session };
}
