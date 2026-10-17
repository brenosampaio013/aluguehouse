"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "@/lib/zod";

import { requireOwner } from "@/lib/auth/require-owner";
import { fieldErrors } from "@/lib/properties/schemas";

import type { FormState } from "./auth";

/*
 * Ações do portal do proprietário. Todas exigem proprietário com MFA e usam
 * a sessão dele: o banco confere o vínculo com o imóvel em cada função
 * (request_owner_block, request_property_change, cancel_owner_request) e
 * nada aqui muda o anúncio ou o calendário diretamente.
 */

type DbError = { code?: string; message?: string } | null;

const requestErrors: Record<string, string> = {
  unavailable: "Essas datas já estão ocupadas no calendário. Escolha outro período.",
  past_check_in: "A data de início já passou. Escolha uma data a partir de hoje.",
  invalid_dates: "A data de saída precisa ser depois da data de início.",
  block_too_long: "O período pode ter no máximo 365 dias. Divida em pedidos menores.",
  too_many_pending:
    "Este imóvel já tem 20 pedidos em análise. Aguarde a resposta da Alugue Houses.",
  message_required: "Descreva a alteração que você quer.",
  invalid_status: "Este pedido já foi respondido ou cancelado.",
};

function requestErrorMessage(error: DbError): string {
  if (error?.code === "42501") {
    return "Imóvel não encontrado entre os seus. Atualize a página e tente de novo.";
  }
  const known = Object.keys(requestErrors).find((key) => error?.message?.includes(key));
  return known ? requestErrors[known]! : "Não foi possível enviar agora. Tente de novo.";
}

function done(message: string): FormState {
  // Menu, visão geral, calendário e imóveis mostram os pedidos.
  revalidatePath("/proprietario", "layout");
  return { status: "success", message };
}

const isoDate = z.iso.date("Informe uma data válida.");

const blockSchema = z.object({
  propertyId: z.uuid("Escolha o imóvel."),
  checkIn: isoDate,
  checkOut: isoDate,
  message: z.string().trim().max(500, "Use no máximo 500 caracteres.").optional(),
});

/** Pede o bloqueio de datas para uso próprio; a Alugue Houses aprova. */
export async function requestOwnerBlock(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = blockSchema.safeParse({
    propertyId: formData.get("propertyId"),
    checkIn: formData.get("checkIn"),
    checkOut: formData.get("checkOut"),
    message: formData.get("message") ?? undefined,
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };
  if (parsed.data.checkOut <= parsed.data.checkIn) {
    return { status: "error", fieldErrors: { checkOut: requestErrors.invalid_dates! } };
  }

  const { supabase } = await requireOwner();
  const { error } = await supabase.rpc("request_owner_block", {
    p_property_id: parsed.data.propertyId,
    p_check_in: parsed.data.checkIn,
    p_check_out: parsed.data.checkOut,
    p_message: parsed.data.message || undefined,
  });
  if (error) return { status: "error", message: requestErrorMessage(error) };
  return done("Pedido enviado. As datas só ficam bloqueadas depois da aprovação da Alugue Houses.");
}

const changeSchema = z.object({
  propertyId: z.uuid("Imóvel inválido."),
  message: z
    .string()
    .trim()
    .min(10, "Descreva a alteração com pelo menos 10 caracteres.")
    .max(2000, "Use no máximo 2.000 caracteres."),
});

/** Pede uma alteração no anúncio; nada muda até a Alugue Houses fazer a edição. */
export async function requestPropertyChange(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = changeSchema.safeParse({
    propertyId: formData.get("propertyId"),
    message: formData.get("message"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  const { supabase } = await requireOwner();
  const { error } = await supabase.rpc("request_property_change", {
    p_property_id: parsed.data.propertyId,
    p_message: parsed.data.message,
  });
  if (error) return { status: "error", message: requestErrorMessage(error) };
  return done("Pedido enviado. O anúncio só muda depois da revisão da Alugue Houses.");
}

/** Desiste de um pedido ainda em análise. */
export async function cancelOwnerRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { status: "error", message: "Pedido inválido." };

  const { supabase } = await requireOwner();
  const { error } = await supabase.rpc("cancel_owner_request", { p_id: id.data });
  if (error) return { status: "error", message: requestErrorMessage(error) };
  return done("Pedido cancelado.");
}

const profileSchema = z.object({
  fullName: z.string().trim().max(120, "Use no máximo 120 caracteres."),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v === "" || /^[0-9]{10,13}$/.test(v), "Informe DDD e número, só dígitos."),
});

/** Nome e telefone de contato (tabela profiles, política "perfil: dono edita"). */
export async function updateOwnerProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName") ?? "",
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  const { supabase, session } = await requireOwner();
  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName || null, phone: parsed.data.phone || null })
    .eq("id", session.userId)
    .select("id");
  if (error || !data?.length) {
    return { status: "error", message: "Não foi possível salvar agora. Tente de novo." };
  }
  revalidatePath("/proprietario/perfil");
  return { status: "success", message: "Dados salvos." };
}

/** Abre uma notificação: marca como lida e segue para a página dela. */
export async function openNotification(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("id"));
  const link = String(formData.get("link") ?? "");
  const { supabase } = await requireOwner();
  if (id.success) await supabase.rpc("mark_owner_notifications_read", { p_ids: [id.data] });
  revalidatePath("/proprietario", "layout");
  // Só caminhos do próprio portal (a coluna no banco também restringe).
  redirect(
    /^\/proprietario(\/[A-Za-z0-9/?=&_-]*)?$/.test(link) ? link : "/proprietario/notificacoes",
  );
}

/** Marca todas as notificações como lidas. */
export async function markAllNotificationsRead(): Promise<FormState> {
  const { supabase } = await requireOwner();
  const { error } = await supabase.rpc("mark_owner_notifications_read", {});
  if (error) return { status: "error", message: "Não foi possível marcar agora. Tente de novo." };
  revalidatePath("/proprietario", "layout");
  return { status: "success", message: "Todas as notificações foram marcadas como lidas." };
}
