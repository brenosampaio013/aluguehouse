"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useFavorites } from "@/components/favorites/favorites-provider";
import { HeartIcon, SearchIcon, UserIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/** Barra inferior fixa do celular. */
export function MobileTabBar() {
  const pathname = usePathname();
  const { signedIn } = useFavorites();
  const tabs = [
    { href: "/", label: "Explorar", Icon: SearchIcon },
    { href: "/favoritos", label: "Favoritos", Icon: HeartIcon },
    { href: "/entrar", label: signedIn ? "Conta" : "Entrar", Icon: UserIcon },
  ];
  // Na página do imóvel, a barra inferior mostra preço e contato no lugar dos atalhos.
  if (pathname.startsWith("/imoveis/")) return null;
  return (
    <nav
      aria-label="Atalhos"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-areia bg-marfim pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-3">
        {tabs.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-small font-semibold",
                  active ? "text-petroleo" : "text-rocha",
                )}
              >
                <Icon />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
