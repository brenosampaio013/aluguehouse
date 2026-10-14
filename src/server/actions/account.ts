"use server";

import { redirect } from "next/navigation";

import { getSessionState } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { FormState } from "./auth";

/**
 * Hóspede: exclui a própria conta (LGPD, art. 18). Apaga o login, o perfil,
 * os favoritos e as avaliações (exclusão em cascata no banco). Solicitações
 * de reserva ficam pelo prazo de guarda (docs/privacidade.md).
 */
export async function deleteMyAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  if (formData.get("confirm") !== "on") {
    return {
      status: "error",
      fieldErrors: { confirm: "Marque a confirmação para excluir a conta." },
    };
  }

  const session = await getSessionState();
  if (session.status === "anonymous") redirect("/entrar");
  if (session.status !== "guest") {
    return {
      status: "error",
      message: "Contas de administrador não podem ser excluídas por aqui.",
    };
  }

  const { error } = await createSupabaseAdminClient().auth.admin.deleteUser(session.userId);
  if (error) {
    return { status: "error", message: "Não foi possível excluir agora. Tente de novo." };
  }

  // Limpa os cookies da sessão que acabou de deixar de existir.
  await (await createSupabaseServerClient()).auth.signOut({ scope: "local" });
  redirect("/entrar?conta=excluida");
}
