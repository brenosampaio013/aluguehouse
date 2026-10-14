import { AllPhotosDialog } from "./all-photos-dialog";
import { Photo, type PhotoData } from "./photo";

/**
 * Desktop: 1 foto grande + até 4 menores. Celular: carrossel deslizável.
 * Todas as fotos ficam disponíveis em "Ver todas as fotos".
 */
export function PropertyGallery({
  photos,
  supabaseUrl,
}: {
  photos: PhotoData[];
  supabaseUrl: string;
}) {
  if (photos.length === 0) return null;
  const [first, ...rest] = photos;
  const side = rest.slice(0, 4);

  return (
    <div className="relative">
      {/* Celular: rolagem horizontal com encaixe */}
      {/* tabIndex: a área rolável precisa ser alcançável pelo teclado. */}
      <ul
        aria-label="Fotos do imóvel"
        tabIndex={0}
        className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 sm:hidden"
      >
        {photos.map((photo, index) => (
          <li key={photo.id} className="w-[88%] shrink-0 snap-center">
            <Photo
              photo={photo}
              supabaseUrl={supabaseUrl}
              sizes="88vw"
              priority={index === 0}
              className="aspect-[4/3] rounded-photo"
            />
          </li>
        ))}
      </ul>

      {/* Tablet e desktop: mosaico */}
      <div
        className={
          "hidden gap-2 overflow-hidden rounded-photo sm:grid " +
          (side.length > 0
            ? "sm:h-[420px] sm:grid-cols-4 sm:grid-rows-2 lg:h-[480px]"
            : "sm:h-[480px]")
        }
      >
        <Photo
          photo={first!}
          supabaseUrl={supabaseUrl}
          sizes="(min-width: 1024px) 620px, 50vw"
          priority
          className={side.length > 0 ? "sm:col-span-2 sm:row-span-2" : ""}
        />
        {side.map((photo) => (
          <Photo
            key={photo.id}
            photo={photo}
            supabaseUrl={supabaseUrl}
            sizes="(min-width: 1024px) 310px, 25vw"
          />
        ))}
      </div>

      {photos.length > 1 ? (
        <div className="mt-3 sm:absolute sm:right-4 sm:bottom-4 sm:mt-0">
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
        </div>
      ) : null}
    </div>
  );
}
