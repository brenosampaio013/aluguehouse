import Link from "next/link";

import { AmenityIcon } from "@/components/amenities/amenity-icon";
import { PropertyCard } from "@/components/property/property-card";
import { Container } from "@/components/ui/container";
import { FormMessage } from "@/components/ui/form-message";
import { getPublicEnv } from "@/lib/env";
import { formatDateISO, todayInSaoPaulo } from "@/lib/format";
import { cn } from "@/lib/cn";
import { findDestination } from "@/lib/destinations";
import { CheckIcon, CloseIcon } from "@/components/ui/icons";
import {
  MAP_RESULTS_LIMIT,
  PAGE_SIZE,
  activeFilterCount,
  rentalHref,
  type RentalFilters,
  type RentalMode,
} from "@/lib/search/params";
import { listAmenities, searchRentals } from "@/server/queries/search";

import { FiltersDisclosure } from "./filters-disclosure";
import { Pagination } from "./pagination";
import { LinkPending } from "./link-pending";
import { MapResultItem, MapSearch } from "./map-search";
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

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Atalhos de comodidade sobre a lista (os mesmos filtros do formulário). */
const quickAmenities = ["piscina", "ar-condicionado", "wi-fi", "estacionamento", "aceita-pets"];

export async function RentalListing({
  mode,
  filters,
}: {
  mode: RentalMode;
  filters: RentalFilters;
}) {
  const text = copy[mode];
  const [result, amenities] = await Promise.all([
    searchRentals(mode, filters),
    listAmenities(filters.comodidades),
  ]);
  const { NEXT_PUBLIC_SUPABASE_URL: supabaseUrl } = getPublicEnv();

  const destination = findDestination(filters.destino ?? filters.regiao);
  const context = [
    filters.area ? "na área do mapa" : destination ? `em ${destination.name}` : null,
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

  const listed = result.status === "ok" ? Math.min(result.total, MAP_RESULTS_LIMIT) : 0;
  const totalPages = Math.max(1, Math.ceil(listed / PAGE_SIZE));
  const hasDates = Boolean(filters.chegada && filters.saida);
  const chips = quickAmenities.flatMap((slug) => {
    const amenity = amenities.find((a) => a.slug === slug);
    return amenity ? [amenity] : [];
  });
  const chipClass =
    "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-small font-semibold transition-colors";

  return (
    <main id="conteudo" className="flex-1">
      <Container className="grid gap-8 py-12">
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
            today={todayInSaoPaulo()}
          />
        </FiltersDisclosure>
      </Container>

      <section aria-labelledby="resultados-titulo" className="min-w-0 border-t border-areia">
        {result.status === "invalid" ? (
          <Container className="py-10">
            <h2 id="resultados-titulo" className="sr-only">
              Resultados
            </h2>
            <FormMessage tone="error">{result.message}</FormMessage>
          </Container>
        ) : (
          <MapSearch
            markers={result.markers}
            filters={filters}
            fallbackView={destination?.view}
            staySuffix={staySuffix}
            supabaseUrl={supabaseUrl}
          >
            <div className="grid gap-6 pt-8">
              <div className="grid gap-2">
                <h2 id="resultados-titulo" className="text-h3 font-semibold" aria-live="polite">
                  {result.total === 0
                    ? "Nenhum imóvel encontrado"
                    : plural(result.total, "imóvel encontrado", "imóveis encontrados")}
                  {context ? <span className="font-normal text-rocha"> {context}</span> : null}
                </h2>
                <p className="text-small text-rocha">
                  {mode === "seasonal"
                    ? hasDates
                      ? "Preço no mapa: média das diárias do período, com as tarifas de temporada e sem taxas. No cartão, o total estimado com taxas (sem caução)."
                      : "Preço no mapa e nos cartões: diária base, sem taxas. Escolha as datas para ver o valor do período."
                    : hasDates
                      ? "Preço no mapa: valor do mês, sem taxas. No cartão, o total estimado do período com taxas (sem caução)."
                      : "Preço no mapa e nos cartões: valor do mês, sem taxas."}{" "}
                  Localização aproximada; o endereço é enviado após a confirmação.
                </p>
              </div>

              <div className="flex flex-wrap gap-2" aria-label="Filtros rápidos" role="group">
                {filters.area ? (
                  <Link
                    href={rentalHref(text.path, filters, { area: undefined, pagina: 1 })}
                    className={cn(chipClass, "border-petroleo bg-petroleo text-branco")}
                  >
                    Área do mapa
                    <CloseIcon width={14} height={14} aria-hidden="true" />
                    <span className="sr-only">(remover)</span>
                  </Link>
                ) : null}
                {chips.map((amenity) => {
                  const active = filters.comodidades.includes(amenity.slug);
                  return (
                    <Link
                      key={amenity.slug}
                      href={rentalHref(text.path, filters, {
                        comodidades: active
                          ? filters.comodidades.filter((s) => s !== amenity.slug)
                          : [...filters.comodidades, amenity.slug],
                        pagina: 1,
                      })}
                      scroll={false}
                      className={cn(
                        chipClass,
                        active
                          ? "border-abismo bg-abismo text-branco"
                          : "border-junco bg-branco text-abismo hover:border-abismo",
                      )}
                    >
                      {active ? (
                        <CheckIcon width={14} height={14} aria-hidden="true" />
                      ) : (
                        <AmenityIcon name={amenity.slug} size={16} />
                      )}
                      {amenity.label}
                      {active ? <span className="sr-only">(ativo, remover)</span> : null}
                      <LinkPending />
                    </Link>
                  );
                })}
              </div>

              {result.total === 0 ? (
                <p className="max-w-[60ch]">
                  {filters.area
                    ? "Nenhum imóvel nesta área com esses filtros. Mova o mapa e pesquise de novo, ou remova um filtro."
                    : "Nenhum imóvel com esses filtros. Tente outras datas, outro destino ou remova um filtro."}{" "}
                  <Link
                    href={text.path}
                    className="font-semibold text-petroleo underline underline-offset-3"
                  >
                    Limpar filtros
                  </Link>
                </p>
              ) : (
                <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 2xl:grid-cols-3">
                  {result.items.map((item, index) => (
                    <MapResultItem key={item.id} id={item.id} title={item.title}>
                      <PropertyCard
                        property={item}
                        supabaseUrl={supabaseUrl}
                        priority={index < 2}
                        href={`/imoveis/${item.slug}${staySuffix}`}
                        stay={item.stay}
                      />
                    </MapResultItem>
                  ))}
                </ul>
              )}

              {result.capped ? (
                <p className="text-small text-rocha">
                  Mostrando os {MAP_RESULTS_LIMIT} primeiros. Aproxime o mapa e use “Pesquisar nesta
                  área” ou refine os filtros para ver os demais.
                </p>
              ) : null}
              {result.withoutLocation > 0 ? (
                <p className="text-small text-rocha">
                  {plural(
                    result.withoutLocation,
                    "imóvel ainda não tem localização e aparece só na lista.",
                    "imóveis ainda não têm localização e aparecem só na lista.",
                  )}
                </p>
              ) : null}

              <Pagination
                page={filters.pagina}
                totalPages={totalPages}
                hrefFor={(page) => rentalHref(text.path, filters, { pagina: page })}
              />
            </div>
          </MapSearch>
        )}
      </section>
    </main>
  );
}
