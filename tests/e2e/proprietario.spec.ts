import { randomUUID } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { addDaysISO, formatDateISO, todayInSaoPaulo } from "@/lib/format";

import { answerConfirm, loginAsAdmin } from "./support/admin";
import { createOwnerWithTotp, loginAsOwner, openAccessLink, openOwnerNav } from "./support/owner";
import { adminApi, createAdminWithTotp, loginAsGuest, uniqueEmail } from "./support/users";

/**
 * Portal do proprietário com usuários reais do Supabase local: dois
 * proprietários com imóveis diferentes, um sem imóveis, hóspede, visitante
 * e admin. Os dados de cada execução levam um marcador único.
 */

const day = (n: number) => addDaysISO(todayInSaoPaulo(), n);

type Owner = Awaited<ReturnType<typeof createOwnerWithTotp>>;

async function noHorizontalScroll(page: Page) {
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
}

test.describe("portal do proprietário", () => {
  const run = randomUUID().slice(0, 8);
  const ids = {
    a1: randomUUID(), // publicado, do proprietário A
    a2: randomUUID(), // rascunho, do proprietário A
    b1: randomUUID(), // publicado, do proprietário B
  };
  const bookings = {
    pending: randomUUID(),
    upcoming: randomUUID(),
    current: randomUUID(),
    cancelled: randomUUID(),
    ofB: randomUUID(),
  };
  let ownerA: Owner;
  let ownerB: Owner;
  let ownerEmpty: Owner;

  test.beforeAll(async () => {
    test.setTimeout(60_000);
    const api = adminApi();
    [ownerA, ownerB, ownerEmpty] = await Promise.all([
      createOwnerWithTotp("dono-a"),
      createOwnerWithTotp("dono-b"),
      createOwnerWithTotp("dono-sem"),
    ]);

    const published = {
      property_type: "casa" as const,
      city: "Bertioga",
      neighborhood: "Riviera de São Lourenço",
      offers_seasonal: true,
      max_guests: 8,
      bedrooms: 4,
      suites: 2,
      status: "published" as const,
      published_at: new Date().toISOString(),
    };
    await api
      .from("properties")
      .insert(
        [
          {
            ...published,
            id: ids.a1,
            slug: `casa-a-${run}`,
            title: `Casa A ${run}`,
            nightly_price: 1200,
            min_nights: 2,
          },
          {
            ...published,
            id: ids.b1,
            slug: `casa-b-${run}`,
            title: `Casa B ${run}`,
            nightly_price: 900,
          },
          {
            id: ids.a2,
            slug: `rascunho-a-${run}`,
            title: `Rascunho A ${run}`,
            property_type: "apartamento" as const,
            city: "Ubatuba",
            status: "draft" as const,
          },
        ],
        { defaultToNull: false },
      )
      .throwOnError();
    await api
      .from("seasonal_rates")
      .insert({
        property_id: ids.a1,
        label: `Temporada ${run}`,
        period: `[${day(50)},${day(55)})`,
        nightly_price: 2500,
        min_nights: 4,
      })
      .throwOnError();
    await api
      .from("property_fees")
      .insert({ property_id: ids.a2, label: "Limpeza", calc: "fixed", amount: 350 })
      .throwOnError();

    const booking = (
      id: string,
      propertyId: string,
      name: string,
      from: number,
      to: number,
      status: "pending" | "approved" | "cancelled",
    ) => ({
      id,
      property_id: propertyId,
      rental_mode: "seasonal" as const,
      guest_name: name,
      guest_email: `hospede-${run}@teste.local`,
      guest_phone: "13999990000",
      stay: `[${day(from)},${day(to)})`,
      guests_count: 3,
      quote_snapshot: {
        lines: [
          { label: "Diária", nights: to - from, unit_price: 1200, amount: 1200 * (to - from) },
        ],
        subtotal: 1200 * (to - from),
        fees: [{ label: "Limpeza", amount: 300 }],
        total: 1200 * (to - from) + 300,
        deposits: [],
      },
      quoted_total: 1200 * (to - from) + 300,
      privacy_consent_at: new Date().toISOString(),
      status,
    });
    await api
      .from("booking_requests")
      .insert([
        booking(bookings.pending, ids.a1, `Maria Clara Souza ${run}`, 10, 14, "pending"),
        booking(bookings.upcoming, ids.a1, `João Pedro ${run}`, 20, 25, "approved"),
        booking(bookings.current, ids.a1, `Ana Lúcia ${run}`, -1, 2, "approved"),
        booking(bookings.cancelled, ids.a1, `Carla Dias ${run}`, 30, 32, "cancelled"),
        booking(bookings.ofB, ids.b1, `Bruno Lima ${run}`, 5, 8, "approved"),
      ])
      .throwOnError();
    await api
      .from("calendar_blocks")
      .insert([
        {
          property_id: ids.a1,
          stay: `[${day(20)},${day(25)})`,
          kind: "booking",
          booking_request_id: bookings.upcoming,
        },
        {
          property_id: ids.a1,
          stay: `[${day(-1)},${day(2)})`,
          kind: "booking",
          booking_request_id: bookings.current,
        },
        {
          property_id: ids.b1,
          stay: `[${day(5)},${day(8)})`,
          kind: "booking",
          booking_request_id: bookings.ofB,
        },
      ])
      .throwOnError();
    await api
      .from("property_owners")
      .insert([
        { property_id: ids.a1, owner_id: ownerA.id },
        { property_id: ids.a2, owner_id: ownerA.id },
        { property_id: ids.b1, owner_id: ownerB.id },
      ])
      .throwOnError();
  });

  test.afterAll(async () => {
    const api = adminApi();
    await api.from("booking_requests").delete().in("id", Object.values(bookings));
    await api.from("properties").delete().in("id", Object.values(ids));
    for (const owner of [ownerA, ownerB, ownerEmpty]) {
      if (owner) await api.auth.admin.deleteUser(owner.id);
    }
  });

  test("visitante e hóspede não entram; proprietário precisa do código do celular", async ({
    page,
  }) => {
    await page.goto("/proprietario/reservas");
    await expect(page).toHaveURL(/\/entrar\?next=%2Fproprietario$/);

    await loginAsGuest(page, uniqueEmail("hospede"));
    await page.goto("/proprietario");
    await expect(page).toHaveURL(/\/entrar\?next=%2Fproprietario$/);
    await page.context().clearCookies();

    // Só o link do e-mail (primeiro fator) não basta.
    await openAccessLink(page, ownerA.email);
    await page.goto(`/proprietario/imoveis/${ids.a1}`);
    await expect(page).toHaveURL(/\/proprietario\/verificacao$/);
    await expect(page.getByRole("heading", { name: "Verificação em duas etapas" })).toBeVisible();
    // E o painel admin continua fechado para o proprietário.
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/entrar$/);
  });

  test("proprietário sem imóveis vê o aviso, sem dados de ninguém", async ({ page }) => {
    await loginAsOwner(page, ownerEmpty);
    await expect(page.getByText("Nenhum imóvel vinculado à sua conta ainda")).toBeVisible();
    await page.goto("/proprietario/reservas");
    await expect(page.getByText("Nenhum imóvel vinculado ainda")).toBeVisible();
    await expect(page.getByText(run)).toHaveCount(0);
  });

  test("visão geral com os números reais do banco", async ({ page }) => {
    await loginAsOwner(page, ownerA);
    const card = (label: string) =>
      page.getByRole("group", { name: label, exact: true }).locator("[data-valor]");
    await expect(card("Imóveis vinculados")).toHaveText("2");
    await expect(card("Reservas futuras")).toHaveText("1");
    await expect(card("Hospedagens em andamento")).toHaveText("1");
    await expect(card("Aguardando aprovação")).toHaveText("1");
    await expect(card("Reservas concluídas")).toHaveText("0");
    await expect(card("Reservas canceladas")).toHaveText("1");

    const arrivals = page.getByRole("region", { name: "Próximas entradas" });
    await expect(arrivals).toContainText(`Casa A ${run}`);
    await expect(arrivals).toContainText("João");
    await expect(page.getByRole("region", { name: "Próximas saídas" })).toContainText("Ana");
    // Só o primeiro nome; nunca e-mail, telefone ou nome completo.
    await expect(page.locator("main")).not.toContainText(`hospede-${run}@teste.local`);
    await expect(page.locator("main")).not.toContainText("Souza");
    await expect(page.locator("main")).not.toContainText(`Casa B ${run}`);
    await expect(page.getByRole("region", { name: "Ocupação dos próximos 30 dias" })).toContainText(
      "Próximas 30 noites: 7 reservadas",
    );
  });

  test("meus imóveis: só os vinculados, inclusive rascunho, com tarifas e regras", async ({
    page,
  }) => {
    await loginAsOwner(page, ownerA);
    const nav = await openOwnerNav(page);
    await nav.getByRole("link", { name: "Meus imóveis" }).click();
    await expect(page).toHaveURL(/\/proprietario\/imoveis$/);
    await expect(page.getByRole("link", { name: new RegExp(`Casa A ${run}`) })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(`Rascunho A ${run}`) })).toBeVisible();
    await expect(page.getByText(`Casa B ${run}`)).toHaveCount(0);

    await page.getByRole("link", { name: new RegExp(`Rascunho A ${run}`) }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Rascunho A ${run}`);
    await expect(page.getByText("Rascunho", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Tarifas e regras" })).toContainText("Limpeza");

    await page.goto(`/proprietario/imoveis/${ids.a1}`);
    await expect(page.getByRole("region", { name: "Tarifas e regras" })).toContainText(
      `Temporada ${run}`,
    );
  });

  test("ID de outro proprietário na URL não abre nada", async ({ page }) => {
    await loginAsOwner(page, ownerA);
    for (const path of [
      `/proprietario/imoveis/${ids.b1}`,
      `/proprietario/reservas/${bookings.ofB}`,
      `/proprietario/imoveis/${randomUUID()}`,
      "/proprietario/imoveis/nao-e-um-id",
    ]) {
      // Com a tela de carregamento, o Next responde 200 com a página de "não encontrada".
      await page.goto(path);
      await expect(
        page.getByRole("heading", { name: "Página não encontrada" }),
        path,
      ).toBeVisible();
      await expect(page.getByText(`Casa B ${run}`)).toHaveCount(0);
      await expect(page.getByText("Bruno")).toHaveCount(0);
    }
    // Calendário e filtro de reservas ignoram o imóvel de B.
    await page.goto(`/proprietario/calendario?imovel=${ids.b1}`);
    await expect(page.getByText(`Casa B ${run}`)).toHaveCount(0);
    await page.goto(`/proprietario/reservas?imovel=${ids.b1}`);
    await expect(page.getByText("Bruno")).toHaveCount(0);
    await expect(page.getByRole("link", { name: `Casa A ${run}` }).first()).toBeVisible();
  });

  test("reservas: etapas, filtro e valores identificados como estimativa", async ({ page }) => {
    await loginAsOwner(page, ownerA);
    await page.goto("/proprietario/reservas");
    const table = page.getByRole("table");
    await expect(table.getByRole("row")).toHaveCount(5); // cabeçalho + 4
    await expect(table).toContainText("Aguardando aprovação");
    await expect(table).toContainText("Hospedagem em andamento");
    await expect(table).toContainText("Cancelada");
    await expect(table).not.toContainText("Bruno");

    await page.getByRole("link", { name: "Aguardando aprovação" }).click();
    await expect(table.getByRole("row")).toHaveCount(2);
    await expect(table).toContainText("Maria");

    await page.goto(`/proprietario/reservas/${bookings.upcoming}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Reserva de João");
    const estimate = page.getByRole("region", { name: "Valores estimados" });
    await expect(estimate).toContainText("estimativa");
    await expect(estimate).toContainText("Total estimado");
    await expect(page.locator("main")).not.toContainText(`hospede-${run}@teste.local`);
    await expect(page.locator("main")).not.toContainText("13999990000");
  });

  test("pedidos: alteração e bloqueio gravados no banco, aprovação pelo admin", async ({
    page,
    browser,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "fluxo de dados: basta um tamanho de tela");
    test.setTimeout(120_000);
    const api = adminApi();
    await loginAsOwner(page, ownerA);

    // Pedido de alteração do anúncio.
    await page.goto(`/proprietario/imoveis/${ids.a1}`);
    const message = `Trocar a foto da varanda ${run}`;
    await page.getByLabel("O que você quer alterar?").fill(message);
    await page.getByRole("button", { name: "Enviar pedido de alteração" }).click();
    await expect(page.getByText("Pedido enviado. O anúncio só muda")).toBeVisible();
    await expect
      .poll(
        async () => (await api.from("owner_requests").select("status").eq("message", message)).data,
      )
      .toEqual([{ status: "pending" }]);
    // O anúncio não mudou.
    const { data: title } = await api.from("properties").select("title").eq("id", ids.a1).single();
    expect(title!.title).toBe(`Casa A ${run}`);

    // Desiste do pedido.
    await page
      .getByRole("listitem")
      .filter({ hasText: message })
      .getByRole("button", { name: /Cancelar pedido/ })
      .click();
    await answerConfirm(page, "Cancelar pedido");
    await expect
      .poll(
        async () => (await api.from("owner_requests").select("status").eq("message", message)).data,
      )
      .toEqual([{ status: "cancelled" }]);

    // Bloqueio sobre datas reservadas é recusado.
    await page.goto(`/proprietario/calendario?imovel=${ids.a1}`);
    const form = page.getByRole("region", { name: "Pedir bloqueio para uso próprio" });
    await form.getByLabel("Imóvel").selectOption(ids.a1);
    await form.getByLabel("De (primeira noite)").fill(day(21));
    await form.getByLabel("Até (dia da saída)").fill(day(23));
    await form.getByRole("button", { name: "Pedir bloqueio" }).click();
    await expect(form.getByText("Essas datas já estão ocupadas")).toBeVisible();

    // Bloqueio em datas livres fica pendente até o admin aprovar.
    await form.getByLabel("De (primeira noite)").fill(day(40));
    await form.getByLabel("Até (dia da saída)").fill(day(43));
    await form.getByLabel("Motivo (opcional)").fill(`Férias ${run}`);
    await form.getByRole("button", { name: "Pedir bloqueio" }).click();
    await expect(form.getByText("Pedido enviado")).toBeVisible();
    await expect
      .poll(
        async () =>
          (
            await api
              .from("calendar_blocks")
              .select("id")
              .eq("property_id", ids.a1)
              .eq("kind", "owner")
          ).data?.length,
      )
      .toBe(0);

    // Admin aprova pela página de proprietários.
    const adminContext = await browser.newContext();
    const admin = await adminContext.newPage();
    await loginAsAdmin(admin, await createAdminWithTotp());
    await admin.goto("/admin/proprietarios");
    const pending = admin
      .getByRole("region", { name: "Pedidos pendentes" })
      .getByRole("listitem")
      .filter({ hasText: `Férias ${run}` });
    await pending.getByLabel("Resposta ao proprietário (opcional)").fill("Boas férias!");
    await pending.getByRole("button", { name: "Aprovar e bloquear as datas" }).click();
    // A lista recarrega e o pedido sai dos pendentes: a prova é o banco.
    await expect
      .poll(
        async () =>
          (
            await api
              .from("calendar_blocks")
              .select("kind, stay")
              .eq("property_id", ids.a1)
              .eq("kind", "owner")
          ).data,
      )
      .toEqual([{ kind: "owner", stay: `[${day(40)},${day(43)})` }]);
    await expect(pending).toHaveCount(0);
    await adminContext.close();

    // O proprietário vê o bloqueio no calendário e a resposta.
    const month = day(40).slice(0, 7);
    await page.goto(`/proprietario/calendario?imovel=${ids.a1}&mes=${month}`);
    await expect(page.locator(`[data-dia="${day(41)}"]`)).toHaveAttribute("data-situacao", "owner");
    await expect(page.getByText("Boas férias!")).toBeVisible();
  });

  test("calendário mostra reservas, pedidos pendentes, tarifa sazonal e estadia mínima", async ({
    page,
  }) => {
    await loginAsOwner(page, ownerA);
    await page.goto(`/proprietario/calendario?imovel=${ids.a1}&mes=${day(20).slice(0, 7)}`);
    await expect(page.locator(`[data-dia="${day(21)}"]`)).toHaveAttribute(
      "data-situacao",
      "booking",
    );
    await page.goto(`/proprietario/calendario?imovel=${ids.a1}&mes=${day(51).slice(0, 7)}`);
    const seasonal = page.locator(`[data-dia="${day(51)}"]`);
    await expect(seasonal).toHaveAttribute("data-situacao", "free");
    await expect(seasonal).toContainText("2.500");
    await expect(seasonal).toContainText("mín. 4");
    await page.goto(`/proprietario/calendario?imovel=${ids.a1}&mes=${day(11).slice(0, 7)}`);
    await expect(page.locator(`[data-dia="${day(11)}"]`)).toContainText(
      "com pedido aguardando aprovação",
    );
    await expect(
      page.getByText(`${formatDateISO(day(10))} a ${formatDateISO(day(14))}`),
    ).toBeVisible();
  });

  test("perfil grava nome e telefone no banco", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "fluxo de dados: basta um tamanho de tela");
    await loginAsOwner(page, ownerB);
    await page.goto("/proprietario/perfil");
    await page.getByLabel("Nome completo").fill(`Dono B ${run}`);
    await page.getByLabel("Telefone (com DDD)").fill("(13) 98888-7777");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Dados salvos.")).toBeVisible();
    const { data } = await adminApi()
      .from("profiles")
      .select("full_name, phone")
      .eq("id", ownerB.id)
      .single();
    expect(data).toEqual({ full_name: `Dono B ${run}`, phone: "13988887777" });
  });

  test("admin dá e remove acesso pelo e-mail", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "fluxo de dados: basta um tamanho de tela");
    const api = adminApi();
    const email = uniqueEmail("novo-dono");
    await loginAsAdmin(page, await createAdminWithTotp());
    await page.goto(`/admin/imoveis/${ids.b1}#proprietarios`);
    const section = page.getByRole("region", { name: "Proprietários" });

    // Sem a confirmação, nada é gravado.
    await section.getByLabel("E-mail do proprietário").fill(email);
    await section.getByRole("button", { name: "Dar acesso ao portal" }).click();
    await expect(section.getByText("Confirme que o e-mail é do proprietário")).toBeVisible();

    await section.getByLabel(/Confirmo que este e-mail/).check();
    await section.getByRole("button", { name: "Dar acesso ao portal" }).click();
    await expect(section.getByText(`${email} vinculado a este imóvel. Conta criada`)).toBeVisible();
    const { data: users } = await api.auth.admin.listUsers({ perPage: 1000 });
    const created = users.users.find((u) => u.email === email)!;
    expect(created.app_metadata.role).toBe("owner");
    await expect
      .poll(
        async () =>
          (await api.from("property_owners").select("owner_id").eq("property_id", ids.b1)).data
            ?.length,
      )
      .toBe(2);

    await section
      .getByRole("listitem")
      .filter({ hasText: email })
      .getByRole("button", { name: /Remover acesso/ })
      .click();
    await answerConfirm(page, "Remover acesso");
    await expect
      .poll(
        async () =>
          (await api.from("property_owners").select("owner_id").eq("owner_id", created.id)).data
            ?.length,
      )
      .toBe(0);
    await api.auth.admin.deleteUser(created.id);
  });

  test("sem violações WCAG 2.1 AA e sem rolagem lateral", async ({ page }) => {
    await loginAsOwner(page, ownerA);
    for (const path of [
      "/proprietario",
      `/proprietario/imoveis/${ids.a1}`,
      `/proprietario/calendario?imovel=${ids.a1}`,
      "/proprietario/reservas",
      "/proprietario/financeiro",
      "/proprietario/perfil",
    ]) {
      await page.goto(path);
      await noHorizontalScroll(page);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations, path).toEqual([]);
    }
  });
});
