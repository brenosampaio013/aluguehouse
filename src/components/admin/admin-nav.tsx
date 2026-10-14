"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

const links = [
  { href: "/admin", label: "Início", exact: true },
  { href: "/admin/solicitacoes", label: "Solicitações", exact: false },
  { href: "/admin/avaliacoes", label: "Avaliações", exact: false },
  { href: "/admin/contatos", label: "Contatos", exact: false },
  { href: "/admin/imoveis", label: "Imóveis", exact: false },
];

export function AdminNav({
  pending = {},
}: {
  /** Pendências por link (ex.: solicitações e avaliações). */
  pending?: Record<string, number>;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Painel">
      <ul className="flex flex-wrap gap-1">
        {links.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-control px-3 font-semibold",
                  active ? "bg-nevoa text-abismo" : "text-petroleo hover:bg-areia",
                )}
              >
                {link.label}
                {(pending[link.href] ?? 0) > 0 ? (
                  <span className="ml-2 inline-flex min-w-6 justify-center rounded-full bg-petroleo px-1.5 text-small text-branco tabular-nums">
                    {pending[link.href]}
                    <span className="sr-only"> pendentes</span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
