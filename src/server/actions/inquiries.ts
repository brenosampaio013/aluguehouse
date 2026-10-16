"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "@/lib/zod";

import { safeReturnPath } from "@/lib/admin/return-to";
import { requireAdmin } from "@/lib/auth/require-admin";
import { formatVisit, inquiryKindLabels, visitDateTime } from "@/lib/inquiries";
import { inquirySchema } from "@/lib/inquiry-schema";
import { notifyAdmin } from "@/server/email/notify-admin";
import { guardPublicForm } from "@/server/security/public-form";

import type { FormState } from "./auth";

export type InquiryFormState = FormState & {
  values?: { name?: string; email?: string; phone?: string; message?: string };
};

function todaySP() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

/** Visitante: mensagem de contato, pedido de visita ou interesse em compra. */
export async function submitInquiry(
  _prev: InquiryFormState,
  formData: FormData,
): Promise<InquiryFormState> {
  const text = (key: string) => String(formData.get(key) ?? "");
  const values = {
    name: text("name"),
    email: text("email"),
    phone: text("phone"),
    message: text("message"),
  };
  const sent = "Mensagem enviada. Respondemos pelo e-mail ou telefone informados.";

  // Campo-isca: responde como se tivesse dado certo, sem gravar nada.
  if (text("website") !== "") return { status: "success", message: sent };

  const parsed = inquirySchema(todaySP()).safeParse({
    kind: formData.get("kind"),
    propertyId: text("propertyId"),
    ...values,
    visitDate: text("visitDate"),
    visitPeriod: text("visitPeriod") || undefined,
    consent: formData.get("consent") ?? undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { status: "error", message: "Confira os campos destacados.", fieldErrors, values };
  }

  const data = parsed.data;
  const guard = await guardPublicForm(formData, { scope: "inquiry", email: data.email });
  if (!guard.ok) return { status: "error", message: guard.message, values };
  const { admin } = guard;

  let propertyTitle: string | null = null;
  if (data.propertyId) {
    const { data: property } = await admin
      .from("properties")
      .select("title")
      .eq("id", data.propertyId)
      .eq("status", "published")
      .maybeSingle();
    if (!property)
      return { status: "error", message: "Este imóvel não está mais disponível.", values };
    propertyTitle = property.title;
  }

  const preferred = data.visitDate ? visitDateTime(data.visitDate, data.visitPeriod) : null;
  const message =
    data.message ||
    (data.kind === "visit"
      ? "Gostaria de agendar uma visita."
      : "Tenho interesse na compra deste imóvel.");

  const { error } = await admin.from("inquiries").insert({
    kind: data.kind,
    property_id: data.propertyId || null,
    name: data.name,
    email: data.email.toLowerCase(),
    phone: data.phone || null,
    message,
    preferred_datetime: preferred,
    privacy_consent_at: new Date().toISOString(),
  });
  if (error) {
    return { status: "error", message: "Não foi possível enviar agora. Tente de novo.", values };
  }

  await notifyAdmin({
    subject: `${inquiryKindLabels[data.kind]}${propertyTitle ? ` · ${propertyTitle}` : ""}`,
    lines: [
      `De: ${data.name} <${data.email}>`,
      data.phone ? `Telefone: ${data.phone}` : null,
      propertyTitle ? `Imóvel: ${propertyTitle}` : null,
      preferred ? `Visita preferida: ${formatVisit(preferred)}` : null,
      "",
      message,
    ].filter((line): line is string => line !== null),
    path: "/admin/contatos",
    replyTo: data.email,
  });

  revalidatePath("/admin", "layout");
  return { status: "success", message: sent };
}

const statusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["new", "in_progress", "closed"]),
});

/** Volta para a mesma lista de contatos (aba, busca e página) com um aviso. */
function backToList(formData: FormData, notice: Record<string, string>): never {
  redirect(
    safeReturnPath(formData.get("returnTo"), "/admin/contatos", notice, [
      "movido",
      "aviso",
      "pagina",
    ]),
  );
}

/** Admin: muda a situação de uma mensagem e volta para a lista em que estava. */
export async function setInquiryStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = statusSchema.safeParse({ id: formData.get("id"), status: formData.get("status") });
  if (!parsed.success) return { status: "error", message: "Ação inválida." };

  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("inquiries")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .select("id");
  if (error) return { status: "error", message: "Não foi possível salvar. Tente de novo." };
  if (!data?.length) return { status: "error", message: "Mensagem não encontrada." };

  revalidatePath("/admin", "layout");
  // A mensagem pode sair da aba atual; o aviso aparece no topo da página.
  backToList(formData, { movido: parsed.data.status });
}

/**
 * Admin: apaga uma mensagem de contato (por exemplo, a pedido do titular,
 * LGPD). Irreversível: a tela pede confirmação explícita antes.
 */
export async function deleteInquiry(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { status: "error", message: "Mensagem inválida." };

  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("inquiries").delete().eq("id", id.data).select("id");
  if (error) return { status: "error", message: "Não foi possível excluir. Tente de novo." };
  if (!data?.length) return { status: "error", message: "Mensagem não encontrada." };

  revalidatePath("/admin", "layout");
  backToList(formData, { aviso: "excluido" });
}
