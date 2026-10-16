import "server-only";

import { unstable_rethrow } from "next/navigation";

export type Settled<T> = { ok: true; data: T } | { ok: false };

/**
 * Executa uma consulta sem derrubar a página inteira: uma seção que falha
 * mostra o próprio aviso de erro e as outras continuam funcionando.
 */
export async function settle<T>(task: PromiseLike<T>, label: string): Promise<Settled<T>> {
  try {
    return { ok: true, data: await task };
  } catch (error) {
    // Sinais internos do Next (página dinâmica, redirect, 404) não são falhas.
    unstable_rethrow(error);
    console.error(`Falha ao carregar: ${label}`, error);
    return { ok: false };
  }
}
