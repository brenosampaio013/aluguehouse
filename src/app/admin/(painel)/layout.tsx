import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/shell/admin-shell";
import { MENU_COOKIE } from "@/components/admin/shell/nav-items";
import { getSessionState } from "@/lib/auth/session";
import { settle } from "@/server/queries/settle";
import { getStatusCounts } from "@/server/queries/status-counts";

/**
 * Autorização definitiva do painel: papel admin + MFA concluído.
 * O banco aplica a mesma regra nas políticas RLS.
 */
export default async function PainelLayout({ children }: LayoutProps<"/admin">) {
  const session = await getSessionState();
  if (session.status === "admin_needs_mfa") redirect("/admin/mfa");
  if (session.status !== "admin") redirect("/admin/entrar");
  // Mesma consulta das abas das listas (memorizada por requisição). Se
  // falhar, o menu só fica sem os contadores.
  const [counts, cookieStore] = await Promise.all([
    settle(getStatusCounts(), "pendências do menu"),
    cookies(),
  ]);

  return (
    <AdminShell
      email={session.email}
      initialCollapsed={cookieStore.get(MENU_COOKIE)?.value === "recolhido"}
      pending={{
        "/admin/solicitacoes": counts.ok ? counts.data.booking_requests.pending : 0,
        "/admin/avaliacoes": counts.ok ? counts.data.reviews.pending : 0,
        "/admin/contatos": counts.ok ? counts.data.inquiries.new : 0,
      }}
    >
      {children}
    </AdminShell>
  );
}
