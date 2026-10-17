import type { Metadata } from "next";
import Link from "next/link";

import { OwnerRequestsList } from "@/components/admin/owner-requests-list";
import { Card, CardHeader } from "@/components/admin/ui/card";
import { EmptyState, SectionError } from "@/components/admin/ui/empty-state";
import { AdminPage, PageHeader } from "@/components/admin/ui/page";
import { KeyIcon } from "@/components/ui/icons";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listAllOwners, listOwnerRequestsForAdmin } from "@/server/queries/admin-owners";
import { settle } from "@/server/queries/settle";

export const metadata: Metadata = { title: "Proprietários" };

export default async function ProprietariosAdminPage() {
  const { supabase } = await requireAdmin();
  const [pending, decided, owners] = await Promise.all([
    settle(listOwnerRequestsForAdmin(supabase, { status: "pending" }), "pedidos pendentes"),
    settle(listOwnerRequestsForAdmin(supabase, { status: "decided" }), "pedidos decididos"),
    settle(listAllOwners(supabase), "proprietários"),
  ]);

  return (
    <AdminPage>
      <PageHeader
        title="Proprietários"
        description="Pedidos enviados pelo Portal do Proprietário e quem tem acesso a cada imóvel. Para dar ou remover acesso, abra o imóvel na seção Proprietários."
      />

      <Card aria-labelledby="pendentes">
        <CardHeader
          id="pendentes"
          title="Pedidos pendentes"
          description="Bloqueio aprovado entra no calendário na hora; alteração aprovada significa que você já editou o anúncio."
        />
        <div className="p-5">
          {pending.ok ? (
            <OwnerRequestsList
              requests={pending.data}
              showProperty
              empty="Nenhum pedido aguardando decisão."
            />
          ) : (
            <SectionError what="os pedidos pendentes" />
          )}
        </div>
      </Card>

      <Card aria-labelledby="acessos">
        <CardHeader id="acessos" title="Proprietários com acesso" />
        {owners.ok ? (
          owners.data.length === 0 ? (
            <EmptyState
              icon={<KeyIcon />}
              title="Nenhum proprietário com acesso ainda"
              description="Abra um imóvel e use a seção Proprietários para dar acesso pelo e-mail."
            />
          ) : (
            <ul className="divide-y divide-areia">
              {owners.data.map((owner) => (
                <li key={owner.ownerId} className="grid gap-1 px-5 py-3">
                  <span className="font-semibold break-all">{owner.email}</span>
                  <span className="flex flex-wrap gap-x-3 gap-y-1 text-small">
                    {owner.properties.map((property) => (
                      <Link
                        key={property.id}
                        href={`/admin/imoveis/${property.id}#proprietarios`}
                        className="text-petroleo hover:underline"
                      >
                        {property.title}
                      </Link>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          )
        ) : (
          <SectionError what="os proprietários" />
        )}
      </Card>

      <Card aria-labelledby="decididos">
        <CardHeader id="decididos" title="Pedidos decididos" description="Os 100 mais recentes." />
        <div className="p-5">
          {decided.ok ? (
            <OwnerRequestsList
              requests={decided.data}
              showProperty
              empty="Nenhum pedido decidido ainda."
            />
          ) : (
            <SectionError what="os pedidos decididos" />
          )}
        </div>
      </Card>
    </AdminPage>
  );
}
