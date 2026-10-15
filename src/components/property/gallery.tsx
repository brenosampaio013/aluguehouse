import { buttonClasses } from "@/components/ui/button";
import { publicMediaUrl } from "@/lib/media";
import { formatDuration } from "@/lib/videos";

import { AllPhotosDialog } from "./all-photos-dialog";
import { MediaViewerProvider, OpenMediaButton, PlayIcon, type VideoData } from "./media-viewer";
import { Photo, type PhotoData } from "./photo";

/** Miniatura de vídeo: foto do quadro, véu, botão de play e selo com a duração. */
function VideoTile({
  video,
  extra,
  supabaseUrl,
  large = false,
}: {
  video: VideoData;
  /** Quantos vídeos além deste. */
  extra: number;
  supabaseUrl: string;
  large?: boolean;
}) {
  return (
    <span className="relative block size-full overflow-hidden bg-abismo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={publicMediaUrl(supabaseUrl, video.posterPath)}
        alt=""
        loading="lazy"
        decoding="async"
        className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-t from-abismo/70 via-abismo/20 to-abismo/10"
      />
      <span
        aria-hidden="true"
        className={
          "absolute top-1/2 left-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-marfim/95 text-petroleo shadow-[0_10px_30px_rgb(0_0_0/0.3)] transition-transform duration-300 group-hover:scale-105 " +
          (large ? "size-20" : "size-14")
        }
      >
        <PlayIcon className={large ? "ml-1 size-9" : "ml-0.5 size-6"} />
      </span>
      <span
        aria-hidden="true"
        className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-abismo/85 px-2.5 py-1 text-small font-semibold text-marfim"
      >
        <PlayIcon className="size-3.5" />
        Vídeo
        {video.duration ? ` · ${formatDuration(video.duration)}` : ""}
        {extra > 0 ? ` · +${extra}` : ""}
      </span>
    </span>
  );
}

function videoLabel(video: VideoData, total: number) {
  const name = video.caption ? `“${video.caption}”` : "do imóvel";
  return `Assistir ao vídeo ${name}${total > 1 ? ` (1 de ${total} vídeos)` : ""}`;
}

/**
 * Desktop: 1 foto grande + até 4 menores; com vídeo, o último quadro vira a
 * miniatura do primeiro vídeo. Celular: carrossel com o vídeo em 2º lugar.
 * Fotos e vídeos abrem num visualizador em tela cheia; o vídeo só carrega
 * quando o visitante clica em reproduzir.
 */
export function PropertyGallery({
  photos,
  videos = [],
  supabaseUrl,
}: {
  photos: PhotoData[];
  videos?: VideoData[];
  supabaseUrl: string;
}) {
  if (photos.length === 0 && videos.length === 0) return null;
  const firstVideo = videos[0];
  const videoIndex = photos.length; // no visualizador, os vídeos vêm depois das fotos
  const [first, ...rest] = photos;
  const side = rest.slice(0, firstVideo ? 3 : 4);
  const tiles = side.length + (firstVideo && first ? 1 : 0);

  const videoButton = (large: boolean, className?: string) =>
    firstVideo ? (
      <OpenMediaButton
        index={videoIndex}
        label={videoLabel(firstVideo, videos.length)}
        className={className}
      >
        <VideoTile
          video={firstVideo}
          extra={videos.length - 1}
          supabaseUrl={supabaseUrl}
          large={large}
        />
      </OpenMediaButton>
    ) : null;

  const mobileItems = [
    ...photos.map((photo, index) => ({ kind: "photo" as const, photo, index })),
  ] as ({ kind: "photo"; photo: PhotoData; index: number } | { kind: "video" })[];
  if (firstVideo) mobileItems.splice(Math.min(1, mobileItems.length), 0, { kind: "video" });

  return (
    <MediaViewerProvider photos={photos} videos={videos} supabaseUrl={supabaseUrl}>
      <div className="relative">
        {/* Celular: rolagem horizontal com encaixe */}
        {/* tabIndex: a área rolável precisa ser alcançável pelo teclado. */}
        <ul
          aria-label="Fotos do imóvel"
          tabIndex={0}
          className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 sm:hidden"
        >
          {mobileItems.map((item) =>
            item.kind === "photo" ? (
              <li key={item.photo.id} className="w-[88%] shrink-0 snap-center">
                <OpenMediaButton
                  index={item.index}
                  label={`Ampliar foto ${item.index + 1}: ${item.photo.alt}`}
                  className="block w-full"
                >
                  <Photo
                    photo={item.photo}
                    supabaseUrl={supabaseUrl}
                    sizes="88vw"
                    imageClassName="transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                    priority={item.index === 0}
                    className="aspect-[4/3] rounded-photo"
                  />
                </OpenMediaButton>
              </li>
            ) : (
              <li key="video" className="w-[88%] shrink-0 snap-center">
                {videoButton(true, "block aspect-[4/3] w-full overflow-hidden rounded-photo")}
              </li>
            ),
          )}
        </ul>

        {/* Tablet e desktop: mosaico */}
        <div
          className={
            "hidden gap-2 overflow-hidden rounded-photo sm:grid " +
            (tiles > 0 ? "sm:h-[420px] sm:grid-cols-4 sm:grid-rows-2 lg:h-[480px]" : "sm:h-[480px]")
          }
        >
          {first ? (
            <OpenMediaButton
              index={0}
              label={`Ampliar foto 1: ${first.alt}`}
              className={tiles > 0 ? "block sm:col-span-2 sm:row-span-2" : "block"}
            >
              <Photo
                photo={first}
                supabaseUrl={supabaseUrl}
                sizes="(min-width: 1024px) 620px, 50vw"
                imageClassName="transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                priority
                className="size-full"
              />
            </OpenMediaButton>
          ) : (
            videoButton(true, "block size-full")
          )}
          {side.map((photo, index) => (
            <OpenMediaButton
              key={photo.id}
              index={index + 1}
              label={`Ampliar foto ${index + 2}: ${photo.alt}`}
              className="block"
            >
              <Photo
                photo={photo}
                supabaseUrl={supabaseUrl}
                sizes="(min-width: 1024px) 310px, 25vw"
                imageClassName="transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                className="size-full"
              />
            </OpenMediaButton>
          ))}
          {first ? videoButton(false, "block") : null}
        </div>

        {photos.length > 1 || firstVideo ? (
          <div
            className={
              "mt-3 flex flex-wrap gap-2 sm:absolute sm:bottom-4 sm:mt-0 " +
              // Com vídeo, o canto direito é a miniatura dele: os botões vão para a esquerda.
              (firstVideo && first ? "sm:left-4" : "sm:right-4")
            }
          >
            {firstVideo ? (
              <OpenMediaButton
                index={videoIndex}
                label={`Vídeos (${videos.length})`}
                className={buttonClasses("secondary", "gap-2 bg-branco/95")}
              >
                <PlayIcon className="size-4" />
                Vídeos ({videos.length})
              </OpenMediaButton>
            ) : null}
            {photos.length > 1 ? (
              <AllPhotosDialog count={photos.length}>
                {photos.map((photo) => (
                  <Photo
                    key={photo.id}
                    photo={photo}
                    supabaseUrl={supabaseUrl}
                    sizes="(min-width: 896px) 832px, 100vw"
                    className="rounded-photo"
                  />
                ))}
              </AllPhotosDialog>
            ) : null}
          </div>
        ) : null}
      </div>
    </MediaViewerProvider>
  );
}
