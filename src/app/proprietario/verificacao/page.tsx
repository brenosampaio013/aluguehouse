import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TotpEnroll } from "@/components/auth/totp-enroll";
import { TotpVerifyForm } from "@/components/auth/totp-verify-form";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Wordmark } from "@/components/ui/wordmark";
import { OWNER_HOME, OWNER_SIGN_IN } from "@/lib/auth/require-owner";
import { getSessionState } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "@/server/actions/auth";

export const metadata: Metadata = { title: "Verificação em duas etapas" };

/** Segundo fator do proprietário: cadastra ou confirma o aplicativo autenticador. */
export default async function ProprietarioVerificacaoPage() {
  const session = await getSessionState();
  if (session.status === "owner") redirect(OWNER_HOME);
  if (session.status !== "owner_needs_mfa") redirect(OWNER_SIGN_IN);

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.mfa.listFactors();
  const factor = data?.totp.find((f) => f.status === "verified");

  return (
    <main id="conteudo" className="flex flex-1 items-center bg-marfim py-16">
      <Container className="grid gap-6">
        <Wordmark className="text-[1.375rem]" />
        <p className="flex items-center gap-3 text-small font-semibold tracking-[0.18em] text-rocha uppercase">
          <span aria-hidden="true" className="h-px w-10 bg-dourado" />
          Portal do proprietário
        </p>
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
              Para proteger os dados dos seus imóveis e das reservas, o portal pede um segundo
              fator. Cadastre um aplicativo autenticador no seu celular; o código será pedido a cada
              novo acesso.
            </p>
            <TotpEnroll />
          </>
        )}
        <p className="text-small text-rocha">Conectado como {session.email}.</p>
        <form action={signOut}>
          <Button type="submit" variant="text">
            Sair
          </Button>
        </form>
      </Container>
    </main>
  );
}
