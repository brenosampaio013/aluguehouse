import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SessionState =
  | { status: "anonymous" }
  | { status: "guest"; userId: string; email: string | null }
  | { status: "admin_needs_mfa"; userId: string; email: string | null }
  | { status: "admin"; userId: string; email: string | null }
  | { status: "owner_needs_mfa"; userId: string; email: string | null }
  | { status: "owner"; userId: string; email: string | null };

/**
 * Lê a sessão a partir do JWT verificado (getClaims), nunca de dados
 * não verificados do cookie. Mesmas regras do banco: admin
 * (private.is_admin) e proprietário (private.is_owner) = papel em
 * app_metadata + sessão com MFA (aal2).
 */
export async function getSessionState(): Promise<SessionState> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (error || !claims?.sub) return { status: "anonymous" };

  const email = typeof claims.email === "string" ? claims.email : null;
  const role = claims.app_metadata?.role;
  const mfa = claims.aal === "aal2";

  if (role === "admin") {
    return { status: mfa ? "admin" : "admin_needs_mfa", userId: claims.sub, email };
  }
  if (role === "owner") {
    return { status: mfa ? "owner" : "owner_needs_mfa", userId: claims.sub, email };
  }
  return { status: "guest", userId: claims.sub, email };
}
