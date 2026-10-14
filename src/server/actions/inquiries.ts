"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import {
  formatVisit,
  inquiryKindLabels,
  inquirySchema,
  parseInquiryTab,
  visitDateTime,
} from "@/lib/inquiries";
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

  revalidatePath("/admin/contatos");
  return { status: "success", message: sent };
}

const statusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["new", "in_progress", "closed"]),
});

/** Admin: muda a situação de uma mensagem e volta para a aba em que estava. */
export async function setInquiryStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = statusSchema.safeParse({ id: formData.get("id"), status: formData.get("status") });
  if (!parsed.success) return { status: "error", message: "Ação inválida." };

  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("inquiries")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id);
  if (error) return { status: "error", message: "Não foi possível salvar. Tente de novo." };

  revalidatePath("/admin/contatos", "layout");
  // A mensagem sai da aba atual; o aviso aparece no topo da página.
  const tab = parseInquiryTab(String(formData.get("tab") ?? "")).slug;
  redirect(`/admin/contatos?situacao=${tab}&movido=${parsed.data.status}`);
}
