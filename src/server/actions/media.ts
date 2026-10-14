"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { MEDIA_BUCKET, variantPath, variantWidths } from "@/lib/media";
import { altTextSchema } from "@/lib/properties/schemas";

import type { FormState } from "./auth";

const registerSchema = z.object({
  propertyId: z.uuid(),
  mediaId: z.uuid(),
  width: z.number().int().min(1).max(1920),
  height: z.number().int().min(1).max(20000),
  altText: altTextSchema,
  isDemo: z.boolean(),
});

/**
 * Registra uma foto já enviada ao Storage pelo navegador do admin
 * (versões WebP em "<imóvel>/<mídia>/<largura>.webp").
 */
export async function registerImage(input: z.input<typeof registerSchema>): Promise<FormState> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    const altIssue = parsed.error.issues.find((issue) => issue.path[0] === "altText");
    return {
      status: "error",
      fieldErrors: altIssue ? { altText: altIssue.message } : undefined,
      message: altIssue ? undefined : "Dados da foto inválidos.",
    };
  }
  const { propertyId, mediaId, width, height, altText, isDemo } = parsed.data;
  const { supabase } = await requireAdmin();
  const basePath = `${propertyId}/${mediaId}`;

  // Confere que as versões esperadas estão no Storage antes de registrar.
  const { data: files } = await supabase.storage.from(MEDIA_BUCKET).list(basePath);
  const expected = variantWidths(width).map((w) => `${w}.webp`);
  const uploaded = new Set(files?.map((file) => file.name));
  if (!expected.every((name) => uploaded.has(name))) {
    return { status: "error", message: "O envio da foto não terminou. Tente de novo." };
  }

  const { data: existing } = await supabase
    .from("property_media")
    .select("position, is_cover")
    .eq("property_id", propertyId)
    .order("position", { ascending: false });

  const { error } = await supabase.from("property_media").insert({
    id: mediaId,
    property_id: propertyId,
    kind: "image",
    storage_path: basePath,
    alt_text: altText,
    width,
    height,
    is_demo: isDemo,
    position: (existing?.[0]?.position ?? -1) + 1,
    is_cover: !existing?.some((item) => item.is_cover),
  });

  if (error) {
    await supabase.storage.from(MEDIA_BUCKET).remove(expected.map((name) => `${basePath}/${name}`));
    return { status: "error", message: "Não foi possível registrar a foto. Tente de novo." };
  }

  revalidatePath(`/admin/imoveis/${propertyId}`);
  return { status: "success", message: "Foto adicionada." };
}

const mediaRef = z.object({ propertyId: z.uuid(), mediaId: z.uuid() });

function readRef(formData: FormData) {
  return mediaRef.parse({
    propertyId: formData.get("propertyId"),
    mediaId: formData.get("mediaId"),
  });
}

export async function updateAltText(_prev: FormState, formData: FormData): Promise<FormState> {
  const ref = mediaRef.safeParse({
    propertyId: formData.get("propertyId"),
    mediaId: formData.get("mediaId"),
  });
  const alt = altTextSchema.safeParse(formData.get("altText"));
  if (!ref.success) return { status: "error", message: "Foto inválida." };
  if (!alt.success)
    return { status: "error", fieldErrors: { altText: alt.error.issues[0]!.message } };

  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("property_media")
    .update({ alt_text: alt.data })
    .eq("id", ref.data.mediaId)
    .eq("property_id", ref.data.propertyId);
  if (error) return { status: "error", message: "Não foi possível salvar a descrição." };

  revalidatePath(`/admin/imoveis/${ref.data.propertyId}`);
  return { status: "success", message: "Descrição salva." };
}

export async function setCover(formData: FormData) {
  const { propertyId, mediaId } = readRef(formData);
  const { supabase } = await requireAdmin();
  // Primeiro remove a capa atual (índice único permite só uma por imóvel).
  await supabase
    .from("property_media")
    .update({ is_cover: false })
    .eq("property_id", propertyId)
    .eq("is_cover", true);
  await supabase
    .from("property_media")
    .update({ is_cover: true })
    .eq("id", mediaId)
    .eq("property_id", propertyId);
  revalidatePath(`/admin/imoveis/${propertyId}`);
}

export async function moveMedia(formData: FormData) {
  const { propertyId, mediaId } = readRef(formData);
  const direction = z.enum(["up", "down"]).parse(formData.get("direction"));
  const { supabase } = await requireAdmin();

  const { data: items } = await supabase
    .from("property_media")
    .select("id, position")
    .eq("property_id", propertyId)
    .order("position")
    .order("created_at");
  if (!items) return;

  const index = items.findIndex((item) => item.id === mediaId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= items.length) return;

  const reordered = [...items];
  [reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!];
  for (const [position, item] of reordered.entries()) {
    if (item.position !== position) {
      await supabase.from("property_media").update({ position }).eq("id", item.id);
    }
  }
  revalidatePath(`/admin/imoveis/${propertyId}`);
}

export async function deleteMedia(formData: FormData) {
  const { propertyId, mediaId } = readRef(formData);
  const { supabase } = await requireAdmin();

  const { data: media } = await supabase
    .from("property_media")
    .select("storage_path, width, is_cover")
    .eq("id", mediaId)
    .eq("property_id", propertyId)
    .single();
  if (!media) return;

  const { error } = await supabase.from("property_media").delete().eq("id", mediaId);
  if (error) return;

  if (media.storage_path && media.width) {
    await supabase.storage
      .from(MEDIA_BUCKET)
      .remove(variantWidths(media.width).map((w) => variantPath(media.storage_path!, w)));
  }

  if (media.is_cover) {
    const { data: next } = await supabase
      .from("property_media")
      .select("id")
      .eq("property_id", propertyId)
      .eq("kind", "image")
      .order("position")
      .limit(1)
      .maybeSingle();
    if (next) await supabase.from("property_media").update({ is_cover: true }).eq("id", next.id);
  }

  revalidatePath(`/admin/imoveis/${propertyId}`);
}
