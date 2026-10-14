import type { Metadata } from "next";
import Link from "next/link";

import { StatusBadge } from "@/components/admin/status-badge";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listPropertiesForAdmin } from "@/server/queries/admin-properties";

export const metadata: Metadata = { title: "Imóveis" };

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

function modes(p: { offers_seasonal: boolean; offers_monthly: boolean; offers_sale: boolean }) {
  const list = [
    p.offers_seasonal && "Temporada",
    p.offers_monthly && "Mensal",
    p.offers_sale && "Venda",
  ].filter(Boolean);
  return list.length > 0 ? list.join(", ") : "Nenhuma definida";
}

export default async function ImoveisPage() {
  const { supabase } = await requireAdmin();
  const properties = await listPropertiesForAdmin(supabase);

  return (
    <main id="conteudo" className="flex-1 py-12">
      <Container className="grid gap-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-serif text-h1 font-normal">Imóveis</h1>
          <Link href="/admin/imoveis/novo" className={buttonClasses("primary")}>
            Novo imóvel
          </Link>
        </div>

        {properties.length === 0 ? (
          <p className="text-rocha">
            Nenhum imóvel cadastrado ainda. Comece pelo botão “Novo imóvel”.
          </p>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <caption className="sr-only">Imóveis cadastrados</caption>
              <thead className="text-small text-rocha">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Imóvel
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Local
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Modalidades
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Situação
                  </th>
                  <th scope="col" className="py-2 font-semibold">
                    Atualizado
                  </th>
                </tr>
              </thead>
              <tbody>
                {properties.map((property) => (
                  <tr key={property.id} className="border-t border-areia">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/admin/imoveis/${property.id}`}
                        className="font-semibold text-petroleo underline underline-offset-3"
                      >
                        {property.title}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">
                      {[property.neighborhood, property.city].filter(Boolean).join(", ")}
                    </td>
                    <td className="py-3 pr-4">{modes(property)}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={property.status} />
                    </td>
                    <td className="py-3 text-rocha tabular-nums">
                      {dateTime.format(new Date(property.updated_at))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Container>
    </main>
  );
}
