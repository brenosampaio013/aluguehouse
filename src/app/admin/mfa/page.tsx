import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TotpEnroll } from "@/components/auth/totp-enroll";
import { TotpVerifyForm } from "@/components/auth/totp-verify-form";
import { Container } from "@/components/ui/container";
import { Wordmark } from "@/components/ui/wordmark";
import { getSessionState } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Verificação em duas etapas" };

export default async function AdminMfaPage() {
  const session = await getSessionState();
  if (session.status === "admin") redirect("/admin");
  if (session.status !== "admin_needs_mfa") redirect("/admin/entrar");

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.mfa.listFactors();
  const factor = data?.totp.find((f) => f.status === "verified");

  return (
    <main id="conteudo" className="flex flex-1 items-center py-16">
      <Container className="grid gap-6">
        <Wordmark className="text-[1.375rem]" />
        <h1 className="font-serif text-h1 font-normal">Verificação em duas etapas</h1>
        {factor ? (
          <>
            <p className="max-w-[60ch] text-rocha">
              Digite o código que aparece agora no seu aplicativo autenticador.
            </p>
            <TotpVerifyForm factorId={factor.id} />
          </>
        ) : (
          <>
            <p className="max-w-[60ch] text-rocha">
              O painel exige um segundo fator. Cadastre um aplicativo autenticador no seu celular;
              ele será pedido a cada novo acesso.
            </p>
            <TotpEnroll />
          </>
        )}
      </Container>
    </main>
  );
}
