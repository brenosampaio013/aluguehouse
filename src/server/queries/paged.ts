import "server-only";

import type { Paging } from "@/lib/admin/list-params";

export type { Paging };

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

/** Contagem exata só quando precisa: página da tela ou 1º lote da exportação. */
export function withCount(paging: Paging): "exact" | undefined {
  return paging.kind === "range" || paging.withCount ? "exact" : undefined;
}

/** A exportação passaria do limite: o admin precisa filtrar mais. */
export class ExportTooLargeError extends Error {
  constructor(
    readonly total: number,
    readonly limit: number,
  ) {
    super(`Exportação com ${total} linhas passa do limite de ${limit}.`);
  }
}

/**
 * Lê todas as linhas de uma consulta em lotes por cursor (o PostgREST devolve
 * no máximo DB_BATCH_SIZE por chamada). O total é contado uma única vez, no
 * primeiro lote; acima de `limit` lança ExportTooLargeError, nunca devolve
 * um resultado parcial. Registros criados durante a leitura podem entrar;
 * os que já existiam nunca são pulados nem repetidos.
 */
export async function fetchAllByCursor<T extends { id: string }>(
  fetchBatch: (paging: Extract<Paging, { kind: "after" }>) => Promise<{
    rows: T[];
    count: number;
  }>,
  limit: number,
  batchSize = DB_BATCH_SIZE,
): Promise<T[]> {
  const first = await fetchBatch({
    kind: "after",
    afterId: null,
    size: batchSize,
    withCount: true,
  });
  if (first.count > limit) throw new ExportTooLargeError(first.count, limit);

  const rows = [...first.rows];
  let batch = first.rows;
  while (batch.length === batchSize) {
    const afterId = batch[batch.length - 1]!.id;
    ({ rows: batch } = await fetchBatch({
      kind: "after",
      afterId,
      size: batchSize,
      withCount: false,
    }));
    rows.push(...batch);
    // Muitos registros criados durante a leitura: recusa em vez de cortar.
    if (rows.length > limit) throw new ExportTooLargeError(rows.length, limit);
  }
  return rows;
}
