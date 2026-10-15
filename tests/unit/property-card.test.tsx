import { describe, expect, it } from "vitest";

import { cardFacts } from "@/components/property/property-card";
import type { PropertyCardData } from "@/server/queries/public-properties";

const base: PropertyCardData = {
  id: "1",
  slug: "casa",
  title: "Casa",
  city: "Bertioga",
  neighborhood: null,
  bedrooms: 4,
  suites: 3,
  maxGuests: 8,
  areaM2: 320,
  price: { kind: "night", amount: 1500 },
  cover: null,
};

const labels = (property: PropertyCardData) => cardFacts(property).map((f) => f.label);

describe("informações do cartão de imóvel", () => {
  it("aluguel: quartos, suítes e capacidade", () => {
    expect(labels(base)).toEqual(["4 quartos", "3 suítes", "até 8 hóspedes"]);
  });

  it("singular e sem itens zerados", () => {
    expect(labels({ ...base, bedrooms: 1, suites: 0, maxGuests: 1 })).toEqual([
      "1 quarto",
      "até 1 hóspede",
    ]);
  });

  it("venda: área no lugar dos hóspedes", () => {
    expect(labels({ ...base, price: { kind: "sale", amount: 1 }, areaM2: 1250 })).toEqual([
      "4 quartos",
      "3 suítes",
      "1.250 m²",
    ]);
    expect(labels({ ...base, price: { kind: "sale", amount: 1 }, areaM2: null })).toEqual([
      "4 quartos",
      "3 suítes",
    ]);
  });
});
