import { expect, type Page } from "@playwright/test";

import { totp } from "./totp";
import { adminApi, anonApi, uniqueEmail } from "./users";

/**
 * Cria um proprietário (papel "owner") com autenticador já cadastrado pela
 * API. Devolve o id, o e-mail e a chave TOTP para gerar os códigos.
 */
export async function createOwnerWithTotp(prefix = "dono") {
  const email = uniqueEmail(prefix);
  const api = adminApi();
  const { data: created, error } = await api.auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: { role: "owner" },
  });
  if (error) throw error;

  // Sessão pelo mesmo link de acesso que o e-mail traria, para cadastrar o TOTP.
  const { data: link, error: linkError } = await api.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError) throw linkError;
  const client = anonApi();
  const { error: otpError } = await client.auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: "magiclink",
  });
  if (otpError) throw otpError;
  const { data: factor, error: enrollError } = await client.auth.mfa.enroll({ factorType: "totp" });
  if (enrollError) throw enrollError;
  const { error: verifyError } = await client.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code: totp(factor.totp.secret),
  });
  if (verifyError) throw verifyError;
  await client.auth.signOut();

  return { id: created.user.id, email, secret: factor.totp.secret };
}

/** Primeiro fator: o link de acesso do e-mail (gerado pela API, sem esperar o e-mail). */
export async function openAccessLink(page: Page, email: string) {
  const { data, error } = await adminApi().auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  await page.goto(`/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink`);
}

/** Entra no portal: link do e-mail e código do autenticador. */
export async function loginAsOwner(page: Page, owner: { email: string; secret: string }) {
  await openAccessLink(page, owner.email);
  await page.goto("/proprietario");
  await expect(page).toHaveURL(/\/proprietario\/verificacao$/);
  await page.getByLabel("Código de 6 dígitos").fill(totp(owner.secret));
  await page.getByRole("button", { name: "Confirmar código" }).click();
  await expect(page).toHaveURL(/\/proprietario$/);
}

/** Menu do portal (na gaveta no celular e no tablet). */
export async function openOwnerNav(page: Page) {
  const open = page.getByRole("button", { name: "Abrir menu" });
  if (await open.isVisible()) await open.click();
  return page.getByRole("navigation", { name: "Portal do proprietário" });
}
