import type { Metadata } from "next";

import { AdminPage, PageHeader } from "@/components/admin/ui/page";
import { ComingSoon } from "@/components/owner/coming-soon";
import { BellIcon } from "@/components/ui/icons";
import { requireOwner } from "@/lib/auth/require-owner";

export const metadata: Metadata = { title: "Notificações" };

export default async function NotificacoesPage() {
  await requireOwner();
  return (
    <AdminPage>
      <PageHeader title="Notificações" description="Avisos sobre seus imóveis e reservas." />
      <ComingSoon
        icon={<BellIcon />}
        title="Nenhuma notificação ainda"
        description="Esta área está em preparação. Por enquanto, acompanhe as reservas e a resposta dos seus pedidos nas páginas de Reservas e de cada imóvel."
        items={[
          "Novas reservas, aprovações e cancelamentos",
          "Resposta aos seus pedidos de bloqueio e de alteração",
          "Avisos da Alugue Houses",
        ]}
      />
    </AdminPage>
  );
}
