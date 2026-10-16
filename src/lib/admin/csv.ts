/**
 * Geração de CSV para abrir no Excel em português: separador ";", quebra
 * de linha CRLF e BOM UTF-8 (acentos corretos).
 */

export type CsvValue = string | number | boolean | null | undefined;

const decimal = new Intl.NumberFormat("pt-BR", { useGrouping: false, maximumFractionDigits: 2 });

function cell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  let text =
    typeof value === "number"
      ? decimal.format(value)
      : typeof value === "boolean"
        ? value
          ? "Sim"
          : "Não"
        : value;
  // Injeção de fórmula: planilhas executam células que começam com = + - @.
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(cell).join(";"));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

/** Nome de arquivo com a data: "solicitacoes-2026-10-16.csv". */
export function csvFilename(base: string, today: string) {
  return `${base}-${today}.csv`;
}
