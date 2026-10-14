import { variantWidths } from "@/lib/media";

export type ImageVariant = { width: number; height: number; blob: Blob };

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED.includes(file.type)) return "Envie uma foto em JPG, PNG ou WebP.";
  if (file.size > MAX_INPUT_BYTES) return "A foto tem mais de 25 MB. Envie uma versão menor.";
  return null;
}

/**
 * Gera versões WebP da foto no navegador. A recodificação descarta os
 * metadados do arquivo original, inclusive localização (GPS).
 */
export async function createWebpVariants(file: File, quality = 0.82): Promise<ImageVariant[]> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const variants: ImageVariant[] = [];
    for (const width of variantWidths(bitmap.width)) {
      const height = Math.round((bitmap.height * width) / bitmap.width);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("canvas_unavailable");
      context.imageSmoothingQuality = "high";
      context.drawImage(bitmap, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", quality),
      );
      if (!blob || blob.type !== "image/webp") throw new Error("webp_unsupported");
      variants.push({ width, height, blob });
    }
    return variants;
  } finally {
    bitmap.close();
  }
}
