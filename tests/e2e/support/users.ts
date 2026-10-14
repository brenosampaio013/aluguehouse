import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import { testEnv } from "./env";

/** Cliente com service_role, só para preparar dados de teste. */
function adminApi() {
  return createClient(testEnv.supabaseUrl, testEnv.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function uniqueEmail(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}@teste.local`;
}

/** Senha que atende à política local (12+ caracteres, maiúsculas, minúsculas e números). */
export const TEST_PASSWORD = "SenhaDeTeste2026";

export async function createUserWithPassword(options: { email: string; admin?: boolean }) {
  const { data, error } = await adminApi().auth.admin.createUser({
    email: options.email,
    password: TEST_PASSWORD,
    email_confirm: true,
    app_metadata: options.admin ? { role: "admin" } : {},
  });
  if (error) throw error;
  return data.user;
}
