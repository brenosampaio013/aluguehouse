import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { stubMapTiles } from "./support/map";
import { adminApi } from "./support/users";

const run = randomUUID().slice(0, 6);
const slug = `casa-percorrer-${run}`;
const fewSlug = `casa-poucas-fotos-${run}`;
const FOTOS = [
  ["sala-jantar", "Sala de jantar integrada à cozinha"],
  ["cozinha", "Cozinha equipada"],
  ["quarto-casal", "Quarto de casal"],
  ["quarto-beliche", "Quarto com beliche"],
  ["banheiro", "Banheiro social"],
] as const;
const ids: string[] = [];
const files: string[] = [];

async function seed(slugValue: string, photos: readonly (readonly [string, string])[]) {
  const api = adminApi();
  const { data, error } = await api
    .from("properties")
    .insert({
      slug: slugValue,
      title: `Casa ${slugValue}`,
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
  for (const [index, [file, alt]] of photos.entries()) {
    const mediaId = randomUUID();
    const filePath = `${data.id}/${mediaId}/640.webp`;
    files.push(filePath);
    await api.storage
      .from("property-media")
      .upload(
        filePath,
        readFileSync(path.join(process.cwd(), `media/recebidas/imovel-01/${file}.jpg`)),
        {
          contentType: "image/jpeg",
        },
      );
    await api.from("property_media").insert({
      id: mediaId,
      property_id: data.id,
      kind: "image",
      storage_path: `${data.id}/${mediaId}`,
      width: 640,
      height: 480,
      alt_text: alt,
      position: index,
      is_cover: index === 0,
      is_demo: index === 4,
    });
  }
}

test.beforeAll(async () => {
  await seed(slug, FOTOS);
  await seed(fewSlug, FOTOS.slice(0, 2));
});

test.afterAll(async () => {
  const api = adminApi();
  await api.storage.from("property-media").remove(files);
  await api.from("properties").delete().in("id", ids);
});

function story(page: Page) {
  return page.getByRole("region", { name: "Percorra a casa" });
}

test("computador: a foto fica fixa e acompanha a rolagem", async ({ page, isMobile }) => {
  test.skip(isMobile || page.viewportSize()!.width < 1024, "Só no computador.");
  await stubMapTiles(page);
  await page.goto(`/imoveis/${slug}`);
  const section = story(page);
  const stage = section.getByTestId("palco");
  await expect(stage).toBeVisible();
  // As fotos das etapas ficam ocultas: a descrição é lida uma vez só.
  await expect(section.locator("li img").first()).toBeHidden();

  for (const step of [2, 4]) {
    await section
      .locator(`li[data-step="${step}"]`)
      .evaluate((element) => element.scrollIntoView({ block: "center" }));
    await expect(section).toHaveAttribute("data-active-step", String(step));
    await expect(stage).toBeInViewport();
  }
  // A última foto é ilustrativa: o aviso acompanha o palco.
  await expect(stage.getByText("Foto ilustrativa")).toBeVisible();
  await expect(section.getByText("Foto 5 de 5")).toBeVisible();
  await expect(section.getByText("Banheiro social")).toBeVisible();
});

test("celular e tablet: sequência simples de fotos com legenda", async ({ page }) => {
  test.skip(page.viewportSize()!.width >= 1024, "Só abaixo de 1024 px.");
  await page.goto(`/imoveis/${slug}`);
  const section = story(page);
  await expect(section.getByTestId("palco")).toBeHidden();
  const photos = section.locator("li img");
  await expect(photos).toHaveCount(5);
  await photos.nth(2).scrollIntoViewIfNeeded();
  await expect(photos.nth(2)).toBeVisible();
  await expect(section.getByRole("figure").nth(2)).toContainText("Foto 3 de 5");
  await expect(section.getByRole("figure").nth(2)).toContainText("Quarto de casal");
});

test("movimento reduzido: sem foto fixa nem troca animada", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/imoveis/${slug}`);
  const section = story(page);
  await expect(section.getByTestId("palco")).toBeHidden();
  await expect(section.locator("li img").first()).toBeVisible();
  await section.locator('li[data-step="3"]').scrollIntoViewIfNeeded();
  await expect(section).toHaveAttribute("data-active-step", "0");
});

test("com menos de 3 fotos a seção não aparece", async ({ page }) => {
  await page.goto(`/imoveis/${fewSlug}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(story(page)).toHaveCount(0);
});

test("sem violações WCAG 2.1 AA e sem rolagem horizontal (com e sem movimento)", async ({
  page,
}) => {
  await stubMapTiles(page);
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    await page.emulateMedia({ reducedMotion });
    await page.goto(`/imoveis/${slug}`);
    await story(page).scrollIntoViewIfNeeded();
    const results = await new AxeBuilder({ page })
      .include("section[aria-labelledby='percorra-a-casa']")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations, reducedMotion).toEqual([]);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width, reducedMotion).toBeLessThanOrEqual(page.viewportSize()!.width);
  }
});
