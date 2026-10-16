import "server-only";

/**
 * Arquivos de um imóvel no Storage, para a exclusão completa. Recebe só o
 * necessário do cliente Supabase (facilita testar com um Storage simulado).
 */

type StorageError = { message: string } | null;

export type BucketApi = {
  list(
    prefix: string,
    options: { limit: number; offset: number },
  ): Promise<{ data: { name: string }[] | null; error: StorageError }>;
  remove(paths: string[]): Promise<{ error: StorageError }>;
};

export type StorageApi = { from(bucket: string): BucketApi };

const STORAGE_PAGE = 1000;

/** Todos os nomes de uma pasta do Storage, em páginas (lança se falhar). */
async function listAll(storage: BucketApi, prefix: string) {
  const names: string[] = [];
  for (let offset = 0; ; offset += STORAGE_PAGE) {
    const { data, error } = await storage.list(prefix, { limit: STORAGE_PAGE, offset });
    if (error) throw error;
    const page = data ?? [];
    names.push(...page.map((item) => item.name));
    if (page.length < STORAGE_PAGE) return names;
  }
}

/**
 * Caminhos de todos os arquivos do imóvel num bucket ("<imóvel>/<mídia>/<arquivo>").
 * Lança se o Storage falhar: sem a lista completa, o imóvel não é excluído.
 */
export async function storageFiles(storage: StorageApi, bucket: string, propertyId: string) {
  const bucketApi = storage.from(bucket);
  const folders = await listAll(bucketApi, propertyId);
  const perFolder = await Promise.all(
    folders.map(async (folder) => {
      const prefix = `${propertyId}/${folder}`;
      return (await listAll(bucketApi, prefix)).map((name) => `${prefix}/${name}`);
    }),
  );
  return perFolder.flat();
}

/** Remove arquivos em lotes; devolve quantos não puderam ser apagados. */
export async function removeFiles(storage: StorageApi, bucket: string, paths: string[]) {
  let failed = 0;
  for (let i = 0; i < paths.length; i += STORAGE_PAGE) {
    const batch = paths.slice(i, i + STORAGE_PAGE);
    const { error } = await storage.from(bucket).remove(batch);
    if (error) {
      failed += batch.length;
      console.error(`Falha ao apagar ${batch.length} arquivo(s) do bucket ${bucket}`, error);
    }
  }
  return failed;
}
