import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { loginAsGuest, uniqueEmail } from "./support/users";
import { waitForAnimations } from "./support/motion";

test.describe("cabeçalho", () => {
  test("marca a modalidade da página atual", async ({ page, isMobile }) => {
    test.skip(isMobile, "Modalidades no cabeçalho só no desktop e tablet.");
    await page.goto("/mensal");
    const nav = page.getByRole("navigation", { name: "Modalidades" });
    await expect(nav.getByRole("link", { name: "Mensal" })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "Temporada" })).not.toHaveAttribute("aria-current");
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
      await expect(header.getByRole("link", { name: "Minha conta" })).toHaveAttribute(
        "href",
        "/entrar",
      );
      await expect(header.getByRole("link", { name: "Entrar" })).toHaveCount(0);
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
