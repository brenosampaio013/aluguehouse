"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { addDaysISO } from "@/lib/format";
import { blockSchema } from "@/lib/booking/admin-schema";

import type { FormState } from "./auth";

const idSchema = z.uuid();
const notesSchema = z.string().trim().max(5000, "Até 5.000 caracteres.");

/** Traduz os códigos das funções de reserva para o painel. */
function bookingActionError(error: { code?: string; message?: string } | null): string {
  switch (error?.message) {
    case "unavailable":
      return "Essas datas já estão ocupadas por outra reserva ou bloqueio. Recuse ou cancele este pedido.";
    case "invalid_status":
      return "A situação deste pedido mudou. Recarregue a página.";
    case "past_check_in":
      return "A data de chegada já passou. Este pedido não pode mais ser aprovado.";
    case "booking_not_found":
      return "Pedido não encontrado.";
  }
  if (error?.code === "42501") {
    return "Sua sessão não tem permissão para esta ação. Entre de novo no painel.";
  }
  return "Não foi possível concluir. Tente de novo.";
}

function revalidateBooking(id: string) {
  revalidatePath("/admin/solicitacoes", "layout");
  revalidatePath(`/admin/solicitacoes/${id}`);
}

const decisionSchema = z.enum(["approve", "decline", "cancel"]);

/** Aprovar, recusar ou cancelar uma solicitação. */
export async function decideBooking(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = idSchema.safeParse(formData.get("id"));
  const decision = decisionSchema.safeParse(formData.get("decision"));
  const notes = notesSchema.safeParse(String(formData.get("reason") ?? ""));
  if (!id.success || !decision.success) return { status: "error", message: "Ação inválida." };
  if (!notes.success) {
    return { status: "error", fieldErrors: { reason: notes.error.issues[0]!.message } };
  }

  const { supabase } = await requireAdmin();
  const reason = notes.data || undefined;
  const { error } =
    decision.data === "approve"
      ? await supabase.rpc("approve_booking_request", { p_id: id.data })
      : decision.data === "decline"
        ? await supabase.rpc("decline_booking_request", { p_id: id.data, p_notes: reason })
        : await supabase.rpc("cancel_booking_request", { p_id: id.data, p_notes: reason });
  if (error) return { status: "error", message: bookingActionError(error) };

  revalidateBooking(id.data);
  revalidatePath("/imoveis/[slug]", "page");
  const messages = {
    approve: "Reserva aprovada. As datas foram bloqueadas no calendário.",
    decline: "Solicitação recusada.",
    cancel: "Reserva cancelada. As datas foram liberadas.",
  };
  return { status: "success", message: messages[decision.data] };
}

/** Anotações internas do pedido (nunca aparecem para o hóspede). */
export async function saveBookingNotes(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = idSchema.safeParse(formData.get("id"));
  const notes = notesSchema.safeParse(String(formData.get("admin_notes") ?? ""));
  if (!id.success) return { status: "error", message: "Pedido inválido." };
  if (!notes.success) {
    return { status: "error", fieldErrors: { admin_notes: notes.error.issues[0]!.message } };
  }

  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("booking_requests")
    .update({ admin_notes: notes.data || null })
    .eq("id", id.data);
  if (error) return { status: "error", message: bookingActionError(error) };

  revalidateBooking(id.data);
  return { status: "success", message: "Anotações salvas." };
}

/** Bloqueio manual de datas (uso do proprietário ou manutenção). */
export async function addCalendarBlock(_prev: FormState, formData: FormData): Promise<FormState> {
  const propertyId = idSchema.safeParse(formData.get("id"));
  if (!propertyId.success) return { status: "error", message: "Imóvel inválido." };

  const parsed = blockSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { status: "error", fieldErrors };
  }

  const { supabase, session } = await requireAdmin();
  // O formulário pede a primeira e a última noite; o banco guarda [início, fim).
  const { error } = await supabase.from("calendar_blocks").insert({
    property_id: propertyId.data,
    kind: parsed.data.kind,
    stay: `[${parsed.data.start_date},${addDaysISO(parsed.data.end_date, 1)})`,
    note: parsed.data.note || null,
    created_by: session.userId,
  });
  if (error) {
    return {
      status: "error",
      message:
        error.code === "23P01"
          ? "Já existe uma reserva ou bloqueio nesse período. Ajuste as datas."
          : bookingActionError(error),
    };
  }

  revalidatePath(`/admin/imoveis/${propertyId.data}`);
  revalidatePath("/imoveis/[slug]", "page");
  return { status: "success", message: "Datas bloqueadas." };
}

/** Remove um bloqueio manual. Bloqueios de reserva saem só cancelando a reserva. */
export async function deleteCalendarBlock(formData: FormData) {
  const propertyId = idSchema.parse(formData.get("id"));
  const blockId = idSchema.parse(formData.get("blockId"));
  const { supabase } = await requireAdmin();
  await supabase
    .from("calendar_blocks")
    .delete()
    .eq("id", blockId)
    .eq("property_id", propertyId)
    .neq("kind", "booking");
  revalidatePath(`/admin/imoveis/${propertyId}`);
  revalidatePath("/imoveis/[slug]", "page");
}
