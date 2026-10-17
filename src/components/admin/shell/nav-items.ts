import type { ComponentType, SVGProps } from "react";

import {
  BedIcon,
  BellIcon,
  CalendarIcon,
  DashboardIcon,
  FileIcon,
  HouseIcon,
  InboxIcon,
  KeyIcon,
  StarIcon,
  UserIcon,
  WalletIcon,
} from "@/components/ui/icons";

/** Cookie com a preferência do menu lateral (aberto ou recolhido). */
export const MENU_COOKIE = "painel-menu";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  exact?: boolean;
};

/** Áreas que usam a mesma estrutura: painel do admin e portal do proprietário. */
export type PanelArea = "admin" | "owner";

type AreaConfig = {
  home: string;
  /** Nome curto ao lado da marca e no início da trilha. */
  title: string;
  /** Nome do menu para leitores de tela. */
  navLabel: string;
  items: AdminNavItem[];
  segmentLabels: Record<string, string>;
};

export const panelAreas: Record<PanelArea, AreaConfig> = {
  admin: {
    home: "/admin",
    title: "Painel",
    navLabel: "Painel",
    items: [
      { href: "/admin", label: "Visão geral", icon: DashboardIcon, exact: true },
      { href: "/admin/solicitacoes", label: "Solicitações", icon: CalendarIcon },
      { href: "/admin/imoveis", label: "Imóveis", icon: HouseIcon },
      { href: "/admin/proprietarios", label: "Proprietários", icon: KeyIcon },
      { href: "/admin/contatos", label: "Contatos", icon: InboxIcon },
      { href: "/admin/avaliacoes", label: "Avaliações", icon: StarIcon },
    ],
    segmentLabels: {
      imoveis: "Imóveis",
      novo: "Novo imóvel",
      solicitacoes: "Solicitações",
      proprietarios: "Proprietários",
      contatos: "Contatos",
      avaliacoes: "Avaliações",
    },
  },
  owner: {
    home: "/proprietario",
    title: "Proprietário",
    navLabel: "Portal do proprietário",
    items: [
      { href: "/proprietario", label: "Visão geral", icon: DashboardIcon, exact: true },
      { href: "/proprietario/imoveis", label: "Meus imóveis", icon: HouseIcon },
      { href: "/proprietario/calendario", label: "Calendário", icon: CalendarIcon },
      { href: "/proprietario/reservas", label: "Reservas", icon: BedIcon },
      { href: "/proprietario/financeiro", label: "Financeiro", icon: WalletIcon },
      { href: "/proprietario/documentos", label: "Documentos", icon: FileIcon },
      { href: "/proprietario/notificacoes", label: "Notificações", icon: BellIcon },
      { href: "/proprietario/perfil", label: "Meu perfil", icon: UserIcon },
    ],
    segmentLabels: {
      imoveis: "Meus imóveis",
      calendario: "Calendário",
      reservas: "Reservas",
      financeiro: "Financeiro",
      documentos: "Documentos",
      notificacoes: "Notificações",
      perfil: "Meu perfil",
    },
  },
};

export function isActive(pathname: string, item: AdminNavItem) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Trilha de navegação a partir do caminho: /admin/imoveis/novo → Painel › Imóveis › Novo imóvel. */
export function breadcrumbsFor(pathname: string, area: PanelArea = "admin") {
  const { home, title, segmentLabels } = panelAreas[area];
  const parts = pathname.split("/").filter(Boolean).slice(1); // sem a raiz da área
  const crumbs = [{ href: home, label: title }];
  let href = home;
  for (const part of parts) {
    href += `/${part}`;
    crumbs.push({ href, label: segmentLabels[part] ?? "Detalhes" });
  }
  return crumbs;
}
