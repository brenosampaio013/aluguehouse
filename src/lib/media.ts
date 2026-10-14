export const MEDIA_BUCKET = "property-media";

/** Larguras geradas no upload (WebP). A maior é limitada ao tamanho original. */
export const IMAGE_WIDTHS = [640, 1280, 1920] as const;
export const MAX_IMAGE_WIDTH = 1920;

/** Larguras disponíveis para uma imagem cuja maior versão tem `width` px. */
export function variantWidths(width: number): number[] {
  const max = Math.min(Math.round(width), MAX_IMAGE_WIDTH);
  const widths: number[] = IMAGE_WIDTHS.filter((w) => w < max);
  widths.push(max);
  return widths;
}

/** Caminho no Storage de uma variante: "<imóvel>/<mídia>/<largura>.webp". */
export function variantPath(basePath: string, width: number): string {
  return `${basePath}/${width}.webp`;
}

export function publicMediaUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}

export function mediaSrcSet(supabaseUrl: string, basePath: string, width: number): string {
  return variantWidths(width)
    .map((w) => `${publicMediaUrl(supabaseUrl, variantPath(basePath, w))} ${w}w`)
    .join(", ");
}
