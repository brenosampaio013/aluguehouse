import { describe, expect, it } from "vitest";

import { activeSaleFilterCount, parseSaleFilters, saleHref } from "@/lib/search/sale-params";

describe("parseSaleFilters", () => {
  it("lê os filtros enviados pela busca da página inicial", () => {
    expect(parseSaleFilters({ tipo: "casa", preco_max: "2000000" })).toMatchObject({
      tipo: "casa",
      precoMax: 2000000,
      ordem: "recentes",
      pagina: 1,
    });
  });

  it("ignora valores inválidos", () => {
    expect(
      parseSaleFilters({
        tipo: "castelo",
        preco_max: "barato",
        area_min: "-5",
        regiao: "lua",
        ordem: "x",
      }),
    ).toEqual({
      regiao: undefined,
      tipo: undefined,
      precoMax: undefined,
      quartos: undefined,
      areaMin: undefined,
      comodidades: [],
      ordem: "recentes",
      pagina: 1,
    });
  });
});

describe("saleHref", () => {
  it("monta a URL com filtros e página", () => {
    const f = parseSaleFilters({ regiao: "ilhabela", tipo: "apartamento", area_min: "100" });
    expect(saleHref(f, { pagina: 2 })).toBe(
      "/venda?regiao=ilhabela&tipo=apartamento&area_min=100&pagina=2",
    );
    expect(activeSaleFilterCount(f)).toBe(3);
  });

  it("sem filtros volta para /venda", () => {
    expect(saleHref(parseSaleFilters({}))).toBe("/venda");
  });
});
