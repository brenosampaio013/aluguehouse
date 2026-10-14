import { expect, type Page } from "@playwright/test";

import { totp } from "./totp";
import { TEST_PASSWORD } from "./users";

/** Entra no painel pela tela de login, com senha e código do autenticador. */
export async function loginAsAdmin(page: Page, admin: { email: string; secret: string }) {
  await page.goto("/admin/entrar");
  await page.getByLabel("E-mail").fill(admin.email);
  await page.getByLabel("Senha").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin\/mfa$/);
  await page.getByLabel("Código de 6 dígitos").fill(totp(admin.secret));
  await page.getByRole("button", { name: "Confirmar código" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}
