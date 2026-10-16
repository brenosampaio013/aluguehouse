import { describe, expect, it } from "vitest";

import {
  ExportChangedError,
  ExportTooLargeError,
  fetchAllPages,
  pagedRows,
} from "@/server/queries/paged";

/** Simula o PostgREST: no máximo `maxRows` por chamada, com contagem exata. */
function fakeTable(total: number, maxRows = 1000) {
  const rows = Array.from({ length: total }, (_, i) => ({ id: `id-${i}` }));
  const calls: { from: number; to: number }[] = [];
  return {
    rows,
    calls,
    fetchPage: async (range: { from: number; to: number }) => {
      calls.push(range);
      const end = Math.min(range.to, range.from + maxRows - 1);
      return { rows: rows.slice(range.from, end + 1), count: rows.length };
    },
  };
}

describe("exportação em lotes", () => {
  it("lê todas as linhas acima do limite de 1.000 do PostgREST", async () => {
    const table = fakeTable(2500);
    const rows = await fetchAllPages(table.fetchPage, 50_000);
    expect(rows).toHaveLength(2500);
    expect(rows.at(-1)).toEqual({ id: "id-2499" });
    expect(table.calls).toEqual([
      { from: 0, to: 999 },
      { from: 1000, to: 1999 },
      { from: 2000, to: 2999 },
    ]);
  });

  it("exatamente 1.000 linhas: uma chamada só", async () => {
    const table = fakeTable(1000);
    expect(await fetchAllPages(table.fetchPage, 50_000)).toHaveLength(1000);
    expect(table.calls).toHaveLength(1);
  });

  it("vazio", async () => {
    expect(await fetchAllPages(fakeTable(0).fetchPage, 10)).toEqual([]);
  });

  it("acima do limite: recusa em vez de cortar", async () => {
    const table = fakeTable(1500);
    await expect(fetchAllPages(table.fetchPage, 1200)).rejects.toBeInstanceOf(ExportTooLargeError);
    expect(table.calls).toHaveLength(1);
  });

  it("linhas apagadas no meio da leitura: recusa em vez de entregar incompleto", async () => {
    const table = fakeTable(1500);
    const fetchPage = async (range: { from: number; to: number }) => {
      const page = await table.fetchPage(range);
      if (range.from === 0) table.rows.splice(0, 10); // dez excluídas depois do 1º lote
      return page;
    };
    await expect(fetchAllPages(fetchPage, 50_000)).rejects.toBeInstanceOf(ExportChangedError);
  });

  it("página além do fim vira lista vazia com o total", () => {
    expect(
      pagedRows({
        data: null,
        count: null,
        error: {
          code: "PGRST103",
          details: "An offset of 100 was requested, but there are only 4 rows.",
        },
      }),
    ).toEqual({ rows: [], count: 4 });
  });
});
