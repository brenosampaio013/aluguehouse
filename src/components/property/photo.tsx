import { mediaSrcSet, publicMediaUrl, variantPath, variantWidths } from "@/lib/media";
import { cn } from "@/lib/cn";

export type PhotoData = { id: string; path: string; width: number; alt: string; isDemo: boolean };

/** Foto com versões WebP (Etapa 6) e aviso de foto ilustrativa quando for o caso. */
export function Photo({
  photo,
  supabaseUrl,
  sizes,
  priority = false,
  className,
}: {
  photo: PhotoData;
  supabaseUrl: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const widths = variantWidths(photo.width);
  return (
    <span className={cn("relative block overflow-hidden bg-areia", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={publicMediaUrl(
          supabaseUrl,
          variantPath(photo.path, widths[Math.min(1, widths.length - 1)]!),
        )}
        srcSet={mediaSrcSet(supabaseUrl, photo.path, photo.width)}
        sizes={sizes}
        alt={photo.alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        className="size-full object-cover"
      />
      {photo.isDemo ? (
        <span className="absolute bottom-3 left-3 rounded-full bg-branco/95 px-2.5 py-1 text-small font-semibold text-abismo">
          Foto ilustrativa
        </span>
      ) : null}
    </span>
  );
}
