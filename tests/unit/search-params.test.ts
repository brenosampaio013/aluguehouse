import { describe, expect, it } from "vitest";

import { activeFilterCount, parseRentalFilters, rentalHref } from "@/lib/search/params";

describe("parseRentalFilters", () => {
  it("lê filtros válidos", () => {
    const f = parseRentalFilters({
      regiao: "ilhabela",
      chegada: "2027-01-10",
      saida: "2027-01-15",
      hospedes: "4",
      quartos: "3",
      preco_max: "1500",
      comodidade: ["piscina", "wi-fi"],
      ordem: "menor-preco",
      pagina: "2",
    });
    expect(f).toEqual({
      regiao: "ilhabela",
      chegada: "2027-01-10",
      saida: "2027-01-15",
      hospedes: 4,
      quartos: 3,
      precoMax: 1500,
      comodidades: ["piscina", "wi-fi"],
      ordem: "menor-preco",
      pagina: 2,
    });
  });

  it("ignora valores inválidos em vez de quebrar a busca", () => {
    const f = parseRentalFilters({
      regiao: "paris",
      chegada: "2027-02-30",
      saida: "amanhã",
      hospedes: "-1",
      quartos: "abc",
      preco_max: "1e9",
      comodidade: "piscina,<script>",
      ordem: "aleatoria",
      pagina: "0",
    });
    expect(f).toEqual({
      regiao: undefined,
      chegada: undefined,
      saida: undefined,
      hospedes: undefined,
      quartos: undefined,
      precoMax: undefined,
      comodidades: ["piscina"],
      ordem: "recentes",
      pagina: 1,
    });
  });

  it("aceita comodidades separadas por vírgula e remove repetidas", () => {
    expect(parseRentalFilters({ comodidade: ["piscina,wi-fi", "piscina"] }).comodidades).toEqual([
      "piscina",
      "wi-fi",
    ]);
  });
});

describe("rentalHref", () => {
  const base = parseRentalFilters({ regiao: "ubatuba", comodidade: ["piscina"] });

  it("monta a URL com os filtros", () => {
    expect(rentalHref("/temporada", base)).toBe("/temporada?regiao=ubatuba&comodidade=piscina");
  });

  it("aplica alterações pontuais, como a página", () => {
    expect(rentalHref("/temporada", base, { pagina: 3 })).toBe(
      "/temporada?regiao=ubatuba&comodidade=piscina&pagina=3",
    );
  });

  it("omite valores padrão", () => {
    expect(rentalHref("/mensal", parseRentalFilters({}))).toBe("/mensal");
  });

  it("conta filtros ativos", () => {
    expect(activeFilterCount(base)).toBe(2);
  });
});
