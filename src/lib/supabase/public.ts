import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente anônimo, sem cookies, para dados públicos (imóveis publicados).
 * Enxerga exatamente o que um visitante enxerga pelas políticas RLS.
 */
export function createSupabasePublicClient() {
  const env = getPublicEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
