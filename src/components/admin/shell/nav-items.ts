import type { ComponentType, SVGProps } from "react";

import { CalendarIcon, DashboardIcon, HouseIcon, InboxIcon, StarIcon } from "@/components/ui/icons";

/** Cookie com a preferência do menu lateral (aberto ou recolhido). */
export const MENU_COOKIE = "painel-menu";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  exact?: boolean;
};

export const adminNavItems: AdminNavItem[] = [
  { href: "/admin", label: "Visão geral", icon: DashboardIcon, exact: true },
  { href: "/admin/solicitacoes", label: "Solicitações", icon: CalendarIcon },
  { href: "/admin/imoveis", label: "Imóveis", icon: HouseIcon },
  { href: "/admin/contatos", label: "Contatos", icon: InboxIcon },
  { href: "/admin/avaliacoes", label: "Avaliações", icon: StarIcon },
];

export function isActive(pathname: string, item: AdminNavItem) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

const segmentLabels: Record<string, string> = {
  imoveis: "Imóveis",
  novo: "Novo imóvel",
  solicitacoes: "Solicitações",
  contatos: "Contatos",
  avaliacoes: "Avaliações",
};

/** Trilha de navegação a partir do caminho: /admin/imoveis/novo → Painel › Imóveis › Novo imóvel. */
export function breadcrumbsFor(pathname: string) {
  const parts = pathname.split("/").filter(Boolean).slice(1); // sem "admin"
  const crumbs = [{ href: "/admin", label: "Painel" }];
  let href = "/admin";
  for (const part of parts) {
    href += `/${part}`;
    crumbs.push({ href, label: segmentLabels[part] ?? "Detalhes" });
  }
  return crumbs;
}
