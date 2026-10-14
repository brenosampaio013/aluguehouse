import { describe, expect, it } from "vitest";

import { bookingErrorMessage, bookingRequestSchema, normalizePhone } from "@/lib/booking/schema";

const valid = {
  propertyId: "3f0c1a8e-2b4d-4c6e-8a1b-9d2e3f4a5b6c",
  checkIn: "2026-12-10",
  checkOut: "2026-12-13",
  guests: "2",
  name: "  Ana Souza ",
  email: "ana@exemplo.com",
  phone: "(13) 99619-5221",
  message: "",
  consent: "on",
};

describe("solicitação de reserva", () => {
  it("normaliza o telefone", () => {
    expect(normalizePhone("+55 (13) 99619-5221")).toBe("5513996195221");
  });

  it("aceita dados válidos e limpa espaços", () => {
    const result = bookingRequestSchema.parse(valid);
    expect(result.name).toBe("Ana Souza");
    expect(result.phone).toBe("13996195221");
    expect(result.guests).toBe(2);
  });

  it("exige consentimento", () => {
    const result = bookingRequestSchema.safeParse({ ...valid, consent: undefined });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["consent"]);
  });

  it("recusa telefone sem DDD, e-mail inválido e datas trocadas", () => {
    const result = bookingRequestSchema.safeParse({
      ...valid,
      phone: "99619-5221",
      email: "ana@",
      checkOut: "2026-12-09",
    });
    expect(result.success).toBe(false);
    const paths = result.error!.issues.map((issue) => issue.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["phone", "email"]));
  });

  it("recusa data inexistente", () => {
    expect(bookingRequestSchema.safeParse({ ...valid, checkIn: "2026-02-30" }).success).toBe(false);
  });

  it("traduz códigos do banco e usa o texto padrão para os desconhecidos", () => {
    expect(bookingErrorMessage("min_nights", "3")).toBe(
      "Nessas datas, este imóvel pede no mínimo 3 noites.",
    );
    expect(bookingErrorMessage("xyz", undefined, "Padrão")).toBe("Padrão");
  });
});
