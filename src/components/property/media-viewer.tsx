"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { CloseIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { mediaSrcSet, publicMediaUrl, variantPath, variantWidths } from "@/lib/media";
import { formatDuration, publicVideoUrl } from "@/lib/videos";

import type { PhotoData } from "./photo";

export type VideoData = {
  id: string;
  path: string;
  posterPath: string;
  caption: string | null;
  alt: string;
  duration: number | null;
  width: number | null;
  height: number | null;
};

type Item = { kind: "photo"; photo: PhotoData } | { kind: "video"; video: VideoData };

const ViewerContext = createContext<((index: number) => void) | null>(null);

export function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <path
        d="M8 5.5v13a.6.6 0 0 0 .9.5l10.2-6.5a.6.6 0 0 0 0-1L8.9 5a.6.6 0 0 0-.9.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={direction === "left" ? "m15 5-7 7 7 7" : "m9 5 7 7-7 7"} />
    </svg>
  );
}

/** Botão da galeria que abre o visualizador numa foto ou vídeo. */
export function OpenMediaButton({
  index,
  label,
  className,
  children,
}: {
  index: number;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const open = useContext(ViewerContext);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => open?.(index)}
      className={cn("group relative cursor-pointer text-left", className)}
    >
      {children}
    </button>
  );
}

function itemLabel(item: Item, index: number, items: Item[]) {
  if (item.kind === "photo") {
    const photos = items.filter((entry) => entry.kind === "photo").length;
    return `Foto ${index + 1} de ${photos}`;
  }
  const videos = items.filter((entry) => entry.kind === "video");
  const position = videos.findIndex((entry) => entry === item) + 1;
  return `Vídeo ${position} de ${videos.length}`;
}

function aspect(width: number | null, height: number | null) {
  return width && height ? width / height : 16 / 9;
}

/**
 * Visualizador em tela cheia com fotos e vídeos. O vídeo só é carregado
 * quando o visitante clica em reproduzir, e para ao trocar de item ou fechar.
 */
export function MediaViewerProvider({
  photos,
  videos,
  supabaseUrl,
  children,
}: {
  photos: PhotoData[];
  videos: VideoData[];
  supabaseUrl: string;
  children: ReactNode;
}) {
  const items: Item[] = [
    ...photos.map((photo) => ({ kind: "photo" as const, photo })),
    ...videos.map((video) => ({ kind: "video" as const, video })),
  ];
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stripRef = useRef<HTMLOListElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const touchStart = useRef<number | null>(null);

  const open = useCallback((target: number) => {
    setIndex(target);
    setPlaying(false);
    dialogRef.current?.showModal();
  }, []);

  const go = useCallback(
    (step: number) => {
      setPlaying(false);
      setIndex((current) => (current + step + items.length) % items.length);
    },
    [items.length],
  );

  // Miniatura atual centralizada na faixa. Rola só a faixa (scrollIntoView
  // rolaria também a janela inteira no celular).
  useEffect(() => {
    const strip = stripRef.current;
    const thumb = strip?.querySelector<HTMLElement>(`[data-index="${index}"]`);
    if (!strip || !thumb) return;
    strip.scrollTo({
      left: thumb.offsetLeft - strip.clientWidth / 2 + thumb.clientWidth / 2,
      behavior: "smooth",
    });
  }, [index]);

  const current = items[index];
  const total = items.length;

  return (
    <ViewerContext.Provider value={open}>
      {children}
      <dialog
        ref={dialogRef}
        aria-label="Fotos e vídeos do imóvel"
        onClose={() => setPlaying(false)}
        onKeyDown={(event) => {
          // Setas dentro do player controlam o vídeo, não a galeria.
          if ((event.target as HTMLElement).closest("video")) return;
          if (event.key === "ArrowRight") go(1);
          if (event.key === "ArrowLeft") go(-1);
        }}
        className="sobre-escuro m-0 size-full max-h-none max-w-none bg-abismo p-0 text-marfim backdrop:bg-abismo/80"
      >
        {current ? (
          <div className="grid h-full grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-4 py-2 sm:px-8">
              <p
                aria-live="polite"
                className="text-small font-semibold tracking-[0.12em] uppercase"
              >
                {itemLabel(current, index, items)}
              </p>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="inline-flex size-11 items-center justify-center rounded-full transition-colors hover:bg-marfim/10"
              >
                <CloseIcon width={24} height={24} />
                <span className="sr-only">Fechar</span>
              </button>
            </div>

            <div
              className="relative flex min-h-0 items-center justify-center px-2 sm:px-20"
              onTouchStart={(event) => {
                touchStart.current = playing ? null : event.touches[0]!.clientX;
              }}
              onTouchEnd={(event) => {
                if (touchStart.current === null) return;
                const delta = event.changedTouches[0]!.clientX - touchStart.current;
                touchStart.current = null;
                if (Math.abs(delta) > 50) go(delta < 0 ? 1 : -1);
              }}
            >
              {current.kind === "photo" ? (
                <figure
                  key={current.photo.id}
                  className="flex h-full max-h-full w-full flex-col items-center justify-center gap-3 motion-safe:animate-[fade-in_200ms_ease-out]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={publicMediaUrl(
                      supabaseUrl,
                      variantPath(current.photo.path, variantWidths(current.photo.width).at(-1)!),
                    )}
                    srcSet={mediaSrcSet(supabaseUrl, current.photo.path, current.photo.width)}
                    sizes="100vw"
                    alt={current.photo.alt}
                    decoding="async"
                    className="max-h-full min-h-0 max-w-full rounded-control object-contain"
                  />
                  {current.photo.isDemo ? (
                    <figcaption className="rounded-full bg-branco/95 px-2.5 py-1 text-small font-semibold text-abismo">
                      Foto ilustrativa
                    </figcaption>
                  ) : null}
                </figure>
              ) : (
                <figure
                  key={current.video.id}
                  className="flex h-full max-h-full w-full flex-col items-center justify-center gap-3 motion-safe:animate-[fade-in_200ms_ease-out]"
                >
                  <div
                    className="bg-black relative max-h-full w-full max-w-5xl overflow-hidden rounded-control"
                    style={{
                      aspectRatio: aspect(current.video.width, current.video.height),
                      // Vídeos verticais não passam da altura da tela.
                      maxWidth: `min(64rem, calc((100svh - 13rem) * ${aspect(current.video.width, current.video.height)}))`,
                    }}
                  >
                    {playing ? (
                      <video
                        src={publicVideoUrl(supabaseUrl, current.video.path)}
                        poster={publicMediaUrl(supabaseUrl, current.video.posterPath)}
                        controls
                        autoPlay
                        playsInline
                        preload="auto"
                        aria-label={current.video.alt}
                        className="size-full object-contain"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPlaying(true)}
                        className="group absolute inset-0 grid place-items-center"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={publicMediaUrl(supabaseUrl, current.video.posterPath)}
                          alt=""
                          decoding="async"
                          className="absolute inset-0 size-full object-contain"
                        />
                        <span aria-hidden="true" className="absolute inset-0 bg-abismo/30" />
                        <span className="relative grid size-20 place-items-center rounded-full bg-marfim/95 text-petroleo shadow-[0_10px_30px_rgb(0_0_0/0.35)] transition-transform duration-300 group-hover:scale-105">
                          <PlayIcon className="ml-1 size-9" />
                        </span>
                        <span className="sr-only">
                          Reproduzir{" "}
                          {current.video.caption ? `o vídeo “${current.video.caption}”` : "o vídeo"}
                        </span>
                      </button>
                    )}
                  </div>
                  {current.video.caption || current.video.duration ? (
                    <figcaption className="text-center text-areia">
                      {current.video.caption}
                      {current.video.caption && current.video.duration ? " · " : ""}
                      {current.video.duration ? formatDuration(current.video.duration) : ""}
                    </figcaption>
                  ) : null}
                </figure>
              )}

              {total > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    className="absolute top-1/2 left-2 hidden size-12 -translate-y-1/2 place-items-center rounded-full border border-marfim/40 bg-abismo/60 transition-colors hover:bg-marfim/15 sm:left-5 sm:grid"
                  >
                    <Chevron direction="left" />
                    <span className="sr-only">Anterior</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    className="absolute top-1/2 right-2 hidden size-12 -translate-y-1/2 place-items-center rounded-full border border-marfim/40 bg-abismo/60 transition-colors hover:bg-marfim/15 sm:right-5 sm:grid"
                  >
                    <Chevron direction="right" />
                    <span className="sr-only">Próximo</span>
                  </button>
                </>
              ) : null}
            </div>

            {total > 1 ? (
              <div className="border-t border-marfim/15 px-4 pt-3 pb-4 sm:px-8">
                <div className="mb-3 flex justify-center gap-3 sm:hidden">
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    className="grid size-11 place-items-center rounded-full border border-marfim/40"
                  >
                    <Chevron direction="left" />
                    <span className="sr-only">Anterior</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    className="grid size-11 place-items-center rounded-full border border-marfim/40"
                  >
                    <Chevron direction="right" />
                    <span className="sr-only">Próximo</span>
                  </button>
                </div>
                <ol
                  ref={stripRef}
                  aria-label="Miniaturas"
                  className="relative flex gap-2 overflow-x-auto p-1"
                >
                  {items.map((item, itemIndex) => {
                    const selected = itemIndex === index;
                    const thumb =
                      item.kind === "photo"
                        ? publicMediaUrl(
                            supabaseUrl,
                            variantPath(item.photo.path, variantWidths(item.photo.width)[0]!),
                          )
                        : publicMediaUrl(supabaseUrl, item.video.posterPath);
                    return (
                      <li
                        key={item.kind === "photo" ? item.photo.id : item.video.id}
                        data-index={itemIndex}
                        className="shrink-0"
                      >
                        <button
                          type="button"
                          aria-current={selected ? "true" : undefined}
                          onClick={() => {
                            setPlaying(false);
                            setIndex(itemIndex);
                          }}
                          className={cn(
                            "relative block h-14 w-20 overflow-hidden rounded-control transition-opacity",
                            selected
                              ? "opacity-100 outline-2 outline-offset-2 outline-dourado"
                              : "opacity-60 hover:opacity-100",
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={thumb}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="size-full object-cover"
                          />
                          {item.kind === "video" ? (
                            <span
                              aria-hidden="true"
                              className="absolute inset-0 grid place-items-center bg-abismo/35"
                            >
                              <span className="grid size-7 place-items-center rounded-full bg-marfim/95 text-petroleo">
                                <PlayIcon className="ml-0.5 size-4" />
                              </span>
                            </span>
                          ) : null}
                          <span className="sr-only">{itemLabel(item, itemIndex, items)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ) : null}
          </div>
        ) : null}
      </dialog>
    </ViewerContext.Provider>
  );
}
