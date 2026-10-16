import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/shell/admin-shell";
import { MENU_COOKIE } from "@/components/admin/shell/nav-items";
import { getSessionState } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { countPendingBookings } from "@/server/queries/admin-bookings";
import { countNewInquiries } from "@/server/queries/inquiries";
import { countPendingReviews } from "@/server/queries/reviews";
import { settle } from "@/server/queries/settle";

/** Contador que não derruba o painel inteiro se a consulta falhar. */
async function safeCount(task: Promise<number>) {
  const result = await settle(task, "pendências do menu");
  return result.ok ? result.data : 0;
}

/**
 * Autorização definitiva do painel: papel admin + MFA concluído.
 * O banco aplica a mesma regra nas políticas RLS.
 */
export default async function PainelLayout({ children }: LayoutProps<"/admin">) {
  const session = await getSessionState();
  if (session.status === "admin_needs_mfa") redirect("/admin/mfa");
  if (session.status !== "admin") redirect("/admin/entrar");
  const supabase = await createSupabaseServerClient();
  const [bookings, reviews, inquiries, cookieStore] = await Promise.all([
    safeCount(countPendingBookings(supabase)),
    safeCount(countPendingReviews(supabase)),
    safeCount(countNewInquiries(supabase)),
    cookies(),
  ]);

  return (
    <AdminShell
      email={session.email}
      initialCollapsed={cookieStore.get(MENU_COOKIE)?.value === "recolhido"}
      pending={{
        "/admin/solicitacoes": bookings,
        "/admin/avaliacoes": reviews,
        "/admin/contatos": inquiries,
      }}
    >
      {children}
    </AdminShell>
  );
}
