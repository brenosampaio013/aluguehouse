import Link from "next/link";

import { PropertyCard } from "@/components/property/property-card";
import { Container } from "@/components/ui/container";
import { getPublicEnv } from "@/lib/env";
import { propertyTypeLabels } from "@/lib/properties/labels";
import { regions } from "@/lib/regions";
import { PAGE_SIZE } from "@/lib/search/params";
import { activeSaleFilterCount, saleHref, type SaleFilters } from "@/lib/search/sale-params";
import { siteConfig } from "@/lib/site-config";
import { listAmenities, searchSales } from "@/server/queries/search";

import { FiltersDisclosure } from "./filters-disclosure";
import { Pagination } from "./pagination";
import { ResultsWithMap } from "./results-with-map";
import { SaleFiltersForm } from "./sale-filters";

export async function SaleListing({ filters }: { filters: SaleFilters }) {
  const [result, amenities] = await Promise.all([searchSales(filters), listAmenities()]);
  const { NEXT_PUBLIC_SUPABASE_URL: supabaseUrl } = getPublicEnv();
  const { responsible, contact } = siteConfig;

  const region = regions.find((r) => r.slug === filters.regiao);
  const context = [
    filters.tipo ? propertyTypeLabels[filters.tipo].toLowerCase() : null,
    region ? `em ${region.name}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <main id="conteudo" className="flex-1 py-12">
      <Container className="grid gap-8">
        <div className="grid gap-3">
          <h1 className="font-serif text-h1 font-normal">Imóveis à venda</h1>
          <p className="max-w-[60ch] text-rocha">
            Casas, apartamentos e terrenos na Riviera de São Lourenço e no Litoral Norte. Para
            visitar ou saber mais, fale com a gente pelo{" "}
            <a
              href={`https://wa.me/${contact.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-petroleo underline underline-offset-3"
            >
              WhatsApp
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
            .
          </p>
          {responsible.name && responsible.creci ? (
            <p className="text-small text-rocha">
              Intermediação: {responsible.name}, CRECI {responsible.creci}
            </p>
          ) : null}
        </div>

        <FiltersDisclosure activeCount={activeSaleFilterCount(filters)}>
          <SaleFiltersForm filters={filters} amenities={amenities} />
        </FiltersDisclosure>

        <section aria-labelledby="resultados-titulo" className="grid min-w-0 gap-8">
          <h2 id="resultados-titulo" className="text-h3 font-semibold" aria-live="polite">
            {result.total === 0
              ? "Nenhum imóvel encontrado"
              : `${result.total} ${result.total === 1 ? "imóvel encontrado" : "imóveis encontrados"}`}
            {context ? <span className="font-normal text-rocha"> {context}</span> : null}
          </h2>

          {result.total === 0 ? (
            <p className="max-w-[60ch]">
              Nenhum imóvel à venda com esses filtros. Tente outra faixa de preço ou remova um
              filtro.{" "}
              <Link
                href="/venda"
                className="font-semibold text-petroleo underline underline-offset-3"
              >
                Limpar filtros
              </Link>
            </p>
          ) : (
            <ResultsWithMap
              areas={result.items.flatMap((item) =>
                item.location
                  ? [
                      {
                        id: item.slug,
                        lat: item.location.lat,
                        lng: item.location.lng,
                        label: item.title,
                        href: `/imoveis/${item.slug}`,
                      },
                    ]
                  : [],
              )}
            >
              <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-2">
                {result.items.map((item, index) => (
                  <li key={item.slug}>
                    <PropertyCard property={item} supabaseUrl={supabaseUrl} priority={index < 2} />
                  </li>
                ))}
              </ul>
            </ResultsWithMap>
          )}

          <Pagination
            page={filters.pagina}
            totalPages={totalPages}
            hrefFor={(page) => saleHref(filters, { pagina: page })}
          />
        </section>
      </Container>
    </main>
  );
}
