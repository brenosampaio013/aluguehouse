import type { Metadata } from "next";

import { RentalListing } from "@/components/search/rental-listing";
import { parseRentalFilters } from "@/lib/search/params";

export const metadata: Metadata = {
  title: "Aluguel mensal",
  description:
    "Imóveis para aluguel mensal (30 a 90 noites) na Riviera de São Lourenço e no Litoral Norte de São Paulo.",
  // Filtros e páginas da busca apontam para a listagem principal.
  alternates: { canonical: "/mensal" },
};

export default async function MensalPage({ searchParams }: PageProps<"/mensal">) {
  return <RentalListing mode="monthly" filters={parseRentalFilters(await searchParams)} />;
}
