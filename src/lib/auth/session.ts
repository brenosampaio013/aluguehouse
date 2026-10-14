import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SessionState =
  | { status: "anonymous" }
  | { status: "guest"; userId: string; email: string | null }
  | { status: "admin_needs_mfa"; userId: string; email: string | null }
  | { status: "admin"; userId: string; email: string | null };

/**
 * Lê a sessão a partir do JWT verificado (getClaims), nunca de dados
 * não verificados do cookie. Mesma regra do banco (private.is_admin):
 * admin = app_metadata.role "admin" + sessão com MFA (aal2).
 */
export async function getSessionState(): Promise<SessionState> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (error || !claims?.sub) return { status: "anonymous" };

  const email = typeof claims.email === "string" ? claims.email : null;
  const isAdminRole = claims.app_metadata?.role === "admin";

  if (!isAdminRole) return { status: "guest", userId: claims.sub, email };
  if (claims.aal !== "aal2") return { status: "admin_needs_mfa", userId: claims.sub, email };
  return { status: "admin", userId: claims.sub, email };
}
