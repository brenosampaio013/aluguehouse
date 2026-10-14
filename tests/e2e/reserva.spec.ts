import { randomInt, randomUUID } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { stubMapTiles } from "./support/map";
import { adminApi, uniqueEmail } from "./support/users";

const run = randomUUID().slice(0, 6);
const slug = `imovel-reserva-${run}`;
const title = `Casa para reservar ${run}`;

function isoInDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/** IP fictício por teste: cada teste tem a própria cota do limite de envios. */
async function useFreshIp(page: Page) {
  const ip = `198.51.${randomInt(0, 255)}.${randomInt(1, 254)}`;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": ip });
  return ip;
}

/** Mostra um dia do calendário, avançando os meses se for preciso. */
async function showDay(page: Page, date: string) {
  const calendar = page.getByRole("region", { name: "Disponibilidade" });
  await expect(calendar.locator("[data-calendar-ready=true]")).toBeAttached();
  const day = calendar.locator(`[data-date="${date}"]`);
  for (let i = 0; i < 4 && !(await day.isVisible()); i += 1) {
    await calendar.getByRole("button", { name: "Próximo mês" }).click();
  }
  return day;
}

async function pickDay(page: Page, date: string) {
  await (await showDay(page, date)).click();
}

async function chooseStay(page: Page, checkIn: string, checkOut: string) {
  await pickDay(page, checkIn);
  await pickDay(page, checkOut);
  await expect(page).toHaveURL(new RegExp(`chegada=${checkIn}&saida=${checkOut}`));
}

async function fillForm(page: Page, email: string) {
  const form = page.getByRole("form", { name: "Solicitar reserva" });
  await form.getByLabel("Nome completo").fill("Ana Teste");
  await form.getByLabel("E-mail").fill(email);
  await form.getByLabel("Telefone (WhatsApp)").fill("(13) 99619-5221");
  await form.getByLabel("Mensagem (opcional)").fill("Chegamos à noite.");
  await form.getByLabel(/Concordo que a Alugue Houses/).check();
  return form;
}

test.describe("calendário e solicitação de reserva", () => {
  let id = "";

  test.beforeAll(async () => {
    const api = adminApi();
    const { data, error } = await api
      .from("properties")
      .insert({
        slug,
        title,
        property_type: "casa",
        city: "Bertioga",
        neighborhood: "Riviera de São Lourenço",
        region: "riviera-de-sao-lourenco",
        bedrooms: 2,
        max_guests: 4,
        offers_seasonal: true,
        nightly_price: 900,
        min_nights: 2,
        status: "published",
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;
    id = data.id;
    await api.from("property_fees").insert({
      property_id: id,
      label: "Limpeza",
      calc: "fixed",
      amount: 250,
      applies_to: "seasonal",
    });
    await api
      .from("calendar_blocks")
      .insert({ property_id: id, stay: `[${isoInDays(20)},${isoInDays(24)})`, kind: "owner" });
  });

  test.afterAll(async () => {
    const api = adminApi();
    await api.from("booking_requests").delete().eq("property_id", id);
    await api.from("properties").delete().eq("id", id);
  });

  test("noites ocupadas aparecem riscadas e não podem ser escolhidas", async ({ page }) => {
    await page.goto(`/imoveis/${slug}`);
    const calendar = page.getByRole("region", { name: "Disponibilidade" });
    await expect(calendar).toContainText("Mínimo de 2 noites.");
    const occupied = await showDay(page, isoInDays(21));
    await expect(occupied).toHaveAttribute("aria-disabled", "true");
    await expect(occupied).toHaveAccessibleName(/, ocupado$/);
    // aria-disabled mantém o dia focável; o clique é ignorado.
    await occupied.click({ force: true });
    await expect(calendar).toContainText("Escolha a data de chegada.");
  });

  test("escolher as datas mostra o total e o formulário", async ({ page }) => {
    await page.goto(`/imoveis/${slug}`);
    await expect(page.getByRole("form", { name: "Solicitar reserva" })).toHaveCount(0);
    await chooseStay(page, isoInDays(30), isoInDays(33));
    const painel = page.getByRole("complementary", { name: "Valores e contato" });
    await expect(painel).toContainText("Diária · 3 noites × R$ 900,00");
    await expect(painel).toContainText("Total estimadoR$ 2.950,00");
    await expect(page.getByRole("form", { name: "Solicitar reserva" })).toBeVisible();
  });

  test("saída que atravessa um período ocupado fica bloqueada", async ({ page }) => {
    await page.goto(`/imoveis/${slug}`);
    await pickDay(page, isoInDays(17));
    const calendar = page.getByRole("region", { name: "Disponibilidade" });
    // Sair no dia em que o bloqueio começa é permitido; depois dele, não.
    await expect(await showDay(page, isoInDays(20))).toHaveAttribute("aria-disabled", "false");
    await expect(await showDay(page, isoInDays(21))).toHaveAttribute("aria-disabled", "true");
    // Depois do bloqueio, o dia vira uma nova chegada em vez de saída.
    await pickDay(page, isoInDays(26));
    await expect(calendar).toContainText("Escolha a data de saída.");
    await expect(calendar.locator(`[data-date="${isoInDays(26)}"]`)).toHaveAccessibleName(
      /, chegada$/,
    );
    await expect(page).not.toHaveURL(/saida=/);
  });

  test("teclado: setas percorrem os dias e Enter escolhe", async ({ page, isMobile }) => {
    test.skip(isMobile, "Teclado físico: desktop e tablet.");
    await page.goto(`/imoveis/${slug}`);
    const calendar = page.getByRole("region", { name: "Disponibilidade" });
    const start = isoInDays(35);
    await pickDay(page, start);
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(calendar.locator(`[data-date="${isoInDays(37)}"]`)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`chegada=${start}&saida=${isoInDays(37)}`));
  });

  test("erros de validação mantêm o que foi digitado", async ({ page }) => {
    await useFreshIp(page);
    await page.goto(`/imoveis/${slug}?chegada=${isoInDays(50)}&saida=${isoInDays(53)}&hospedes=2`);
    const form = page.getByRole("form", { name: "Solicitar reserva" });
    await form.getByLabel("Nome completo").fill("Ana Teste");
    await form.getByLabel("Telefone (WhatsApp)").fill("9999");
    await form.getByRole("button", { name: "Enviar solicitação" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Confira os campos" })).toBeVisible();
    await expect(form.getByText("Informe seu e-mail.")).toBeVisible();
    await expect(form.getByText(/Informe o telefone com DDD/)).toBeVisible();
    await expect(form.getByText("É preciso concordar")).toBeVisible();
    await expect(form.getByLabel("Nome completo")).toHaveValue("Ana Teste");
  });

  test("envia a solicitação e grava pendente com o orçamento", async ({ page }) => {
    await useFreshIp(page);
    const email = uniqueEmail("reserva");
    const checkIn = isoInDays(60);
    const checkOut = isoInDays(64);
    await page.goto(`/imoveis/${slug}?chegada=${checkIn}&saida=${checkOut}&hospedes=3`);
    const form = await fillForm(page, email);
    await form.getByRole("button", { name: "Enviar solicitação" }).click();

    const confirmation = page.getByRole("heading", { name: "Solicitação enviada" });
    await expect(confirmation).toBeFocused();
    const reference = await page
      .getByText(/^Protocolo/)
      .locator("strong")
      .textContent();
    expect(reference).toMatch(/^[0-9A-F]{8}$/);

    const { data } = await adminApi()
      .from("booking_requests")
      .select("id, status, guest_name, guest_email, guest_phone, guests_count, quoted_total, stay")
      .eq("guest_email", email)
      .single();
    expect(data).toMatchObject({
      status: "pending",
      guest_name: "Ana Teste",
      guest_phone: "13996195221",
      guests_count: 3,
      quoted_total: 3850,
      stay: `[${checkIn},${checkOut})`,
    });
    expect(data!.id.slice(0, 8).toUpperCase()).toBe(reference);
  });

  test("campo-isca preenchido não grava nada", async ({ page }) => {
    await useFreshIp(page);
    const email = uniqueEmail("robo");
    await page.goto(`/imoveis/${slug}?chegada=${isoInDays(70)}&saida=${isoInDays(73)}`);
    const form = await fillForm(page, email);
    await page.locator('input[name="website"]').fill("http://spam.example", { force: true });
    await form.getByRole("button", { name: "Enviar solicitação" }).click();
    await expect(page.getByRole("heading", { name: "Solicitação enviada" })).toBeVisible();
    const { count } = await adminApi()
      .from("booking_requests")
      .select("id", { count: "exact", head: true })
      .eq("guest_email", email);
    expect(count).toBe(0);
  });

  test("limite de envios por IP", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Basta um tamanho de tela.");
    await useFreshIp(page);
    const url = `/imoveis/${slug}?chegada=${isoInDays(80)}&saida=${isoInDays(83)}`;
    for (let i = 0; i < 5; i += 1) {
      await page.goto(url);
      const form = await fillForm(page, uniqueEmail(`limite${i}`));
      await form.getByRole("button", { name: "Enviar solicitação" }).click();
      await expect(page.getByRole("heading", { name: "Solicitação enviada" })).toBeVisible();
    }
    await page.goto(url);
    const form = await fillForm(page, uniqueEmail("limite5"));
    await form.getByRole("button", { name: "Enviar solicitação" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Recebemos muitos pedidos seguidos" }),
    ).toBeVisible();
    await expect(form.getByLabel("Nome completo")).toHaveValue("Ana Teste");
  });

  test("celular: barra fixa leva às datas", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Só no celular.");
    await page.goto(`/imoveis/${slug}`);
    await page.getByRole("link", { name: "Ver datas", exact: true }).click();
    await expect(page).toHaveURL(/#disponibilidade$/);
    await expect(page.getByRole("heading", { name: "Disponibilidade" })).toBeInViewport();
  });

  test("com datas e formulário: sem violações WCAG 2.1 AA e sem rolagem horizontal", async ({
    page,
  }) => {
    await stubMapTiles(page);
    await page.goto(`/imoveis/${slug}?chegada=${isoInDays(30)}&saida=${isoInDays(33)}`);
    await expect(page.getByRole("form", { name: "Solicitar reserva" })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
  });
});
