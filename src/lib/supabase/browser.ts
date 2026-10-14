import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnv } from "@/lib/env";

/** Cliente para Client Components. Sujeito às políticas RLS do usuário atual. */
export function createSupabaseBrowserClient() {
  const env = getPublicEnv();
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
