import type { Metadata } from "next";

import { Card, CardHeader } from "@/components/admin/ui/card";
import { SectionError } from "@/components/admin/ui/empty-state";
import { AdminPage, PageHeader } from "@/components/admin/ui/page";
import { ProfileForm } from "@/components/owner/profile-form";
import { requireOwner } from "@/lib/auth/require-owner";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = { title: "Meu perfil" };

export default async function PerfilPage() {
  const { supabase, session } = await requireOwner();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", session.userId)
    .maybeSingle();

  return (
    <AdminPage>
      <PageHeader title="Meu perfil" description="Seus dados de contato e a segurança da conta." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card aria-labelledby="dados">
          <CardHeader id="dados" title="Dados de contato" />
          <div className="grid gap-4 p-5">
            <div>
              <p className="text-small text-rocha">E-mail de acesso</p>
              <p className="font-semibold">{session.email}</p>
              <p className="text-small text-rocha">
                Para trocar o e-mail, fale com a Alugue Houses ({siteConfig.contact.email}).
              </p>
            </div>
            {error ? (
              <SectionError what="seus dados" />
            ) : (
              <ProfileForm fullName={profile?.full_name ?? ""} phone={profile?.phone ?? ""} />
            )}
          </div>
        </Card>
        <Card aria-labelledby="seguranca">
          <CardHeader id="seguranca" title="Segurança" />
          <div className="grid gap-2 p-5">
            <p className="font-semibold">Verificação em duas etapas ativa</p>
            <p className="text-rocha">
              Cada acesso ao portal pede o link enviado ao seu e-mail e o código do aplicativo
              autenticador. Se trocar de celular, fale com a Alugue Houses para cadastrar o novo
              aparelho.
            </p>
          </div>
        </Card>
      </div>
    </AdminPage>
  );
}
