import Link from "next/link";

import { CoastScene } from "@/components/home/coast-scene";
import { HeroBackgroundVideo, HeroMotionToggle } from "@/components/home/hero-motion";
import { Container } from "@/components/ui/container";
import { heroSrc, heroSrcSet, type HeroMedia } from "@/lib/home/hero-photo";

/**
 * Topo da página inicial: foto em tela cheia (quando houver), com o vídeo do
 * mar por cima depois que a página carrega, e o título com as chamadas.
 * Sem foto, o cenário desenhado do litoral, com o mar em movimento.
 */
export function HomeHero({ media }: { media: HeroMedia | null }) {
  const photo = media?.photo ?? null;
  const video = media?.video ?? null;
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
            // Sem vídeo, a própria foto ganha um movimento lento.
            className={`absolute inset-0 -z-20 size-full object-cover ${video ? "" : "foto-viva"}`}
            style={photo.position ? { objectPosition: photo.position } : undefined}
          />
          {video ? <HeroBackgroundVideo video={video} position={photo.position} /> : null}
          {/*
            Véu em petróleo e marinho para o texto ficar legível mesmo sobre uma
            foto clara: mais forte embaixo (celular) e à esquerda (computador),
            onde está o texto.
          */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-linear-to-t from-abismo/95 via-petroleo/85 to-petroleo/75 lg:bg-linear-to-r lg:from-abismo/95 lg:via-petroleo/70 lg:to-petroleo/10"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-linear-to-t from-abismo/60 to-transparent"
          />
        </>
      ) : (
        <>
          <CoastScene />
          {/* Escurece o mar atrás do texto (embaixo no celular, à esquerda no computador). */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-linear-to-t from-abismo/85 via-abismo/25 via-55% to-transparent lg:bg-linear-to-r lg:from-abismo/70 lg:via-abismo/15 lg:via-45%"
          />
        </>
      )}

      <div className="absolute top-4 right-4 flex items-center gap-2">
        {photo?.illustrative ? (
          <span className="rounded-full bg-branco/95 px-2.5 py-1 text-small font-semibold text-abismo">
            {video ? "Imagens ilustrativas" : "Foto ilustrativa"}
          </span>
        ) : null}
        <HeroMotionToggle />
      </div>

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
        </div>
      </Container>
    </section>
  );
}
