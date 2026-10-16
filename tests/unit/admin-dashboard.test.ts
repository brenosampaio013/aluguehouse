import { describe, expect, it } from "vitest";

import {
  bucketLabels,
  compare,
  formatDelta,
  formatDuration,
  formatPercent,
  parseDashboardPeriod,
  ratio,
} from "@/lib/admin/dashboard";

const TODAY = "2026-10-16";

describe("período da visão geral", () => {
  it("padrão: últimos 30 dias até hoje", () => {
    expect(parseDashboardPeriod({}, TODAY)).toMatchObject({
      from: "2026-09-17",
      to: TODAY,
      preset: "30",
    });
  });

  it("presets de 7 dias e 12 meses", () => {
    expect(parseDashboardPeriod({ periodo: "7" }, TODAY).from).toBe("2026-10-10");
    expect(parseDashboardPeriod({ periodo: "365" }, TODAY).from).toBe("2025-10-17");
  });

  it("datas personalizadas, sem passar de hoje", () => {
    expect(parseDashboardPeriod({ de: "2026-01-01", ate: "2026-12-31" }, TODAY)).toMatchObject({
      from: "2026-01-01",
      to: TODAY,
      preset: "personalizado",
    });
  });

  it("datas inválidas ou longas demais voltam ao preset", () => {
    expect(parseDashboardPeriod({ de: "2026-05-10", ate: "2026-05-01" }, TODAY).preset).toBe("30");
    expect(parseDashboardPeriod({ de: "2020-01-01", ate: "2026-01-01" }, TODAY).preset).toBe("30");
    expect(parseDashboardPeriod({ periodo: "9999" }, TODAY).preset).toBe("30");
  });
});

describe("comparação com o período anterior", () => {
  it("percentual e tendência", () => {
    expect(compare(15, 10)).toEqual({ value: 0.5, kind: "percent", trend: "up", good: true });
    expect(compare(5, 10)?.good).toBe(false);
    expect(compare(10, 10)).toMatchObject({ trend: "flat", good: null });
  });

  it("sem base (anterior zero ou ausente) não inventa porcentagem", () => {
    expect(compare(4, 0)).toBeNull();
    expect(compare(null, 3)).toBeNull();
  });

  it("menor é melhor (tempo de resposta)", () => {
    expect(compare(2, 4, { higherIsBetter: false })?.good).toBe(true);
  });

  it("pontos percentuais para taxas", () => {
    const delta = compare(0.5, 0.25, { kind: "points" })!;
    expect(formatDelta(delta)).toBe("+25 p.p.");
    expect(compare(0.1, 0, { kind: "points" })?.trend).toBe("up");
  });

  it("formatos", () => {
    expect(ratio(1, 0)).toBeNull();
    expect(formatPercent(ratio(1, 2))).toBe("50%");
    expect(formatPercent(null)).toBe("—");
    expect(formatDelta(compare(12, 10)!)).toBe("+20%");
    expect(formatDuration(0.25)).toBe("15 min");
    expect(formatDuration(3.5)).toBe("3,5 h");
    expect(formatDuration(72)).toBe("3 dias");
    expect(formatDuration(null)).toBe("—");
  });

  it("rótulos do gráfico por dia, semana e mês", () => {
    expect(bucketLabels("day", "2026-10-05", "2026-10-05")).toEqual({
      label: "05/10",
      longLabel: "05/10/2026",
    });
    expect(bucketLabels("week", "2026-10-05", "2026-10-11").longLabel).toBe("05/10 a 11/10/2026");
    expect(bucketLabels("month", "2026-10-01", "2026-10-31")).toEqual({
      label: "out/26",
      longLabel: "outubro de 2026",
    });
  });
});
