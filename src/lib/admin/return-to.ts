/**
 * Caminho de volta para uma lista do painel, vindo de um campo de
 * formulário. Só aceita caminhos dentro de `base` depois de normalizar
 * ".." e barras invertidas (nada de "//outro-site.com").
 */
export function safeReturnPath(
  value: unknown,
  base: string,
  notice: Record<string, string> = {},
  drop: string[] = [],
): string {
  let url = new URL(base, "http://painel.invalid");
  if (typeof value === "string" && value.startsWith("/")) {
    const candidate = new URL(value, "http://painel.invalid");
    const inside = candidate.pathname === base || candidate.pathname.startsWith(`${base}/`);
    if (candidate.origin === url.origin && inside) url = candidate;
  }
  for (const key of drop) url.searchParams.delete(key);
  for (const [key, val] of Object.entries(notice)) url.searchParams.set(key, val);
  return `${url.pathname}${url.search}`;
}
