import { randomUUID } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { waitForAccessLink } from "./support/mailpit";
import { adminApi, loginAsGuest, uniqueEmail } from "./support/users";

const run = randomUUID().slice(0, 6);
const title = `Casa favorita ${run}`;
const slug = `casa-favorita-${run}`;
let id = "";

function toast(page: Page, text: string | RegExp) {
  return page.getByRole("status").filter({ hasText: text });
}

test.beforeAll(async () => {
  const { data, error } = await adminApi()
    .from("properties")
    .insert({
      slug,
      title,
      property_type: "casa",
      city: "Bertioga",
      region: "riviera-de-sao-lourenco",
      offers_seasonal: true,
      nightly_price: 700,
      max_guests: 4,
      status: "published",
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  id = data.id;
});

test.afterAll(async () => {
  await adminApi().from("properties").delete().eq("id", id);
});

test("sem login: a página de favoritos convida a entrar", async ({ page }) => {
  await page.goto("/favoritos");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Favoritos");
  await expect(page.getByRole("link", { name: "Entrar para ver favoritos" })).toHaveAttribute(
    "href",
    "/entrar?next=/favoritos",
  );
});

test("sem login, o coração leva para entrar e o link volta para a mesma página", async ({
  page,
}) => {
  const email = uniqueEmail("favorito");
  await page.goto(`/imoveis/${slug}`);
  await page
    .getByRole("button", { name: `Salvar ${title} nos favoritos (é preciso entrar)` })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/entrar\\?next=${encodeURIComponent(`/imoveis/${slug}`)}$`),
  );

  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Enviar link de acesso" }).click();
  const link = await waitForAccessLink(email);
  await page.goto(link.pathname + link.search);
  await expect(page).toHaveURL(new RegExp(`/imoveis/${slug}$`));

  const heart = page.getByRole("button", { name: `Salvar ${title} nos favoritos` });
  await expect(heart).toHaveAttribute("aria-pressed", "false");
  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "true");
  await expect(toast(page, `${title} foi salvo nos favoritos.`)).toBeVisible();
  await toast(page, "foi salvo").getByRole("link", { name: "Ver favoritos" }).click();
  await expect(page).toHaveURL(/\/favoritos$/);
  await expect(page.getByRole("link", { name: title })).toBeVisible();
});

test("salvar pelo cartão da listagem e remover pela página de favoritos", async ({ page }) => {
  await loginAsGuest(page, uniqueEmail("cartao"));
  await page.goto("/temporada?regiao=riviera-de-sao-lourenco");
  const heart = page.getByRole("button", { name: `Salvar ${title} nos favoritos` });
  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "true");
  await expect(toast(page, "foi salvo")).toBeVisible();

  // Continua salvo ao recarregar
  await page.reload();
  await expect(heart).toHaveAttribute("aria-pressed", "true");

  await page.goto("/favoritos");
  await expect(page.getByText("1 imóvel salvo.")).toBeVisible();
  await page.getByRole("button", { name: `Salvar ${title} nos favoritos` }).click();
  await expect(toast(page, `${title} saiu dos favoritos.`)).toBeVisible();
  await page.reload();
  await expect(page.getByText("Você ainda não salvou nenhum imóvel.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Temporada" }).last()).toBeVisible();
});

test("cada pessoa vê só os próprios favoritos; despublicado sai da lista", async ({
  page,
  browser,
}) => {
  const other = await adminApi()
    .from("properties")
    .insert({
      slug: `${slug}-b`,
      title: `${title} B`,
      property_type: "casa",
      city: "Ubatuba",
      offers_seasonal: true,
      nightly_price: 500,
      max_guests: 2,
      status: "published",
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  try {
    await loginAsGuest(page, uniqueEmail("ana"));
    await page.goto(`/imoveis/${slug}-b`);
    await page.getByRole("button", { name: `Salvar ${title} B nos favoritos` }).click();
    await expect(toast(page, "foi salvo")).toBeVisible();

    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    await loginAsGuest(otherPage, uniqueEmail("bia"));
    await otherPage.goto("/favoritos");
    await expect(otherPage.getByText("Você ainda não salvou nenhum imóvel.")).toBeVisible();
    await otherContext.close();

    await adminApi().from("properties").update({ status: "draft" }).eq("id", other.data!.id);
    await page.goto("/favoritos");
    await expect(page.getByText("Você ainda não salvou nenhum imóvel.")).toBeVisible();
  } finally {
    await adminApi().from("properties").delete().eq("id", other.data!.id);
  }
});

test("favoritos sem violações WCAG 2.1 AA e sem rolagem horizontal", async ({ page }) => {
  await loginAsGuest(page, uniqueEmail("a11y"));
  await page.goto(`/imoveis/${slug}`);
  await page.getByRole("button", { name: `Salvar ${title} nos favoritos` }).click();
  await expect(toast(page, "foi salvo")).toBeVisible();
  for (const url of ["/favoritos", "/temporada?regiao=riviera-de-sao-lourenco"]) {
    await page.goto(url);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations, url).toEqual([]);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width, url).toBeLessThanOrEqual(page.viewportSize()!.width);
  }
});
