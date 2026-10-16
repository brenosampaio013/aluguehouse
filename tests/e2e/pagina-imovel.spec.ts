import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { stubMapTiles } from "./support/map";
import { adminApi } from "./support/users";

const run = randomUUID().slice(0, 6);
const slug = `imovel-teste-${run}`;
const draftSlug = `imovel-rascunho-${run}`;
const title = `Casa com piscina ${run}`;
const EXACT = { lat: -23.801234, lng: -46.012345 };
const FOTOS = [
  "sala-jantar",
  "cozinha",
  "quarto-casal",
  "quarto-beliche",
  "banheiro",
  "sala-jantar",
];

function isoInDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

test.describe("página do imóvel", () => {
  let id = "";
  const paths: string[] = [];

  test.beforeAll(async () => {
    const api = adminApi();
    const { data, error } = await api
      .from("properties")
      .insert({
        slug,
        title,
        summary: "Casa térrea perto da praia.",
        description: "Casa térrea com varanda.\nA 300 m da praia.",
        property_type: "casa",
        city: "Bertioga",
        neighborhood: "Riviera de São Lourenço",
        region: "riviera-de-sao-lourenco",
        bedrooms: 3,
        suites: 2,
        bathrooms: 3,
        max_guests: 6,
        parking_spots: 2,
        area_m2: 140,
        distance_to_beach_m: 300,
        offers_seasonal: true,
        offers_monthly: true,
        nightly_price: 1000,
        monthly_price: 18000,
        min_nights: 2,
        house_rules: "Não é permitido fumar.",
        status: "published",
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;
    id = data.id;

    await api.from("property_private").insert({
      property_id: id,
      full_address: "Rua Secreta, 123",
      exact_lat: EXACT.lat,
      exact_lng: EXACT.lng,
    });
    await api.from("property_fees").insert({
      property_id: id,
      label: "Limpeza",
      calc: "fixed",
      amount: 300,
      applies_to: "seasonal",
    });
    const amenities = await api.from("amenities").select("id").in("slug", ["piscina", "wi-fi"]);
    await api
      .from("property_amenities")
      .insert(amenities.data!.map((a) => ({ property_id: id, amenity_id: a.id })));
    await api
      .from("calendar_blocks")
      .insert({ property_id: id, stay: `[${isoInDays(40)},${isoInDays(45)})`, kind: "owner" });

    for (const [index, foto] of FOTOS.entries()) {
      const mediaId = randomUUID();
      const filePath = `${id}/${mediaId}/640.webp`;
      paths.push(filePath);
      await api.storage
        .from("property-media")
        .upload(
          filePath,
          readFileSync(path.join(process.cwd(), `media/recebidas/imovel-01/${foto}.jpg`)),
          { contentType: "image/jpeg" },
        );
      await api.from("property_media").insert({
        id: mediaId,
        property_id: id,
        kind: "image",
        storage_path: `${id}/${mediaId}`,
        width: 640,
        height: 480,
        alt_text: `Foto ${index + 1}: ${foto.replace("-", " ")}`,
        position: index,
        is_cover: index === 0,
        is_demo: index === 5,
      });
    }

    await api.from("properties").insert({
      slug: draftSlug,
      title: "Rascunho",
      property_type: "casa",
      city: "Bertioga",
      status: "draft",
    });
  });

  test.afterAll(async () => {
    const api = adminApi();
    await api.storage.from("property-media").remove(paths);
    await api.from("properties").delete().in("slug", [slug, draftSlug]);
  });

  test("mostra título, características, preços, descrição e comodidades", async ({ page }) => {
    await page.goto(`/imoveis/${slug}`);
    await expect(page).toHaveTitle(new RegExp(`^${title}`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.getByText("Casa em Riviera de São Lourenço, Bertioga")).toBeVisible();
    const fatos = page.getByRole("list", { name: "Características" });
    for (const fato of ["3 quartos", "2 suítes", "até 6 hóspedes", "140 m²", "300 m da praia"]) {
      await expect(fatos).toContainText(fato);
    }
    const painel = page.getByRole("complementary", { name: "Valores e contato" });
    await expect(painel).toContainText("R$ 1.000 por noite");
    await expect(painel).toContainText("R$ 18.000 por mês");
    await expect(painel).toContainText("mínimo de 2 noites");
    await expect(page.getByRole("region", { name: "Comodidades" })).toContainText("Piscina");
    await expect(page.getByText("Não é permitido fumar.")).toBeVisible();
  });

  test("galeria e janela com todas as fotos", async ({ page }) => {
    await page.goto(`/imoveis/${slug}`);
    await page.getByRole("button", { name: "Ver todas as fotos (6)" }).click();
    const dialog = page.getByRole("dialog", { name: "Todas as fotos" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("img")).toHaveCount(6);
    await expect(dialog.getByText("Foto ilustrativa")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    // Só aluguel: sem o selo de venda.
    await expect(page.getByText("CASA À VENDA")).toHaveCount(0);
  });

  test("a coordenada exata e o endereço nunca chegam ao navegador", async ({ page, request }) => {
    const html = await (await request.get(`/imoveis/${slug}`)).text();
    for (const secret of ["-23.801234", "-23,801234", "-46.012345", "-46,012345", "Rua Secreta"]) {
      expect(html).not.toContain(secret);
    }
    const { data } = await adminApi()
      .from("properties")
      .select("approx_lat, approx_lng")
      .eq("id", id)
      .single();
    expect(html).toContain(String(data!.approx_lat));

    await page.goto(`/imoveis/${slug}`);
    const rendered = await page.content();
    expect(rendered).not.toContain("-23.801234");
  });

  test("mapa da área aproximada carrega ao rolar até ele", async ({ page }) => {
    await stubMapTiles(page);
    await page.goto(`/imoveis/${slug}`);
    const mapa = page.getByRole("region", { name: /Mapa com a área aproximada do imóvel/ });
    // Longe da área visível, o MapLibre ainda não foi baixado.
    const box = await mapa.boundingBox();
    if (box && box.y > page.viewportSize()!.height + 400) {
      await expect(mapa).toHaveAttribute("data-map-status", "waiting");
    }
    await mapa.scrollIntoViewIfNeeded();
    await expect(mapa).toHaveAttribute("data-map-status", "ready", { timeout: 15_000 });
  });

  test("datas vindas da busca mostram o total estimado", async ({ page }) => {
    await page.goto(`/imoveis/${slug}?chegada=${isoInDays(60)}&saida=${isoInDays(63)}&hospedes=2`);
    const painel = page.getByRole("complementary", { name: "Valores e contato" });
    await expect(painel).toContainText("Diária · 3 noites × R$ 1.000,00");
    await expect(painel).toContainText("Limpeza");
    await expect(painel).toContainText("Total estimadoR$ 3.300,00");
  });

  test("datas ocupadas ou abaixo do mínimo são explicadas", async ({ page }) => {
    await page.goto(`/imoveis/${slug}?chegada=${isoInDays(41)}&saida=${isoInDays(43)}`);
    await expect(page.getByText("Essas datas não estão disponíveis.")).toBeVisible();
    await page.goto(`/imoveis/${slug}?chegada=${isoInDays(60)}&saida=${isoInDays(61)}`);
    await expect(
      page.getByText("Nessas datas, este imóvel pede no mínimo 2 noites."),
    ).toBeVisible();
  });

  test("WhatsApp leva o nome do imóvel na mensagem", async ({ page }) => {
    await page.goto(`/imoveis/${slug}`);
    const link = page
      .getByRole("complementary", { name: "Valores e contato" })
      .getByRole("link", { name: /Falar no WhatsApp/ });
    const href = await link.getAttribute("href");
    expect(href).toContain("https://wa.me/5513996195221?text=");
    expect(decodeURIComponent(href!.split("text=")[1]!)).toContain(`"${title}"`);
  });

  test("rascunho e endereço inexistente mostram página não encontrada", async ({ page }) => {
    for (const s of [draftSlug, `nao-existe-${run}`]) {
      const response = await page.goto(`/imoveis/${s}`);
      expect(response?.status()).toBe(404);
      await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
    }
  });

  test("celular: barra fixa com preço e WhatsApp no lugar dos atalhos", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Só no celular.");
    await page.goto(`/imoveis/${slug}`);
    await expect(page.getByRole("navigation", { name: "Atalhos" })).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "WhatsApp (abre em nova aba)", exact: true }),
    ).toBeVisible();
  });

  test("sem violações WCAG 2.1 AA e sem rolagem horizontal", async ({ page }) => {
    await stubMapTiles(page);
    await page.goto(`/imoveis/${slug}`);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
  });

  test("listagem mostra o mapa ao lado (desktop) ou pelo botão (celular e tablet)", async ({
    page,
  }) => {
    await stubMapTiles(page);
    await page.goto("/temporada?regiao=riviera-de-sao-lourenco");
    const mapa = page.getByRole("region", {
      name: "Mapa com a área aproximada dos imóveis encontrados",
    });
    // Abaixo de 1024 px o mapa fica atrás do botão "Ver mapa".
    if (page.viewportSize()!.width < 1024) {
      await expect(mapa).toBeHidden();
      await page.getByRole("button", { name: "Ver mapa" }).click();
    }
    await expect(mapa).toHaveAttribute("data-map-status", "ready", { timeout: 15_000 });
  });
});
