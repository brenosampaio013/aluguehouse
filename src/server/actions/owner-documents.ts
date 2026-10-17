"use server";

import { revalidatePath } from "next/cache";
import { z } from "@/lib/zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import {
  OWNER_DOC_MAX_BYTES,
  OWNER_DOCS_BUCKET,
  ownerDocCategoryLabels,
  ownerDocMimeTypes,
  safeFileName,
  type OwnerDocCategory,
} from "@/lib/owner/documents";
import { fieldErrors } from "@/lib/properties/schemas";

import type { FormState } from "./auth";

/*
 * Admin: documentos privados do proprietário e avisos. Sempre depois de
 * requireAdmin (admin com MFA) e com a sessão dele (RLS e políticas do
 * Storage). O arquivo é enviado pelo navegador direto ao bucket privado; aqui
 * o servidor confere que ele existe antes de registrar.
 */

const registerSchema = z.object({
  propertyId: z.uuid(),
  documentId: z.uuid(),
  fileName: z.string().min(1).max(130),
  title: z
    .string()
    .trim()
    .min(3, "Dê um título com pelo menos 3 caracteres.")
    .max(120, "Use no máximo 120 caracteres."),
  category: z.enum(
    Object.keys(ownerDocCategoryLabels) as [OwnerDocCategory, ...OwnerDocCategory[]],
  ),
});

export async function registerOwnerDocument(
  input: z.input<typeof registerSchema>,
): Promise<FormState> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };
  const { propertyId, documentId, fileName, title, category } = parsed.data;
  if (safeFileName(fileName) !== fileName) {
    return { status: "error", message: "Nome de arquivo inválido." };
  }

  const { supabase } = await requireAdmin();
  const folder = `${propertyId}/${documentId}`;
  const path = `${folder}/${fileName}`;

  // Confere o arquivo enviado (existência, tipo e tamanho) antes de registrar.
  const { data: files, error: listError } = await supabase.storage
    .from(OWNER_DOCS_BUCKET)
    .list(folder);
  const file = files?.find((f) => f.name === fileName);
  const mime = file?.metadata?.mimetype as string | undefined;
  const size = Number(file?.metadata?.size ?? 0);
  if (listError || !file) {
    return { status: "error", message: "O envio do arquivo não terminou. Tente de novo." };
  }
  if (
    !mime ||
    !(ownerDocMimeTypes as readonly string[]).includes(mime) ||
    !size ||
    size > OWNER_DOC_MAX_BYTES
  ) {
    await supabase.storage.from(OWNER_DOCS_BUCKET).remove([path]);
    return { status: "error", message: "Envie um PDF ou uma imagem de até 10 MB." };
  }

  const { error } = await supabase.from("owner_documents").insert({
    id: documentId,
    property_id: propertyId,
    title,
    category,
    storage_path: path,
    mime_type: mime,
    size_bytes: size,
  });
  if (error) {
    await supabase.storage.from(OWNER_DOCS_BUCKET).remove([path]);
    return { status: "error", message: "Não foi possível registrar o documento. Tente de novo." };
  }
  revalidatePath(`/admin/imoveis/${propertyId}`);
  return { status: "success", message: `“${title}” disponível para os proprietários do imóvel.` };
}

const deleteSchema = z.object({ id: z.uuid(), propertyId: z.uuid() });

/** Exclui o registro e o arquivo. */
export async function deleteOwnerDocument(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = deleteSchema.safeParse({
    id: formData.get("id"),
    propertyId: formData.get("propertyId"),
  });
  if (!parsed.success) return { status: "error", message: "Documento inválido." };

  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("owner_documents")
    .delete()
    .eq("id", parsed.data.id)
    .select("storage_path");
  if (error) return { status: "error", message: "Não foi possível excluir. Tente de novo." };
  if (!data?.length) {
    return {
      status: "error",
      message: "Este documento já tinha sido excluído. Atualize a página.",
    };
  }
  const { error: storageError } = await supabase.storage
    .from(OWNER_DOCS_BUCKET)
    .remove(data.map((d) => d.storage_path));
  if (storageError) {
    console.error(`Documento ${parsed.data.id} excluído; arquivo ficou no Storage`, storageError);
  }
  revalidatePath(`/admin/imoveis/${parsed.data.propertyId}`);
  return { status: "success", message: "Documento excluído." };
}

const noticeSchema = z.object({
  propertyId: z.union([z.uuid(), z.literal("")]),
  title: z
    .string()
    .trim()
    .min(3, "Dê um título com pelo menos 3 caracteres.")
    .max(160, "Use no máximo 160 caracteres."),
  body: z.string().trim().max(2000, "Use no máximo 2.000 caracteres."),
});

/** Aviso aos proprietários de um imóvel ou de todos. */
export async function sendOwnerNotice(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = noticeSchema.safeParse({
    propertyId: formData.get("propertyId") ?? "",
    title: formData.get("title"),
    body: formData.get("body") ?? "",
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  const { supabase } = await requireAdmin();
  const { data: count, error } = await supabase.rpc("admin_notify_owners", {
    // null = todos os proprietários (o tipo gerado não marca o parâmetro como opcional).
    p_property_id: (parsed.data.propertyId || null) as string,
    p_title: parsed.data.title,
    p_body: parsed.data.body,
  });
  if (error) return { status: "error", message: "Não foi possível enviar o aviso. Tente de novo." };
  if (!count) {
    return {
      status: "error",
      message: "Nenhum proprietário com acesso recebeu: ninguém vinculado.",
    };
  }
  revalidatePath("/admin/proprietarios");
  return {
    status: "success",
    message: `Aviso enviado para ${count} ${count === 1 ? "proprietário" : "proprietários"}.`,
  };
}
