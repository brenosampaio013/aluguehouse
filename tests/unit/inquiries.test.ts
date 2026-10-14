import { describe, expect, it } from "vitest";

import { formatVisit, inquirySchema, parseInquiryTab, visitDateTime } from "@/lib/inquiries";

const today = "2026-10-14";
const base = {
  kind: "contact",
  name: "Ana Souza",
  email: "ana@exemplo.com",
  message: "Olá!",
  consent: "on",
};
const propertyId = "3f0c1a8e-2b4d-4c6e-8a1b-9d2e3f4a5b6c";

describe("contatos", () => {
  it("contato exige mensagem; telefone é opcional e normalizado", () => {
    expect(inquirySchema(today).safeParse({ ...base, message: "" }).success).toBe(false);
    expect(inquirySchema(today).parse({ ...base, phone: "" }).phone).toBe("");
    expect(inquirySchema(today).parse({ ...base, phone: "(13) 99619-5221" }).phone).toBe(
      "13996195221",
    );
    expect(inquirySchema(today).safeParse({ ...base, phone: "1234" }).success).toBe(false);
  });

  it("visita e interesse exigem imóvel; mensagem pode ficar vazia", () => {
    const visit = { ...base, kind: "visit", message: "" };
    expect(inquirySchema(today).safeParse(visit).success).toBe(false);
    expect(inquirySchema(today).safeParse({ ...visit, propertyId }).success).toBe(true);
  });

  it("data da visita não pode estar no passado", () => {
    const visit = { ...base, kind: "visit", propertyId };
    expect(inquirySchema(today).safeParse({ ...visit, visitDate: "2026-10-13" }).success).toBe(
      false,
    );
    expect(inquirySchema(today).safeParse({ ...visit, visitDate: "2026-02-30" }).success).toBe(
      false,
    );
    expect(inquirySchema(today).safeParse({ ...visit, visitDate: today }).success).toBe(true);
  });

  it("aponta todos os campos com problema de uma vez", () => {
    const result = inquirySchema(today).safeParse({ ...base, message: "", consent: undefined });
    const paths = result.error!.issues.map((issue) => issue.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["message", "consent"]));
  });

  it("consentimento obrigatório", () => {
    expect(inquirySchema(today).safeParse({ ...base, consent: undefined }).success).toBe(false);
  });

  it("período da visita vira horário de São Paulo e volta como texto", () => {
    expect(visitDateTime("2026-11-14", "tarde")).toBe("2026-11-14T15:00:00-03:00");
    expect(formatVisit("2026-11-14T15:00:00-03:00")).toBe("sábado, 14/11/2026, à tarde");
    expect(formatVisit("2026-11-14T13:00:00Z")).toBe("sábado, 14/11/2026, pela manhã");
  });

  it("abas: novos por padrão", () => {
    expect(parseInquiryTab(undefined).status).toBe("new");
    expect(parseInquiryTab("encerrados").status).toBe("closed");
  });
});
