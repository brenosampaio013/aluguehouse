import { describe, expect, it } from "vitest";

import type { Paging } from "@/lib/admin/list-params";
import { sortRows, timeValue } from "@/lib/admin/sort";
import { ExportTooLargeError, fetchAllByCursor, pagedRows } from "@/server/queries/paged";

type Row = { id: string };
type After = Extract<Paging, { kind: "after" }>;

const id = (n: number) => `id-${String(n).padStart(6, "0")}`;

/**
 * Simula o PostgREST com cursor: `id > afterId order by id limit size`,
 * no máximo `maxRows` por chamada, contagem só quando pedida.
 */
function fakeTable(total: number, maxRows = 1000) {
  let rows: Row[] = Array.from({ length: total }, (_, i) => ({ id: id(i) }));
  const calls: After[] = [];
  return {
    calls,
    mutate: (fn: (rows: Row[]) => Row[]) => {
      rows = fn(rows).sort((a, b) => (a.id < b.id ? -1 : 1));
    },
    fetchBatch: async (paging: After) => {
      calls.push(paging);
      const after = paging.afterId;
      const page = rows
        .filter((row) => after === null || row.id > after)
        .slice(0, Math.min(paging.size, maxRows));
      return { rows: page, count: paging.withCount ? rows.length : 0 };
    },
  };
}

describe("exportação por cursor", () => {
  it("lê todas as linhas acima do limite de 1.000 do PostgREST", async () => {
    const table = fakeTable(2500);
    const rows = await fetchAllByCursor(table.fetchBatch, 20_000);
    expect(rows).toHaveLength(2500);
    expect(new Set(rows.map((r) => r.id)).size).toBe(2500);
    expect(table.calls.map((c) => c.afterId)).toEqual([null, id(999), id(1999)]);
  });

  it("conta o total só no primeiro lote", async () => {
    const table = fakeTable(2500);
    await fetchAllByCursor(table.fetchBatch, 20_000);
    expect(table.calls.map((c) => c.withCount)).toEqual([true, false, false]);
  });

  it("exatamente 1.000 linhas: um lote cheio e um vazio confirmando o fim", async () => {
    const table = fakeTable(1000);
    expect(await fetchAllByCursor(table.fetchBatch, 20_000)).toHaveLength(1000);
    expect(table.calls).toHaveLength(2);
  });

  it("vazio", async () => {
    expect(await fetchAllByCursor(fakeTable(0).fetchBatch, 10)).toEqual([]);
  });

  it("acima do limite: recusa em vez de cortar", async () => {
    const table = fakeTable(1500);
    await expect(fetchAllByCursor(table.fetchBatch, 1200)).rejects.toBeInstanceOf(
      ExportTooLargeError,
    );
    expect(table.calls).toHaveLength(1);
  });

  it("inserção e exclusão entre lotes não pulam nem repetem os registros que já existiam", async () => {
    const table = fakeTable(2500);
    const fetchBatch = async (paging: After) => {
      const page = await table.fetchBatch(paging);
      if (paging.afterId === null) {
        // Depois do 1º lote: um registro novo no começo e um excluído já lido.
        table.mutate((rows) => [{ id: "id-000000a" }, ...rows.filter((r) => r.id !== id(10))]);
      }
      return page;
    };
    const rows = await fetchAllByCursor(fetchBatch, 20_000);
    const ids = rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length); // sem repetidas
    // Todos os 2.500 originais aparecem (o excluído já tinha sido lido no 1º lote).
    for (let n = 0; n < 2500; n++) expect(ids).toContain(id(n));
  });

  it("muitos registros criados durante a leitura: recusa em vez de cortar", async () => {
    const table = fakeTable(1500);
    const fetchBatch = async (paging: After) => {
      const page = await table.fetchBatch(paging);
      if (paging.afterId === null) {
        table.mutate((rows) => [
          ...rows,
          ...Array.from({ length: 600 }, (_, i) => ({ id: `z${i}` })),
        ]);
      }
      return page;
    };
    await expect(fetchAllByCursor(fetchBatch, 2000)).rejects.toBeInstanceOf(ExportTooLargeError);
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

describe("ordem da exportação igual à da tela", () => {
  const rows = [
    { id: "b", title: "Ébano", total: null, at: "2026-10-16T10:00:00.5+00:00" },
    { id: "a", title: "abacate", total: 300, at: "2026-10-16T10:00:00.25+00:00" },
    { id: "c", title: "Zebra", total: 100, at: "2026-10-16T09:59:59+00:00" },
    { id: "d", title: "abacate", total: 100, at: null },
  ];

  it("texto em português, sem diferenciar maiúsculas e acentos; desempate por id", () => {
    expect(sortRows(rows, (r) => r.title, "asc").map((r) => r.id)).toEqual(["a", "d", "b", "c"]);
  });

  it("vazios no fim em ordem crescente e no começo em decrescente (como o Postgres)", () => {
    expect(sortRows(rows, (r) => r.total, "asc").map((r) => r.id)).toEqual(["c", "d", "a", "b"]);
    expect(sortRows(rows, (r) => r.total, "desc").map((r) => r.id)).toEqual(["b", "a", "c", "d"]);
  });

  it("datas em ordem cronológica, não pelo texto (frações de segundo variáveis)", () => {
    expect(sortRows(rows, (r) => timeValue(r.at), "asc").map((r) => r.id)).toEqual([
      "c",
      "a",
      "b",
      "d",
    ]);
  });
});
