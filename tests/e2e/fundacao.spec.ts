import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("fundação", () => {
  test("página inicial carrega em português com marca e contato", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/^Alugue Houses/);
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /Fale no WhatsApp/ })).toHaveAttribute(
      "href",
      "https://wa.me/5513996195221",
    );
  });

  test("não tem rolagem horizontal", async ({ page }) => {
    await page.goto("/");
    // Compara com a largura real da tela: no celular o navegador amplia a
    // área de layout quando o conteúdo transborda.
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
  });

  test("primeiro Tab leva ao link de pular para o conteúdo", async ({ page, isMobile }) => {
    test.skip(isMobile, "Navegação por teclado não se aplica ao celular.");
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Pular para o conteúdo" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
  });

  test("sem violações de acessibilidade (WCAG 2.1 AA)", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("envia cabeçalhos de segurança", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("rota inexistente mostra página 404 em português", async ({ page }) => {
    const response = await page.goto("/rota-que-nao-existe");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
  });
});
