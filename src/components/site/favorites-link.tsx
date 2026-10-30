"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useFavorites } from "@/components/favorites/favorites-provider";
import { HeartIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/** Favoritos no cabeçalho: coração preenchido e contagem quando há imóveis salvos. */
export function FavoritesLink() {
  const { count } = useFavorites();
  const pathname = usePathname();
  const active = pathname === "/favoritos";
  return (
    <Link
      href="/favoritos"
      aria-current={active ? "page" : undefined}
      className={cn(
        "group inline-flex min-h-11 items-center gap-2 rounded-full px-2 font-medium transition-colors lg:px-3",
        active ? "text-petroleo" : "text-rocha hover:text-petroleo",
      )}
    >
      <HeartIcon
        width={22}
        height={22}
        className={cn(
          "shrink-0 transition-colors",
          count > 0 ? "fill-petroleo text-petroleo" : "text-petroleo",
        )}
      />
      {/* No tablet só o coração; o nome segue para leitores de tela. */}
      <span className="max-lg:sr-only">Favoritos</span>
      {count > 0 ? (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-petroleo px-1.5 text-[0.75rem] leading-none font-bold text-branco tabular-nums">
          {count}
          <span className="sr-only"> {count === 1 ? "imóvel salvo" : "imóveis salvos"}</span>
        </span>
      ) : null}
    </Link>
  );
}
