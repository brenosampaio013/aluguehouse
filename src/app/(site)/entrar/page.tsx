import type { Metadata } from "next";

import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { FormMessage } from "@/components/ui/form-message";
import { getSessionState } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/redirect";
import { signOut } from "@/server/actions/auth";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false },
};

export default async function EntrarPage({ searchParams }: PageProps<"/entrar">) {
  const params = await searchParams;
  const session = await getSessionState();
  const linkError = params.erro === "link";
  const next = safeNextPath(params.next) ?? undefined;

  return (
    <main id="conteudo" className="flex-1 py-16">
      <Container className="grid gap-6">
        {session.status === "anonymous" ? (
          <>
            <h1 className="font-serif text-h1 font-normal">Entrar</h1>
            <p className="max-w-[60ch] text-rocha">
              Entre para salvar imóveis nos favoritos e avaliar suas estadias. Você recebe um link
              por e-mail, sem precisar criar senha. Para pedir uma reserva não é preciso entrar.
            </p>
            {linkError ? (
              <FormMessage tone="error" className="max-w-sm">
                Este link de acesso expirou ou já foi usado. Peça um novo abaixo.
              </FormMessage>
            ) : null}
            <MagicLinkForm next={next} />
          </>
        ) : (
          <>
            <h1 className="font-serif text-h1 font-normal">Você entrou</h1>
            <p className="max-w-[60ch] text-rocha">
              Conectado como <strong className="text-abismo">{session.email}</strong>.
            </p>
            <form action={signOut}>
              <Button type="submit" variant="secondary">
                Sair
              </Button>
            </form>
          </>
        )}
      </Container>
    </main>
  );
}
