import type { Metadata } from "next";

import { PropertyCreateForm } from "@/components/admin/property-create-form";
import { Card } from "@/components/admin/ui/card";
import { AdminPage, PageHeader } from "@/components/admin/ui/page";
import { requireAdmin } from "@/lib/auth/require-admin";

export const metadata: Metadata = { title: "Novo imóvel" };

export default async function NovoImovelPage() {
  await requireAdmin();
  return (
    <AdminPage className="max-w-3xl">
      <PageHeader
        back={{ href: "/admin/imoveis", label: "Voltar para imóveis" }}
        title="Novo imóvel"
        description="Comece com o básico. O imóvel é criado como rascunho e só aparece no site depois de publicado."
      />
      <Card as="div" className="p-5 sm:p-6">
        <PropertyCreateForm />
      </Card>
    </AdminPage>
  );
}
