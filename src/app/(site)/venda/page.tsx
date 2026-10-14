import type { Metadata } from "next";

import { SaleListing } from "@/components/search/sale-listing";
import { parseSaleFilters } from "@/lib/search/sale-params";

export const metadata: Metadata = {
  title: "Imóveis à venda",
  description:
    "Casas, apartamentos e terrenos à venda na Riviera de São Lourenço e no Litoral Norte de São Paulo.",
  // Filtros e páginas da busca apontam para a listagem principal.
  alternates: { canonical: "/venda" },
};

export default async function VendaPage({ searchParams }: PageProps<"/venda">) {
  return <SaleListing filters={parseSaleFilters(await searchParams)} />;
}
