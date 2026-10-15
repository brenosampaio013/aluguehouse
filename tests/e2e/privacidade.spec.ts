import { randomUUID } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./support/admin";
import { adminApi, createAdminWithTotp, loginAsGuest, uniqueEmail } from "./support/users";
import { waitForAnimations } from "./support/motion";

const run = randomUUID().slice(0, 6);
const slug = `casa-lgpd-${run}`;
let propertyId = "";

function isoInDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

test.beforeAll(async () => {
  const { data, error } = await adminApi()
    .from("properties")
    .insert({
      slug,
      title: `Casa LGPD ${run}`,
      property_type: "casa",
      city: "Bertioga",
      offers_seasonal: true,
      nightly_price: 700,
      max_guests: 4,
      status: "published",
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  propertyId = data.id;
});

test.afterAll(async () => {
  const api = adminApi();
  await api.from("booking_requests").delete().eq("property_id", propertyId);
  await api.from("properties").delete().eq("id", propertyId);
});

test("política de privacidade e termos de uso", async ({ page }) => {
  await page.goto("/privacidade");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Política de privacidade");
  for (const heading of [
    "1. Quem é o responsável",
    "2. Quais dados coletamos e para quê",
    "4. Por quanto tempo guardamos",
    "5. Seus direitos",
    "6. Cookies",
  ]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
  await expect(page.getByText("Controlador dos dados: Alugue Houses.")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "1. Quem é o responsável" }).getByRole("link"),
  ).toHaveAttribute("href", "mailto:contatoaluguehouses@gmail.com");
  await page
    .getByRole("navigation", { name: "Nesta página" })
    .getByRole("link", { name: "Cookies" })
    .click();
  await expect(page).toHaveURL(/#cookies$/);

  await page.goto("/termos");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Termos de uso");
  await expect(page.getByText("não é uma reserva confirmada")).toBeVisible();
  await expect(page.getByText("Nada é cobrado pelo site.")).toBeVisible();
});

test("links para a política: rodapé, formulários e login", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: "Política de privacidade" })).toHaveAttribute(
    "href",
    "/privacidade",
  );
  await expect(footer.getByRole("link", { name: "Termos de uso" })).toHaveAttribute(
    "href",
    "/termos",
  );

  await page.goto(`/imoveis/${slug}?chegada=${isoInDays(30)}&saida=${isoInDays(33)}`);
  const booking = page.getByRole("form", { name: "Solicitar reserva" });
  const bookingLink = booking.getByRole("link", { name: /Política de privacidade/ });
  await expect(bookingLink).toHaveAttribute("href", "/privacidade");
  await expect(bookingLink).toHaveAttribute("target", "_blank");

  await page.goto("/contato");
  await expect(
    page.getByRole("main").getByRole("link", { name: /Política de privacidade/ }),
  ).toHaveAttribute("target", "_blank");

  await page.goto("/entrar");
  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: /Termos de uso/ })).toBeVisible();
  await expect(main.getByRole("link", { name: /Política de privacidade/ })).toBeVisible();
});

test("hóspede exclui a própria conta; a reserva continua guardada", async ({ page }) => {
  const email = uniqueEmail("excluir");
  await loginAsGuest(page, email);
  const api = adminApi();
  const { data: users } = await api.auth.admin.listUsers({ perPage: 1000 });
  const user = users.users.find((u) => u.email === email)!;
  await api.from("favorites").insert({ user_id: user.id, property_id: propertyId });
  await api.from("booking_requests").insert({
    property_id: propertyId,
    rental_mode: "seasonal",
    guest_name: "Hóspede Excluída",
    guest_email: email,
    guest_phone: "13999999999",
    stay: `[${isoInDays(40)},${isoInDays(43)})`,
    guests_count: 2,
    quote_snapshot: {},
    quoted_total: 2100,
    privacy_consent_at: new Date().toISOString(),
  });

  await page.goto("/entrar");
  const section = page.getByRole("region", { name: "Excluir minha conta" });
  await section.getByRole("button", { name: "Excluir minha conta" }).click();
  await expect(section.getByText("Marque a confirmação para excluir a conta.")).toBeVisible();
  await section.getByLabel("Entendo que a exclusão é definitiva.").check();
  await section.getByRole("button", { name: "Excluir minha conta" }).click();

  await expect(page).toHaveURL(/\/entrar\?conta=excluida$/);
  await expect(page.getByText("Sua conta foi excluída.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Entrar");

  const { data: gone } = await api.auth.admin.getUserById(user.id);
  expect(gone.user).toBeNull();
  const favorites = await api
    .from("favorites")
    .select("property_id", { count: "exact", head: true })
    .eq("user_id", user.id);
  expect(favorites.count).toBe(0);
  const bookings = await api
    .from("booking_requests")
    .select("id", { count: "exact", head: true })
    .eq("guest_email", email);
  expect(bookings.count).toBe(1);
});

test("administrador não vê a exclusão de conta", async ({ page }) => {
  await loginAsAdmin(page, await createAdminWithTotp());
  await page.goto("/entrar");
  await expect(page.getByRole("heading", { name: "Você entrou" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Excluir minha conta" })).toHaveCount(0);
});

test("páginas legais e Entrar sem violações WCAG 2.1 AA", async ({ page }) => {
  for (const url of ["/privacidade", "/termos"]) {
    await page.goto(url);
    await waitForAnimations(page);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations, url).toEqual([]);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width, url).toBeLessThanOrEqual(page.viewportSize()!.width);
  }
  await loginAsGuest(page, uniqueEmail("a11y-lgpd"));
  await page.goto("/entrar");
  await waitForAnimations(page);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
