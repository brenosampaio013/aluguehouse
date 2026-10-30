import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { loginAsGuest, uniqueEmail } from "./support/users";
import { waitForAnimations } from "./support/motion";

test.describe("cabeçalho", () => {
  test("marca a modalidade da página atual", async ({ page, isMobile }) => {
    test.skip(isMobile, "Modalidades no cabeçalho só no desktop e tablet.");
    await page.goto("/venda");
    const nav = page.getByRole("navigation", { name: "Modalidades" });
    await expect(nav.getByRole("link", { name: "Venda" })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "Temporada" })).not.toHaveAttribute("aria-current");
    // Só Temporada e Venda no cabeçalho; o mensal continua em /mensal.
    await expect(nav.getByRole("link")).toHaveCount(2);
    await expect(page.getByRole("banner").getByRole("link", { name: "Mensal" })).toHaveCount(0);
  });

  test("Fale conosco abre o WhatsApp do atendimento", async ({ page, isMobile }) => {
    await page.goto("/");
    if (isMobile) await page.getByRole("button", { name: "Abrir menu" }).click();
    const link = page.getByRole("banner").getByRole("link", { name: /^Fale conosco/ });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", /^https:\/\/wa\.me\/5513996195221\?text=/);
    await expect(link).toHaveAttribute("target", "_blank");
  });

  test("mostra Minha conta depois do login", async ({ page, isMobile }) => {
    await loginAsGuest(page, uniqueEmail("cabecalho"));
    await page.goto("/");
    if (isMobile) {
      const atalhos = page.getByRole("navigation", { name: "Atalhos" });
      await expect(atalhos.getByRole("link", { name: "Conta" })).toHaveAttribute("href", "/entrar");
      await page.getByRole("button", { name: "Abrir menu" }).click();
      await expect(
        page.getByRole("navigation", { name: "Menu principal" }).getByRole("link", {
          name: "Minha conta",
        }),
      ).toBeVisible();
    } else {
      const header = page.getByRole("banner");
      await expect(header.getByRole("link", { name: "Entrar" })).toHaveCount(0);
      const conta = header.getByRole("button", { name: "Minha conta" });
      await expect(conta).toHaveAttribute("aria-expanded", "false");
      await conta.click();
      await expect(header.getByRole("link", { name: "Minha conta" })).toHaveAttribute(
        "href",
        "/entrar",
      );
      await expect(header.getByRole("link", { name: "Minhas estadias" })).toHaveAttribute(
        "href",
        "/minhas-estadias",
      );
      await page.keyboard.press("Escape");
      await expect(conta).toHaveAttribute("aria-expanded", "false");
      await expect(conta).toBeFocused();
      // Sair encerra a sessão e volta ao login.
      await conta.click();
      await header.getByRole("button", { name: "Sair" }).click();
      await expect(page).toHaveURL(/\/entrar$/);
      await expect(page.getByRole("banner").getByRole("link", { name: "Entrar" })).toBeVisible();
    }
  });

  test("sem violações WCAG 2.1 AA e sem rolagem lateral", async ({ page, isMobile }) => {
    await page.goto("/temporada");
    if (isMobile) await page.getByRole("button", { name: "Abrir menu" }).click();
    await waitForAnimations(page);
    const results = await new AxeBuilder({ page })
      .include("header")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
  });
});
