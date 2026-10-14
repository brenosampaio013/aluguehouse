import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import { loginAsAdmin } from "./support/admin";
import { stubMapTiles } from "./support/map";
import { adminApi, createAdminWithTotp } from "./support/users";

const run = randomUUID().slice(0, 6);
const slug = `casa-seo-${run}`;
const draftSlug = `casa-seo-rascunho-${run}`;
const title = `Casa SEO ${run}`;
const EXACT = { lat: -23.811111, lng: -46.022222 };
const ids: string[] = [];

test.beforeAll(async () => {
  const api = adminApi();
  const base = {
    property_type: "casa" as const,
    city: "Bertioga",
    neighborhood: "Riviera de São Lourenço",
    region: "riviera-de-sao-lourenco",
    bedrooms: 3,
    bathrooms: 2,
    max_guests: 6,
    area_m2: 150,
    offers_seasonal: true,
    nightly_price: 1200,
  };
  const published = await api
    .from("properties")
    .insert({
      ...base,
      slug,
      title,
      summary: "Casa de teste para SEO.",
      status: "published",
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  const draft = await api
    .from("properties")
    .insert({ ...base, slug: draftSlug, title: "Rascunho SEO", status: "draft" })
    .select("id")
    .single();
  if (published.error) throw published.error;
  if (draft.error) throw draft.error;
  ids.push(published.data.id, draft.data.id);
  await api.from("property_private").insert({
    property_id: published.data.id,
    full_address: "Rua Particular, 99",
    exact_lat: EXACT.lat,
    exact_lng: EXACT.lng,
  });
});

test.afterAll(async () => {
  await adminApi().from("properties").delete().in("id", ids);
});

/** Registra violações de CSP que o navegador relatar na página. */
async function watchCsp(page: Page) {
  await page.addInitScript(() => {
    const list: string[] = [];
    (window as unknown as { __csp: string[] }).__csp = list;
    document.addEventListener("securitypolicyviolation", (event) => {
      list.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });
}

async function cspViolations(page: Page) {
  return page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
}

test("CSP com nonce: cabeçalho e scripts da página", async ({ request, page }) => {
  const response = await request.get("/");
  const csp = response.headers()["content-security-policy"]!;
  expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
  const nonce = csp.match(/'nonce-([^']+)'/)![1];

  // Cada requisição recebe um nonce novo.
  const second = (await request.get("/")).headers()["content-security-policy"]!;
  expect(second).not.toContain(nonce);

  await page.goto("/");
  const scripts = await page
    .locator("script:not([type='application/ld+json'])")
    .evaluateAll((elements) => elements.map((element) => (element as HTMLScriptElement).nonce));
  expect(scripts.length).toBeGreaterThan(0);
  for (const value of scripts) expect(value).not.toBe("");
});

test("páginas públicas sem violações de CSP (mapa, fotos, formulários)", async ({ page }) => {
  await watchCsp(page);
  await stubMapTiles(page);
  for (const url of [
    "/",
    "/temporada?regiao=riviera-de-sao-lourenco",
    `/imoveis/${slug}`,
    "/contato",
    "/entrar",
    "/favoritos",
  ]) {
    await page.goto(url);
    await page.mouse.wheel(0, 4000);
    await page.waitForLoadState("networkidle");
    expect(await cspViolations(page), url).toEqual([]);
  }
});

test("painel sem violações de CSP", async ({ page }) => {
  test.setTimeout(60_000);
  await watchCsp(page);
  await loginAsAdmin(page, await createAdminWithTotp());
  for (const url of ["/admin", `/admin/imoveis/${ids[0]}`, "/admin/solicitacoes"]) {
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    expect(await cspViolations(page), url).toEqual([]);
  }
});

test("indexação desligada: robots.txt e meta robots", async ({ request, page }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("User-Agent: *");
  expect(robots).toContain("Disallow: /");
  expect(robots).not.toContain("Sitemap:");
  await page.goto("/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
});

test("sitemap lista páginas públicas e imóveis publicados", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.headers()["content-type"]).toContain("xml");
  const xml = await response.text();
  for (const path of ["/temporada", "/mensal", "/venda", "/contato", `/imoveis/${slug}`]) {
    expect(xml).toContain(`${path}</loc>`);
  }
  expect(xml).not.toContain(draftSlug);
  expect(xml).not.toContain("/admin");
});

test("canônicos sem filtros nem datas", async ({ page }) => {
  await page.goto(`/imoveis/${slug}?chegada=2030-01-10&saida=2030-01-12&hospedes=2`);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    new RegExp(`/imoveis/${slug}$`),
  );
  await page.goto("/temporada?regiao=ubatuba&pagina=2");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/temporada$/);
});

test("dados estruturados do imóvel e da empresa", async ({ page }) => {
  await page.goto(`/imoveis/${slug}`);
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((elements) => elements.map((element) => element.textContent ?? ""));
  const raw = blocks.join("\n");
  expect(raw).not.toContain(String(EXACT.lat));
  expect(raw).not.toContain("Rua Particular");
  const data = JSON.parse(blocks[0]!) as unknown[];
  const listing = data[0] as Record<string, unknown> & {
    about: Record<string, unknown>;
    offers: { price: number; priceCurrency: string }[];
  };
  expect(listing["@type"]).toBe("RealEstateListing");
  expect(listing.name).toBe(title);
  expect(listing.about["@type"]).toBe("House");
  expect(listing.about.numberOfBedrooms).toBe(3);
  expect(listing.offers[0]).toMatchObject({ price: 1200, priceCurrency: "BRL" });
  expect((data[1] as Record<string, unknown>)["@type"]).toBe("BreadcrumbList");

  await page.goto("/");
  const home = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(JSON.parse(home!)).toMatchObject({
    "@type": "Organization",
    name: "Alugue Houses",
    email: "contatoaluguehouses@gmail.com",
  });
});
