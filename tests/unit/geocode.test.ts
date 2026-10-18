import { describe, expect, it } from "vitest";

import { nominatimSearchUrl, parseNominatim, roundCoord } from "@/lib/geocode";

describe("busca de endereço (Nominatim)", () => {
  it("monta a URL só no Brasil, priorizando o litoral atendido", () => {
    const url = new URL(nominatimSearchUrl("Rua das Flores, 10, Bertioga"));
    expect(url.origin + url.pathname).toBe("https://nominatim.openstreetmap.org/search");
    expect(url.searchParams.get("q")).toBe("Rua das Flores, 10, Bertioga");
    expect(url.searchParams.get("countrycodes")).toBe("br");
    expect(url.searchParams.get("format")).toBe("jsonv2");
    expect(url.searchParams.get("viewbox")).toBe("-46.35,-23.25,-44.7,-24.0");
  });

  it("converte a resposta e ignora itens inválidos", () => {
    expect(
      parseNominatim([
        {
          display_name: "Riviera de São Lourenço, Bertioga",
          lat: "-23.7933123",
          lon: "-46.0123456",
        },
        { display_name: "Sem coordenada", lat: "x", lon: "1" },
        { lat: "-23", lon: "-46" },
        null,
      ]),
    ).toEqual([{ label: "Riviera de São Lourenço, Bertioga", lat: -23.793312, lng: -46.012346 }]);
    expect(parseNominatim({ error: "x" })).toEqual([]);
  });

  it("arredonda para a precisão da coluna (6 casas)", () => {
    expect(roundCoord(-23.12345678)).toBe(-23.123457);
  });
});
