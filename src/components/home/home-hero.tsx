import Link from "next/link";

import { Container } from "@/components/ui/container";
import { heroSrc, heroSrcSet, type HeroPhoto } from "@/lib/home/hero-photo";

/** Ondas finas no fundo desenhado: só decoração. */
function Waves() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1440 320"
      preserveAspectRatio="none"
      className="ondas-mar absolute inset-x-0 bottom-0 h-[45%] w-full text-dourado"
    >
      <path
        d="M0 210 C 240 170, 480 250, 720 205 S 1200 160, 1440 200"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.55"
      />
      <path
        d="M0 250 C 260 215, 520 285, 760 245 S 1220 205, 1440 240"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.3"
      />
      <path
        d="M0 288 C 300 260, 560 318, 820 282 S 1240 250, 1440 278"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.18"
      />
    </svg>
  );
}

/**
 * Topo da página inicial: foto em tela cheia (quando houver) com o título e as
 * chamadas. Sem foto, um fundo desenhado em petróleo e marinho.
 */
export function HomeHero({ photo }: { photo: HeroPhoto | null }) {
  return (
    <section
      aria-labelledby="titulo-inicio"
      className="relative isolate overflow-hidden bg-abismo text-marfim"
    >
      {photo ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroSrc(photo)}
            srcSet={heroSrcSet(photo)}
            sizes="100vw"
            alt={photo.alt}
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 -z-20 size-full object-cover"
            style={photo.position ? { objectPosition: photo.position } : undefined}
          />
          {/*
            Véu escuro para o texto ficar legível mesmo sobre uma foto clara:
            mais forte embaixo (celular) e à esquerda (computador), onde está o texto.
          */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-linear-to-t from-abismo/95 via-abismo/75 to-abismo/65 lg:bg-linear-to-r lg:from-abismo/95 lg:via-abismo/75 lg:to-abismo/10"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-linear-to-t from-abismo/60 to-transparent"
          />
          {photo.illustrative ? (
            <span className="absolute top-4 right-4 rounded-full bg-branco/95 px-2.5 py-1 text-small font-semibold text-abismo">
              Foto ilustrativa
            </span>
          ) : null}
        </>
      ) : (
        <div aria-hidden="true" className="hero-sem-foto absolute inset-0 -z-10">
          <Waves />
        </div>
      )}

      <Container className="flex min-h-[36rem] flex-col justify-end gap-6 pt-20 pb-28 sm:min-h-[40rem] sm:pb-32 lg:min-h-[min(48rem,85svh)] lg:pb-36">
        <p className="entrada flex items-center gap-3 text-small font-semibold tracking-[0.18em] text-marfim uppercase">
          <span aria-hidden="true" className="h-px w-10 bg-dourado" />
          Riviera de São Lourenço · Litoral Norte
        </p>
        <h1
          id="titulo-inicio"
          className="entrada-titulo max-w-[13ch] font-serif text-[2.75rem] leading-[1.04] font-normal tracking-[-0.015em] [--atraso:80ms] sm:text-display lg:text-[4.75rem]"
        >
          Seu próximo capítulo começa aqui.
        </h1>
        <p className="entrada max-w-[44ch] text-[1.0625rem] text-areia [--atraso:180ms] sm:text-[1.1875rem]">
          Casas extraordinárias, experiências exclusivas e o melhor do litoral paulista.
        </p>
        <div className="entrada mt-2 flex flex-wrap gap-3 [--atraso:280ms]">
          <Link
            href="/temporada"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-marfim px-6 font-semibold text-petroleo transition-[background-color,transform] duration-200 hover:bg-areia active:scale-[0.98]"
          >
            Explorar imóveis
          </Link>
          <Link
            href="/temporada?regiao=riviera-de-sao-lourenco"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-marfim/70 px-6 font-semibold text-marfim transition-[background-color,transform] duration-200 hover:bg-marfim/10 active:scale-[0.98]"
          >
            Conheça a Riviera
          </Link>
        </div>
      </Container>
    </section>
  );
}
