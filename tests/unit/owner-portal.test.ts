import { describe, expect, it } from "vitest";

import { breadcrumbsFor, panelAreas } from "@/components/admin/shell/nav-items";
import {
  bookingStage,
  dayInfo,
  occupancy,
  parseOwnerBookingTab,
  parseQuote,
} from "@/lib/owner/portal";

const today = "2026-10-17";

describe("etapa da reserva para o proprietário", () => {
  const approved = (check_in: string, check_out: string) =>
    bookingStage({ status: "approved", check_in, check_out }, today);

  it("aprovada: futura, em andamento ou concluída conforme as datas", () => {
    expect(approved("2026-10-18", "2026-10-20")).toBe("upcoming");
    expect(approved("2026-10-17", "2026-10-20")).toBe("in_progress");
    expect(approved("2026-10-10", "2026-10-18")).toBe("in_progress");
    // Saída hoje: a noite de ontem foi a última.
    expect(approved("2026-10-10", "2026-10-17")).toBe("completed");
  });

  it("outras situações seguem o banco", () => {
    for (const status of ["pending", "declined", "cancelled", "expired"] as const) {
      expect(bookingStage({ status, check_in: "2026-11-01", check_out: "2026-11-03" }, today)).toBe(
        status,
      );
    }
  });

  it("aba desconhecida volta para todas", () => {
    expect(parseOwnerBookingTab("futuras")).toBe("futuras");
    expect(parseOwnerBookingTab("../admin")).toBe("todas");
    expect(parseOwnerBookingTab(undefined)).toBe("todas");
  });
});

describe("calendário do proprietário", () => {
  const blocks = [
    { start_date: "2026-10-20", end_date: "2026-10-23", kind: "booking" as const },
    { start_date: "2026-10-25", end_date: "2026-10-26", kind: "maintenance" as const },
  ];
  const rates = [
    {
      label: "Réveillon",
      start: "2026-12-28",
      end: "2027-01-03",
      nightlyPrice: 3000,
      minNights: 5,
    },
  ];
  const base = { blocks, pendingStays: [], rates, basePrice: 1000, baseMinNights: 2 };

  it("noite ocupada pelo intervalo [entrada, saída)", () => {
    expect(dayInfo("2026-10-20", base).state).toBe("booking");
    expect(dayInfo("2026-10-22", base).state).toBe("booking");
    expect(dayInfo("2026-10-23", base).state).toBe("free");
    expect(dayInfo("2026-10-25", base).state).toBe("maintenance");
  });

  it("tarifa sazonal e estadia mínima maior valem só no período", () => {
    expect(dayInfo("2026-12-31", base)).toMatchObject({
      price: 3000,
      rateLabel: "Réveillon",
      minNights: 5,
    });
    expect(dayInfo("2027-01-03", base)).toMatchObject({
      price: 1000,
      rateLabel: null,
      minNights: 2,
    });
  });

  it("pedido pendente só marca noites livres", () => {
    const pendingStays = [{ check_in: "2026-10-21", check_out: "2026-10-24" }];
    expect(dayInfo("2026-10-21", { ...base, pendingStays }).pending).toBe(false);
    expect(dayInfo("2026-10-23", { ...base, pendingStays }).pending).toBe(true);
    expect(dayInfo("2026-10-24", { ...base, pendingStays }).pending).toBe(false);
  });

  it("ocupação soma as noites de cada tipo na janela", () => {
    expect(occupancy(blocks, "2026-10-17", 10)).toEqual({
      days: 10,
      free: 6,
      booking: 3,
      owner: 0,
      maintenance: 1,
    });
  });
});

describe("orçamento estimado", () => {
  it("lê o JSON gravado no pedido", () => {
    expect(
      parseQuote({
        lines: [{ label: "Diária", nights: 2, unit_price: 500, amount: 1000 }],
        subtotal: 1000,
        fees: [{ label: "Limpeza", amount: 200 }],
        deposits: [{ label: "Caução", amount: 800 }],
        total: 1200,
      }),
    ).toEqual({
      lines: [{ label: "Diária", nights: 2, unitPrice: 500, amount: 1000 }],
      subtotal: 1000,
      fees: [{ label: "Limpeza", amount: 200 }],
      deposits: [{ label: "Caução", amount: 800 }],
      total: 1200,
    });
  });

  it("JSON incompleto ou estranho não quebra a página", () => {
    expect(parseQuote(null)).toEqual({
      lines: [],
      subtotal: null,
      fees: [],
      deposits: [],
      total: null,
    });
    expect(parseQuote({ lines: "x", fees: [{ amount: 1 }], total: "1200" }).total).toBeNull();
    expect(parseQuote({ fees: [{ amount: 1 }] }).fees).toEqual([]);
  });
});

describe("menu e trilha do portal", () => {
  it("portal tem as oito seções pedidas", () => {
    expect(panelAreas.owner.items.map((item) => item.label)).toEqual([
      "Visão geral",
      "Meus imóveis",
      "Calendário",
      "Reservas",
      "Financeiro",
      "Documentos",
      "Notificações",
      "Meu perfil",
    ]);
  });

  it("trilha por área, sem mudar a do painel", () => {
    expect(breadcrumbsFor("/proprietario/imoveis/abc", "owner").map((c) => c.label)).toEqual([
      "Proprietário",
      "Meus imóveis",
      "Detalhes",
    ]);
    expect(breadcrumbsFor("/admin/imoveis/novo").map((c) => c.label)).toEqual([
      "Painel",
      "Imóveis",
      "Novo imóvel",
    ]);
  });
});
