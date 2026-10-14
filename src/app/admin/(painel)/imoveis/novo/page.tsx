import type { Metadata } from "next";
import Link from "next/link";

import { PropertyCreateForm } from "@/components/admin/property-create-form";
import { Container } from "@/components/ui/container";
import { requireAdmin } from "@/lib/auth/require-admin";

export const metadata: Metadata = { title: "Novo imóvel" };

export default async function NovoImovelPage() {
  await requireAdmin();
  return (
    <main id="conteudo" className="flex-1 py-12">
      <Container className="grid gap-6">
        <Link href="/admin/imoveis" className="text-petroleo underline underline-offset-3">
          Voltar para imóveis
        </Link>
        <h1 className="font-serif text-h1 font-normal">Novo imóvel</h1>
        <p className="max-w-[60ch] text-rocha">
          Comece com o básico. O imóvel é criado como rascunho e só aparece no site depois de
          publicado.
        </p>
        <PropertyCreateForm />
      </Container>
    </main>
  );
}
