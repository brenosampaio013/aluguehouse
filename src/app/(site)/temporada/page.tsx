import type { Metadata } from "next";

import { RentalListing } from "@/components/search/rental-listing";
import { parseRentalFilters } from "@/lib/search/params";

export const metadata: Metadata = {
  title: "Aluguel por temporada",
  description:
    "Casas e apartamentos para temporada na Riviera de São Lourenço e no Litoral Norte de São Paulo, com reserva por solicitação.",
  // Filtros e páginas da busca apontam para a listagem principal.
  alternates: { canonical: "/temporada" },
};

export default async function TemporadaPage({ searchParams }: PageProps<"/temporada">) {
  return <RentalListing mode="seasonal" filters={parseRentalFilters(await searchParams)} />;
}
