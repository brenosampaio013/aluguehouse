import type { Metadata } from "next";

import { AdminPage, PageHeader } from "@/components/admin/ui/page";
import { ComingSoon } from "@/components/owner/coming-soon";
import { WalletIcon } from "@/components/ui/icons";
import { requireOwner } from "@/lib/auth/require-owner";

export const metadata: Metadata = { title: "Financeiro" };

export default async function FinanceiroPage() {
  await requireOwner();
  return (
    <AdminPage>
      <PageHeader
        title="Financeiro"
        description="Extrato das reservas, comissão e repasses dos seus imóveis."
      />
      <ComingSoon
        icon={<WalletIcon />}
        title="Ainda não há lançamentos financeiros"
        description="Os valores só aparecem quando houver pagamentos registrados e as regras de taxas, despesas e cancelamentos estiverem definidas. Enquanto isso, nenhum valor é estimado aqui; o orçamento de cada pedido está na página da reserva."
        items={[
          "Valor bruto de cada reserva recebida",
          "Comissão da Alugue Houses (15% sobre as diárias)",
          "Taxas e despesas discriminadas",
          "Valor líquido previsto e valor repassado",
          "Repasses pendentes e realizados (até 2 dias após o check-in)",
          "Histórico por período e relatório mensal",
        ]}
      />
    </AdminPage>
  );
}
