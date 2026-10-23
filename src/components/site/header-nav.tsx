"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

import { headerLinks, isActivePath } from "./nav-links";

/** Modalidades no centro do cabeçalho (tablet e computador), com a página atual marcada. */
export function HeaderNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Modalidades" className="hidden justify-self-center md:block">
      <ul className="flex items-center gap-6 lg:gap-10">
        {headerLinks.map((link) => {
          const active = isActivePath(pathname, link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-22 items-center text-[1.0625rem] tracking-[0.005em] transition-colors duration-200",
                  // Linha fina embaixo: cresce ao passar o mouse e fica na página atual.
                  "after:absolute after:inset-x-0 after:bottom-5 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-petroleo after:transition-transform after:duration-300 hover:after:scale-x-100",
                  active
                    ? "font-semibold text-petroleo after:scale-x-100"
                    : "font-medium text-abismo/80 hover:text-petroleo",
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
