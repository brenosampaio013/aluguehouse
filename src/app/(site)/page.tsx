import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { Destinations } from "@/components/home/destinations";
import { HeroSearch } from "@/components/home/hero-search";
import { PersonalService } from "@/components/home/personal-service";
import { RevealOnScroll } from "@/components/home/reveal-on-scroll";
import { RivieraExperience } from "@/components/home/riviera-experience";
import { HomeHero } from "@/components/home/home-hero";
import { PropertyCard } from "@/components/property/property-card";
import { JsonLd } from "@/components/seo/json-ld";
import { Container } from "@/components/ui/container";
import { ArrowRightIcon } from "@/components/ui/icons";
import { getPublicEnv } from "@/lib/env";
import { heroPhoto } from "@/lib/home/hero-photo";
import { organizationJsonLd } from "@/lib/seo/json-ld";
import type { RegionSlug } from "@/lib/regions";
import { MAX_SEARCH_GUESTS } from "@/lib/search/home-search";
import { siteConfig } from "@/lib/site-config";
import {
  getFeaturedProperties,
  getMaxGuestCapacity,
  getSeasonalCountsByRegion,
  type PropertyCardData,
} from "@/server/queries/public-properties";

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name} | Riviera de São Lourenço e Litoral Norte` },
  alternates: { canonical: "/" },
};

async function loadFeatured(): Promise<PropertyCardData[]> {
  try {
    return await getFeaturedProperties(6);
  } catch (error) {
    // A página continua útil sem os destaques se o banco estiver fora do ar.
    console.error("Falha ao carregar destaques", error);
    return [];
  }
}

async function loadCapacity(): Promise<number> {
  try {
    return (await getMaxGuestCapacity()) ?? MAX_SEARCH_GUESTS;
  } catch (error) {
    console.error("Falha ao carregar a capacidade máxima", error);
    return MAX_SEARCH_GUESTS;
  }
}

async function loadRegionCounts(): Promise<Partial<Record<RegionSlug, number>>> {
  try {
    return await getSeasonalCountsByRegion();
  } catch (error) {
    // Sem a contagem, os destinos continuam com o convite "Ver imóveis".
    console.error("Falha ao contar imóveis por região", error);
    return {};
  }
}

/** Hoje no fuso de São Paulo (AAAA-MM-DD), como no calendário do imóvel. */
function todaySP() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export default async function HomePage() {
  // Gera a página a cada visita para os destaques refletirem o que está
  // publicado agora. Cache com revalidação entra na etapa de otimização.
  await connection();
  const [featured, maxGuests, regionCounts] = await Promise.all([
    loadFeatured(),
    loadCapacity(),
    loadRegionCounts(),
  ]);
  const { NEXT_PUBLIC_SUPABASE_URL: supabaseUrl } = getPublicEnv();

  return (
    <main id="conteudo" className="flex-1">
      <JsonLd data={organizationJsonLd(getPublicEnv().NEXT_PUBLIC_SITE_URL)} />
      <HomeHero photo={heroPhoto} />
      {/* A busca sobe sobre a borda inferior do topo. */}
      <Container className="relative z-20 -mt-20 sm:-mt-24">
        <div className="entrada max-w-[60rem] [--atraso:380ms]">
          <HeroSearch today={todaySP()} maxGuests={Math.min(maxGuests, MAX_SEARCH_GUESTS)} />
        </div>
      </Container>

      <Container className="grid gap-20 pt-14 pb-16 sm:gap-24 sm:pt-16 sm:pb-24">
        {featured.length > 0 ? (
          <section aria-labelledby="titulo-destaques" className="grid gap-8">
            <div className="revelar flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <div className="grid gap-3">
                <p className="flex items-center gap-3 text-small font-semibold tracking-[0.18em] text-rocha uppercase">
                  <span aria-hidden="true" className="h-px w-10 bg-dourado" />
                  Seleção
                </p>
                <h2 id="titulo-destaques" className="font-serif text-h2 font-normal">
                  Em destaque
                </h2>
              </div>
              <Link
                href="/temporada"
                className="group/seta inline-flex min-h-11 items-center gap-2 font-semibold text-petroleo underline-offset-4 hover:underline"
              >
                Ver todos os imóveis
                <ArrowRightIcon
                  width={16}
                  height={16}
                  className="transition-transform duration-300 group-hover/seta:translate-x-1"
                />
              </Link>
            </div>
            <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((property) => (
                <li key={property.slug} className="revelar">
                  <PropertyCard
                    property={property}
                    supabaseUrl={supabaseUrl}
                    // Abaixo da busca: sem prioridade, para não atrasar o título.
                    priority={false}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <Destinations counts={regionCounts} />
      </Container>

      <RivieraExperience count={regionCounts["riviera-de-sao-lourenco"] ?? 0} />
      <PersonalService />
      <RevealOnScroll />
    </main>
  );
}
