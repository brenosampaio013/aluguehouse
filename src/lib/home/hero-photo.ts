/**
 * Mídia do topo da página inicial. Os arquivos ficam em `public/inicio/`:
 * - foto: `pnpm hero:photo <arquivo>` (scripts/hero-photo.mjs) cria as
 *   versões WebP nas larguras abaixo;
 * - vídeo do mar: `pnpm hero:video <arquivo>` (scripts/hero-video.mjs) cria
 *   as versões WebM e MP4 sem áudio e a foto de capa (primeiro quadro).
 *
 * `null`: ainda não há foto; o topo usa o cenário desenhado (sem simular foto).
 * Foto ou vídeo que não é de um imóvel anunciado precisa de `illustrative: true`.
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

/**
 * Vídeo em loop do mar. Só entra depois que a página carregou, por cima da
 * foto (que continua sendo a capa, o fallback e o maior elemento da tela).
 */
export type HeroVideo = {
  /** Caminho sem largura e formato, ex.: "/inicio/mar" → /inicio/mar-1920.webm */
  basePath: string;
  widths: readonly number[];
  formats: readonly HeroVideoFormat[];
};

export type HeroVideoFormat = "webm" | "mp4";

export type HeroMedia = {
  photo: HeroPhoto;
  /** Sem vídeo, a foto ganha um movimento lento de aproximação. */
  video: HeroVideo | null;
};

export const heroMedia: HeroMedia | null = null;

export const heroWidths = [960, 1600, 2400] as const;

/** Até esta largura de tela (CSS px) o vídeo menor basta, mesmo em tela 2x. */
export const HERO_VIDEO_NARROW = 767;

const videoTypes: Record<HeroVideoFormat, string> = {
  webm: 'video/webm; codecs="vp9"',
  mp4: 'video/mp4; codecs="avc1.640028"',
};

export function heroSrcSet(photo: HeroPhoto) {
  return photo.widths.map((width) => `${photo.basePath}-${width}.webp ${width}w`).join(", ");
}

export function heroSrc(photo: HeroPhoto) {
  const middle = photo.widths[Math.floor(photo.widths.length / 2)];
  return `${photo.basePath}-${middle}.webp`;
}

/**
 * Escolhe o arquivo do vídeo: o menor em telas estreitas, o maior nas demais,
 * no primeiro formato que o navegador sabe tocar. `null` se nenhum serve.
 */
export function pickHeroVideo(
  video: HeroVideo,
  { narrow, canPlay }: { narrow: boolean; canPlay: (type: string) => boolean },
) {
  const widths = [...video.widths].sort((a, b) => a - b);
  const width = narrow ? widths[0] : widths[widths.length - 1];
  const format = video.formats.find((f) => canPlay(videoTypes[f]));
  if (width === undefined || !format) return null;
  return `${video.basePath}-${width}.${format}`;
}
