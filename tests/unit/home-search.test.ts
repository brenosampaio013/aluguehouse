import { describe, expect, it } from "vitest";

import {
  buildSearch,
  guestsSummary,
  matchDestinations,
  pickDestination,
  stepGuests,
} from "@/lib/search/home-search";

const today = "2026-10-15";

describe("destinos", () => {
  it("sem texto mostra as cinco regiões", () => {
    expect(matchDestinations("")).toHaveLength(5);
    expect(matchDestinations("").every((d) => d.kind === "region")).toBe(true);
  });

  it("ignora acentos e maiúsculas e procura também cidades e bairros", () => {
    expect(matchDestinations("LOURENÇO").map((r) => r.slug)).toEqual(["riviera-de-sao-lourenco"]);
    expect(matchDestinations("bertioga").map((r) => r.slug)).toEqual([
      "riviera-de-sao-lourenco",
      "bertioga",
    ]);
    expect(matchDestinations("juquei")).toEqual([]);
    expect(matchDestinations("juqu").map((r) => r.slug)).toEqual(["juquehy"]);
    expect(matchDestinations("boicu").map((r) => r.slug)).toEqual(["boicucanga"]);
  });

  it("texto digitado escolhe o destino único ou o de nome idêntico", () => {
    expect(pickDestination("Bertioga")?.slug).toBe("bertioga");
    expect(pickDestination("barra do una")?.slug).toBe("barra-do-una");
    expect(pickDestination("barra")).toBeUndefined();
  });

  it("sem correspondência devolve lista vazia", () => {
    expect(matchDestinations("Paris")).toEqual([]);
  });
});

describe("hóspedes", () => {
  const none = { adults: 0, children: 0 };

  it("nunca fica negativo", () => {
    expect(stepGuests(none, "adults", -1, 10)).toEqual(none);
    expect(stepGuests(none, "children", -1, 10)).toEqual(none);
  });

  it("criança sem adulto inclui um adulto", () => {
    expect(stepGuests(none, "children", 1, 10)).toEqual({ adults: 1, children: 1 });
  });

  it("não deixa zerar adultos havendo crianças", () => {
    expect(stepGuests({ adults: 1, children: 2 }, "adults", -1, 10)).toEqual({
      adults: 1,
      children: 2,
    });
  });

  it("respeita a capacidade", () => {
    expect(stepGuests({ adults: 3, children: 1 }, "adults", 1, 4)).toEqual({
      adults: 3,
      children: 1,
    });
    expect(stepGuests({ adults: 0, children: 0 }, "children", 1, 1)).toEqual({
      adults: 0,
      children: 0,
    });
  });

  it("resume o total", () => {
    expect(guestsSummary(none)).toBeNull();
    expect(guestsSummary({ adults: 1, children: 0 })).toBe("1 hóspede");
    expect(guestsSummary({ adults: 2, children: 1 })).toBe("3 hóspedes");
  });
});

describe("montagem da busca", () => {
  it("temporada com destino, datas e hóspedes", () => {
    expect(
      buildSearch(
        {
          mode: "temporada",
          destination: "ilhabela",
          checkIn: "2026-12-20",
          checkOut: "2026-12-27",
          guests: { adults: 2, children: 2 },
        },
        today,
      ),
    ).toEqual({
      ok: true,
      href: "/temporada?regiao=ilhabela&chegada=2026-12-20&saida=2026-12-27&hospedes=4",
    });
  });

  it("cidade e bairro usam o parâmetro destino; na venda, a região deles", () => {
    expect(buildSearch({ mode: "temporada", destination: "juquehy" }, today)).toEqual({
      ok: true,
      href: "/temporada?destino=juquehy",
    });
    expect(buildSearch({ mode: "venda", destination: "juquehy" }, today)).toEqual({
      ok: true,
      href: "/venda?regiao=sao-sebastiao",
    });
  });

  it("sem filtros vai para a listagem da modalidade", () => {
    expect(buildSearch({ mode: "mensal" }, today)).toEqual({ ok: true, href: "/mensal" });
  });

  it("venda ignora datas e hóspedes", () => {
    expect(
      buildSearch(
        {
          mode: "venda",
          destination: "ubatuba",
          checkIn: "2026-12-20",
          checkOut: "2026-12-27",
          guests: { adults: 2, children: 0 },
          saleType: "casa",
          salePriceMax: "2000000",
        },
        today,
      ),
    ).toEqual({ ok: true, href: "/venda?regiao=ubatuba&tipo=casa&preco_max=2000000" });
  });

  it("valida as datas conforme a modalidade", () => {
    const base = { checkIn: "2026-11-01" };
    expect(
      buildSearch({ mode: "temporada", ...base, checkOut: "2026-12-01" }, today),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/29 noites/) });
    expect(buildSearch({ mode: "mensal", ...base, checkOut: "2026-11-10" }, today)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/30 noites/),
    });
    expect(buildSearch({ mode: "mensal", ...base, checkOut: "2026-12-01" }, today)).toMatchObject({
      ok: true,
    });
    expect(buildSearch({ mode: "temporada", ...base, checkOut: null }, today)).toMatchObject({
      ok: false,
    });
    expect(
      buildSearch({ mode: "temporada", checkIn: "2026-10-01", checkOut: "2026-10-05" }, today),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/já passou/) });
  });
});
