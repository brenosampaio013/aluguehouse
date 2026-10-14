import "server-only";

import { getSessionState } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { CARD_COLUMNS, toCard, type CardRow, type PropertyCardData } from "./public-properties";

/** Quem está conectado e quais imóveis já salvou (para os botões de coração). */
export async function getFavoriteState(): Promise<{ signedIn: boolean; ids: string[] }> {
  const session = await getSessionState();
  if (session.status === "anonymous") return { signedIn: false, ids: [] };
  const supabase = await createSupabaseServerClient();
  // Filtro explícito: o admin também lê os favoritos de todos (relatórios).
  const { data, error } = await supabase
    .from("favorites")
    .select("property_id")
    .eq("user_id", session.userId);
  if (error) throw error;
  return { signedIn: true, ids: data.map((row) => row.property_id) };
}

/** Imóveis salvos e ainda publicados, do mais recente para o mais antigo. */
export async function listFavoriteProperties(userId: string): Promise<PropertyCardData[]> {
  const supabase = await createSupabaseServerClient();
  const { data: favorites, error } = await supabase
    .from("favorites")
    .select("property_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (favorites.length === 0) return [];

  const ids = favorites.map((row) => row.property_id);
  const { data, error: propertiesError } = await supabase
    .from("properties")
    .select(CARD_COLUMNS)
    .in("id", ids)
    .eq("status", "published");
  if (propertiesError) throw propertiesError;

  const cards = new Map((data as CardRow[]).map((row) => [row.id, toCard(row)]));
  return ids.flatMap((id) => cards.get(id) ?? []);
}
