import type { Metadata } from "next";

import { AdminPage, PageHeader } from "@/components/admin/ui/page";
import { ComingSoon } from "@/components/owner/coming-soon";
import { FileIcon } from "@/components/ui/icons";
import { requireOwner } from "@/lib/auth/require-owner";

export const metadata: Metadata = { title: "Documentos" };

export default async function DocumentosPage() {
  await requireOwner();
  return (
    <AdminPage>
      <PageHeader
        title="Documentos"
        description="Arquivos que a Alugue Houses compartilha com você."
      />
      <ComingSoon
        icon={<FileIcon />}
        title="Nenhum documento disponível ainda"
        description="Esta área está em preparação. Os arquivos ficarão em armazenamento privado, abertos só por você com links temporários."
        items={[
          "Contrato de administração e aditivos",
          "Relatórios mensais e comprovantes de repasse",
          "Vistorias e laudos do imóvel",
        ]}
      />
    </AdminPage>
  );
}
