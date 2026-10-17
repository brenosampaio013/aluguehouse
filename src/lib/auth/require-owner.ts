import "server-only";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { getSessionState } from "./session";

/** Caminhos do portal do proprietário. */
export const OWNER_HOME = "/proprietario";
export const OWNER_MFA = "/proprietario/verificacao";
export const OWNER_SIGN_IN = `/entrar?next=${encodeURIComponent(OWNER_HOME)}`;

/**
 * Exige proprietário com MFA antes de qualquer página ou ação do portal.
 * Devolve um cliente com a sessão dele, sujeito às políticas RLS (não usa
 * service_role): o banco só entrega os imóveis vinculados a ele.
 */
export async function requireOwner() {
  const session = await getSessionState();
  if (session.status === "owner_needs_mfa") redirect(OWNER_MFA);
  if (session.status !== "owner") redirect(OWNER_SIGN_IN);
  return { supabase: await createSupabaseServerClient(), session };
}
