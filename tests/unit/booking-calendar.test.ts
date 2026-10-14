import { describe, expect, it } from "vitest";

import {
  canCheckIn,
  canCheckOut,
  isNightBlocked,
  monthStart,
  monthsBetween,
  monthWeeks,
  nightsBetween,
  overlapsBlocked,
  stayLimits,
  stayMode,
} from "@/lib/booking/calendar";

const blocked = [{ start: "2026-12-10", end: "2026-12-15" }];
const limits = { minNights: 2, maxNights: 90 };

describe("calendário de reservas", () => {
  it("conta noites e define a modalidade", () => {
    expect(nightsBetween("2026-12-01", "2026-12-04")).toBe(3);
    expect(nightsBetween("2027-02-27", "2027-03-01")).toBe(2);
    expect(stayMode("2026-12-01", "2026-12-30")).toBe("seasonal");
    expect(stayMode("2026-12-01", "2026-12-31")).toBe("monthly");
  });

  it("noites ocupadas usam o intervalo [início, fim)", () => {
    expect(isNightBlocked("2026-12-09", blocked)).toBe(false);
    expect(isNightBlocked("2026-12-10", blocked)).toBe(true);
    expect(isNightBlocked("2026-12-14", blocked)).toBe(true);
    expect(isNightBlocked("2026-12-15", blocked)).toBe(false);
  });

  it("sair no dia em que outra estadia começa é permitido", () => {
    expect(overlapsBlocked("2026-12-07", "2026-12-10", blocked)).toBe(false);
    expect(overlapsBlocked("2026-12-15", "2026-12-18", blocked)).toBe(false);
    expect(overlapsBlocked("2026-12-08", "2026-12-11", blocked)).toBe(true);
    expect(overlapsBlocked("2026-12-01", "2026-12-20", blocked)).toBe(true);
  });

  it("chegada: não passou, dentro da janela e com a noite livre", () => {
    const today = "2026-12-05";
    const last = "2027-12-05";
    expect(canCheckIn("2026-12-04", today, last, blocked)).toBe(false);
    expect(canCheckIn("2026-12-05", today, last, blocked)).toBe(true);
    expect(canCheckIn("2026-12-12", today, last, blocked)).toBe(false);
    expect(canCheckIn("2026-12-15", today, last, blocked)).toBe(true);
    expect(canCheckIn("2027-12-05", today, last, blocked)).toBe(false);
  });

  it("saída: respeita mínimo, máximo, janela e períodos ocupados", () => {
    const last = "2027-12-05";
    expect(canCheckOut("2026-12-07", "2026-12-08", last, limits, blocked)).toBe(false);
    expect(canCheckOut("2026-12-07", "2026-12-09", last, limits, blocked)).toBe(true);
    expect(canCheckOut("2026-12-07", "2026-12-10", last, limits, blocked)).toBe(true);
    expect(canCheckOut("2026-12-07", "2026-12-11", last, limits, blocked)).toBe(false);
    expect(canCheckOut("2026-12-07", "2026-12-06", last, limits, blocked)).toBe(false);
    expect(canCheckOut("2026-12-15", "2027-03-16", last, { minNights: 1, maxNights: 90 }, [])).toBe(
      false,
    );
    expect(canCheckOut("2027-12-01", "2027-12-06", last, limits, [])).toBe(false);
  });

  it("limites conforme as modalidades oferecidas", () => {
    const base = { min_nights: 2, max_nights: 90 };
    expect(stayLimits({ ...base, offers_seasonal: true, offers_monthly: true })).toEqual({
      minNights: 2,
      maxNights: 90,
    });
    expect(stayLimits({ ...base, offers_seasonal: true, offers_monthly: false })).toEqual({
      minNights: 2,
      maxNights: 29,
    });
    expect(stayLimits({ ...base, offers_seasonal: false, offers_monthly: true })).toEqual({
      minNights: 30,
      maxNights: 90,
    });
  });

  it("monta as semanas do mês começando no domingo", () => {
    // Outubro de 2026 começa numa quinta-feira e tem 31 dias.
    const weeks = monthWeeks("2026-10-01");
    expect(weeks[0]).toEqual([null, null, null, null, "2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(weeks.flat().filter(Boolean)).toHaveLength(31);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks.at(-1)).toContain("2026-10-31");
  });

  it("navega entre meses, inclusive na virada do ano", () => {
    expect(monthStart("2026-12-20", 1)).toBe("2027-01-01");
    expect(monthStart("2026-01-31", -1)).toBe("2025-12-01");
    expect(monthsBetween("2026-10-14", "2027-02-01")).toBe(4);
  });
});
