"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { mediaSrcSet, publicMediaUrl, variantPath, variantWidths } from "@/lib/media";

import type { PhotoData } from "./photo";

/** Telas grandes e sem pedido de movimento reduzido: modo imersivo. */
const IMMERSIVE_QUERY = "(min-width: 1024px) and (prefers-reduced-motion: no-preference)";

function src(supabaseUrl: string, photo: PhotoData, index: 0 | 1 | 2) {
  const widths = variantWidths(photo.width);
  return publicMediaUrl(
    supabaseUrl,
    variantPath(photo.path, widths[Math.min(index, widths.length - 1)]!),
  );
}

/**
 * "Percorra a casa": no computador, a foto fica fixa e troca conforme a
 * rolagem passa pela descrição de cada ambiente. No celular e com movimento
 * reduzido, vira uma sequência simples de fotos com legenda. As legendas são
 * as descrições (texto alternativo) cadastradas no painel.
 */
export function HouseStory({ photos, supabaseUrl }: { photos: PhotoData[]; supabaseUrl: string }) {
  const [active, setActive] = useState(0);
  const steps = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const media = window.matchMedia(IMMERSIVE_QUERY);
    let observer: IntersectionObserver | null = null;

    function start() {
      observer?.disconnect();
      observer = null;
      if (!media.matches) return;
      // A etapa que cruza o meio da tela é a ativa.
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) setActive(Number(entry.target.getAttribute("data-step")));
          }
        },
        { rootMargin: "-50% 0px -50% 0px" },
      );
      for (const step of steps.current) if (step) observer.observe(step);
    }

    start();
    media.addEventListener("change", start);
    return () => {
      media.removeEventListener("change", start);
      observer?.disconnect();
    };
  }, []);

  const total = photos.length;

  return (
    <section aria-labelledby="percorra-a-casa" data-active-step={active} className="grid gap-6">
      <div className="grid gap-2">
        <h2 id="percorra-a-casa" className="font-serif text-h2 font-normal">
          Percorra a casa
        </h2>
        <p className="max-w-[60ch] text-rocha">Ambiente por ambiente, na ordem das fotos.</p>
      </div>

      <div className="lg:motion-safe:grid lg:motion-safe:grid-cols-[3fr_2fr] lg:motion-safe:gap-12">
        {/* Palco fixo (decorativo: as descrições estão nas etapas ao lado). */}
        <div aria-hidden="true" className="hidden lg:motion-safe:block">
          <div
            data-testid="palco"
            className="sticky top-6 h-[min(80vh,720px)] overflow-hidden rounded-photo bg-areia"
          >
            {photos.map((photo, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={photo.id}
                src={src(supabaseUrl, photo, 1)}
                srcSet={mediaSrcSet(supabaseUrl, photo.path, photo.width)}
                sizes="(min-width: 1280px) 720px, 60vw"
                alt=""
                loading="lazy"
                decoding="async"
                className={cn(
                  "absolute inset-0 size-full object-cover transition-opacity duration-700 ease-out",
                  index === active ? "opacity-100" : "opacity-0",
                )}
              />
            ))}
            {photos[active]?.isDemo ? (
              <span className="absolute bottom-3 left-3 rounded-full bg-branco/95 px-2.5 py-1 text-small font-semibold text-abismo">
                Foto ilustrativa
              </span>
            ) : null}
          </div>
        </div>

        <ol className="grid gap-10 lg:motion-safe:gap-0">
          {photos.map((photo, index) => (
            <li
              key={photo.id}
              ref={(element) => {
                steps.current[index] = element;
              }}
              data-step={index}
              className="lg:motion-safe:flex lg:motion-safe:min-h-[75vh] lg:motion-safe:items-center"
            >
              <figure className="grid gap-3">
                {/* Sequência simples (celular e movimento reduzido). */}
                <span className="relative block aspect-[4/3] overflow-hidden rounded-photo bg-areia lg:motion-safe:hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src(supabaseUrl, photo, 0)}
                    srcSet={mediaSrcSet(supabaseUrl, photo.path, photo.width)}
                    sizes="(min-width: 1024px) 760px, 100vw"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover"
                  />
                  {photo.isDemo ? (
                    <span className="absolute bottom-3 left-3 rounded-full bg-branco/95 px-2.5 py-1 text-small font-semibold text-abismo">
                      Foto ilustrativa
                    </span>
                  ) : null}
                </span>
                <figcaption
                  className={cn(
                    "grid gap-1 transition-colors duration-500",
                    "lg:motion-safe:max-w-[28ch]",
                    index !== active && "lg:motion-safe:text-rocha",
                  )}
                >
                  <span className="text-small font-semibold text-rocha tabular-nums">
                    Foto {index + 1} de {total}
                  </span>
                  <span className="text-body lg:motion-safe:font-serif lg:motion-safe:text-h2">
                    {photo.alt}
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
