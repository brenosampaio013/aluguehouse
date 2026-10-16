import { describe, expect, it, vi } from "vitest";

import { removeFiles, storageFiles, type StorageApi } from "@/server/storage-files";

/** Storage simulado: pastas → arquivos, com paginação limit/offset real. */
function fakeStorage(
  tree: Record<string, string[]>,
  fail: { list?: string; remove?: boolean } = {},
) {
  const removed: string[][] = [];
  const api: StorageApi = {
    from: () => ({
      list: async (prefix, { limit, offset }) => {
        if (fail.list === prefix) return { data: null, error: { message: "timeout" } };
        const names = tree[prefix] ?? [];
        return { data: names.slice(offset, offset + limit).map((name) => ({ name })), error: null };
      },
      remove: async (paths) => {
        removed.push(paths);
        return { error: fail.remove ? { message: "indisponível" } : null };
      },
    }),
  };
  return { api, removed };
}

describe("arquivos do imóvel no Storage", () => {
  it("lista todas as pastas e arquivos, inclusive acima de 1.000 por pasta", async () => {
    const many = Array.from({ length: 2300 }, (_, i) => `f${i}.webp`);
    const { api } = fakeStorage({ p1: ["m1", "m2"], "p1/m1": many, "p1/m2": ["a.webp"] });
    const paths = await storageFiles(api, "property-media", "p1");
    expect(paths).toHaveLength(2301);
    expect(paths).toContain("p1/m1/f2299.webp");
    expect(paths).toContain("p1/m2/a.webp");
  });

  it("falha ao listar lança erro (o imóvel não é excluído)", async () => {
    const { api } = fakeStorage({ p1: ["m1"], "p1/m1": ["a.webp"] }, { list: "p1/m1" });
    await expect(storageFiles(api, "property-media", "p1")).rejects.toMatchObject({
      message: "timeout",
    });
  });

  it("remove em lotes de até 1.000 e conta os que falharam", async () => {
    const paths = Array.from({ length: 2500 }, (_, i) => `p1/m/f${i}`);
    const ok = fakeStorage({});
    expect(await removeFiles(ok.api, "property-media", paths)).toBe(0);
    expect(ok.removed.map((batch) => batch.length)).toEqual([1000, 1000, 500]);

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = fakeStorage({}, { remove: true });
    expect(await removeFiles(broken.api, "property-media", paths)).toBe(2500);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("nada a remover: nenhuma chamada", async () => {
    const { api, removed } = fakeStorage({});
    expect(await removeFiles(api, "property-media", [])).toBe(0);
    expect(removed).toEqual([]);
  });
});
