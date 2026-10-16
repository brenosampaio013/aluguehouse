import { describe, expect, it } from "vitest";

import {
  addDaysISO,
  formatBRL,
  parseDateRange,
  parseDecimalInput,
  slugify,
  toDecimalInput,
  todayInSaoPaulo,
} from "@/lib/format";

describe("parseDecimalInput", () => {
  it.each([
    ["1.800,50", 1800.5],
    ["1800,50", 1800.5],
    ["1800.50", 1800.5],
    ["1800", 1800],
    ["R$ 2.000", 2000],
    ["1.250.000", 1250000],
    ["2.5", 2.5],
    [" 15 000 ", 15000],
  ])("%j → %d", (input, expected) => {
    expect(parseDecimalInput(input)).toBe(expected);
  });

  it("vazio vira undefined", () => {
    expect(parseDecimalInput("")).toBeUndefined();
    expect(parseDecimalInput(null)).toBeUndefined();
  });

  it("texto inválido vira NaN", () => {
    expect(parseDecimalInput("mil reais")).toBeNaN();
    expect(parseDecimalInput("1,2,3")).toBeNaN();
  });
});

describe("formatação", () => {
  it("formata reais", () => {
    expect(formatBRL(1800.5).replace(/\s/g, " ")).toBe("R$ 1.800,50");
    expect(formatBRL(null)).toBe("—");
  });

  it("prepara valores para campos", () => {
    expect(toDecimalInput(1800.5)).toBe("1800,50");
    expect(toDecimalInput(null)).toBe("");
  });
});

describe("slugify", () => {
  it("remove acentos e símbolos", () => {
    expect(slugify("Casa Pé na Areia – Módulo 5")).toBe("casa-pe-na-areia-modulo-5");
    expect(slugify("  Apartamento   Frente ao Mar!! ")).toBe("apartamento-frente-ao-mar");
  });
});

describe("addDaysISO", () => {
  it("soma dias atravessando mês e ano", () => {
    expect(addDaysISO("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysISO("2027-03-01", -1)).toBe("2027-02-28");
  });
});

describe("parseDateRange", () => {
  it("lê o formato de intervalo do Postgres", () => {
    expect(parseDateRange("[2026-12-28,2027-01-03)")).toEqual({
      start: "2026-12-28",
      endExclusive: "2027-01-03",
    });
    expect(parseDateRange("vazio")).toBeNull();
  });
});

describe("todayInSaoPaulo", () => {
  it("vira o dia à meia-noite de São Paulo (03:00 UTC), não à meia-noite UTC", () => {
    expect(todayInSaoPaulo(new Date("2026-03-11T02:59:59Z"))).toBe("2026-03-10"); // 23:59:59 em SP
    expect(todayInSaoPaulo(new Date("2026-03-11T03:00:00Z"))).toBe("2026-03-11"); // 00:00 em SP
    expect(todayInSaoPaulo(new Date("2026-12-31T23:30:00-03:00"))).toBe("2026-12-31");
    expect(todayInSaoPaulo(new Date("2027-01-01T00:00:00-03:00"))).toBe("2027-01-01");
  });
});
