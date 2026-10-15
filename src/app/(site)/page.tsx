import type { Metadata } from "next";
import { connection } from "next/server";

import { CoastLine } from "@/components/home/coast-line";
import { HeroSearch } from "@/components/home/hero-search";
import { HomeHero } from "@/components/home/home-hero";
import { PropertyCard } from "@/components/property/property-card";
import { JsonLd } from "@/components/seo/json-ld";
import { Container } from "@/components/ui/container";
import { getPublicEnv } from "@/lib/env";
import { heroPhoto } from "@/lib/home/hero-photo";
import { organizationJsonLd } from "@/lib/seo/json-ld";
import { siteConfig } from "@/lib/site-config";
import { MAX_SEARCH_GUESTS } from "@/lib/search/home-search";
import {
  getFeaturedProperties,
  getMaxGuestCapacity,
  type PropertyCardData,
} from "@/server/queries/public-properties";

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name} | Riviera de São Lourenço e Litoral Norte` },
  alternates: { canonical: "/" },
};

const steps = [
  {
    title: "Escolha a casa e as datas",
    text: "Veja fotos, comodidades e as datas livres de cada imóvel.",
  },
  {
    title: "Envie a solicitação",
    text: "Sem pagamento nesta etapa e sem precisar criar conta: só nome, e-mail e telefone.",
  },
  {
    title: "Receba a confirmação",
    text: "Conferimos a disponibilidade e respondemos por e-mail ou WhatsApp com os próximos passos.",
  },
];

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

/** Hoje no fuso de São Paulo (AAAA-MM-DD), como no calendário do imóvel. */
function todaySP() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export default async function HomePage() {
  // Gera a página a cada visita para os destaques refletirem o que está
  // publicado agora. Cache com revalidação entra na etapa de otimização.
  await connection();
  const [featured, maxGuests] = await Promise.all([loadFeatured(), loadCapacity()]);
  const { NEXT_PUBLIC_SUPABASE_URL: supabaseUrl } = getPublicEnv();

  return (
    <main id="conteudo" className="flex-1">
      <JsonLd data={organizationJsonLd(getPublicEnv().NEXT_PUBLIC_SITE_URL)} />
      <HomeHero photo={heroPhoto} />
      {/* A busca sobe sobre a borda inferior do topo. */}
      <Container className="relative z-20 -mt-20 sm:-mt-24">
        <div className="max-w-[60rem]">
          <HeroSearch today={todaySP()} maxGuests={Math.min(maxGuests, MAX_SEARCH_GUESTS)} />
        </div>
      </Container>

      <Container className="grid gap-20 pt-14 pb-16 sm:pt-16 sm:pb-20">
        <CoastLine />

        {featured.length > 0 ? (
          <section aria-labelledby="titulo-destaques" className="grid gap-8">
            <h2 id="titulo-destaques" className="font-serif text-h2 font-normal">
              Em destaque
            </h2>
            <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((property) => (
                <li key={property.slug}>
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
      </Container>

      <section aria-labelledby="titulo-como-funciona" className="bg-areia py-16 sm:py-20">
        <Container className="grid gap-10">
          <h2 id="titulo-como-funciona" className="font-serif text-h2 font-normal">
            Como funciona a reserva
          </h2>
          <ol className="grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="grid content-start gap-2">
                <span aria-hidden="true" className="font-serif text-h1 leading-none text-petroleo">
                  {index + 1}
                </span>
                <h3 className="text-h3 font-semibold">{step.title}</h3>
                <p className="max-w-[36ch] text-abismo">{step.text}</p>
              </li>
            ))}
          </ol>
          <p>
            Prefere conversar antes?{" "}
            <a
              href={`https://wa.me/${siteConfig.contact.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-petroleo underline underline-offset-3"
            >
              Fale no WhatsApp {siteConfig.contact.whatsappDisplay}
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
          </p>
        </Container>
      </section>
    </main>
  );
}
