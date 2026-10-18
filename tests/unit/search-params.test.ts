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
      destino: undefined,
      area: undefined,
      tipo: undefined,
      precoMin: undefined,
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
      destino: undefined,
      area: undefined,
      tipo: undefined,
      precoMin: undefined,
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

describe("destino, área, tipo e preço mínimo", () => {
  it("destino de região vira regiao; cidade e bairro ficam em destino", () => {
    expect(parseRentalFilters({ destino: "ilhabela" })).toMatchObject({ regiao: "ilhabela" });
    expect(parseRentalFilters({ destino: "juquehy", regiao: "ubatuba" })).toMatchObject({
      regiao: undefined,
      destino: "juquehy",
    });
    expect(parseRentalFilters({ destino: "paris" })).toMatchObject({
      regiao: undefined,
      destino: undefined,
    });
  });

  it("lê a área do mapa e recusa áreas inválidas ou grandes demais", () => {
    expect(parseRentalFilters({ area: "-45.9,-23.9,-45.6,-23.6" }).area).toEqual([
      -45.9, -23.9, -45.6, -23.6,
    ]);
    expect(parseRentalFilters({ area: "-45.6,-23.9,-45.9,-23.6" }).area).toBeUndefined();
    expect(parseRentalFilters({ area: "-60,-30,-40,-20" }).area).toBeUndefined();
    expect(parseRentalFilters({ area: "a,b,c,d" }).area).toBeUndefined();
  });

  it("tipo, preço mínimo e ordenação por avaliação", () => {
    expect(
      parseRentalFilters({ tipo: "apartamento", preco_min: "300", ordem: "melhor-avaliados" }),
    ).toMatchObject({ tipo: "apartamento", precoMin: 300, ordem: "melhor-avaliados" });
    expect(parseRentalFilters({ tipo: "terreno" }).tipo).toBeUndefined();
  });

  it("monta a URL com destino e área arredondada", () => {
    const f = parseRentalFilters({ destino: "juquehy", area: "-45.123456,-23.9,-45.1,-23.8" });
    expect(rentalHref("/temporada", f)).toBe(
      "/temporada?destino=juquehy&area=-45.1235%2C-23.9%2C-45.1%2C-23.8",
    );
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
