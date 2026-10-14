import { randomUUID } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { loginAsAdmin } from "./support/admin";
import { adminApi, anonApi, createAdminWithTotp } from "./support/users";

function isoInDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function status(page: Page, text: string | RegExp) {
  return page.getByRole("status").filter({ hasText: text });
}

function alert(page: Page, text: string | RegExp) {
  return page.getByRole("alert").filter({ hasText: text });
}

/** Imóvel publicado próprio de cada teste (os testes rodam em paralelo). */
async function seedProperty() {
  const run = randomUUID().slice(0, 6);
  const api = adminApi();
  const { data, error } = await api
    .from("properties")
    .insert({
      slug: `imovel-painel-${run}`,
      title: `Casa do painel ${run}`,
      property_type: "casa",
      city: "Bertioga",
      offers_seasonal: true,
      nightly_price: 800,
      min_nights: 2,
      max_guests: 6,
      status: "published",
      published_at: new Date().toISOString(),
    })
    .select("id, title")
    .single();
  if (error) throw error;
  return data;
}

async function requestBooking(propertyId: string, name: string, from: number, to: number) {
  const { data, error } = await adminApi().rpc("request_booking", {
    p_property_id: propertyId,
    p_mode: "seasonal",
    p_check_in: isoInDays(from),
    p_check_out: isoInDays(to),
    p_guests: 2,
    p_name: name,
    p_email: `${name.toLowerCase().replace(/\W/g, "")}@teste.local`,
    p_phone: "13996195221",
    p_message: "Vamos com um cachorro pequeno.",
    p_privacy_consent: true,
  });
  if (error) throw error;
  return data;
}

async function cleanup(propertyId: string) {
  const api = adminApi();
  await api.from("booking_requests").delete().eq("property_id", propertyId);
  await api.from("properties").delete().eq("id", propertyId);
}

async function unavailable(propertyId: string) {
  const { data } = await anonApi().rpc("get_unavailable_ranges", {
    p_property_id: propertyId,
    p_from: isoInDays(0),
    p_to: isoInDays(120),
  });
  return data ?? [];
}

test("visitante não abre as solicitações", async ({ page }) => {
  await page.goto("/admin/solicitacoes");
  await expect(page).toHaveURL(/\/admin\/entrar$/);
});

test("aprovar bloqueia as datas; o pedido sobreposto não pode ser aprovado", async ({ page }) => {
  test.setTimeout(90_000);
  const property = await seedProperty();
  try {
    const first = await requestBooking(property.id, "Ana Primeira", 30, 34);
    const second = await requestBooking(property.id, "Bia Segunda", 32, 35);
    const admin = await createAdminWithTotp();
    await loginAsAdmin(page, admin);

    // Lista e contador no menu
    const nav = page.getByRole("navigation", { name: "Painel" });
    await expect(nav.getByRole("link", { name: /Solicitações \d+ pendentes/ })).toBeVisible();
    await nav.getByRole("link", { name: /Solicitações/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Solicitações de reserva");
    // Outros testes rodam em paralelo: o link é localizado pelo id do pedido.
    await page.locator(`a[href="/admin/solicitacoes/${first}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/admin/solicitacoes/${first}$`));

    // Detalhe: dados, conflitos e contato
    await expect(page.getByText(`Protocolo ${first!.slice(0, 8).toUpperCase()}`)).toBeVisible();
    await expect(page.getByText("Vamos com um cachorro pequeno.")).toBeVisible();
    const conflitos = page.getByRole("region", { name: "Conflitos" });
    await expect(conflitos).toContainText("Outro pedido pendente nas mesmas datas");
    await expect(conflitos.getByRole("link", { name: "Bia Segunda" })).toBeVisible();
    const whatsapp = page.getByRole("link", { name: /Responder no WhatsApp/ });
    expect(await whatsapp.getAttribute("href")).toContain("https://wa.me/5513996195221?text=");

    // Aprovar
    await page.getByRole("button", { name: "Aprovar reserva" }).click();
    await expect(status(page, "Reserva aprovada")).toBeVisible();
    await expect(page.getByText("Aprovada", { exact: true })).toBeVisible();
    expect(await unavailable(property.id)).toEqual([
      { start_date: isoInDays(30), end_date: isoInDays(34) },
    ]);

    // O segundo pedido mostra o conflito e não pode ser aprovado
    await page.goto(`/admin/solicitacoes/${second}`);
    await expect(page.getByRole("region", { name: "Conflitos" })).toContainText(
      "Datas ocupadas: reserva",
    );
    await page.getByRole("button", { name: "Aprovar reserva" }).click();
    await expect(alert(page, "Essas datas já estão ocupadas")).toBeVisible();
    await page.getByLabel("Motivo (opcional, uso interno)").fill("Datas já reservadas.");
    await page.getByRole("button", { name: "Recusar solicitação" }).click();
    await expect(status(page, "Solicitação recusada.")).toBeVisible();
    await expect(page.getByLabel("Anotações internas")).toHaveValue("Datas já reservadas.");

    // Cancelar a reserva aprovada libera as datas
    await page.goto(`/admin/solicitacoes/${first}`);
    await page.getByRole("button", { name: "Cancelar reserva" }).click();
    await expect(status(page, "Reserva cancelada")).toBeVisible();
    await expect(page.getByText("Cancelada", { exact: true })).toBeVisible();
    expect(await unavailable(property.id)).toEqual([]);

    // Abas
    await page.goto("/admin/solicitacoes?situacao=recusadas");
    await expect(page.getByRole("link", { name: "Recusadas" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.locator(`a[href="/admin/solicitacoes/${second}"]`)).toHaveText("Bia Segunda");
  } finally {
    await cleanup(property.id);
  }
});

test("anotações internas são salvas", async ({ page }) => {
  const property = await seedProperty();
  try {
    const id = await requestBooking(property.id, "Caio Notas", 40, 43);
    await loginAsAdmin(page, await createAdminWithTotp());
    await page.goto(`/admin/solicitacoes/${id}`);
    await page.getByLabel("Anotações internas").fill("Chega às 22h.");
    await page.getByRole("button", { name: "Salvar anotações" }).click();
    await expect(status(page, "Anotações salvas.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Anotações internas")).toHaveValue("Chega às 22h.");
  } finally {
    await cleanup(property.id);
  }
});

test("bloqueios de datas no editor do imóvel", async ({ page }) => {
  test.setTimeout(60_000);
  const property = await seedProperty();
  try {
    await loginAsAdmin(page, await createAdminWithTotp());
    await page.goto(`/admin/imoveis/${property.id}`);
    const calendario = page.getByRole("region", { name: "Calendário" });
    await expect(calendario).toContainText("Nenhuma reserva ou bloqueio");

    // Validação
    await calendario.getByLabel("Primeira noite").fill(isoInDays(50));
    await calendario.getByLabel("Última noite").fill(isoInDays(48));
    await calendario.getByRole("button", { name: "Bloquear datas" }).click();
    await expect(calendario.getByText("A última noite deve ser igual ou posterior")).toBeVisible();

    // Bloqueio de 3 noites (50, 51 e 52; saída no dia 53)
    await calendario.getByLabel("Última noite").fill(isoInDays(52));
    await calendario.getByLabel("Observação").fill("Família do proprietário");
    await calendario.getByRole("button", { name: "Bloquear datas" }).click();
    await expect(status(page, "Datas bloqueadas.")).toBeVisible();
    await expect(calendario.getByRole("row", { name: /Família do proprietário/ })).toContainText(
      "3 noites",
    );
    expect(await unavailable(property.id)).toEqual([
      { start_date: isoInDays(50), end_date: isoInDays(53) },
    ]);

    // Sobreposição
    await calendario.getByLabel("Motivo").selectOption("maintenance");
    await calendario.getByLabel("Primeira noite").fill(isoInDays(52));
    await calendario.getByLabel("Última noite").fill(isoInDays(54));
    await calendario.getByRole("button", { name: "Bloquear datas" }).click();
    await expect(alert(page, "Já existe uma reserva ou bloqueio nesse período")).toBeVisible();

    // Remover
    await calendario.getByRole("button", { name: /Remover bloqueio/ }).click();
    await expect(calendario).toContainText("Nenhuma reserva ou bloqueio");
    expect(await unavailable(property.id)).toEqual([]);
  } finally {
    await cleanup(property.id);
  }
});

test("lista e detalhe sem violações WCAG 2.1 AA e sem rolagem horizontal", async ({ page }) => {
  test.setTimeout(60_000);
  const property = await seedProperty();
  try {
    const id = await requestBooking(property.id, "Duda Acessível", 60, 63);
    await loginAsAdmin(page, await createAdminWithTotp());
    for (const url of ["/admin/solicitacoes", `/admin/solicitacoes/${id}`, "/admin"]) {
      await page.goto(url);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations, url).toEqual([]);
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(width, url).toBeLessThanOrEqual(page.viewportSize()!.width);
    }
  } finally {
    await cleanup(property.id);
  }
});
