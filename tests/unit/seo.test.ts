import { describe, expect, it } from "vitest";

import { buildCsp } from "@/lib/seo/csp";
import { indexingEnabled } from "@/lib/seo/indexing";
import { breadcrumbJsonLd, listingJsonLd, serializeJsonLd } from "@/lib/seo/json-ld";
import { buildRobots } from "@/lib/seo/robots";

const base = {
  nonce: "abc123",
  isDev: false,
  siteUrl: "https://aluguehouses.com.br",
  supabaseUrl: "https://xyz.supabase.co",
  mapStyleUrl: "https://tiles.openfreemap.org/styles/positron",
};

function directive(csp: string, name: string) {
  return csp.split("; ").find((part) => part.startsWith(`${name} `) || part === name);
}

describe("CSP", () => {
  it("scripts só com o nonce; sem unsafe-eval em produção", () => {
    const csp = buildCsp(base);
    expect(directive(csp, "script-src")).toBe(
      "script-src 'self' 'nonce-abc123' 'strict-dynamic' https://challenges.cloudflare.com",
    );
    expect(csp).not.toContain("unsafe-eval");
    expect(directive(csp, "object-src")).toBe("object-src 'none'");
    expect(directive(csp, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(csp, "upgrade-insecure-requests")).toBe("upgrade-insecure-requests");
  });

  it("libera só Supabase, mapa e Turnstile", () => {
    const csp = buildCsp(base);
    expect(directive(csp, "connect-src")).toBe(
      "connect-src 'self' https://xyz.supabase.co https://tiles.openfreemap.org https://challenges.cloudflare.com",
    );
    expect(directive(csp, "img-src")).toBe(
      "img-src 'self' data: blob: https://xyz.supabase.co https://tiles.openfreemap.org",
    );
    expect(directive(csp, "frame-src")).toBe("frame-src https://challenges.cloudflare.com");
  });

  it("desenvolvimento: unsafe-eval e websocket; http local sem upgrade", () => {
    const csp = buildCsp({ ...base, isDev: true, siteUrl: "http://localhost:3000" });
    expect(directive(csp, "script-src")).toContain("'unsafe-eval'");
    expect(directive(csp, "connect-src")).toContain("ws:");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });
});

describe("indexação", () => {
  it("só liga com SITE_INDEXING=on", () => {
    expect(indexingEnabled(undefined)).toBe(false);
    expect(indexingEnabled("true")).toBe(false);
    expect(indexingEnabled("on")).toBe(true);
  });

  it("robots.txt bloqueia tudo até ligar; depois só as áreas privadas", () => {
    expect(buildRobots(base.siteUrl, false)).toEqual({ rules: { userAgent: "*", disallow: "/" } });
    const open = buildRobots(base.siteUrl, true);
    expect(open.sitemap).toBe("https://aluguehouses.com.br/sitemap.xml");
    expect(open.rules).toMatchObject({
      allow: "/",
      disallow: expect.arrayContaining(["/admin", "/minhas-estadias", "/favoritos"]),
    });
  });
});

describe("JSON-LD", () => {
  const input = {
    url: "https://aluguehouses.com.br/imoveis/casa",
    title: "Casa </script><script>alert(1)</script>",
    description: null,
    propertyType: "casa",
    city: "Bertioga",
    neighborhood: "Riviera de São Lourenço",
    geo: { lat: -23.8, lng: -46.01 },
    bedrooms: 3,
    bathrooms: 2,
    maxGuests: 6,
    areaM2: 140,
    amenities: ["Piscina"],
    images: ["https://x/1.webp"],
    publishedAt: "2026-10-01T00:00:00Z",
    prices: { nightly: 1000, monthly: null, sale: 2_500_000 },
    rating: { average: 4.666, count: 3 },
  };

  it("texto do banco nunca fecha a tag de script", () => {
    const json = serializeJsonLd(listingJsonLd(input));
    expect(json).not.toContain("</script>");
    expect(JSON.parse(json).name).toBe(input.title);
  });

  it("anúncio com imóvel, ofertas por modalidade e nota", () => {
    const data = JSON.parse(serializeJsonLd(listingJsonLd(input)));
    expect(data["@type"]).toBe("RealEstateListing");
    expect(data.about["@type"]).toBe("House");
    expect(data.about.floorSize).toEqual({
      "@type": "QuantitativeValue",
      value: 140,
      unitCode: "MTK",
    });
    expect(data.about.aggregateRating).toMatchObject({ ratingValue: 4.7, reviewCount: 3 });
    expect(data.offers).toHaveLength(2);
    expect(data.offers[0].priceSpecification.unitCode).toBe("DAY");
    expect(data.offers[1]).toMatchObject({ price: 2_500_000, priceCurrency: "BRL" });
  });

  it("sem dados opcionais, sem campos vazios", () => {
    const data = JSON.parse(
      serializeJsonLd(
        listingJsonLd({
          ...input,
          propertyType: "terreno",
          geo: null,
          areaM2: null,
          amenities: [],
          images: [],
          prices: { nightly: null, monthly: null, sale: null },
          rating: null,
        }),
      ),
    );
    expect(data.about["@type"]).toBe("Place");
    expect(data.about).not.toHaveProperty("numberOfBedrooms");
    expect(data.about).not.toHaveProperty("geo");
    expect(data).not.toHaveProperty("offers");
    expect(data).not.toHaveProperty("image");
  });

  it("trilha com posições", () => {
    const data = JSON.parse(
      serializeJsonLd(
        breadcrumbJsonLd([
          { name: "Início", url: "https://x/" },
          { name: "Casa", url: "https://x/imoveis/casa" },
        ]),
      ),
    );
    expect(data.itemListElement[1]).toEqual({
      "@type": "ListItem",
      position: 2,
      name: "Casa",
      item: "https://x/imoveis/casa",
    });
  });
});
