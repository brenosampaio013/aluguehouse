import { describe, expect, it } from "vitest";

import { blockSchema } from "@/lib/booking/admin-schema";
import { parseBookingTab } from "@/lib/booking/labels";
import { guestWhatsappLink } from "@/lib/whatsapp";

describe("painel de reservas", () => {
  it("abas: pendentes por padrão e valores desconhecidos ignorados", () => {
    expect(parseBookingTab(undefined).status).toBe("pending");
    expect(parseBookingTab("aprovadas").status).toBe("approved");
    expect(parseBookingTab(["recusadas", "x"]).status).toBe("declined");
    expect(parseBookingTab("todas").status).toBeNull();
    expect(parseBookingTab("<script>").slug).toBe("pendentes");
  });

  it("WhatsApp do hóspede recebe o código do país quando falta", () => {
    expect(guestWhatsappLink("13996195221")).toBe("https://wa.me/5513996195221");
    expect(guestWhatsappLink("5513996195221")).toBe("https://wa.me/5513996195221");
    expect(guestWhatsappLink("1332221111", "Olá, Ana!")).toBe(
      "https://wa.me/551332221111?text=Ol%C3%A1%2C%20Ana!",
    );
  });

  it("bloqueio: motivo permitido e última noite depois da primeira", () => {
    const ok = blockSchema.safeParse({
      kind: "owner",
      start_date: "2026-12-20",
      end_date: "2026-12-20",
    });
    expect(ok.success).toBe(true);
    expect(
      blockSchema.safeParse({ kind: "booking", start_date: "2026-12-20", end_date: "2026-12-21" })
        .success,
    ).toBe(false);
    const swapped = blockSchema.safeParse({
      kind: "maintenance",
      start_date: "2026-12-21",
      end_date: "2026-12-20",
    });
    expect(swapped.error?.issues[0]?.path).toEqual(["end_date"]);
  });
});
