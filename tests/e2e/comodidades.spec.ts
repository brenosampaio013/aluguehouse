import { randomUUID } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { amenityCatalog } from "@/lib/amenities";

import { loginAsAdmin } from "./support/admin";
import { adminApi, anonApi, createAdminWithTotp } from "./support/users";

const run = randomUUID().slice(0, 6);
const COM = `Casa completa ${run}`;
const SEM = `Casa sem comodidades ${run}`;
// 12 comodidades: passa do resumo (10) e cai em mais de uma categoria.
const SLUGS = [
  "wi-fi",
  "piscina",
  "ar-condicionado",
  "churrasqueira",
  "berco",
  "bide",
  "rede",
  "sauna",
  "cofre",
  "reciclagem",
  "lava-loucas",
  "guarda-bagagem",
];

async function expectNoHorizontalScroll(page: Page) {
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
}

test.describe("comodidades", () => {
  test.describe.configure({ mode: "serial" });
  const ids: string[] = [];
  const slugs: string[] = [];

  test.beforeAll(async () => {
    ids.length = 0;
    slugs.length = 0;
    const api = adminApi();
    for (const [index, title] of [COM, SEM].entries()) {
      const slug = `comodidades-${run}-${index}`;
      const { data, error } = await api
        .from("properties")
        .insert({
          title,
          slug,
          property_type: "casa",
          city: "Bertioga",
          offers_seasonal: true,
          nightly_price: 900,
          max_guests: 6,
          status: "published",
          published_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;
      ids.push(data.id);
      slugs.push(slug);
    }
    const { data: amenities } = await api.from("amenities").select("id").in("slug", SLUGS);
    const link = await api
      .from("property_amenities")
      .insert(amenities!.map((a) => ({ property_id: ids[0]!, amenity_id: a.id })));
    if (link.error) throw link.error;
  });

  test.afterAll(async () => {
    await adminApi().from("properties").delete().in("id", ids);
  });

  test("o banco tem exatamente o catálogo do código", async () => {
    const { data, error } = await anonApi().from("amenities").select("slug, label");
    expect(error).toBeNull();
    const db = new Map(data!.map((a) => [a.slug, a.label]));
    expect([...db.keys()].sort()).toEqual(amenityCatalog.map((a) => a.slug).sort());
    for (const a of amenityCatalog) expect(db.get(a.slug), a.slug).toBe(a.label);
  });

  test("página mostra 10 com ícone e todas por categoria no diálogo", async ({ page }) => {
    await page.goto(`/imoveis/${slugs[0]}`);
    const secao = page.getByRole("region", { name: "O que este lugar oferece" });
    await expect(secao.getByRole("list").first().locator("li")).toHaveCount(10);
    await expect(secao.locator("li svg").first()).toHaveAttribute("aria-hidden", "true");

    await secao.getByRole("button", { name: "Mostrar todas as 12 comodidades" }).click();
    const dialogo = page.getByRole("dialog", { name: "O que este lugar oferece (12)" });
    await expect(dialogo).toBeVisible();
    for (const categoria of ["Bebês e crianças", "Segurança", "Sustentabilidade"]) {
      await expect(dialogo.getByRole("heading", { name: categoria })).toBeVisible();
    }
    await expect(dialogo.locator("li")).toHaveCount(12);
    await expect(dialogo).not.toContainText("lava-loucas");
    await page.keyboard.press("Escape");
    await expect(dialogo).toBeHidden();
    await expectNoHorizontalScroll(page);

    const results = await new AxeBuilder({ page })
      .include("main")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("imóvel sem comodidades não mostra a seção", async ({ page }) => {
    await page.goto(`/imoveis/${slugs[1]}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(SEM);
    await expect(page.getByRole("region", { name: "O que este lugar oferece" })).toHaveCount(0);
  });

  test("cadastro já com comodidades, sem violações WCAG no seletor", async ({ page }) => {
    test.setTimeout(90_000);
    const admin = await createAdminWithTotp();
    await loginAsAdmin(page, admin);
    await page.goto("/admin/imoveis/novo");
    await page.getByLabel("Título do anúncio").fill(`Rascunho comodidades ${run}`);
    await page.getByText("Comodidades (opcional)").click();
    await page.getByLabel("Categoria").selectOption("criancas");
    await page.getByRole("checkbox", { name: "Berço" }).check();
    await page.getByLabel("Buscar comodidade").fill("wifi");
    await page.getByLabel("Categoria").selectOption("");
    await page.getByRole("checkbox", { name: "Wi-Fi", exact: true }).check();
    await expect(page.getByText("2 comodidades marcadas")).toBeVisible();
    await expectNoHorizontalScroll(page);
    const results = await new AxeBuilder({ page })
      .include("form")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);

    await page.getByRole("button", { name: "Criar rascunho" }).click();
    await page.waitForURL(/\/admin\/imoveis\/[0-9a-f-]{36}$/);
    const id = page.url().split("/").pop()!;
    ids.push(id);
    await expect(page.getByRole("checkbox", { name: "Berço" })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Wi-Fi", exact: true })).toBeChecked();
    await expect(page.getByText("2 comodidades marcadas")).toBeVisible();
  });
});
