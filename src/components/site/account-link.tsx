"use client";

import Link from "next/link";

import { useFavorites } from "@/components/favorites/favorites-provider";
import { UserIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/** "Entrar" para visitantes; "Minha conta" para quem já entrou. */
export function accountLabel(signedIn: boolean) {
  return signedIn ? "Minha conta" : "Entrar";
}

export function AccountLink({ className }: { className?: string }) {
  const { signedIn } = useFavorites();
  return (
    <Link
      href="/entrar"
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full border border-petroleo px-4 font-semibold text-petroleo transition-colors hover:bg-petroleo hover:text-marfim",
        className,
      )}
    >
      <UserIcon />
      {accountLabel(signedIn)}
    </Link>
  );
}
