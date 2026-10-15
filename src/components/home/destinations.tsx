import Link from "next/link";
import type { ReactNode } from "react";

import { ArrowRightIcon } from "@/components/ui/icons";
import { heroSrc, heroSrcSet } from "@/lib/home/hero-photo";
import {
  destinationHref,
  destinations,
  rentalCountLabel,
  type Destination,
} from "@/lib/home/destinations";
import type { RegionSlug } from "@/lib/regions";

/**
 * Desenho de cada destino enquanto não há foto: traços dourados finos sobre
 * petróleo e marinho, com o relevo característico da região. Só decoração.
 */
const motifs: Record<RegionSlug, ReactNode> = {
  // Praia longa e reta, com o sol baixo.
  "riviera-de-sao-lourenco": (
    <>
      <circle cx="300" cy="150" r="34" strokeOpacity="0.7" />
      <path d="M0 196 H400" strokeOpacity="0.8" />
      <path d="M0 222 C 70 214, 130 230, 200 222 S 330 214, 400 222" strokeOpacity="0.45" />
      <path d="M0 248 C 80 240, 140 256, 210 248 S 340 240, 400 248" strokeOpacity="0.28" />
      <path d="M0 272 C 90 266, 150 280, 220 272 S 350 266, 400 272" strokeOpacity="0.16" />
    </>
  ),
  // Enseadas recortadas da costa sul.
  "sao-sebastiao": (
    <>
      <path
        d="M0 170 C 30 140, 60 140, 80 175 C 100 140, 140 128, 165 172 C 190 132, 240 120, 265 170 C 290 138, 330 130, 360 168 C 375 150, 390 148, 400 152"
        strokeOpacity="0.75"
      />
      <path d="M0 215 C 80 205, 160 225, 240 212 S 360 205, 400 212" strokeOpacity="0.4" />
      <path d="M0 250 C 90 242, 170 258, 250 248 S 360 242, 400 248" strokeOpacity="0.22" />
    </>
  ),
  // A ilha montanhosa sobre o canal.
  ilhabela: (
    <>
      <path
        d="M70 200 C 110 190, 130 130, 175 112 C 205 100, 225 140, 250 128 C 280 114, 300 170, 340 200"
        strokeOpacity="0.8"
      />
      <path d="M0 200 H400" strokeOpacity="0.55" />
      <path d="M0 232 C 80 224, 160 240, 240 230 S 360 224, 400 230" strokeOpacity="0.32" />
      <path d="M0 262 C 90 256, 170 270, 250 262 S 360 256, 400 262" strokeOpacity="0.18" />
    </>
  ),
  // Baía larga e plana, com uma ilhota.
  caraguatatuba: (
    <>
      <path d="M0 150 C 90 200, 310 200, 400 150" strokeOpacity="0.75" />
      <path d="M250 150 C 262 138, 286 136, 300 150" strokeOpacity="0.6" />
      <path d="M0 225 C 90 218, 170 232, 250 224 S 360 218, 400 224" strokeOpacity="0.35" />
      <path d="M0 258 C 90 252, 170 266, 250 258 S 360 252, 400 258" strokeOpacity="0.2" />
    </>
  ),
  // A Serra do Mar descendo até o mar.
  ubatuba: (
    <>
      <path
        d="M0 150 L60 105 L110 135 L170 80 L235 130 L290 95 L350 140 L400 115"
        strokeOpacity="0.45"
      />
      <path d="M0 185 L70 145 L130 172 L200 128 L270 170 L330 140 L400 175" strokeOpacity="0.75" />
      <path d="M0 220 C 90 212, 170 228, 250 218 S 360 212, 400 218" strokeOpacity="0.35" />
      <path d="M0 252 C 90 246, 170 260, 250 252 S 360 246, 400 252" strokeOpacity="0.2" />
    </>
  ),
};

function DestinationCard({
  destination,
  count,
  featured,
}: {
  destination: Destination;
  count: number;
  featured: boolean;
}) {
  const { photo } = destination;
  const countLabel = rentalCountLabel(count);

  return (
    <Link
      href={destinationHref(destination.slug)}
      className={
        "group relative isolate flex h-full flex-col justify-end overflow-hidden rounded-photo bg-abismo p-5 text-marfim sm:p-6 " +
        (featured ? "sm:min-h-[22rem] lg:min-h-[36rem]" : "sm:min-h-[18rem]")
      }
    >
      {photo ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroSrc(photo)}
            srcSet={heroSrcSet(photo)}
            sizes={
              featured
                ? "(min-width: 1024px) 620px, 100vw"
                : "(min-width: 1024px) 300px, (min-width: 640px) 50vw, 100vw"
            }
            alt={photo.alt}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 -z-20 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            style={photo.position ? { objectPosition: photo.position } : undefined}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-linear-to-t from-abismo/95 via-abismo/55 to-abismo/10"
          />
          {photo.illustrative ? (
            <span className="absolute top-4 left-4 rounded-full bg-branco/95 px-2.5 py-1 text-small font-semibold text-abismo">
              Foto ilustrativa
            </span>
          ) : null}
        </>
      ) : (
        <div aria-hidden="true" className="destino-sem-foto absolute inset-0 -z-10" />
      )}

      {/* Espaço do desenho (ou da foto) acima do texto: os traços nunca passam por trás dele. */}
      <div
        aria-hidden="true"
        className="relative -mx-5 -mt-5 mb-4 aspect-[9/5] sm:-mx-6 sm:-mt-6 sm:aspect-auto sm:min-h-[8rem] sm:flex-1"
      >
        {photo ? null : (
          <svg
            viewBox="0 70 400 220"
            preserveAspectRatio="xMidYMax slice"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            className="absolute inset-0 size-full text-dourado transition-transform duration-700 ease-out group-hover:-translate-y-1"
          >
            {motifs[destination.slug]}
          </svg>
        )}
      </div>

      <p className="flex items-center gap-2.5 text-small font-semibold tracking-[0.16em] text-dourado uppercase">
        <span aria-hidden="true" className="h-px w-6 bg-dourado" />
        {destination.caption}
      </p>
      <h3
        className={
          "mt-2 font-serif leading-[1.08] font-normal " +
          (featured ? "text-[2rem] sm:text-h1" : "text-[1.625rem]")
        }
      >
        {destination.name}
      </h3>
      <p className={"mt-2 text-areia " + (featured ? "max-w-[38ch]" : "max-w-[32ch] text-small")}>
        {destination.description}
      </p>
      <p className="mt-4 inline-flex items-center gap-2 text-small font-semibold">
        {countLabel ?? "Ver imóveis"}
        <ArrowRightIcon
          width={16}
          height={16}
          className="transition-transform duration-300 group-hover:translate-x-1"
        />
      </p>
    </Link>
  );
}

/**
 * Destinos da página inicial, da Riviera a Ubatuba. A Riviera, foco da casa,
 * ocupa o cartão maior. A contagem vem do banco; sem imóveis, só o convite.
 */
export function Destinations({ counts }: { counts: Partial<Record<RegionSlug, number>> }) {
  return (
    <section aria-labelledby="titulo-destinos" className="grid gap-8">
      <div className="grid gap-3">
        <p className="flex items-center gap-3 text-small font-semibold tracking-[0.18em] text-rocha uppercase">
          <span aria-hidden="true" className="h-px w-10 bg-dourado" />
          Destinos
        </p>
        <h2 id="titulo-destinos" className="font-serif text-h2 font-normal">
          Da Riviera a Ubatuba
        </h2>
        <p className="max-w-[56ch] text-rocha">
          Cinco destinos pela Rio-Santos, de Bertioga à divisa com o Rio de Janeiro.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
        {destinations.map((destination, index) => (
          <li
            key={destination.slug}
            className={index === 0 ? "sm:col-span-2 lg:row-span-2" : undefined}
          >
            <DestinationCard
              destination={destination}
              count={counts[destination.slug] ?? 0}
              featured={index === 0}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
