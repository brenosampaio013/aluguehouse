import { randomUUID } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { adminApi } from "./support/users";

function isoInDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const run = randomUUID().slice(0, 6);
const A = `Casa Riviera ${run}`;
const B = `Casa Ilhabela ${run}`;
const C = `Apartamento Ubatuba ${run}`;
const D = `Rascunho ${run}`;

function card(page: Page, title: string) {
  return page
    .getByRole("article")
    .filter({ has: page.getByRole("link", { name: title, exact: true }) });
}

/** No celular os filtros ficam recolhidos. */
async function openFilters(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole("button", { name: /^Filtros/ }).click();
}

test.describe("listagens de aluguel", () => {
  const ids: string[] = [];

  test.beforeAll(async () => {
    const api = adminApi();
    const now = Date.now();
    const rows = [
      {
        title: A,
        region: "riviera-de-sao-lourenco",
        offers_seasonal: true,
        offers_monthly: false,
        nightly_price: 800,
        monthly_price: null,
        max_guests: 6,
        bedrooms: 3,
        min_nights: 2,
        status: "published",
      },
      {
        title: B,
        region: "ilhabela",
        offers_seasonal: true,
        offers_monthly: true,
        nightly_price: 1500,
        monthly_price: 20000,
        max_guests: 10,
        bedrooms: 5,
        min_nights: 1,
        status: "published",
      },
      {
        title: C,
        region: "ubatuba",
        offers_seasonal: false,
        offers_monthly: true,
        nightly_price: null,
        monthly_price: 12000,
        max_guests: 4,
        bedrooms: 2,
        min_nights: 1,
        status: "published",
      },
      {
        title: D,
        region: "riviera-de-sao-lourenco",
        offers_seasonal: true,
        offers_monthly: true,
        nightly_price: 500,
        monthly_price: 9000,
        max_guests: 8,
        bedrooms: 3,
        min_nights: 1,
        status: "draft",
      },
    ] as const;
    for (const [index, row] of rows.entries()) {
      const { data, error } = await api
        .from("properties")
        .insert({
          ...row,
          slug: `teste-${run}-${index}`,
          property_type: "casa",
          city: "Bertioga",
          published_at:
            row.status === "published" ? new Date(now - index * 60_000).toISOString() : null,
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
    const block = await api.from("calendar_blocks").insert({
      property_id: ids[0]!,
      stay: `[${isoInDays(60)},${isoInDays(65)})`,
      kind: "owner",
    });
    if (block.error) throw block.error;
  });

  test.afterAll(async () => {
    await adminApi().from("properties").delete().in("id", ids);
  });

  test("temporada lista só imóveis publicados que oferecem temporada", async ({ page }) => {
    await page.goto("/temporada");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Aluguel por temporada");
    await expect(card(page, A)).toBeVisible();
    await expect(card(page, B)).toBeVisible();
    await expect(card(page, C)).toHaveCount(0);
    await expect(card(page, D)).toHaveCount(0);
    await expect(card(page, A)).toContainText("R$ 800 por noite");
  });

  test("mensal lista os que oferecem aluguel mensal", async ({ page }) => {
    await page.goto("/mensal");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Aluguel mensal");
    await expect(card(page, B)).toContainText("R$ 20.000 por mês");
    await expect(card(page, C)).toBeVisible();
    await expect(card(page, A)).toHaveCount(0);
  });

  test("filtro de região pelo formulário", async ({ page, isMobile }) => {
    await page.goto("/temporada");
    await openFilters(page, isMobile);
    await page.getByLabel("Região").selectOption("ilhabela");
    await page.getByRole("button", { name: "Aplicar filtros" }).click();
    await expect(page).toHaveURL(/\/temporada\?regiao=ilhabela/);
    await expect(card(page, B)).toBeVisible();
    await expect(card(page, A)).toHaveCount(0);
    const resumo = page.getByRole("main").getByRole("heading", { level: 2 });
    await expect(resumo).toContainText(/^\d+ imóve(l|is) encontrados? em Ilhabela$/);
  });

  test("datas escondem imóveis ocupados e mostram o total", async ({ page }) => {
    await page.goto(`/temporada?chegada=${isoInDays(61)}&saida=${isoInDays(63)}&hospedes=2`);
    await expect(card(page, A)).toHaveCount(0);
    await expect(card(page, B)).toContainText("R$ 3.000 no total · 2 noites");
    await expect(card(page, B).getByRole("link", { name: B })).toHaveAttribute(
      "href",
      new RegExp(`chegada=${isoInDays(61)}&saida=${isoInDays(63)}&hospedes=2$`),
    );

    await page.goto(`/temporada?chegada=${isoInDays(70)}&saida=${isoInDays(73)}`);
    await expect(card(page, A)).toContainText("R$ 2.400 no total · 3 noites");
  });

  test("mínimo de noites esconde o imóvel", async ({ page }) => {
    await page.goto(`/temporada?chegada=${isoInDays(70)}&saida=${isoInDays(71)}`);
    await expect(card(page, A)).toHaveCount(0);
    await expect(card(page, B)).toBeVisible();
  });

  test("hóspedes, quartos, preço e comodidades", async ({ page }) => {
    await page.goto("/temporada?hospedes=8");
    await expect(card(page, A)).toHaveCount(0);
    await expect(card(page, B)).toBeVisible();

    await page.goto("/temporada?quartos=4");
    await expect(card(page, A)).toHaveCount(0);
    await expect(card(page, B)).toBeVisible();

    await page.goto("/temporada?preco_max=1000");
    await expect(card(page, A)).toBeVisible();
    await expect(card(page, B)).toHaveCount(0);

    await page.goto("/temporada?comodidade=piscina");
    await expect(card(page, A)).toBeVisible();
    await expect(card(page, B)).toHaveCount(0);
  });

  test("ordenação por preço", async ({ page }) => {
    await page.goto("/temporada?ordem=menor-preco");
    const titles = await page.getByRole("article").getByRole("heading").allTextContents();
    expect(titles.indexOf(A)).toBeLessThan(titles.indexOf(B));

    await page.goto("/temporada?ordem=maior-preco");
    const desc = await page.getByRole("article").getByRole("heading").allTextContents();
    expect(desc.indexOf(B)).toBeLessThan(desc.indexOf(A));
  });

  test("datas incompatíveis com a modalidade mostram orientação", async ({ page }) => {
    await page.goto(`/temporada?chegada=${isoInDays(10)}&saida=${isoInDays(45)}`);
    await expect(
      page.getByRole("alert").filter({ hasText: "Temporada vai até 29 noites" }),
    ).toBeVisible();

    await page.goto(`/mensal?chegada=${isoInDays(10)}&saida=${isoInDays(15)}`);
    await expect(
      page.getByRole("alert").filter({ hasText: "Aluguel mensal começa em 30 noites" }),
    ).toBeVisible();
  });

  test("sem resultados mostra como seguir", async ({ page }) => {
    await page.goto("/temporada?hospedes=50");
    await expect(page.getByText("Nenhuma casa com esses filtros.")).toBeVisible();
  });

  test("filtros inválidos na URL são ignorados", async ({ page }) => {
    const response = await page.goto("/temporada?regiao=paris&hospedes=abc&ordem=x&pagina=-2");
    expect(response?.status()).toBe(200);
    await expect(card(page, A)).toBeVisible();
  });

  test("no celular os filtros abrem por um botão", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Só no celular.");
    await page.goto("/temporada?regiao=ilhabela");
    const button = page.getByRole("button", { name: /^Filtros/ });
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(button).toContainText("1");
    await expect(page.getByRole("button", { name: "Aplicar filtros" })).toBeHidden();
    await button.click();
    await expect(page.getByRole("button", { name: "Aplicar filtros" })).toBeVisible();
  });

  test("sem violações WCAG 2.1 AA e sem rolagem horizontal", async ({ page, isMobile }) => {
    await page.goto("/temporada");
    await openFilters(page, isMobile);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
  });
});
