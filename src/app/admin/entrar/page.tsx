import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminSignInForm } from "@/components/auth/admin-sign-in-form";
import { Container } from "@/components/ui/container";
import { Wordmark } from "@/components/ui/wordmark";
import { getSessionState } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Entrar no painel" };

export default async function AdminEntrarPage() {
  const session = await getSessionState();
  if (session.status === "admin") redirect("/admin");
  if (session.status === "admin_needs_mfa") redirect("/admin/mfa");

  return (
    <main id="conteudo" className="flex flex-1 items-center py-16">
      <Container className="grid gap-6">
        <Wordmark className="text-[1.375rem]" />
        <h1 className="font-serif text-h1 font-normal">Entrar no painel</h1>
        <p className="max-w-[60ch] text-rocha">Acesso exclusivo do administrador.</p>
        <AdminSignInForm />
      </Container>
    </main>
  );
}
