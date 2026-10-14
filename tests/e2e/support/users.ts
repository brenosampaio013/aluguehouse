import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import { testEnv } from "./env";
import { totp } from "./totp";

/** Cliente com service_role, só para preparar dados de teste. */
export function adminApi() {
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

/** Cliente anônimo, como um visitante do site. */
export function anonApi() {
  return createClient(testEnv.supabaseUrl, testEnv.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Cria um admin com autenticador já cadastrado (pela API, sem passar pela
 * tela de cadastro) e devolve a chave TOTP para gerar os códigos.
 */
export async function createAdminWithTotp() {
  const email = uniqueEmail("admin");
  await createUserWithPassword({ email, admin: true });

  const client = anonApi();
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });
  if (signInError) throw signInError;
  const { data: factor, error: enrollError } = await client.auth.mfa.enroll({ factorType: "totp" });
  if (enrollError) throw enrollError;
  const { error: verifyError } = await client.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code: totp(factor.totp.secret),
  });
  if (verifyError) throw verifyError;
  await client.auth.signOut();

  return { email, secret: factor.totp.secret };
}

/**
 * Entra como hóspede sem passar pelo e-mail: gera o mesmo link de acesso que o
 * Supabase enviaria e abre o callback do site.
 */
export async function loginAsGuest(page: import("@playwright/test").Page, email: string) {
  const api = adminApi();
  await api.auth.admin.createUser({ email, email_confirm: true });
  const { data, error } = await api.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  await page.goto(`/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink`);
}
