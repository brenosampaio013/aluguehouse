"use server";

import { revalidatePath } from "next/cache";
import { z } from "@/lib/zod";

import { getSessionState } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type FavoriteResult = { ok: true } | { ok: false; reason: "signed_out" | "error" };

/**
 * Salva ou remove um imóvel dos favoritos de quem está conectado.
 * Usa a sessão da própria pessoa: as políticas RLS garantem que ela só mexe
 * nos próprios favoritos e só salva imóveis publicados.
 */
export async function setFavorite(propertyId: string, save: boolean): Promise<FavoriteResult> {
  const id = z.uuid().safeParse(propertyId);
  if (!id.success || typeof save !== "boolean") return { ok: false, reason: "error" };

  const session = await getSessionState();
  if (session.status === "anonymous") return { ok: false, reason: "signed_out" };

  const supabase = await createSupabaseServerClient();
  const { error } = save
    ? await supabase
        .from("favorites")
        .upsert(
          { user_id: session.userId, property_id: id.data },
          { onConflict: "user_id,property_id", ignoreDuplicates: true },
        )
    : await supabase
        .from("favorites")
        .delete()
        .eq("user_id", session.userId)
        .eq("property_id", id.data);
  if (error) return { ok: false, reason: "error" };

  revalidatePath("/favoritos");
  return { ok: true };
}
