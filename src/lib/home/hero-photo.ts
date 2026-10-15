/**
 * Foto do topo da página inicial. Os arquivos ficam em `public/inicio/` e são
 * gerados por `pnpm hero:photo <arquivo>` (scripts/hero-photo.mjs), que cria
 * as versões WebP nas larguras abaixo.
 *
 * `null`: ainda não há foto; o topo usa o fundo desenhado (sem simular foto).
 * Foto que não é de um imóvel anunciado precisa de `illustrative: true`.
 */
export type HeroPhoto = {
  /** Caminho sem a largura, ex.: "/inicio/capa" → /inicio/capa-1600.webp */
  basePath: string;
  widths: readonly number[];
  alt: string;
  illustrative: boolean;
  /** Enquadramento no corte (CSS object-position), ex.: "50% 60%". */
  position?: string;
};

export const heroPhoto: HeroPhoto | null = null;

export const heroWidths = [960, 1600, 2400] as const;

export function heroSrcSet(photo: HeroPhoto) {
  return photo.widths.map((width) => `${photo.basePath}-${width}.webp ${width}w`).join(", ");
}

export function heroSrc(photo: HeroPhoto) {
  const middle = photo.widths[Math.floor(photo.widths.length / 2)];
  return `${photo.basePath}-${middle}.webp`;
}
