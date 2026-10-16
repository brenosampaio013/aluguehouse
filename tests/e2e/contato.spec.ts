import { randomInt, randomUUID } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { loginAsAdmin, openAdminNav } from "./support/admin";
import { waitForEmail } from "./support/mailpit";
import { adminApi, createAdminWithTotp, uniqueEmail } from "./support/users";

const ADMIN_INBOX = "contatoaluguehouses@gmail.com";
const run = randomUUID().slice(0, 6);
const sale = { slug: `casa-venda-${run}`, title: `Casa à venda ${run}`, id: "" };
const rental = { slug: `casa-aluguel-${run}`, title: `Casa de aluguel ${run}`, id: "" };

function isoInDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/** IP fictício por teste: cada teste tem a própria cota do limite de envios. */
async function useFreshIp(page: Page) {
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `203.0.${randomInt(0, 255)}.${randomInt(1, 254)}`,
  });
}

test.beforeAll(async () => {
  const api = adminApi();
  const base = {
    property_type: "casa" as const,
    city: "Bertioga",
    max_guests: 6,
    status: "published" as const,
    published_at: new Date().toISOString(),
  };
  const sold = await api
    .from("properties")
    .insert({
      ...base,
      slug: sale.slug,
      title: sale.title,
      offers_sale: true,
      sale_price: 2_500_000,
    })
    .select("id")
    .single();
  const rented = await api
    .from("properties")
    .insert({
      ...base,
      slug: rental.slug,
      title: rental.title,
      offers_seasonal: true,
      nightly_price: 600,
    })
    .select("id")
    .single();
  if (sold.error) throw sold.error;
  if (rented.error) throw rented.error;
  sale.id = sold.data.id;
  rental.id = rented.data.id;
});

test.afterAll(async () => {
  const api = adminApi();
  await api.from("inquiries").delete().in("property_id", [sale.id, rental.id]);
  await api.from("booking_requests").delete().eq("property_id", rental.id);
  await api.from("properties").delete().in("id", [sale.id, rental.id]);
});

test("formulário de contato: validação, envio, gravação e aviso por e-mail", async ({ page }) => {
  await useFreshIp(page);
  const email = uniqueEmail("contato");
  const token = `msg-${randomUUID().slice(0, 8)}`;
  await page.goto("/contato");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contato");

  await page.getByLabel("Nome").fill("Ana Contato");
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Confira os campos" })).toBeVisible();
  await expect(page.getByText("Escreva sua mensagem.")).toBeVisible();
  await expect(page.getByText("É preciso concordar")).toBeVisible();
  await expect(page.getByLabel("Nome")).toHaveValue("Ana Contato");

  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mensagem", { exact: true }).fill(`Quero saber sobre réveillon. ${token}`);
  await page.getByLabel(/Concordo que a Alugue Houses/).check();
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  const done = page.getByRole("status").filter({ hasText: "Mensagem enviada." });
  await expect(done).toBeVisible();
  await expect(done).toBeFocused();

  const { data } = await adminApi()
    .from("inquiries")
    .select("kind, name, phone, property_id, status")
    .eq("email", email)
    .single();
  expect(data).toEqual({
    kind: "contact",
    name: "Ana Contato",
    phone: null,
    property_id: null,
    status: "new",
  });

  const mail = await waitForEmail(token);
  expect(mail.to).toEqual([ADMIN_INBOX]);
  expect(mail.replyTo).toEqual([email]);
  expect(mail.subject).toBe("[Alugue Houses] Mensagem");
  expect(mail.text).toContain(`De: Ana Contato <${email}>`);
  expect(mail.text).toContain("/admin/contatos");
});

test("imóvel à venda: pedido de visita com data e período", async ({ page }) => {
  await useFreshIp(page);
  const email = uniqueEmail("visita");
  await page.goto(`/imoveis/${sale.slug}`);
  const box = page.getByRole("region", { name: "Agendar visita ou tirar dúvidas" });
  await expect(box.getByRole("radio", { name: "Agendar uma visita" })).toBeChecked();
  await box.getByLabel("Nome").fill("Bruno Visita");
  await box.getByLabel("E-mail").fill(email);
  await box.getByLabel("Telefone (opcional)").fill("(13) 98888-7777");
  await box.getByLabel("Data preferida (opcional)").fill(isoInDays(5));
  await box.getByLabel("Período").selectOption("tarde");
  await box.getByLabel(/Concordo que a Alugue Houses/).check();
  await box.getByRole("button", { name: "Enviar pedido" }).click();
  await expect(box.getByRole("status")).toContainText("Mensagem enviada.");

  const { data } = await adminApi()
    .from("inquiries")
    .select("kind, phone, message, property_id, preferred_datetime")
    .eq("email", email)
    .single();
  expect(data).toMatchObject({
    kind: "visit",
    phone: "13988887777",
    message: "Gostaria de agendar uma visita.",
    property_id: sale.id,
  });
  expect(new Date(data!.preferred_datetime!).toISOString()).toBe(
    new Date(`${isoInDays(5)}T15:00:00-03:00`).toISOString(),
  );

  const mail = await waitForEmail(`subject:"Pedido de visita · ${sale.title}"`);
  expect(mail.text).toContain("Visita preferida:");
  expect(mail.text).toContain("à tarde");
});

test("imóvel de aluguel: pergunta pelo contato com o imóvel indicado", async ({ page }) => {
  await useFreshIp(page);
  const email = uniqueEmail("pergunta");
  await page.goto(`/imoveis/${rental.slug}`);
  await page.getByRole("link", { name: "Enviar uma pergunta por mensagem" }).click();
  await expect(page).toHaveURL(new RegExp(`/contato\\?imovel=${rental.slug}$`));
  await expect(page.getByText(`Sobre o imóvel ${rental.title}`)).toBeVisible();
  await page.getByLabel("Nome").fill("Caio Pergunta");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mensagem", { exact: true }).fill("Aceita animais?");
  await page.getByLabel(/Concordo que a Alugue Houses/).check();
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Mensagem enviada." })).toBeVisible();
  const { data } = await adminApi()
    .from("inquiries")
    .select("property_id")
    .eq("email", email)
    .single();
  expect(data!.property_id).toBe(rental.id);
});

test("nova solicitação de reserva avisa o administrador por e-mail", async ({ page }) => {
  await useFreshIp(page);
  const email = uniqueEmail("aviso-reserva");
  await page.goto(`/imoveis/${rental.slug}?chegada=${isoInDays(40)}&saida=${isoInDays(43)}`);
  const form = page.getByRole("form", { name: "Solicitar reserva" });
  await form.getByLabel("Nome completo").fill("Duda Reserva");
  await form.getByLabel("E-mail").fill(email);
  await form.getByLabel("Telefone (WhatsApp)").fill("(13) 99619-5221");
  await form.getByLabel(/Concordo que a Alugue Houses/).check();
  await form.getByRole("button", { name: "Enviar solicitação" }).click();
  const reference = await page
    .getByText(/^Protocolo/)
    .locator("strong")
    .textContent();

  const mail = await waitForEmail(`subject:"Nova solicitação de reserva ${reference}"`);
  expect(mail.replyTo).toEqual([email]);
  expect(mail.text).toContain(`Imóvel: ${rental.title}`);
  expect(mail.text).toContain("Hóspede: Duda Reserva");
  expect(mail.text).toMatch(/Total estimado: R\$\s1\.800,00/);
  expect(mail.text).toContain("/admin/solicitacoes/");
});

test("admin acompanha os contatos pelas abas", async ({ page }) => {
  test.setTimeout(60_000);
  const email = uniqueEmail("painel");
  await adminApi()
    .from("inquiries")
    .insert({
      kind: "sale_interest",
      property_id: sale.id,
      name: `Eva Painel ${run}`,
      email,
      phone: "13977776666",
      message: "Aceita permuta?",
      privacy_consent_at: new Date().toISOString(),
    });

  await loginAsAdmin(page, await createAdminWithTotp());
  await (await openAdminNav(page)).getByRole("link", { name: /Contatos/ }).click();
  const card = page.getByRole("article").filter({ hasText: `Eva Painel ${run}` });
  await expect(card).toContainText("Interesse em compra");
  await expect(card).toContainText("Aceita permuta?");
  await expect(card.getByRole("link", { name: sale.title })).toBeVisible();
  expect(
    await card.getByRole("link", { name: /Responder no WhatsApp/ }).getAttribute("href"),
  ).toContain("https://wa.me/5513977776666?text=");

  await card.getByRole("button", { name: /Marcar como em andamento/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Em andamento" })).toBeVisible();
  await expect(card).toHaveCount(0);

  await page.goto("/admin/contatos?situacao=em-andamento");
  await card.getByRole("button", { name: /Encerrar/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Encerrado" })).toBeVisible();
  await page.goto("/admin/contatos?situacao=encerrados");
  await expect(card).toBeVisible();
});

test("contato, imóvel à venda e painel sem violações WCAG 2.1 AA", async ({ page }) => {
  test.setTimeout(60_000);
  const check = async (url: string) => {
    await page.goto(url);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations, url).toEqual([]);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width, url).toBeLessThanOrEqual(page.viewportSize()!.width);
  };
  await check("/contato");
  await check(`/contato?imovel=${rental.slug}`);
  await check(`/imoveis/${sale.slug}`);
  await loginAsAdmin(page, await createAdminWithTotp());
  await check("/admin/contatos");
  await check("/admin");
});
