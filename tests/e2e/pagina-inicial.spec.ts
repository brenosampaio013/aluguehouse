import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { regions } from "@/lib/regions";

import { adminApi } from "./support/users";

const FOTO = path.join(process.cwd(), "media/recebidas/imovel-01/sala-jantar.jpg");

function isoInDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/** No celular, a busca fica recolhida até tocar em "Onde e quando?". */
async function openSearch(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole("button", { name: /Onde e quando/ }).click();
}

test.describe("página inicial", () => {
  const slug = `casa-destaque-${randomUUID().slice(0, 8)}`;
  const title = `Casa em destaque ${slug.slice(-8)}`;
  let propertyId = "";
  let mediaPath = "";

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
        bedrooms: 3,
        suites: 2,
        max_guests: 6,
        offers_seasonal: true,
        nightly_price: 1234,
        status: "published",
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;
    propertyId = data.id;

    const mediaId = randomUUID();
    mediaPath = `${propertyId}/${mediaId}`;
    const upload = await api.storage
      .from("property-media")
      .upload(`${mediaPath}/640.webp`, readFileSync(FOTO), { contentType: "image/jpeg" });
    if (upload.error) throw upload.error;
    const media = await api.from("property_media").insert({
      id: mediaId,
      property_id: propertyId,
      kind: "image",
      storage_path: mediaPath,
      width: 640,
      height: 480,
      alt_text: "Sala de jantar com mesa redonda",
      is_cover: true,
      is_demo: true,
    });
    if (media.error) throw media.error;
  });

  test.afterAll(async () => {
    const api = adminApi();
    await api.storage.from("property-media").remove([`${mediaPath}/640.webp`]);
    await api.from("properties").delete().eq("id", propertyId);
  });

  test("mostra título, linha da costa e como funciona", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Seu próximo capítulo começa aqui.",
    );

    const costa = page.getByRole("navigation", { name: "Da Riviera a Ubatuba" });
    const links = costa.getByRole("link");
    await expect(links).toHaveCount(regions.length);
    for (const [index, region] of regions.entries()) {
      await expect(links.nth(index)).toContainText(region.name);
      await expect(links.nth(index)).toHaveAttribute("href", `/temporada?regiao=${region.slug}`);
    }

    const passos = page
      .getByRole("region", { name: "Como funciona a reserva" })
      .getByRole("listitem");
    await expect(passos).toHaveCount(3);
  });

  test("topo com subtítulo e chamadas para os imóveis e a Riviera", async ({ page }) => {
    await page.goto("/");
    const topo = page.getByRole("region", { name: "Seu próximo capítulo começa aqui." });
    await expect(
      topo.getByText(
        "Casas extraordinárias, experiências exclusivas e o melhor do litoral paulista.",
      ),
    ).toBeVisible();
    await expect(topo.getByRole("link", { name: "Explorar imóveis" })).toHaveAttribute(
      "href",
      "/temporada",
    );
    await expect(topo.getByRole("link", { name: "Conheça a Riviera" })).toHaveAttribute(
      "href",
      "/temporada?regiao=riviera-de-sao-lourenco",
    );
    // Título e chamadas cabem na primeira tela, sem rolar.
    const box = await topo.getByRole("link", { name: "Explorar imóveis" }).boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  });

  test("imóvel publicado aparece em destaque com foto, preço e aviso de foto ilustrativa", async ({
    page,
  }) => {
    await page.goto("/");
    const card = page.getByRole("article").filter({ hasText: title });
    await expect(card).toBeVisible();
    await expect(card.getByRole("link", { name: title })).toHaveAttribute(
      "href",
      `/imoveis/${slug}`,
    );
    await expect(card).toContainText("Riviera de São Lourenço, Bertioga");
    await expect(card).toContainText("2 suítes · até 6 hóspedes");
    await expect(card).toContainText("R$ 1.234 por noite");
    await expect(card.getByText("Foto ilustrativa")).toBeVisible();
    const img = card.getByRole("img", { name: "Sala de jantar com mesa redonda" });
    await expect
      .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBeGreaterThan(0);
  });

  test("busca de temporada leva aos resultados com os filtros", async ({ page, isMobile }) => {
    await page.goto("/");
    await openSearch(page, isMobile);
    await page.getByLabel("Onde").selectOption("ilhabela");
    await page.getByLabel("Chegada").fill(isoInDays(30));
    await page.getByLabel("Saída").fill(isoInDays(34));
    await page.getByLabel("Hóspedes").fill("4");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page).toHaveURL(
      `/temporada?regiao=ilhabela&chegada=${isoInDays(30)}&saida=${isoInDays(34)}&hospedes=4`,
    );
  });

  test("busca avisa quando as datas não combinam com a modalidade", async ({ page, isMobile }) => {
    await page.goto("/");
    await openSearch(page, isMobile);
    await page.getByLabel("Chegada").fill(isoInDays(10));
    await page.getByLabel("Saída").fill(isoInDays(8));
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "A saída precisa ser depois da chegada." }),
    ).toBeVisible();

    await page.getByLabel("Saída").fill(isoInDays(45));
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Temporada vai até 29 noites" }),
    ).toBeVisible();
    await expect(page).toHaveURL("/");
  });

  test("busca de venda troca os campos", async ({ page, isMobile }) => {
    await page.goto("/");
    await openSearch(page, isMobile);
    // O visitante clica no rótulo; o botão de opção é visualmente oculto.
    const venda = page.getByRole("radio", { name: "Venda" });
    await page.locator("label", { has: venda }).click();
    await expect(venda).toBeChecked();
    await expect(page.getByLabel("Chegada")).toHaveCount(0);
    await page.getByLabel("Tipo").selectOption("casa");
    await page.getByLabel("Preço máximo").selectOption("2000000");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page).toHaveURL("/venda?tipo=casa&preco_max=2000000");
  });

  test("navegação do celular: menu e barra inferior", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Só no celular.");
    await page.goto("/");
    const atalhos = page.getByRole("navigation", { name: "Atalhos" });
    await expect(atalhos.getByRole("link", { name: "Explorar" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    const menu = page.getByRole("button", { name: "Abrir menu" });
    await menu.click();
    await expect(page.getByRole("link", { name: "Mensal" }).first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Abrir menu" })).toBeFocused();
  });

  test("navegação do desktop mostra as modalidades no cabeçalho", async ({ page, isMobile }) => {
    test.skip(isMobile, "Só no desktop e tablet.");
    await page.goto("/");
    const header = page.getByRole("banner");
    for (const label of ["Temporada", "Mensal", "Venda", "Favoritos", "Entrar"]) {
      await expect(header.getByRole("link", { name: label })).toBeVisible();
    }
  });

  test("sem violações WCAG 2.1 AA com destaques e busca aberta", async ({ page, isMobile }) => {
    await page.goto("/");
    await openSearch(page, isMobile);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
  });
});
