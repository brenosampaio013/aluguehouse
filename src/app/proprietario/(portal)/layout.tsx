import { cookies } from "next/headers";

import { AdminShell } from "@/components/admin/shell/admin-shell";
import { MENU_COOKIE } from "@/components/admin/shell/nav-items";
import { requireOwner } from "@/lib/auth/require-owner";
import { todayInSaoPaulo } from "@/lib/format";
import { getOwnerBookingCounts } from "@/server/queries/owner-portal";
import { settle } from "@/server/queries/settle";

/**
 * Autorização definitiva do portal: papel de proprietário + MFA concluído.
 * O banco aplica a mesma regra (private.is_owner) e ainda confere o vínculo
 * com cada imóvel.
 */
export default async function PortalLayout({ children }: LayoutProps<"/proprietario">) {
  const { supabase, session } = await requireOwner();
  const [counts, cookieStore] = await Promise.all([
    settle(getOwnerBookingCounts(supabase, todayInSaoPaulo()), "pendências do menu"),
    cookies(),
  ]);

  return (
    <AdminShell
      area="owner"
      email={session.email}
      initialCollapsed={cookieStore.get(MENU_COOKIE)?.value === "recolhido"}
      pending={{ "/proprietario/reservas": counts.ok ? counts.data.pending : 0 }}
    >
      {children}
    </AdminShell>
  );
}
