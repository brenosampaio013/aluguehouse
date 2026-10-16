import { randomUUID } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { answerConfirm, loginAsAdmin, openAdminNav } from "./support/admin";
import { adminApi, createAdminWithTotp } from "./support/users";

function isoInDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Imóvel e dados próprios de cada teste (os testes rodam em paralelo). */
async function seed() {
  const run = randomUUID().slice(0, 6);
  const api = adminApi();
  const { data: property, error } = await api
    .from("properties")
    .insert({
      slug: `painel-geral-${run}`,
      title: `Casa painel geral ${run}`,
      property_type: "casa",
      city: "Bertioga",
      offers_seasonal: true,
      nightly_price: 900,
      min_nights: 2,
      max_guests: 6,
      status: "published",
      published_at: new Date().toISOString(),
    })
    .select("id, title, slug")
    .single();
  if (error) throw error;

  const book = async (name: string, from: number, to: number) => {
    const { data, error: bookingError } = await api.rpc("request_booking", {
      p_property_id: property.id,
      p_mode: "seasonal",
      p_check_in: isoInDays(from),
      p_check_out: isoInDays(to),
      p_guests: 2,
      p_name: name,
      p_email: `${name.toLowerCase().replace(/\W/g, "")}-${run}@teste.local`,
      p_phone: "13996195221",
      p_message: null,
      p_privacy_consent: true,
    });
    if (bookingError) throw bookingError;
    return data as string;
  };
  const approvedId = await book(`Gabi Aprovada ${run}`, 50, 53);
  await book(`Hugo Pendente ${run}`, 60, 63);
  // Aprovação direta no banco, como o painel faria (bloqueio + situação).
  await api
    .from("calendar_blocks")
    .insert({
      property_id: property.id,
      kind: "booking",
      booking_request_id: approvedId,
      stay: `[${isoInDays(50)},${isoInDays(53)})`,
    })
    .throwOnError();
  await api
    .from("booking_requests")
    .update({ status: "approved", decided_at: new Date().toISOString() })
    .eq("id", approvedId)
    .throwOnError();

  const { data: inquiry } = await api
    .from("inquiries")
    .insert({
      kind: "visit",
      property_id: property.id,
      name: `Iara Contato ${run}`,
      email: `iara-${run}@teste.local`,
      message: "Quero visitar; pode ser sábado?",
      privacy_consent_at: new Date().toISOString(),
    })
    .select("id")
    .single()
    .throwOnError();

  return { run, property, inquiryId: inquiry!.id };
}

async function cleanup(propertyId: string) {
  const api = adminApi();
  await api.from("inquiries").delete().eq("property_id", propertyId);
  await api.from("booking_requests").delete().eq("property_id", propertyId);
  await api.from("properties").delete().eq("id", propertyId);
}

async function expectNoHorizontalScroll(page: Page) {
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width, "a página não deve rolar de lado").toBeLessThanOrEqual(page.viewportSize()!.width);
}

test("exportação exige admin", async ({ request }) => {
  // Sem sessão, o proxy já manda para o login; nada do CSV é entregue.
  const csv = await request.get("/admin/exportar/solicitacoes", { maxRedirects: 0 });
  expect(csv.status()).toBe(307);
  expect(csv.headers()["location"]).toMatch(/\/admin\/entrar$/);
  expect(await csv.text()).not.toContain("Protocolo");
});

test("visão geral, listas, filtros, CSV e exclusão com confirmação", async ({ page }) => {
  test.setTimeout(150_000);
  const { run, property } = await seed();
  try {
    await loginAsAdmin(page, await createAdminWithTotp());
    await expect(page.getByRole("heading", { level: 1, name: "Visão geral" })).toBeVisible();

    // Menu lateral com todas as seções (gaveta no celular)
    const nav = await openAdminNav(page);
    for (const name of ["Visão geral", "Solicitações", "Imóveis", "Contatos", "Avaliações"]) {
      await expect(nav.getByRole("link", { name: new RegExp(name) })).toBeVisible();
    }
    await nav.getByRole("link", { name: /Visão geral/ }).click();

    // Indicadores calculados no banco, filtrados pelo imóvel do teste
    await page.goto(`/admin?periodo=7&imovel=${property.id}`);
    const kpis = page.getByRole("region", { name: "Indicadores do período" });
    await expect(kpis).toContainText("Solicitações recebidas");
    const kpi = (name: string) =>
      kpis.getByRole("group", { name, exact: true }).locator("[data-valor]");
    await expect(kpi("Solicitações recebidas")).toHaveText("2");
    await expect(kpi("Taxa de aprovação")).toHaveText("50%");
    await expect(kpi("Contatos recebidos")).toHaveText("1");
    await expect(kpi("Valor estimado aprovado")).toContainText("R$");
    await expect(kpis).toContainText("Contatos recebidos");
    await expect(page.getByRole("img", { name: /Solicitações e contatos por dia/ })).toBeVisible();
    await expect(page.getByRole("region", { name: "Imóveis mais procurados" })).toContainText(
      property.title,
    );
    await expect(page.getByRole("region", { name: "Pendências" })).toContainText(
      `Hugo Pendente ${run}`,
    );
    await expectNoHorizontalScroll(page);

    // Solicitações: busca, filtro por imóvel e ordenação
    await page.goto("/admin/solicitacoes?situacao=todas");
    const toolbar = page.getByRole("search");
    await toolbar.getByLabel("Buscar por nome, e-mail ou telefone").fill(`Pendente ${run}`);
    await toolbar.getByRole("button", { name: "Filtrar" }).click();
    await expect(page).toHaveURL(/q=Pendente/);
    const table = page.getByRole("table");
    await expect(table.getByRole("link", { name: `Hugo Pendente ${run}` })).toBeVisible();
    await expect(table.getByRole("link", { name: `Gabi Aprovada ${run}` })).toHaveCount(0);

    await page.goto(`/admin/solicitacoes?situacao=todas&imovel=${property.id}`);
    await expect(table.getByRole("row")).toHaveCount(3); // cabeçalho + 2
    await table.getByRole("link", { name: /^Hóspede/ }).click();
    await expect(table.getByRole("columnheader", { name: /Hóspede/ })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    await expect(table.getByRole("row").nth(1)).toContainText(`Gabi Aprovada ${run}`);
    await table.getByRole("link", { name: /^Hóspede/ }).click();
    await expect(table.getByRole("row").nth(1)).toContainText(`Hugo Pendente ${run}`);

    // Nada encontrado: estado vazio com explicação
    await page.goto(`/admin/solicitacoes?situacao=todas&q=nada-${run}`);
    await expect(page.getByText("Nenhuma solicitação encontrada")).toBeVisible();

    // CSV com os mesmos filtros da tela
    const csv = await page.request.get(
      `/admin/exportar/solicitacoes?situacao=todas&imovel=${property.id}`,
    );
    expect(csv.status()).toBe(200);
    expect(csv.headers()["content-type"]).toContain("text/csv");
    expect(csv.headers()["content-disposition"]).toMatch(/attachment; filename="solicitacoes-/);
    const text = await csv.text();
    expect(text.startsWith("﻿Protocolo;Hóspede;E-mail")).toBe(true);
    expect(text).toContain(`Gabi Aprovada ${run}`);
    expect(text).toContain(`Hugo Pendente ${run}`);
    expect(text.trim().split("\r\n")).toHaveLength(3);

    // Imóveis: busca e filtro de situação
    await page.goto(`/admin/imoveis?q=${encodeURIComponent(`painel geral ${run}`)}`);
    await expect(page.getByRole("row").filter({ hasText: property.title })).toBeVisible();
    await page.goto(`/admin/imoveis?situacao=draft&q=${encodeURIComponent(`painel geral ${run}`)}`);
    await expect(page.getByText("Nenhum imóvel encontrado")).toBeVisible();

    // Contatos: excluir pede confirmação; cancelar mantém, confirmar apaga
    await page.goto(
      `/admin/contatos?situacao=todos&q=${encodeURIComponent(`Iara Contato ${run}`)}`,
    );
    const card = page.getByRole("article").filter({ hasText: `Iara Contato ${run}` });
    await expect(card).toContainText("Pedido de visita");
    await card.getByRole("button", { name: /Excluir mensagem/ }).click();
    await answerConfirm(page, "Cancelar");
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: /Excluir mensagem/ }).click();
    await answerConfirm(page, "Excluir mensagem", "não pode ser desfeita");
    await expect(page.getByRole("status").filter({ hasText: "Mensagem excluída." })).toBeVisible();
    await expect(card).toHaveCount(0);
    const { data: left } = await adminApi()
      .from("inquiries")
      .select("id")
      .eq("property_id", property.id);
    expect(left).toHaveLength(0);

    // Página além do fim (link antigo): vai para a última página válida
    await page.goto(`/admin/imoveis?pagina=9999&q=${encodeURIComponent(`painel geral ${run}`)}`);
    await expect(page).not.toHaveURL(/pagina=9999/);
    await expect(page.getByRole("row").filter({ hasText: property.title })).toBeVisible();
  } finally {
    await cleanup(property.id);
  }
});

test("menu recolhido fica salvo no computador", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "menu lateral fixo só no computador");
  await loginAsAdmin(page, await createAdminWithTotp());
  await page.getByRole("button", { name: "Recolher menu" }).click();
  await expect(page.getByRole("button", { name: "Expandir menu" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.reload();
  await expect(page.getByRole("button", { name: "Expandir menu" })).toBeVisible();
  // Recolhido, os links continuam com nome acessível
  await expect(
    page.getByRole("navigation", { name: "Painel" }).getByRole("link", { name: /Imóveis/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Expandir menu" }).click();
  await expect(page.getByRole("button", { name: "Recolher menu" })).toBeVisible();
});

test("painel sem violações WCAG 2.1 AA", async ({ page }) => {
  test.setTimeout(90_000);
  const { property } = await seed();
  try {
    await loginAsAdmin(page, await createAdminWithTotp());
    for (const url of [
      `/admin?imovel=${property.id}`,
      "/admin/solicitacoes?situacao=todas",
      "/admin/imoveis",
      "/admin/contatos?situacao=todos",
      "/admin/avaliacoes",
      `/admin/imoveis/${property.id}`,
    ]) {
      await page.goto(url);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations, url).toEqual([]);
      await expectNoHorizontalScroll(page);
    }
  } finally {
    await cleanup(property.id);
  }
});

test("exporta mais de 1.000 registros completos (sem o corte do PostgREST)", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "dados pesados: basta um tamanho de tela");
  test.setTimeout(120_000);
  const marker = `lote-${randomUUID().slice(0, 8)}`;
  const api = adminApi();
  const total = 1250;
  const rows = Array.from({ length: total }, (_, i) => ({
    kind: "contact" as const,
    name: `Exportação ${marker} ${String(i).padStart(4, "0")}`,
    email: `${marker}-${i}@teste.local`,
    message: `Mensagem ${i}`,
    privacy_consent_at: new Date().toISOString(),
  }));
  for (let i = 0; i < rows.length; i += 500) {
    await api
      .from("inquiries")
      .insert(rows.slice(i, i + 500))
      .throwOnError();
  }
  try {
    await loginAsAdmin(page, await createAdminWithTotp());
    const csv = await page.request.get(`/admin/exportar/contatos?situacao=todos&q=${marker}`);
    expect(csv.status()).toBe(200);
    const lines = (await csv.text()).trim().split("\r\n");
    expect(lines).toHaveLength(total + 1); // cabeçalho + todas as linhas
    const names = new Set(lines.slice(1).map((line) => line.split(";")[1]));
    expect(names.size).toBe(total); // sem repetidas
    expect(names.has(`Exportação ${marker} 1249`)).toBe(true);
  } finally {
    await api.from("inquiries").delete().like("email", `${marker}-%`);
  }
});

test("excluir o último imóvel da última página volta para uma página válida", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "fluxo de dados: basta um tamanho de tela");
  test.setTimeout(120_000);
  const marker = `pag${randomUUID().slice(0, 6)}`;
  const api = adminApi();
  const { data } = await api
    .from("properties")
    .insert(
      Array.from({ length: 21 }, (_, i) => ({
        slug: `${marker}-${i}`,
        title: `Paginação ${marker} ${String(i).padStart(2, "0")}`,
        property_type: "casa" as const,
        city: "Bertioga",
      })),
    )
    .select("id")
    .throwOnError();
  const ids = data!.map((row) => row.id);
  try {
    await loginAsAdmin(page, await createAdminWithTotp());
    // Ordem por título: o 21º (…20) fica sozinho na página 2.
    await page.goto(`/admin/imoveis?q=${marker}&ordem=titulo&dir=asc&pagina=2`);
    const rows = page.getByRole("row").filter({ hasText: `Paginação ${marker}` });
    await expect(rows).toHaveCount(1);
    await rows.getByRole("button", { name: /Excluir/ }).click();
    await answerConfirm(page, "Excluir definitivamente");
    await expect(page.getByRole("status").filter({ hasText: "Imóvel excluído." })).toBeVisible();
    await expect(page).not.toHaveURL(/pagina=2/);
    await expect(page).toHaveURL(new RegExp(`q=${marker}`));
    await expect(rows).toHaveCount(20);
    await expect(page.getByText("1–20 de 20")).toBeVisible();
  } finally {
    await api.from("properties").delete().in("id", ids);
  }
});

test("próximas chegadas aparecem mesmo com 30+ estadias em andamento", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "fluxo de dados: basta um tamanho de tela");
  test.setTimeout(120_000);
  const marker = `cheg${randomUUID().slice(0, 6)}`;
  const api = adminApi();
  const { data } = await api
    .from("properties")
    .insert(
      Array.from({ length: 32 }, (_, i) => ({
        slug: `${marker}-${i}`,
        title: `Chegadas ${marker} ${i}`,
        property_type: "casa" as const,
        city: "Bertioga",
      })),
    )
    .select("id")
    .throwOnError();
  const ids = data!.map((row) => row.id);
  const booking = (propertyId: string, from: number, to: number, name: string) => ({
    property_id: propertyId,
    rental_mode: "monthly" as const,
    guest_name: name,
    guest_email: `${marker}@teste.local`,
    guest_phone: "13999999999",
    stay: `[${isoInDays(from)},${isoInDays(to)})`,
    guests_count: 2,
    quote_snapshot: {},
    quoted_total: 1,
    privacy_consent_at: new Date().toISOString(),
    status: "approved" as const,
  });
  try {
    // 31 estadias que começaram há 5 dias e uma chegada amanhã.
    await api
      .from("booking_requests")
      .insert([
        ...ids.slice(0, 31).map((id, i) => booking(id, -5, 30, `Em andamento ${marker} ${i}`)),
        booking(ids[31]!, 1, 31, `Chega amanhã ${marker}`),
      ])
      .throwOnError();
    await loginAsAdmin(page, await createAdminWithTotp());
    const arrivals = page.getByRole("region", { name: "Próximas chegadas" });
    await expect(arrivals).toContainText(`Chega amanhã ${marker}`);
    await expect(arrivals).not.toContainText(`Em andamento ${marker}`);
  } finally {
    await api.from("booking_requests").delete().in("property_id", ids);
    await api.from("properties").delete().in("id", ids);
  }
});

test("filtro de imóvel da visão geral: válido, inválido e inexistente", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "fluxo de dados: basta um tamanho de tela");
  test.setTimeout(90_000);
  const { property } = await seed();
  try {
    await loginAsAdmin(page, await createAdminWithTotp());
    const warning = page
      .getByRole("alert")
      .filter({ hasText: /filtro de imóvel|imóvel do filtro/ });

    await page.goto(`/admin?imovel=${property.id}`);
    await expect(
      page.getByText(new RegExp(`^Últimos 30 dias: .* · ${property.title}$`)),
    ).toBeVisible();
    await expect(page.getByLabel("Imóvel")).toHaveValue(property.id);
    await expect(warning).toHaveCount(0);

    await page.goto("/admin?imovel=nao-e-um-uuid");
    await expect(warning).toContainText("inválido e foi ignorado");
    await expect(page.getByText(/^Últimos 30 dias: .* · todos os imóveis$/)).toBeVisible();

    await page.goto(`/admin?imovel=${randomUUID()}`);
    await expect(warning).toContainText("não existe");
    await expect(
      page
        .getByRole("region", { name: "Indicadores do período" })
        .getByRole("group", { name: "Solicitações recebidas", exact: true })
        .locator("[data-valor]"),
    ).toHaveText("0");
  } finally {
    await cleanup(property.id);
  }
});
