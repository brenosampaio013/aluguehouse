import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Wordmark } from "@/components/ui/wordmark";
import { getSessionState } from "@/lib/auth/session";
import { signOut } from "@/server/actions/auth";

/**
 * Autorização definitiva do painel: papel admin + MFA concluído.
 * O banco aplica a mesma regra nas políticas RLS.
 */
export default async function PainelLayout({ children }: LayoutProps<"/admin">) {
  const session = await getSessionState();
  if (session.status === "admin_needs_mfa") redirect("/admin/mfa");
  if (session.status !== "admin") redirect("/admin/entrar");

  return (
    <>
      <header className="border-b border-areia">
        <Container className="flex min-h-16 flex-wrap items-center justify-between gap-4 py-2">
          <span className="flex items-baseline gap-3">
            <Wordmark className="text-[1.25rem]" />
            <span className="text-small text-rocha">Painel</span>
          </span>
          <span className="flex items-center gap-4">
            <span className="text-small text-rocha">{session.email}</span>
            <form action={signOut}>
              <Button type="submit" variant="text">
                Sair
              </Button>
            </form>
          </span>
        </Container>
      </header>
      {children}
    </>
  );
}
