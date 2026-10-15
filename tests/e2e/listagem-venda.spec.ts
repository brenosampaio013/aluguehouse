import { randomUUID } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { adminApi } from "./support/users";

const run = randomUUID().slice(0, 6);
const A = `Casa à venda Riviera ${run}`;
const B = `Apartamento à venda Ilhabela ${run}`;
const C = `Só temporada ${run}`;
const D = `Venda rascunho ${run}`;

function card(page: Page, title: string) {
  return page
    .getByRole("article")
    .filter({ has: page.getByRole("link", { name: title, exact: true }) });
}

test.describe("listagem de venda", () => {
  const ids: string[] = [];

  test.beforeAll(async () => {
    const api = adminApi();
    const rows = [
      {
        title: A,
        property_type: "casa",
        region: "riviera-de-sao-lourenco",
        offers_sale: true,
        offers_seasonal: false,
        sale_price: 1800000,
        nightly_price: null,
        bedrooms: 4,
        suites: 0,
        area_m2: 320,
        status: "published",
      },
      {
        title: B,
        property_type: "apartamento",
        region: "ilhabela",
        offers_sale: true,
        offers_seasonal: false,
        sale_price: 950000,
        nightly_price: null,
        bedrooms: 2,
        suites: 1,
        area_m2: 110,
        status: "published",
      },
      {
        title: C,
        property_type: "casa",
        region: "riviera-de-sao-lourenco",
        offers_sale: false,
        offers_seasonal: true,
        sale_price: null,
        nightly_price: 900,
        bedrooms: 3,
        suites: 0,
        area_m2: 200,
        status: "published",
      },
      {
        title: D,
        property_type: "casa",
        region: "riviera-de-sao-lourenco",
        offers_sale: true,
        offers_seasonal: false,
        sale_price: 500000,
        nightly_price: null,
        bedrooms: 3,
        suites: 0,
        area_m2: 150,
        status: "draft",
      },
    ] as const;
    for (const [index, row] of rows.entries()) {
      const { data, error } = await api
        .from("properties")
        .insert({
          ...row,
          slug: `venda-${run}-${index}`,
          city: "Bertioga",
          published_at:
            row.status === "published" ? new Date(Date.now() - index * 60_000).toISOString() : null,
        })
        .select("id")
        .single();
      if (error) throw error;
      ids.push(data.id);
    }
    const { data: piscina } = await api
      .from("amenities")
      .select("id")
      .eq("slug", "piscina")
      .single();
    await api.from("property_amenities").insert({ property_id: ids[0]!, amenity_id: piscina!.id });
  });

  test.afterAll(async () => {
    await adminApi().from("properties").delete().in("id", ids);
  });

  test("lista só publicados à venda, com preço e área", async ({ page }) => {
    await page.goto("/venda");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Imóveis à venda");
    await expect(card(page, A)).toContainText("R$ 1.800.000 à venda");
    // Quartos, suítes (só quando há) e área; venda não mostra hóspedes.
    await expect(card(page, A).getByRole("listitem")).toHaveText(["4 quartos", "320 m²"]);
    await expect(card(page, B).getByRole("listitem")).toHaveText([
      "2 quartos",
      "1 suíte",
      "110 m²",
    ]);
    await expect(card(page, C)).toHaveCount(0);
    await expect(card(page, D)).toHaveCount(0);
  });

  test("busca de venda da página inicial chega filtrada", async ({ page, isMobile }) => {
    await page.goto("/");
    if (isMobile) await page.getByRole("button", { name: /Onde e quando/ }).click();
    const venda = page.getByRole("radio", { name: "Venda" });
    await page.locator("label", { has: venda }).click();
    await page.getByLabel("Tipo").selectOption("casa");
    await page.getByLabel("Preço máximo").selectOption("2000000");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page).toHaveURL("/venda?tipo=casa&preco_max=2000000");
    await expect(card(page, A)).toBeVisible();
    await expect(card(page, B)).toHaveCount(0);
    if (isMobile) await page.getByRole("button", { name: /^Filtros/ }).click();
    await expect(page.getByRole("form", { name: "Filtros" }).getByLabel("Tipo")).toHaveValue(
      "casa",
    );
  });

  test("filtros de região, área, quartos e comodidades", async ({ page, isMobile }) => {
    await page.goto("/venda");
    if (isMobile) await page.getByRole("button", { name: /^Filtros/ }).click();
    await page.getByLabel("Região").selectOption("ilhabela");
    await page.getByRole("button", { name: "Aplicar filtros" }).click();
    await expect(page).toHaveURL(/regiao=ilhabela/);
    await expect(card(page, B)).toBeVisible();
    await expect(card(page, A)).toHaveCount(0);

    await page.goto("/venda?area_min=200");
    await expect(card(page, A)).toBeVisible();
    await expect(card(page, B)).toHaveCount(0);

    await page.goto("/venda?quartos=3");
    await expect(card(page, A)).toBeVisible();
    await expect(card(page, B)).toHaveCount(0);

    await page.goto("/venda?comodidade=piscina");
    await expect(card(page, A)).toBeVisible();
    await expect(card(page, B)).toHaveCount(0);
  });

  test("ordenação por preço", async ({ page }) => {
    await page.goto("/venda?ordem=menor-preco");
    const asc = await page.getByRole("article").getByRole("heading").allTextContents();
    expect(asc.indexOf(B)).toBeLessThan(asc.indexOf(A));
    await page.goto("/venda?ordem=maior-preco");
    const desc = await page.getByRole("article").getByRole("heading").allTextContents();
    expect(desc.indexOf(A)).toBeLessThan(desc.indexOf(B));
  });

  test("sem resultados orienta a mudar os filtros", async ({ page }) => {
    await page.goto("/venda?preco_max=1&tipo=terreno");
    await expect(page.getByText("Nenhum imóvel à venda com esses filtros.")).toBeVisible();
  });

  test("sem violações WCAG 2.1 AA e sem rolagem horizontal", async ({ page, isMobile }) => {
    await page.goto("/venda");
    if (isMobile) await page.getByRole("button", { name: /^Filtros/ }).click();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
  });
});
