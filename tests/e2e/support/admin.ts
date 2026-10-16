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

/**
 * Menu lateral do painel. No celular e no tablet ele fica numa gaveta:
 * abre antes de devolver a navegação.
 */
export async function openAdminNav(page: Page) {
  const open = page.getByRole("button", { name: "Abrir menu" });
  if (await open.isVisible()) await open.click();
  return page.getByRole("navigation", { name: "Painel" });
}

/** Confirma (ou cancela) o diálogo de confirmação do painel. */
export async function answerConfirm(page: Page, button: string | RegExp, expectText?: string) {
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  if (expectText) await expect(dialog).toContainText(expectText);
  await dialog.getByRole("button", { name: button, exact: typeof button === "string" }).click();
  await expect(dialog).toBeHidden();
}
