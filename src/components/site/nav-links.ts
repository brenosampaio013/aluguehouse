export const modeLinks = [
  { href: "/temporada", label: "Temporada" },
  { href: "/mensal", label: "Mensal" },
  { href: "/venda", label: "Venda" },
] as const;

/** Link da modalidade ativo na página atual (inclui subpáginas). */
export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
