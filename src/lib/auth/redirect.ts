/** Cookie que guarda para onde voltar depois do login por link. */
export const NEXT_PATH_COOKIE = "ah_next";

/**
 * Aceita apenas caminhos internos ("/favoritos"), nunca URLs externas
 * ("https://…", "//dominio", "/\\dominio"). Evita redirecionamento aberto.
 */
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 200) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  if (/[\u0000-\u001f]/.test(value)) return null;
  return value;
}
