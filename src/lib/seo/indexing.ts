/**
 * Indexação por buscadores. Desligada por padrão: o site só deve aparecer no
 * Google depois do domínio e da regularização (CRECI). Liga com
 * SITE_INDEXING=on (lida em tempo de execução, sem novo build).
 */
export function indexingEnabled(value = process.env.SITE_INDEXING): boolean {
  return value === "on";
}

/** Caminhos que nunca devem ser indexados. */
export const privatePaths = ["/admin", "/auth", "/entrar", "/favoritos", "/minhas-estadias"];
