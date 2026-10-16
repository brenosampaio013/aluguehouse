import "server-only";

type PagedResult<T> = {
  data: T[] | null;
  error: { code?: string; details?: string | null } | null;
  count: number | null;
};

/**
 * Resultado de uma consulta paginada. Uma página além do fim (link antigo,
 * itens excluídos) não é erro: vira lista vazia, com o total para a
 * paginação levar de volta às páginas que existem.
 */
export function pagedRows<T>(result: PagedResult<T>): { rows: T[]; count: number } {
  if (result.error?.code === "PGRST103") {
    const total = Number(/only (\d+) rows/.exec(result.error.details ?? "")?.[1] ?? 0);
    return { rows: [], count: total };
  }
  if (result.error) throw result.error;
  return { rows: result.data ?? [], count: result.count ?? 0 };
}
