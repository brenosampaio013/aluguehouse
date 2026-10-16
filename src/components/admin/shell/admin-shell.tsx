"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  ChevronLeftIcon,
  CloseIcon,
  ExternalIcon,
  LogoutIcon,
  MenuIcon,
  PanelIcon,
} from "@/components/ui/icons";
import { Wordmark } from "@/components/ui/wordmark";
import { cn } from "@/lib/cn";
import { signOut } from "@/server/actions/auth";

import { AdminNav } from "./admin-nav";
import { Breadcrumbs } from "./breadcrumbs";
import { MENU_COOKIE } from "./nav-items";

type Props = {
  children: ReactNode;
  email: string | null;
  pending: Record<string, number>;
  /** Estado inicial do menu no computador (lido do cookie no servidor). */
  initialCollapsed: boolean;
};

/**
 * Estrutura do painel: menu lateral recolhível no computador, gaveta no
 * celular e cabeçalho com trilha de navegação e perfil.
 */
export function AdminShell({ children, email, pending, initialCollapsed }: Props) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const drawerRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  // Fecha a gaveta ao trocar de página.
  useEffect(() => {
    drawerRef.current?.close();
  }, [pathname]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    // Preferência só deste navegador; o servidor lê para evitar "piscar".
    document.cookie = `${MENU_COOKIE}=${next ? "recolhido" : "aberto"}; path=/admin; max-age=31536000; samesite=lax`;
  }

  const initial = (email ?? "A").charAt(0).toUpperCase();

  return (
    <div className="flex min-h-dvh flex-1 bg-marfim">
      {/* Menu lateral (computador) */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-areia bg-branco transition-[width] duration-200 lg:flex",
          collapsed ? "w-[4.75rem]" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center border-b border-areia px-4",
            collapsed && "justify-center px-0",
          )}
        >
          <Link
            href="/admin"
            className="flex items-baseline gap-2"
            aria-label="Painel Alugue Houses"
          >
            {collapsed ? (
              <span aria-hidden="true" className="font-serif text-h3 font-medium">
                AH
              </span>
            ) : (
              <>
                <Wordmark className="text-[1.125rem]" />
                <span className="text-small text-rocha">Painel</span>
              </>
            )}
          </Link>
        </div>
        <div className="relative flex-1 overflow-y-auto p-3">
          <AdminNav pending={pending} collapsed={collapsed} />
        </div>
        <div className="grid gap-1 border-t border-areia p-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            title={collapsed ? "Ver site" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-control px-3 font-semibold text-rocha hover:bg-marfim hover:text-abismo",
              collapsed && "justify-center px-0",
            )}
          >
            <ExternalIcon className="shrink-0" />
            <span className={cn(collapsed && "sr-only")}>Ver site</span>
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-pressed={collapsed}
            title={collapsed ? "Expandir menu" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-control px-3 font-semibold text-rocha hover:bg-marfim hover:text-abismo",
              collapsed && "justify-center px-0",
            )}
          >
            <ChevronLeftIcon
              className={cn("shrink-0 transition-transform", collapsed && "rotate-180")}
            />
            <span className={cn(collapsed && "sr-only")}>
              {collapsed ? "Expandir menu" : "Recolher menu"}
            </span>
          </button>
        </div>
      </aside>

      {/* Gaveta (celular e tablet) */}
      <dialog
        ref={drawerRef}
        aria-label="Menu do painel"
        className="m-0 h-dvh max-h-none w-72 max-w-[85vw] bg-branco p-0 text-abismo backdrop:bg-abismo/40 lg:hidden"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-areia px-4">
            <span className="flex items-baseline gap-2">
              <Wordmark className="text-[1.125rem]" />
              <span className="text-small text-rocha">Painel</span>
            </span>
            <button
              type="button"
              onClick={() => drawerRef.current?.close()}
              className="inline-flex size-11 items-center justify-center rounded-control hover:bg-marfim"
            >
              <CloseIcon />
              <span className="sr-only">Fechar menu</span>
            </button>
          </div>
          <div className="relative flex-1 overflow-y-auto p-3">
            <AdminNav pending={pending} onNavigate={() => drawerRef.current?.close()} />
          </div>
          <div className="border-t border-areia p-3">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center gap-3 rounded-control px-3 font-semibold text-rocha hover:bg-marfim"
            >
              <ExternalIcon />
              Ver site
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
          </div>
        </div>
      </dialog>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-areia bg-branco/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => drawerRef.current?.showModal()}
            className="-ml-2 inline-flex size-11 shrink-0 items-center justify-center rounded-control text-abismo hover:bg-marfim lg:hidden"
          >
            <MenuIcon />
            <span className="sr-only">Abrir menu</span>
          </button>
          <PanelIcon aria-hidden="true" className="hidden shrink-0 text-rocha lg:block" />
          <div className="min-w-0 flex-1">
            <Breadcrumbs />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-flex size-9 items-center justify-center rounded-full bg-nevoa font-semibold text-petroleo"
            >
              {initial}
            </span>
            <span className="hidden max-w-56 truncate text-small text-rocha md:block">{email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center gap-2 rounded-control px-2 font-semibold text-petroleo hover:bg-marfim sm:px-3"
              >
                <LogoutIcon />
                <span className="sr-only sm:not-sr-only">Sair</span>
              </button>
            </form>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
