"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getPublicEnv } from "@/lib/env";
import { MEDIA_BUCKET } from "@/lib/media";
import { getServerEnv } from "@/lib/server-env";
import {
  VIDEO_BUCKET,
  VIDEO_CAPTION_MAX,
  VIDEO_TYPES,
  isVideoMime,
  publicVideoUrl,
  sniffVideoType,
  validateVideoFile,
  videoAltText,
  videoPaths,
  type VideoExtension,
} from "@/lib/videos";
import { z } from "@/lib/zod";

import type { FormState } from "./auth";

type Admin = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

export type VideoLimits = { maxBytes: number; maxPerProperty: number };

function videoLimits(): VideoLimits {
  const env = getServerEnv();
  return {
    maxBytes: env.VIDEO_MAX_UPLOAD_MB * 1024 * 1024,
    maxPerProperty: env.VIDEO_MAX_PER_PROPERTY,
  };
}

async function countVideos(supabase: Admin, propertyId: string) {
  const { count, error } = await supabase
    .from("property_media")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId)
    .eq("kind", "video");
  if (error) throw error;
  return count ?? 0;
}

const captionSchema = z
  .string()
  .trim()
  .max(VIDEO_CAPTION_MAX, `Use até ${VIDEO_CAPTION_MAX} caracteres.`)
  .transform((value) => value || null);

const prepareSchema = z.object({
  propertyId: z.uuid(),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().max(100),
  size: z.number().int().positive(),
});

export type PrepareVideoResult =
  | {
      status: "ready";
      mediaId: string;
      extension: VideoExtension;
      videoUploadUrl: string;
      poster: { path: string; token: string };
    }
  | { status: "error"; message: string };

/**
 * Autoriza o envio de um vídeo: confere admin, formato, tamanho e limite de
 * vídeos, e devolve URLs de envio assinadas para caminhos definidos aqui
 * (o navegador não escolhe onde gravar).
 */
export async function prepareVideoUpload(
  input: z.input<typeof prepareSchema>,
): Promise<PrepareVideoResult> {
  const parsed = prepareSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Dados do vídeo inválidos." };
  const { propertyId, fileName, mimeType, size } = parsed.data;
  const limits = videoLimits();

  const invalid = validateVideoFile({ name: fileName, type: mimeType, size }, limits.maxBytes);
  if (invalid || !isVideoMime(mimeType)) {
    return { status: "error", message: invalid ?? "Envie um vídeo em MP4 ou WebM." };
  }

  const { supabase } = await requireAdmin();
  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .maybeSingle();
  if (!property) return { status: "error", message: "Imóvel não encontrado." };

  if ((await countVideos(supabase, propertyId)) >= limits.maxPerProperty) {
    return {
      status: "error",
      message: `Este imóvel já tem ${limits.maxPerProperty} vídeos, o limite. Remova um para enviar outro.`,
    };
  }

  const mediaId = crypto.randomUUID();
  const extension = VIDEO_TYPES[mimeType];
  const paths = videoPaths(propertyId, mediaId, extension);
  const [video, poster] = await Promise.all([
    supabase.storage.from(VIDEO_BUCKET).createSignedUploadUrl(paths.video),
    supabase.storage.from(MEDIA_BUCKET).createSignedUploadUrl(paths.poster),
  ]);
  if (video.error || poster.error) {
    return { status: "error", message: "Não foi possível preparar o envio. Tente de novo." };
  }

  return {
    status: "ready",
    mediaId,
    extension,
    videoUploadUrl: video.data.signedUrl,
    poster: { path: paths.poster, token: poster.data.token },
  };
}

const registerSchema = z.object({
  propertyId: z.uuid(),
  mediaId: z.uuid(),
  extension: z.enum(["mp4", "webm"]),
  caption: captionSchema,
  durationSeconds: z.number().min(0.5).max(21600).nullable(),
  width: z.number().int().min(1).max(8192).nullable(),
  height: z.number().int().min(1).max(8192).nullable(),
});

/** Lê os primeiros bytes do arquivo enviado para conferir o tipo real. */
async function readHead(path: string) {
  const { NEXT_PUBLIC_SUPABASE_URL: supabaseUrl } = getPublicEnv();
  const response = await fetch(publicVideoUrl(supabaseUrl, path), {
    headers: { Range: "bytes=0-31" },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return new Uint8Array(await response.arrayBuffer()).subarray(0, 32);
}

/**
 * Registra um vídeo já enviado ao Storage. Antes de gravar no banco, confere
 * no servidor que o arquivo e a miniatura existem, o tamanho e o tipo real
 * (assinatura do arquivo). Se algo falhar, apaga o que foi enviado.
 */
export async function registerVideo(input: z.input<typeof registerSchema>): Promise<FormState> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    const captionIssue = parsed.error.issues.find((issue) => issue.path[0] === "caption");
    return {
      status: "error",
      fieldErrors: captionIssue ? { caption: captionIssue.message } : undefined,
      message: captionIssue ? undefined : "Dados do vídeo inválidos.",
    };
  }
  const { propertyId, mediaId, extension, caption, durationSeconds, width, height } = parsed.data;
  const { supabase } = await requireAdmin();
  const limits = videoLimits();
  const paths = videoPaths(propertyId, mediaId, extension);
  const folder = `${propertyId}/${mediaId}`;

  async function discard(message: string): Promise<FormState> {
    await Promise.all([
      supabase.storage.from(VIDEO_BUCKET).remove([paths.video]),
      supabase.storage.from(MEDIA_BUCKET).remove([paths.poster]),
    ]);
    return { status: "error", message };
  }

  const [videoFiles, posterFiles] = await Promise.all([
    supabase.storage.from(VIDEO_BUCKET).list(folder),
    supabase.storage.from(MEDIA_BUCKET).list(folder),
  ]);
  const file = videoFiles.data?.find((item) => item.name === `video.${extension}`);
  const hasPoster = posterFiles.data?.some((item) => item.name === "poster.webp");
  if (!file || !hasPoster) {
    return discard("O envio do vídeo não terminou. Tente de novo.");
  }

  const size = Number(file.metadata?.size ?? 0);
  if (!size || size > limits.maxBytes) {
    return discard("O vídeo passa do tamanho permitido.");
  }

  const head = await readHead(paths.video);
  if (!head || sniffVideoType(head) !== extension) {
    return discard("O arquivo não é um vídeo MP4 ou WebM válido.");
  }

  if ((await countVideos(supabase, propertyId)) >= limits.maxPerProperty) {
    return discard(`Este imóvel já tem ${limits.maxPerProperty} vídeos, o limite.`);
  }

  const { data: last } = await supabase
    .from("property_media")
    .select("position")
    .eq("property_id", propertyId)
    .eq("kind", "video")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("property_media").insert({
    id: mediaId,
    property_id: propertyId,
    kind: "video",
    video_source: "file",
    storage_path: paths.video,
    poster_path: paths.poster,
    caption,
    alt_text: videoAltText(caption),
    duration_seconds: durationSeconds ? Math.max(1, Math.round(durationSeconds)) : null,
    width,
    height,
    position: (last?.position ?? -1) + 1,
  });
  if (error) {
    return discard(
      error.message.includes("video_limit")
        ? "Este imóvel atingiu o limite de vídeos."
        : "Não foi possível registrar o vídeo. Tente de novo.",
    );
  }

  revalidatePath(`/admin/imoveis/${propertyId}`);
  return { status: "success", message: "Vídeo adicionado." };
}

const refSchema = z.object({ propertyId: z.uuid(), mediaId: z.uuid() });

export async function updateVideoCaption(_prev: FormState, formData: FormData): Promise<FormState> {
  const ref = refSchema.safeParse({
    propertyId: formData.get("propertyId"),
    mediaId: formData.get("mediaId"),
  });
  const caption = captionSchema.safeParse(String(formData.get("caption") ?? ""));
  if (!ref.success) return { status: "error", message: "Vídeo inválido." };
  if (!caption.success) {
    return { status: "error", fieldErrors: { caption: caption.error.issues[0]!.message } };
  }

  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("property_media")
    .update({ caption: caption.data, alt_text: videoAltText(caption.data) })
    .eq("id", ref.data.mediaId)
    .eq("property_id", ref.data.propertyId)
    .eq("kind", "video")
    .select("id");
  if (error || !data?.length) return { status: "error", message: "Não foi possível salvar." };

  revalidatePath(`/admin/imoveis/${ref.data.propertyId}`);
  return { status: "success", message: "Título salvo." };
}

/** Remove o vídeo do banco e os arquivos (vídeo e miniatura) do Storage. */
export async function deleteVideo(formData: FormData) {
  const { propertyId, mediaId } = refSchema.parse({
    propertyId: formData.get("propertyId"),
    mediaId: formData.get("mediaId"),
  });
  const { supabase } = await requireAdmin();

  const { data: video } = await supabase
    .from("property_media")
    .select("storage_path, poster_path, video_source")
    .eq("id", mediaId)
    .eq("property_id", propertyId)
    .eq("kind", "video")
    .maybeSingle();
  if (!video) return;

  const { error } = await supabase.from("property_media").delete().eq("id", mediaId);
  if (error) return;

  if (video.video_source === "file" && video.storage_path) {
    await supabase.storage.from(VIDEO_BUCKET).remove([video.storage_path]);
  }
  if (video.poster_path) await supabase.storage.from(MEDIA_BUCKET).remove([video.poster_path]);

  revalidatePath(`/admin/imoveis/${propertyId}`);
}
