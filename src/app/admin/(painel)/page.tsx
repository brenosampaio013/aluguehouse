import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function PainelPage() {
  return (
    <main id="conteudo" className="flex-1 py-12">
      <Container className="grid gap-4">
        <h1 className="font-serif text-h1 font-normal">Painel</h1>
        <p className="max-w-[60ch] text-rocha">
          Cadastre imóveis, fotos, tarifas e taxas. Reservas e calendário entram nas próximas
          etapas.
        </p>
        <div>
          <Link href="/admin/imoveis" className={buttonClasses("primary")}>
            Ver imóveis
          </Link>
        </div>
      </Container>
    </main>
  );
}
