import { describe, expect, it } from "vitest";

import { safeFileName, validateOwnerDocFile } from "@/lib/owner/documents";

describe("documentos do proprietário", () => {
  it("nome seguro para o Storage, mantendo a extensão", () => {
    expect(safeFileName("Contrato Março 2026.PDF")).toBe("Contrato-Marco-2026.pdf");
    expect(safeFileName("../../etc/passwd")).toBe("passwd");
    expect(safeFileName("C:\\docs\\Relatório.pdf")).toBe("Relatorio.pdf");
    expect(safeFileName("..pdf")).toBe("documento.pdf");
    expect(safeFileName("sem-extensao")).toBe("sem-extensao");
    expect(safeFileName(`${"a".repeat(300)}.pdf`)).toHaveLength(104);
  });

  it("aceita só PDF e imagens até 10 MB", () => {
    expect(validateOwnerDocFile({ type: "application/pdf", size: 1000 })).toBeNull();
    expect(validateOwnerDocFile({ type: "image/webp", size: 1000 })).toBeNull();
    expect(validateOwnerDocFile({ type: "text/html", size: 1000 })).toMatch(/PDF ou uma imagem/);
    expect(validateOwnerDocFile({ type: "application/pdf", size: 0 })).toMatch(/vazio/);
    expect(validateOwnerDocFile({ type: "application/pdf", size: 11 * 1024 * 1024 })).toMatch(
      /10 MB/,
    );
  });
});
