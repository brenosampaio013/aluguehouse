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

/** Máximo de linhas por chamada ao PostgREST (`max_rows` em supabase/config.toml). */
export const DB_BATCH_SIZE = 1000;

/** A exportação passaria do limite: o admin precisa filtrar mais. */
export class ExportTooLargeError extends Error {
  constructor(
    readonly total: number,
    readonly limit: number,
  ) {
    super(`Exportação com ${total} linhas passa do limite de ${limit}.`);
  }
}

/** As linhas mudaram enquanto os lotes eram lidos: o arquivo sairia incompleto. */
export class ExportChangedError extends Error {
  constructor() {
    super("Os dados mudaram durante a exportação.");
  }
}

/**
 * Lê todas as linhas de uma consulta em lotes (o PostgREST devolve no
 * máximo DB_BATCH_SIZE por chamada). Nunca devolve um resultado parcial:
 * acima de `limit` lança ExportTooLargeError, e se o total lido não bater
 * com a contagem do banco lança ExportChangedError.
 */
export async function fetchAllPages<T extends { id: string }>(
  fetchPage: (range: { from: number; to: number }) => Promise<{ rows: T[]; count: number }>,
  limit: number,
  batchSize = DB_BATCH_SIZE,
): Promise<T[]> {
  const first = await fetchPage({ from: 0, to: batchSize - 1 });
  if (first.count > limit) throw new ExportTooLargeError(first.count, limit);

  const byId = new Map(first.rows.map((row) => [row.id, row]));
  for (let from = batchSize; from < first.count; from += batchSize) {
    const page = await fetchPage({ from, to: from + batchSize - 1 });
    for (const row of page.rows) byId.set(row.id, row);
  }
  if (byId.size !== first.count) throw new ExportChangedError();
  return [...byId.values()];
}
