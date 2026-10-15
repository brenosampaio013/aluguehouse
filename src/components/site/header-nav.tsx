"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

import { isActivePath, modeLinks } from "./nav-links";

/** Modalidades no cabeçalho do desktop, com a página atual marcada. */
export function HeaderNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Modalidades" className="hidden md:block">
      <ul className="flex gap-2">
        {modeLinks.map((link) => {
          const active = isActivePath(pathname, link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex min-h-11 items-center rounded-control px-3 tracking-[0.01em] text-abismo transition-colors hover:text-petroleo",
                  // Traço dourado embaixo: aparece ao passar o mouse e fica na página atual.
                  "after:absolute after:inset-x-3 after:bottom-1.5 after:h-px after:origin-left after:scale-x-0 after:bg-dourado after:transition-transform hover:after:scale-x-100",
                  active ? "font-bold after:scale-x-100" : "font-medium",
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
