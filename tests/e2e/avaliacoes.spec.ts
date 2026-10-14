import { randomUUID } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { loginAsAdmin } from "./support/admin";
import { adminApi, createAdminWithTotp, loginAsGuest, uniqueEmail } from "./support/users";

function isoInDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function status(page: Page, text: string | RegExp) {
  return page.getByRole("status").filter({ hasText: text });
}

/** Imóvel publicado com uma estadia concluída e outra futura do mesmo hóspede. */
async function seedStays(email: string) {
  const run = randomUUID().slice(0, 6);
  const api = adminApi();
  const { data: property, error } = await api
    .from("properties")
    .insert({
      slug: `casa-avaliada-${run}`,
      title: `Casa avaliada ${run}`,
      property_type: "casa",
      city: "Bertioga",
      offers_seasonal: true,
      nightly_price: 800,
      max_guests: 6,
      status: "published",
      published_at: new Date().toISOString(),
    })
    .select("id, slug, title")
    .single();
  if (error) throw error;

  const booking = (from: number, to: number) => ({
    property_id: property.id,
    rental_mode: "seasonal" as const,
    guest_name: "Carla Dias Teste",
    guest_email: email,
    guest_phone: "13999999999",
    stay: `[${isoInDays(from)},${isoInDays(to)})`,
    guests_count: 2,
    quote_snapshot: {},
    quoted_total: 3200,
    privacy_consent_at: new Date().toISOString(),
    status: "approved" as const,
  });
  const { error: bookingError } = await api
    .from("booking_requests")
    .insert([booking(-10, -6), booking(30, 33)]);
  if (bookingError) throw bookingError;
  return property;
}

async function cleanup(propertyId: string) {
  const api = adminApi();
  await api.from("booking_requests").delete().eq("property_id", propertyId);
  await api.from("properties").delete().eq("id", propertyId);
}

test("sem login, minhas estadias convida a entrar", async ({ page }) => {
  await page.goto("/minhas-estadias");
  await expect(page.getByRole("link", { name: "Entrar para ver estadias" })).toHaveAttribute(
    "href",
    "/entrar?next=/minhas-estadias",
  );
});

test("hóspede avalia estadia concluída; admin publica com resposta", async ({ page }) => {
  test.setTimeout(90_000);
  const email = uniqueEmail("carla");
  const property = await seedStays(email);
  try {
    await loginAsGuest(page, email);
    await page.goto("/minhas-estadias");
    const stays = page.getByRole("article");
    await expect(stays).toHaveCount(2);
    await expect(stays.first()).toContainText("Você poderá avaliar depois do check-out.");

    const form = stays.last();
    await form.getByRole("button", { name: "Enviar avaliação" }).click();
    await expect(form.getByText("Escolha uma nota de 1 a 5 estrelas.")).toBeVisible();

    // Teclado: primeira estrela e setas até 4
    await form.locator("label").filter({ hasText: "1 estrela (Ruim)" }).click();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(form.getByRole("radio", { name: "4 estrelas (Muito bom)" })).toBeChecked();
    await form.getByLabel("Comentário (opcional)").fill("Casa limpa e perto da praia.");
    await form.getByRole("button", { name: "Enviar avaliação" }).click();
    await expect(form.getByText("Em análise")).toBeVisible();
    await expect(form.getByRole("img", { name: "Nota 4 de 5" })).toBeVisible();

    // Antes da moderação, nada aparece no site
    await page.goto(`/imoveis/${property.slug}`);
    await expect(page.getByRole("heading", { name: "Avaliações" })).toHaveCount(0);

    // Admin publica com resposta
    await loginAsAdmin(page, await createAdminWithTotp());
    await expect(
      page.getByRole("navigation", { name: "Painel" }).getByRole("link", { name: /Avaliações/ }),
    ).toBeVisible();
    await page.goto("/admin/avaliacoes");
    const card = page.getByRole("article").filter({ hasText: property.title });
    await expect(card).toContainText("Carla");
    await expect(card).not.toContainText("Dias");
    await card.getByLabel("Resposta pública (opcional)").fill("Obrigado, Carla! Volte sempre.");
    await card.getByRole("button", { name: "Publicar", exact: true }).click();
    await expect(status(page, "Avaliação publicada no site.")).toBeVisible();

    await page.goto(`/imoveis/${property.slug}`);
    const section = page.getByRole("region", { name: "Avaliações" });
    await expect(section).toContainText("4,0 de 5 · 1 avaliação de hóspedes");
    await expect(section).toContainText("Carla");
    await expect(section).toContainText("Casa limpa e perto da praia.");
    await expect(section).toContainText(
      "Resposta da Alugue Houses: Obrigado, Carla! Volte sempre.",
    );

    // Não publicar tira do site
    await page.goto("/admin/avaliacoes?situacao=publicadas");
    await page
      .getByRole("article")
      .filter({ hasText: property.title })
      .getByRole("button", { name: "Não publicar" })
      .click();
    await expect(status(page, "Avaliação não será publicada.")).toBeVisible();
    await page.goto(`/imoveis/${property.slug}`);
    await expect(page.getByRole("heading", { name: "Avaliações" })).toHaveCount(0);
  } finally {
    await cleanup(property.id);
  }
});

test("outra pessoa não vê as estadias nem avalia", async ({ page }) => {
  const property = await seedStays(uniqueEmail("dona"));
  try {
    await loginAsGuest(page, uniqueEmail("outra"));
    await page.goto("/minhas-estadias");
    await expect(page.getByText("Nenhuma solicitação com este e-mail.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar avaliação" })).toHaveCount(0);
  } finally {
    await cleanup(property.id);
  }
});

test("estadias, moderação e avaliações sem violações WCAG 2.1 AA", async ({ page }) => {
  test.setTimeout(90_000);
  const email = uniqueEmail("a11y");
  const property = await seedStays(email);
  try {
    await loginAsGuest(page, email);
    await page.goto("/minhas-estadias");
    const check = async (url: string) => {
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations, url).toEqual([]);
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(width, url).toBeLessThanOrEqual(page.viewportSize()!.width);
    };
    await check("/minhas-estadias");
    await page.locator("label").filter({ hasText: "5 estrelas (Excelente)" }).click();
    await page.getByRole("button", { name: "Enviar avaliação" }).click();
    await expect(page.getByText("Em análise")).toBeVisible();

    await loginAsAdmin(page, await createAdminWithTotp());
    await page.goto("/admin/avaliacoes");
    await check("/admin/avaliacoes");
    await page
      .getByRole("article")
      .filter({ hasText: property.title })
      .getByRole("button", { name: "Publicar", exact: true })
      .click();
    await expect(status(page, "Avaliação publicada")).toBeVisible();
    await page.goto(`/imoveis/${property.slug}`);
    await expect(page.getByRole("region", { name: "Avaliações" })).toBeVisible();
    await check(`/imoveis/${property.slug}`);
  } finally {
    await cleanup(property.id);
  }
});
