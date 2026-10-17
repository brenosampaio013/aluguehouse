import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { waitForAccessLink } from "./support/mailpit";
import { totp } from "./support/totp";
import { createUserWithPassword, TEST_PASSWORD, uniqueEmail } from "./support/users";

/** O Next.js mantém um anunciador de rotas com role="alert"; filtramos pelo texto. */
function errorAlert(page: Page, text: string) {
  return page.getByRole("alert").filter({ hasText: text });
}

async function signInAdminForm(page: Page, email: string, password = TEST_PASSWORD) {
  await page.goto("/admin/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test.describe("acesso ao painel", () => {
  test("visitante é levado ao login do painel", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/entrar$/);
    await expect(page.getByRole("heading", { name: "Entrar no painel" })).toBeVisible();
  });

  test("usuário que não é admin não entra pelo painel", async ({ page }) => {
    const email = uniqueEmail("comum");
    await createUserWithPassword({ email });

    await signInAdminForm(page, email);
    await expect(errorAlert(page, "E-mail ou senha incorretos.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/entrar$/);
  });

  test("senha errada mostra a mesma mensagem genérica", async ({ page }) => {
    const email = uniqueEmail("admin-senha");
    await createUserWithPassword({ email, admin: true });

    await signInAdminForm(page, email, "SenhaErrada2026x");
    await expect(errorAlert(page, "E-mail ou senha incorretos.")).toBeVisible();
    await expect(page.getByLabel("E-mail")).toHaveValue(email);
    await expect(page.getByLabel("Senha")).toHaveValue("");
  });

  test("admin só acessa o painel depois do MFA", async ({ page }) => {
    const email = uniqueEmail("admin");
    await createUserWithPassword({ email, admin: true });

    // Primeiro fator: senha. Ainda sem acesso ao painel.
    await signInAdminForm(page, email);
    await expect(page).toHaveURL(/\/admin\/mfa$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/mfa$/);

    // Cadastro do autenticador
    await page.getByRole("button", { name: "Configurar autenticador" }).click();
    const secret = (await page.getByTestId("totp-secret").textContent())?.trim();
    expect(secret).toBeTruthy();

    await page.getByLabel("Código de 6 dígitos").fill("000000");
    await page.getByRole("button", { name: "Confirmar código" }).click();
    await expect(page.getByText(/Código incorreto ou expirado/)).toBeVisible();

    await page.getByLabel("Código de 6 dígitos").fill(totp(secret!));
    await page.getByRole("button", { name: "Confirmar código" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Visão geral", level: 1 })).toBeVisible();

    // Sair e voltar: agora o código é pedido sem novo cadastro.
    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/entrar$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/entrar$/);

    await signInAdminForm(page, email);
    await expect(page).toHaveURL(/\/admin\/mfa$/);
    await expect(page.getByRole("button", { name: "Configurar autenticador" })).toHaveCount(0);
    await page.getByLabel("Código de 6 dígitos").fill(totp(secret!));
    await page.getByRole("button", { name: "Confirmar código" }).click();
    await expect(page).toHaveURL(/\/admin$/);
  });
});

test.describe("login do hóspede", () => {
  test("entra pelo link no e-mail e não acessa o painel", async ({ page }) => {
    const email = uniqueEmail("hospede");

    await page.goto("/entrar");
    await page.getByLabel("E-mail").fill(email);
    await page.getByRole("button", { name: "Enviar link de acesso" }).click();
    await expect(page.getByRole("status").filter({ hasText: /\S/ })).toContainText(
      `Enviamos um link de acesso para ${email}`,
    );

    const link = await waitForAccessLink(email);
    await page.goto(link.pathname + link.search);

    await expect(page).toHaveURL(/\/entrar$/);
    await expect(page.getByRole("heading", { name: "Você entrou" })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/entrar$/);

    await page.goto("/entrar");
    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page.getByRole("heading", { name: "Entrar", exact: true })).toBeVisible();
  });

  test("link já usado ou inválido mostra como pedir outro", async ({ page }) => {
    await page.goto("/auth/callback?token_hash=invalido&type=email");
    await expect(page).toHaveURL(/\/entrar\?erro=link$/);
    await expect(errorAlert(page, "expirou ou já foi usado")).toBeVisible();
  });

  test("link do modelo padrão (?code= no endereço do site) vai para o callback", async ({
    page,
  }) => {
    await page.goto("/?code=codigo-invalido");
    // O callback tenta trocar o código; inválido, explica como pedir outro.
    await expect(page).toHaveURL(/\/entrar\?erro=link$/);
  });

  test("e-mail inválido é apontado no campo", async ({ page }) => {
    await page.goto("/entrar");
    await page.getByLabel("E-mail").fill("nome@");
    await page.getByRole("button", { name: "Enviar link de acesso" }).click();
    await expect(page.getByLabel("E-mail")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Informe um e-mail válido")).toBeVisible();
    await expect(page.getByLabel("E-mail")).toHaveValue("nome@");
  });
});

test.describe("acessibilidade das telas de login", () => {
  for (const path of ["/entrar", "/admin/entrar"]) {
    test(`${path} sem violações WCAG 2.1 AA`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
