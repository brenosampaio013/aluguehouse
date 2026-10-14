"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "@/lib/zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getSessionState } from "@/lib/auth/session";
import { parseReviewTab, reviewSchema } from "@/lib/reviews";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { FormState } from "./auth";

/** Hóspede: avalia uma estadia concluída. A avaliação nasce "em análise". */
export async function submitReview(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = reviewSchema.safeParse({
    bookingId: formData.get("bookingId"),
    rating: formData.get("rating") ?? undefined,
    comment: formData.get("comment") ?? "",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { status: "error", fieldErrors };
  }

  const session = await getSessionState();
  if (session.status === "anonymous") {
    return { status: "error", message: "Sua sessão terminou. Entre de novo para avaliar." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: stays, error: staysError } = await supabase.rpc("get_my_stays");
  if (staysError) return { status: "error", message: "Não foi possível enviar. Tente de novo." };
  const stay = stays.find((item) => item.booking_request_id === parsed.data.bookingId);
  if (!stay || !stay.can_review) {
    return { status: "error", message: "Esta estadia não pode ser avaliada." };
  }

  const { error } = await supabase.from("reviews").insert({
    booking_request_id: stay.booking_request_id,
    property_id: stay.property_id,
    rating: parsed.data.rating,
    comment: parsed.data.comment || null,
  });
  if (error) {
    return {
      status: "error",
      message:
        error.code === "23505"
          ? "Esta estadia já foi avaliada."
          : "Não foi possível enviar. Tente de novo.",
    };
  }

  revalidatePath("/minhas-estadias");
  revalidatePath("/admin/avaliacoes");
  return {
    status: "success",
    message: "Obrigado! Sua avaliação foi enviada e aparece no site depois de revisada.",
  };
}

const moderationSchema = z.object({
  id: z.uuid(),
  decision: z.enum(["approve", "reject", "reply"]),
  admin_reply: z.string().trim().max(2000, "Até 2.000 caracteres."),
});

/** Admin: publica, não publica ou só atualiza a resposta pública. */
export async function moderateReview(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = moderationSchema.safeParse({
    id: formData.get("id"),
    decision: formData.get("decision"),
    admin_reply: String(formData.get("admin_reply") ?? ""),
  });
  if (!parsed.success) {
    const reply = parsed.error.issues.find((issue) => issue.path[0] === "admin_reply");
    return reply
      ? { status: "error", fieldErrors: { admin_reply: reply.message } }
      : { status: "error", message: "Ação inválida." };
  }

  const { supabase } = await requireAdmin();
  const { id, decision, admin_reply } = parsed.data;
  const changes =
    decision === "reply"
      ? { admin_reply: admin_reply || null }
      : {
          status: decision === "approve" ? ("approved" as const) : ("rejected" as const),
          admin_reply: admin_reply || null,
          moderated_at: new Date().toISOString(),
        };
  const { data, error } = await supabase
    .from("reviews")
    .update(changes)
    .eq("id", id)
    .select("properties(slug)")
    .maybeSingle();
  if (error || !data) {
    return { status: "error", message: "Não foi possível salvar. Recarregue a página." };
  }

  revalidatePath("/admin/avaliacoes");
  if (data.properties) revalidatePath(`/imoveis/${data.properties.slug}`);
  if (decision === "reply") return { status: "success", message: "Resposta salva." };

  // A avaliação sai da aba atual; o aviso aparece no topo da página.
  const tab = parseReviewTab(String(formData.get("tab") ?? "")).slug;
  redirect(
    `/admin/avaliacoes?situacao=${tab}&aviso=${decision === "approve" ? "publicada" : "nao-publicada"}`,
  );
}
