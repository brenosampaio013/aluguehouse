/**
 * Vídeos dos imóveis enviados como arquivo. Usado no navegador (validação
 * antes do envio) e no servidor (validação definitiva).
 */

export const VIDEO_BUCKET = "property-videos";

/** Padrões dos limites configuráveis (VIDEO_MAX_UPLOAD_MB, VIDEO_MAX_PER_PROPERTY). */
export const DEFAULT_VIDEO_MAX_MB = 50;
export const DEFAULT_VIDEO_MAX_PER_PROPERTY = 6;
/** Teto do banco (trigger private.check_video_limit). */
export const VIDEO_HARD_LIMIT_PER_PROPERTY = 20;

export const VIDEO_CAPTION_MAX = 120;

export const VIDEO_TYPES = { "video/mp4": "mp4", "video/webm": "webm" } as const;
export type VideoMime = keyof typeof VIDEO_TYPES;
export type VideoExtension = (typeof VIDEO_TYPES)[VideoMime];

export function isVideoMime(type: string): type is VideoMime {
  return Object.hasOwn(VIDEO_TYPES, type);
}

export function formatMegabytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (mb < 10) return `${mb.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
  return `${Math.round(mb)} MB`;
}

/** Erro para o admin, ou null se tipo, extensão e tamanho estiverem certos. */
export function validateVideoFile(
  file: { name: string; type: string; size: number },
  maxBytes: number,
): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!isVideoMime(file.type) || VIDEO_TYPES[file.type] !== extension) {
    return "Envie um vídeo em MP4 ou WebM.";
  }
  if (file.size === 0) return "O arquivo está vazio.";
  if (file.size > maxBytes) {
    return `O vídeo tem ${formatMegabytes(file.size)}; o limite é ${formatMegabytes(maxBytes)}. Envie uma versão menor ou mais curta.`;
  }
  return null;
}

// Marcas de arquivos MP4 aceitas (caixa "ftyp"). QuickTime (.mov, "qt  ")
// fica de fora: muitos não tocam fora do Safari.
const MP4_BRANDS = new Set([
  "isom",
  "iso2",
  "iso4",
  "iso5",
  "iso6",
  "mp41",
  "mp42",
  "avc1",
  "M4V ",
  "dash",
  "mmp4",
  "MSNV",
]);

/**
 * Tipo real do arquivo pelos primeiros bytes (não pela extensão).
 * Precisa de pelo menos 12 bytes.
 */
export function sniffVideoType(bytes: Uint8Array): VideoExtension | null {
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return "webm";
  }
  if (bytes.length >= 12) {
    const text = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
    if (text(4, 8) === "ftyp" && MP4_BRANDS.has(text(8, 12))) return "mp4";
  }
  return null;
}

/** Caminhos de um vídeo: arquivo no bucket de vídeos e miniatura no de fotos. */
export function videoPaths(propertyId: string, mediaId: string, extension: VideoExtension) {
  const base = `${propertyId}/${mediaId}`;
  return { video: `${base}/video.${extension}`, poster: `${base}/poster.webp` };
}

export function publicVideoUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${VIDEO_BUCKET}/${path}`;
}

/** "0:42", "12:05", "1:02:03". */
export function formatDuration(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** Texto alternativo da miniatura (a coluna alt_text é obrigatória). */
export function videoAltText(caption: string | null) {
  return caption ? `Vídeo: ${caption}` : "Vídeo do imóvel";
}
