import type { Metadata } from "next";
import Link from "next/link";

import { DeleteAccountForm } from "@/components/auth/delete-account-form";
import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { Button, buttonClasses } from "@/components/ui/button";
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
            {params.conta === "excluida" ? (
              <FormMessage tone="success" className="max-w-xl">
                Sua conta foi excluída. Obrigado por usar a Alugue Houses.
              </FormMessage>
            ) : null}
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
            <ul className="flex flex-wrap gap-3">
              <li>
                <Link href="/favoritos" className={buttonClasses("secondary")}>
                  Favoritos
                </Link>
              </li>
              <li>
                <Link href="/minhas-estadias" className={buttonClasses("secondary")}>
                  Minhas estadias
                </Link>
              </li>
            </ul>
            <form action={signOut}>
              <Button type="submit" variant="text">
                Sair
              </Button>
            </form>
            {session.status === "guest" ? (
              <section
                aria-labelledby="excluir-conta"
                className="mt-6 grid gap-3 border-t border-areia pt-8"
              >
                <h2 id="excluir-conta" className="font-serif text-h3 font-normal">
                  Excluir minha conta
                </h2>
                <DeleteAccountForm />
              </section>
            ) : null}
          </>
        )}
      </Container>
    </main>
  );
}
