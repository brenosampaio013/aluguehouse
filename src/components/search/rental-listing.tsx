import Link from "next/link";

import { PropertyCard } from "@/components/property/property-card";
import { Container } from "@/components/ui/container";
import { FormMessage } from "@/components/ui/form-message";
import { getPublicEnv } from "@/lib/env";
import { formatDateISO } from "@/lib/format";
import { regions } from "@/lib/regions";
import {
  PAGE_SIZE,
  activeFilterCount,
  rentalHref,
  type RentalFilters,
  type RentalMode,
} from "@/lib/search/params";
import { listAmenities, searchRentals } from "@/server/queries/search";

import { FiltersDisclosure } from "./filters-disclosure";
import { RentalFiltersForm } from "./rental-filters";

const copy = {
  seasonal: {
    path: "/temporada",
    title: "Aluguel por temporada",
    intro:
      "Estadias de 1 a 29 noites. Escolha as datas para ver só o que está livre e o total estimado.",
    switchText: "Procurando 30 noites ou mais?",
    switchLabel: "Ver aluguel mensal",
    switchPath: "/mensal",
  },
  monthly: {
    path: "/mensal",
    title: "Aluguel mensal",
    intro: "Estadias de 30 a 90 noites, com valor proporcional ao mês.",
    switchText: "Estadia mais curta?",
    switchLabel: "Ver temporada",
    switchPath: "/temporada",
  },
} as const;

/** Data de hoje em São Paulo, para o mínimo dos campos de data. */
function todaySaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export async function RentalListing({
  mode,
  filters,
}: {
  mode: RentalMode;
  filters: RentalFilters;
}) {
  const text = copy[mode];
  const [result, amenities] = await Promise.all([searchRentals(mode, filters), listAmenities()]);
  const { NEXT_PUBLIC_SUPABASE_URL: supabaseUrl } = getPublicEnv();

  const region = regions.find((r) => r.slug === filters.regiao);
  const context = [
    region ? `em ${region.name}` : null,
    filters.chegada && filters.saida
      ? `de ${formatDateISO(filters.chegada)} a ${formatDateISO(filters.saida)}`
      : null,
    filters.hospedes ? `para ${plural(filters.hospedes, "hóspede", "hóspedes")}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const stayQuery = new URLSearchParams();
  if (filters.chegada && filters.saida) {
    stayQuery.set("chegada", filters.chegada);
    stayQuery.set("saida", filters.saida);
  }
  if (filters.hospedes) stayQuery.set("hospedes", String(filters.hospedes));
  const staySuffix = stayQuery.size > 0 ? `?${stayQuery}` : "";

  const totalPages = result.status === "ok" ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1;

  return (
    <main id="conteudo" className="flex-1 py-12">
      <Container className="grid gap-8">
        <div className="grid gap-3">
          <h1 className="font-serif text-h1 font-normal">{text.title}</h1>
          <p className="max-w-[60ch] text-rocha">{text.intro}</p>
          <p className="text-small">
            {text.switchText}{" "}
            <Link
              href={text.switchPath}
              className="font-semibold text-petroleo underline underline-offset-3"
            >
              {text.switchLabel}
            </Link>
          </p>
        </div>

        <FiltersDisclosure activeCount={activeFilterCount(filters)}>
          <RentalFiltersForm
            path={text.path}
            mode={mode}
            filters={filters}
            amenities={amenities}
            today={todaySaoPaulo()}
          />
        </FiltersDisclosure>

        <section aria-labelledby="resultados-titulo" className="grid min-w-0 gap-8">
          {result.status === "invalid" ? (
            <>
              <h2 id="resultados-titulo" className="sr-only">
                Resultados
              </h2>
              <FormMessage tone="error">{result.message}</FormMessage>
            </>
          ) : (
            <>
              <h2 id="resultados-titulo" className="text-h3 font-semibold" aria-live="polite">
                {result.total === 0
                  ? "Nenhum imóvel encontrado"
                  : plural(result.total, "imóvel encontrado", "imóveis encontrados")}
                {context ? <span className="font-normal text-rocha"> {context}</span> : null}
              </h2>

              {result.total === 0 ? (
                <p className="max-w-[60ch]">
                  Nenhuma casa com esses filtros. Tente outras datas ou remova um filtro.{" "}
                  <Link
                    href={text.path}
                    className="font-semibold text-petroleo underline underline-offset-3"
                  >
                    Limpar filtros
                  </Link>
                </p>
              ) : (
                <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                  {result.items.map((item, index) => (
                    <li key={item.slug}>
                      <PropertyCard
                        property={item}
                        supabaseUrl={supabaseUrl}
                        priority={index < 2}
                        href={`/imoveis/${item.slug}${staySuffix}`}
                        stay={item.stay}
                      />
                    </li>
                  ))}
                </ul>
              )}

              {totalPages > 1 ? (
                <nav aria-label="Paginação" className="flex flex-wrap items-center gap-2">
                  {filters.pagina > 1 ? (
                    <Link
                      href={rentalHref(text.path, filters, { pagina: filters.pagina - 1 })}
                      className="inline-flex min-h-11 items-center rounded-control px-3 font-semibold text-petroleo underline"
                    >
                      Anterior
                    </Link>
                  ) : null}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Link
                      key={page}
                      href={rentalHref(text.path, filters, { pagina: page })}
                      aria-current={page === filters.pagina ? "page" : undefined}
                      className={
                        "inline-flex size-11 items-center justify-center rounded-control font-semibold " +
                        (page === filters.pagina
                          ? "bg-petroleo text-branco"
                          : "text-petroleo hover:bg-areia")
                      }
                    >
                      <span className="sr-only">Página </span>
                      {page}
                    </Link>
                  ))}
                  {filters.pagina < totalPages ? (
                    <Link
                      href={rentalHref(text.path, filters, { pagina: filters.pagina + 1 })}
                      className="inline-flex min-h-11 items-center rounded-control px-3 font-semibold text-petroleo underline"
                    >
                      Próxima
                    </Link>
                  ) : null}
                </nav>
              ) : null}
            </>
          )}
        </section>
      </Container>
    </main>
  );
}
