import { describe, expect, it } from "vitest";

import { COAST_BOUNDS, findDestination, searchDestinations } from "@/lib/destinations";
import {
  markerAriaLabel,
  markerPriceLabel,
  markersGeoJSON,
  pointsBounds,
  visibleArea,
} from "@/lib/search/map-markers";

describe("marcadores de preço", () => {
  it("preço curto, arredondado e compacto a partir de 10 mil", () => {
    expect(markerPriceLabel(1250)).toBe("R$ 1.250");
    expect(markerPriceLabel(1499.6)).toBe("R$ 1.500");
    expect(markerPriceLabel(15000)).toBe("R$ 15 mil");
    expect(markerPriceLabel(null)).toBe("Consultar");
  });

  it("nome acessível com título, preço completo e nota", () => {
    expect(
      markerAriaLabel({
        title: "Casa Azul",
        price: 1600,
        priceKind: "night",
        rating: { average: 4.5, count: 2 },
      }),
    ).toBe("Casa Azul, R$ 1.600 por noite, nota 4,5");
    expect(markerAriaLabel({ title: "Apto", price: 15000, priceKind: "month", rating: null })).toBe(
      "Apto, R$ 15.000 por mês",
    );
  });

  it("retângulo dos pontos e GeoJSON só com o id", () => {
    const points = [
      { id: "a", lat: -23.8, lng: -46.0 },
      { id: "b", lat: -23.7, lng: -45.7 },
    ];
    expect(pointsBounds(points)).toEqual([-46.0, -23.8, -45.7, -23.7]);
    expect(pointsBounds([])).toBeNull();
    expect(markersGeoJSON(points).features[1]).toEqual({
      type: "Feature",
      properties: { id: "b" },
      geometry: { type: "Point", coordinates: [-45.7, -23.7] },
    });
  });

  it("área visível: recusa mapa afastado demais", () => {
    expect(visibleArea({ west: -45.8, south: -23.8, east: -45.7, north: -23.7 })).toEqual([
      -45.8, -23.8, -45.7, -23.7,
    ]);
    expect(visibleArea({ west: -60, south: -30, east: -40, north: -20 })).toBeNull();
  });
});

describe("catálogo de destinos", () => {
  it("slugs únicos e cada lugar dentro do litoral atendido", () => {
    const slugs = searchDestinations.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const [[w, s], [e, n]] = COAST_BOUNDS;
    for (const d of searchDestinations) {
      const [lng, lat] = d.view.center;
      expect(lng).toBeGreaterThanOrEqual(w);
      expect(lng).toBeLessThanOrEqual(e);
      expect(lat).toBeGreaterThanOrEqual(s);
      expect(lat).toBeLessThanOrEqual(n);
    }
  });

  it("cidade e bairro levam os valores gravados no imóvel", () => {
    expect(findDestination("bertioga")).toMatchObject({ kind: "city", city: "Bertioga" });
    expect(findDestination("juquehy")).toMatchObject({
      kind: "neighborhood",
      city: "São Sebastião",
      neighborhood: "Juquehy",
      region: "sao-sebastiao",
    });
    expect(findDestination("ilhabela")).toMatchObject({ kind: "region", region: "ilhabela" });
    expect(findDestination("paris")).toBeUndefined();
  });
});
