"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

const links = [
  { href: "/admin", label: "Início", exact: true },
  { href: "/admin/imoveis", label: "Imóveis", exact: false },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Painel">
      <ul className="flex gap-1">
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
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
