import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { loginAsAdmin } from "./support/admin";
import { anonApi, createAdminWithTotp } from "./support/users";

const FOTO_REAL = path.join(process.cwd(), "media/recebidas/imovel-01/sala-jantar.jpg");

function isoInDays(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function status(page: Page, text: string | RegExp) {
  return page.getByRole("status").filter({ hasText: text });
}

async function expectNoHorizontalScroll(page: Page) {
  const screenWidth = page.viewportSize()!.width;
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width, "a página não deve ter rolagem horizontal").toBeLessThanOrEqual(screenWidth);
}

function alert(page: Page, text: string | RegExp) {
  return page.getByRole("alert").filter({ hasText: text });
}

test("visitante não abre o cadastro de imóveis", async ({ page }) => {
  await page.goto("/admin/imoveis/novo");
  await expect(page).toHaveURL(/\/admin\/entrar$/);
});

test("admin cria, completa, publica e arquiva um imóvel", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const admin = await createAdminWithTotp();
  const title = `Apartamento de teste ${testInfo.project.name} ${Date.now()}`;

  await loginAsAdmin(page, admin);
  await page
    .getByRole("navigation", { name: "Painel" })
    .getByRole("link", { name: "Imóveis" })
    .click();
  await page.getByRole("link", { name: "Novo imóvel" }).click();

  // Criação
  await page.getByLabel("Título do anúncio").fill(title);
  await page.getByLabel("Tipo").selectOption("apartamento");
  await page.getByRole("button", { name: "Criar rascunho" }).click();
  await expect(page).toHaveURL(/\/admin\/imoveis\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByText("Rascunho", { exact: true })).toBeVisible();
  const propertyId = page.url().split("/").pop()!;

  // Publicar ainda não é possível
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(alert(page, "Para publicar, falta")).toBeVisible();

  // Dados gerais: validação e salvamento
  await page.getByRole("checkbox", { name: "Aluguel por temporada (1 a 29 noites)" }).check();
  await page.getByRole("checkbox", { name: "Venda" }).check();
  await page.getByLabel("Diária base (R$)").fill("850,00");
  await page.getByLabel("Capacidade (hóspedes)").fill("5");
  await page.getByRole("button", { name: "Salvar dados gerais" }).click();
  await expect(page.getByText("Informe o preço para oferecer venda.")).toBeVisible();
  // O que foi digitado continua no formulário depois do erro.
  await expect(page.getByLabel("Diária base (R$)")).toHaveValue("850,00");
  await expect(page.getByLabel("Capacidade (hóspedes)")).toHaveValue("5");

  await page.getByRole("checkbox", { name: "Venda" }).uncheck();
  await page.getByLabel("Região (linha da costa)").selectOption("riviera-de-sao-lourenco");
  await page.getByRole("button", { name: "Salvar dados gerais" }).click();
  await expect(status(page, "Dados gerais salvos.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Região (linha da costa)")).toHaveValue("riviera-de-sao-lourenco");

  // Foto real do imóvel 01
  await page.getByLabel("Foto (JPG, PNG ou WebP)").setInputFiles(FOTO_REAL);
  await page
    .getByLabel("Descrição da foto (texto alternativo)")
    .fill("Sala de jantar com mesa redonda e espelho");
  await page.getByRole("button", { name: "Enviar foto" }).click();
  await expect(status(page, "Foto adicionada.")).toBeVisible({ timeout: 30_000 });
  const foto = page.getByRole("img", { name: "Sala de jantar com mesa redonda e espelho" });
  await expect(foto).toBeVisible();
  await expect
    .poll(() => foto.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  await expect(page.getByText("Capa", { exact: true })).toBeVisible();

  // Tarifa sazonal e sobreposição
  const tarifa = page.locator("#tarifas");
  for (const attempt of [1, 2]) {
    await tarifa.getByLabel("Nome").fill("Réveillon");
    await tarifa.getByLabel("Primeiro dia").fill(isoInDays(70));
    await tarifa.getByLabel("Último dia").fill(isoInDays(75));
    await tarifa.getByLabel("Diária (R$)").fill("2.000");
    await tarifa.getByLabel("Mínimo de noites").fill("5");
    await tarifa.getByRole("button", { name: "Adicionar tarifa" }).click();
    if (attempt === 1) {
      await expect(status(page, 'Tarifa "Réveillon" adicionada.')).toBeVisible();
      await expect(tarifa.getByRole("cell", { name: "R$ 2.000,00" })).toBeVisible();
    } else {
      await expect(alert(page, "Já existe uma tarifa nesse período")).toBeVisible();
    }
  }

  // Taxa
  const taxas = page.locator("#taxas");
  await taxas.getByLabel("Nome").fill("Limpeza");
  await taxas.getByLabel("Valor (R$ ou %)").fill("250");
  await taxas.getByRole("button", { name: "Adicionar taxa" }).click();
  await expect(taxas.getByRole("cell", { name: "Limpeza", exact: true })).toBeVisible();
  await expectNoHorizontalScroll(page);

  // Comodidades
  await page.getByRole("checkbox", { name: "Wi-Fi" }).check();
  await page.getByRole("checkbox", { name: "Piscina" }).check();
  await page.getByRole("button", { name: "Salvar comodidades" }).click();
  await expect(status(page, "Comodidades salvas.")).toBeVisible();

  // Localização privada
  await page.getByLabel("Latitude exata").fill("-23,8012");
  await page.getByLabel("Longitude exata").fill("-46,0123");
  await page.getByRole("button", { name: "Salvar localização" }).click();
  await expect(status(page, "Localização e anotações salvas.")).toBeVisible();
  await expect(page.getByText("ainda não definida")).toHaveCount(0);

  // Publicação: visitantes passam a ver o imóvel, nunca os dados privados
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(status(page, "Imóvel publicado.")).toBeVisible();
  await expect(page.getByText("Publicado", { exact: true })).toBeVisible();

  const visitante = anonApi();
  const publico = await visitante.from("properties").select("id, approx_lat").eq("id", propertyId);
  expect(publico.data).toHaveLength(1);
  expect(publico.data![0]!.approx_lat).not.toBe(-23.8012);
  expect(
    (await visitante.from("property_media").select("id").eq("property_id", propertyId)).data,
  ).toHaveLength(1);
  expect(
    (await visitante.from("property_private").select("*").eq("property_id", propertyId)).data ?? [],
  ).toHaveLength(0);

  // Arquivar: sai do site
  await page.getByRole("button", { name: "Arquivar" }).click();
  await expect(status(page, "Imóvel arquivado")).toBeVisible();
  await expect(page.getByText("Arquivado", { exact: true })).toBeVisible();
  expect((await visitante.from("properties").select("id").eq("id", propertyId)).data).toHaveLength(
    0,
  );

  // Excluir a foto remove também os arquivos do Storage
  const fotoUrl = await foto.getAttribute("src");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Excluir foto 1" }).click();
  await expect(page.getByText("Nenhuma foto ainda.")).toBeVisible();
  expect((await fetch(fotoUrl!)).status).toBeGreaterThanOrEqual(400);

  // Lista mostra o imóvel arquivado
  await page.getByRole("link", { name: "Voltar para imóveis" }).click();
  const linha = page.getByRole("row").filter({ hasText: title });
  await expect(linha.getByText("Arquivado")).toBeVisible();
  await expectNoHorizontalScroll(page);
});
