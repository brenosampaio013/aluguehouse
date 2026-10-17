"use server";

import { revalidatePath } from "next/cache";
import { z } from "@/lib/zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { fieldErrors } from "@/lib/properties/schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import type { FormState } from "./auth";

/*
 * Admin: vincula proprietários aos imóveis e decide os pedidos deles.
 * Sempre depois de requireAdmin (admin com MFA). O vínculo é gravado com a
 * sessão do admin (RLS); só a atribuição do papel "owner" usa a chave de
 * serviço, porque app_metadata não pode ser alterado pelo próprio usuário.
 */

function refresh(propertyId?: string) {
  revalidatePath("/admin", "layout");
  if (propertyId) revalidatePath(`/admin/imoveis/${propertyId}`);
}

const linkSchema = z.object({
  propertyId: z.uuid("Imóvel inválido."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "E-mail muito longo.")
    .pipe(z.email("Informe um e-mail válido, ex.: nome@exemplo.com.")),
  confirm: z.literal("on", "Confirme que o e-mail é do proprietário deste imóvel."),
});

/**
 * Dá acesso ao portal: encontra (ou cria) a conta pelo e-mail, marca o papel
 * de proprietário e vincula ao imóvel. Contas de admin nunca viram
 * proprietário. A pessoa entra pelo link no e-mail em /entrar.
 */
export async function linkPropertyOwner(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = linkSchema.safeParse({
    propertyId: formData.get("propertyId"),
    email: formData.get("email"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };
  const { propertyId, email } = parsed.data;

  const { supabase } = await requireAdmin();
  const { data: found, error: findError } = await supabase
    .rpc("admin_find_user_by_email", { p_email: email })
    .maybeSingle();
  if (findError) {
    return {
      status: "error",
      message: "Não foi possível consultar as contas agora. Tente de novo.",
    };
  }

  const service = createSupabaseAdminClient();
  let userId = found?.id ?? null;
  let note = "";
  if (found?.role === "admin") {
    return {
      status: "error",
      fieldErrors: { email: "Este e-mail é de uma conta de administrador. Use outro e-mail." },
    };
  }
  if (!userId) {
    const { data, error } = await service.auth.admin.createUser({
      email,
      email_confirm: true,
      app_metadata: { role: "owner" },
    });
    if (error || !data.user) {
      return { status: "error", message: "Não foi possível criar a conta. Tente de novo." };
    }
    userId = data.user.id;
    note = " Conta criada: a pessoa entra em /entrar com este e-mail.";
  } else if (found?.role !== "owner") {
    const { error } = await service.auth.admin.updateUserById(userId, {
      app_metadata: { role: "owner" },
    });
    if (error) {
      return { status: "error", message: "Não foi possível dar o acesso agora. Tente de novo." };
    }
    note = " A conta que já existia passou a ser de proprietário.";
  }

  const { error: linkError } = await supabase
    .from("property_owners")
    .insert({ property_id: propertyId, owner_id: userId });
  if (linkError) {
    if (linkError.code === "23505") {
      return { status: "error", fieldErrors: { email: "Este proprietário já está vinculado." } };
    }
    return { status: "error", message: "Não foi possível vincular agora. Tente de novo." };
  }
  refresh(propertyId);
  return { status: "success", message: `${email} vinculado a este imóvel.${note}` };
}

const unlinkSchema = z.object({ propertyId: z.uuid(), ownerId: z.uuid() });

/** Tira o acesso do proprietário a este imóvel (na hora). A conta continua existindo. */
export async function unlinkPropertyOwner(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = unlinkSchema.safeParse({
    propertyId: formData.get("propertyId"),
    ownerId: formData.get("ownerId"),
  });
  if (!parsed.success) return { status: "error", message: "Vínculo inválido." };

  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("property_owners")
    .delete()
    .eq("property_id", parsed.data.propertyId)
    .eq("owner_id", parsed.data.ownerId)
    .select("owner_id");
  if (error) return { status: "error", message: "Não foi possível remover. Tente de novo." };
  if (!data?.length) {
    return { status: "error", message: "Este vínculo já tinha sido removido. Atualize a página." };
  }
  refresh(parsed.data.propertyId);
  return { status: "success", message: "Acesso removido." };
}

const decisionSchema = z.object({
  id: z.uuid(),
  decision: z.enum(["approve", "reject"]),
  reply: z.string().trim().max(2000, "Use no máximo 2.000 caracteres.").optional(),
});

const decisionErrors: Record<string, string> = {
  unavailable:
    "As datas já estão ocupadas no calendário (reserva ou outro bloqueio). Recuse o pedido com uma resposta.",
  past_check_in: "A data de início já passou. Recuse o pedido com uma resposta.",
  invalid_status: "Este pedido já foi decidido ou cancelado. Atualize a página.",
};

/** Aprova ou recusa um pedido do proprietário. */
export async function decideOwnerRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = decisionSchema.safeParse({
    id: formData.get("id"),
    decision: formData.get("decision"),
    reply: formData.get("reply") ?? undefined,
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  const { supabase } = await requireAdmin();
  const { id, decision, reply } = parsed.data;
  const { error } =
    decision === "approve"
      ? await supabase.rpc("approve_owner_request", { p_id: id, p_reply: reply || undefined })
      : await supabase.rpc("reject_owner_request", { p_id: id, p_reply: reply || undefined });
  if (error) {
    const known = Object.keys(decisionErrors).find((key) => error.message?.includes(key));
    return {
      status: "error",
      message: known ? decisionErrors[known]! : "Não foi possível salvar a decisão. Tente de novo.",
    };
  }
  refresh();
  return {
    status: "success",
    message: decision === "approve" ? "Pedido aprovado." : "Pedido recusado.",
  };
}
