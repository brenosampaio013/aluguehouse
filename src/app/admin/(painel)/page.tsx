import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { requireAdmin } from "@/lib/auth/require-admin";
import { countPendingBookings } from "@/server/queries/admin-bookings";

export default async function PainelPage() {
  const { supabase } = await requireAdmin();
  const pending = await countPendingBookings(supabase);

  return (
    <main id="conteudo" className="flex-1 py-12">
      <Container className="grid gap-8">
        <h1 className="font-serif text-h1 font-normal">Painel</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          <section
            aria-labelledby="painel-solicitacoes"
            className="grid gap-3 rounded-photo bg-areia p-6"
          >
            <h2 id="painel-solicitacoes" className="font-serif text-h3 font-normal">
              Solicitações de reserva
            </h2>
            <p>
              {pending === 0
                ? "Nenhuma solicitação esperando resposta."
                : `${pending} ${pending === 1 ? "solicitação esperando" : "solicitações esperando"} sua resposta.`}
            </p>
            <div>
              <Link href="/admin/solicitacoes" className={buttonClasses("primary")}>
                Ver solicitações
              </Link>
            </div>
          </section>
          <section
            aria-labelledby="painel-imoveis"
            className="grid gap-3 rounded-photo border border-areia p-6"
          >
            <h2 id="painel-imoveis" className="font-serif text-h3 font-normal">
              Imóveis
            </h2>
            <p>Cadastro, fotos, tarifas, taxas e bloqueios de datas.</p>
            <div>
              <Link href="/admin/imoveis" className={buttonClasses("secondary")}>
                Ver imóveis
              </Link>
            </div>
          </section>
        </div>
      </Container>
    </main>
  );
}
