import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export const metadata = { robots: { index: false } };

export default function NotFound() {
  return (
    <main id="conteudo" className="flex flex-1 items-center py-16">
      <Container>
        <h1 className="font-serif text-h1 font-normal">Página não encontrada</h1>
        <p className="mt-4 text-rocha">
          O endereço pode ter mudado ou o imóvel não está mais disponível.
        </p>
        <Link href="/" className={buttonClasses("primary", "mt-8")}>
          Voltar para o início
        </Link>
      </Container>
    </main>
  );
}
