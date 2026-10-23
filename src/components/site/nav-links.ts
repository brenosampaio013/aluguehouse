/** Todas as modalidades (rodapé). */
export const modeLinks = [
  { href: "/temporada", label: "Temporada" },
  { href: "/mensal", label: "Mensal" },
  { href: "/venda", label: "Venda" },
] as const;

/**
 * Modalidades do cabeçalho e do menu do celular. O aluguel mensal continua em
 * /mensal (link na listagem de temporada e no rodapé), mas saiu do cabeçalho.
 */
export const headerLinks = modeLinks.filter((link) => link.href !== "/mensal");

/** Link da modalidade ativo na página atual (inclui subpáginas). */
export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
