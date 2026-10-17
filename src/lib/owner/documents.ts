import type { Database } from "@/types/database";

/** Bucket privado dos documentos do proprietário (sem URL pública). */
export const OWNER_DOCS_BUCKET = "owner-documents";

export const OWNER_DOC_MAX_BYTES = 10 * 1024 * 1024;

export const ownerDocMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type OwnerDocCategory = Database["public"]["Enums"]["owner_document_category"];

export const ownerDocCategoryLabels: Record<OwnerDocCategory, string> = {
  contract: "Contrato",
  report: "Relatório",
  inspection: "Vistoria",
  receipt: "Comprovante",
  other: "Outro",
};

/** Validade do link assinado que abre o documento. */
export const SIGNED_URL_SECONDS = 60;

/**
 * Nome do arquivo seguro para o Storage (só letras, números, ponto, hífen e
 * sublinhado), mantendo a extensão. Ex.: "Contrato Março.pdf" → "Contrato-Marco.pdf".
 */
export function safeFileName(name: string): string {
  // Só o nome, sem pastas ("../../a.pdf" → "a.pdf").
  const baseName = name.split(/[\\/]/).pop() ?? "";
  const normalized = baseName.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const dot = normalized.lastIndexOf(".");
  const ext =
    dot > 0
      ? normalized
          .slice(dot + 1)
          .replace(/[^A-Za-z0-9]/g, "")
          .slice(0, 8)
      : "";
  const base = (dot > 0 ? normalized.slice(0, dot) : normalized)
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return `${base || "documento"}${ext ? `.${ext.toLowerCase()}` : ""}`;
}

/** Erro de validação do arquivo, ou null se pode ser enviado. */
export function validateOwnerDocFile(file: { type: string; size: number }): string | null {
  if (!(ownerDocMimeTypes as readonly string[]).includes(file.type)) {
    return "Envie um PDF ou uma imagem (JPG, PNG ou WebP).";
  }
  if (file.size === 0) return "O arquivo está vazio.";
  if (file.size > OWNER_DOC_MAX_BYTES) return "O arquivo passa de 10 MB.";
  return null;
}
