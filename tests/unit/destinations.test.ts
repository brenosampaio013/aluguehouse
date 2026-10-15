import { describe, expect, it } from "vitest";

import { destinationHref, destinations, rentalCountLabel } from "@/lib/home/destinations";
import { regions } from "@/lib/regions";

describe("destinos da página inicial", () => {
  it("seguem as 5 regiões, na ordem da Rio-Santos, com a Riviera primeiro", () => {
    expect(destinations.map((d) => d.slug)).toEqual(regions.map((r) => r.slug));
    expect(destinations[0]!.name).toBe("Riviera de São Lourenço");
    for (const d of destinations) expect(d.description.length).toBeGreaterThan(20);
  });

  it("ainda não têm fotos: nenhum destino simula uma", () => {
    expect(destinations.every((d) => d.photo === null)).toBe(true);
  });

  it("levam à listagem de temporada da região", () => {
    expect(destinationHref("ilhabela")).toBe("/temporada?regiao=ilhabela");
  });

  it("mostram a contagem real só quando há imóveis", () => {
    expect(rentalCountLabel(0)).toBeNull();
    expect(rentalCountLabel(1)).toBe("1 imóvel para temporada");
    expect(rentalCountLabel(4)).toBe("4 imóveis para temporada");
  });
});
