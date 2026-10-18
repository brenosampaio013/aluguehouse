import { randomUUID } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { stubMapTiles } from "./support/map";
import { adminApi } from "./support/users";

function isoInDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const run = randomUUID().slice(0, 6);
// Barra do Una (São Sebastião): dois com localização e um sem.
const X = `Casa Barra ${run}`;
const Y = `Chalé Barra ${run}`;
const SEM = `Sem mapa ${run}`;
// Outro bairro, para conferir que o destino filtra.
const J = `Casa Juquehy ${run}`;

/*
 * Os projetos (computador, tablet, celular) rodam em paralelo com os mesmos
 * bairros. Cada um usa uma faixa de preço própria e filtra por ela, para que
 * a lista e o mapa mostrem só os imóveis do próprio projeto.
 */
const bands: Record<string, number> = { desktop: 0, tablet: 3000, celular: 6000 };
let base = 0;
let LISTA = "";
const price = (value: number) => `R$ ${(value + base).toLocaleString("pt-BR")}`;

function card(page: Page, title: string) {
  return page
    .getByRole("article")
    .filter({ has: page.getByRole("link", { name: title, exact: true }) });
}

/** Marcador de preço: o nome acessível começa pelo título do imóvel. */
function marker(page: Page, title: string) {
  return page.getByRole("button", { name: new RegExp(`^${title},`) });
}

/** Abaixo de 1024 px a lista e o mapa se alternam. */
function stacked(page: Page) {
  return page.viewportSize()!.width < 1024;
}

async function openMap(page: Page) {
  if (stacked(page)) await page.getByRole("button", { name: "Mapa", exact: true }).click();
  const mapa = page.locator("[data-map-status]");
  await mapa.scrollIntoViewIfNeeded();
  await expect(mapa).toHaveAttribute("data-map-status", "ready", { timeout: 15_000 });
  return mapa;
}

test.describe("busca com mapa", () => {
  // Um worker por projeto: os dados criados no beforeAll valem para o arquivo todo.
  test.describe.configure({ mode: "serial" });
  const ids: string[] = [];

  test.beforeAll(async () => {
    ids.length = 0;
    base = bands[test.info().project.name] ?? 0;
    LISTA = `/temporada?destino=barra-do-una&preco_min=${800 + base}&preco_max=${2000 + base}`;
    const api = adminApi();
    const rows = [
      { title: X, neighborhood: "Barra do Una", nightly_price: 1000, coords: [-23.7631, -45.7712] },
      { title: Y, neighborhood: "Barra do Una", nightly_price: 1400, coords: [-23.7545, -45.7585] },
      { title: SEM, neighborhood: "Barra do Una", nightly_price: 900, coords: null },
      { title: J, neighborhood: "Juquehy", nightly_price: 1100, coords: [-23.7675, -45.7331] },
    ] as const;
    for (const [index, row] of rows.entries()) {
      const { data, error } = await api
        .from("properties")
        .insert({
          title: row.title,
          slug: `mapa-${run}-${index}`,
          property_type: "casa",
          city: "São Sebastião",
          neighborhood: row.neighborhood,
          region: "sao-sebastiao",
          offers_seasonal: true,
          nightly_price: row.nightly_price + base,
          max_guests: 6,
          bedrooms: 3,
          min_nights: 1,
          status: "published",
          published_at: new Date(Date.now() - index * 60_000).toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;
      ids.push(data.id);
      if (row.coords) {
        // Localização exata é privada; o banco publica só a aproximada.
        const priv = await api.from("property_private").insert({
          property_id: data.id,
          exact_lat: row.coords[0],
          exact_lng: row.coords[1],
        });
        if (priv.error) throw priv.error;
      }
    }
    // Feriado em 2 das 4 noites de X: a média do período fica em R$ 1.500.
    const rate = await api.from("seasonal_rates").insert({
      property_id: ids[0]!,
      label: "Feriado",
      period: `[${isoInDays(82)},${isoInDays(84)})`,
      nightly_price: 2000 + base,
    });
    if (rate.error) throw rate.error;
  });

  test.afterAll(async () => {
    await adminApi().from("properties").delete().in("id", ids);
  });

  test.beforeEach(async ({ page }) => {
    await stubMapTiles(page);
  });

  test("destino por bairro: lista filtrada e marcadores só de quem tem localização", async ({
    page,
  }) => {
    await page.goto(LISTA);
    await expect(page.getByRole("main").getByRole("heading", { level: 2 })).toContainText(
      "em Barra do Una",
    );
    await expect(card(page, X)).toBeVisible();
    await expect(card(page, SEM)).toBeVisible();
    await expect(card(page, J)).toHaveCount(0);
    await expect(
      page.locator("li", { has: card(page, SEM) }).getByText("Sem localização no mapa"),
    ).toBeVisible();

    await openMap(page);
    await expect(marker(page, X)).toHaveText(price(1000));
    await expect(marker(page, Y)).toHaveText(price(1400));
    await expect(marker(page, SEM)).toHaveCount(0);
    await expect(marker(page, J)).toHaveCount(0);
  });

  test("marcador mostra o resumo e destaca o cartão", async ({ page }) => {
    await page.goto(LISTA);
    await openMap(page);
    await marker(page, X).click();
    await expect(marker(page, X)).toHaveAttribute("aria-pressed", "true");
    const resumo = page.getByRole("dialog", { name: `Resumo: ${X}` });
    await expect(resumo).toContainText(`${price(1000)} por noite`);
    await expect(resumo.getByRole("link", { name: "Ver imóvel" })).toHaveAttribute(
      "href",
      `/imoveis/mapa-${run}-0`,
    );
    if (!stacked(page)) {
      await expect(page.locator("[data-selected]")).toHaveAttribute("data-result-id", ids[0]!);
    }
    await page.keyboard.press("Escape");
    await expect(resumo).toBeHidden();
  });

  test("“Ver no mapa” no cartão seleciona o marcador", async ({ page }) => {
    await page.goto(LISTA);
    if (!stacked(page)) await openMap(page);
    await page.getByRole("button", { name: `Ver no mapa: ${Y}` }).click();
    await openMap(page);
    await expect(marker(page, Y)).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("dialog", { name: `Resumo: ${Y}` })).toBeVisible();
  });

  test("com datas, o marcador mostra a média das diárias e o cartão o total", async ({ page }) => {
    await page.goto(`${LISTA}&chegada=${isoInDays(80)}&saida=${isoInDays(84)}`);
    await expect(card(page, X)).toContainText(
      `${price(6000 + 3 * base)} no total com taxas · 4 noites`,
    );
    await expect(card(page, X)).toContainText(`média de ${price(1500)} por noite`);
    await openMap(page);
    await expect(marker(page, X)).toHaveText(price(1500));
  });

  test("pesquisar nesta área, voltar e avançar", async ({ page }) => {
    test.skip(stacked(page), "Arrastar o mapa é testado no computador.");
    await page.goto(LISTA);
    const mapa = await openMap(page);
    await mapa.scrollIntoViewIfNeeded();
    const box = (await mapa.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 120, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();

    await page.getByRole("button", { name: "Pesquisar nesta área" }).click();
    await expect(page).toHaveURL(/\/temporada\?area=-?\d/);
    await expect(page.getByRole("main").getByRole("heading", { level: 2 })).toContainText(
      "na área do mapa",
    );
    // Sem localização não entra na busca por área.
    await expect(card(page, SEM)).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Área do mapa/ })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(LISTA);
    await expect(card(page, SEM)).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(/area=/);
  });

  test("destino sem imóveis: mensagem e mapa no lugar", async ({ page }) => {
    await page.goto("/temporada?destino=camburi&hospedes=50");
    await expect(page.getByRole("main").getByRole("heading", { level: 2 })).toHaveText(
      /Nenhum imóvel encontrado em Camburi/,
    );
    await openMap(page);
    await expect(page.getByText("Nenhum imóvel com localização para mostrar aqui.")).toBeVisible();
  });

  test("atalhos de comodidade ligam e desligam o filtro", async ({ page }) => {
    await page.goto(LISTA);
    await page.getByRole("link", { name: "Piscina", exact: true }).click();
    await expect(page).toHaveURL(`${LISTA}&comodidade=piscina`);
    await expect(card(page, X)).toHaveCount(0);
    await page.getByRole("link", { name: /Piscina \(ativo, remover\)/ }).click();
    await expect(page).toHaveURL(LISTA);
  });

  test("sem violações WCAG 2.1 AA com o mapa e sem rolagem horizontal", async ({ page }) => {
    await page.goto(LISTA);
    await openMap(page);
    await expect(marker(page, X)).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
  });
});
