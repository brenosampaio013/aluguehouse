"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { useFavorites } from "@/components/favorites/favorites-provider";
import { ChevronDownIcon, UserIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { signOut } from "@/server/actions/auth";

/** "Entrar" para visitantes; "Minha conta" para quem já entrou. */
export function accountLabel(signedIn: boolean) {
  return signedIn ? "Minha conta" : "Entrar";
}

const pill =
  "inline-flex min-h-11 items-center gap-2 rounded-full border border-petroleo/35 bg-branco px-4 font-semibold text-petroleo transition-[border-color,background-color,box-shadow] duration-200 hover:border-petroleo hover:shadow-[0_2px_10px_-4px_rgb(16_59_64/0.35)]";

const item =
  "flex min-h-11 w-full items-center rounded-control px-3 text-left font-medium text-abismo transition-colors hover:bg-marfim focus-visible:bg-marfim";

/**
 * Conta no cabeçalho do computador. Visitante: "Entrar" (leva ao login).
 * Conectado: "Minha conta" abre um menu com as páginas da conta e "Sair",
 * as mesmas da página /entrar. Esc ou clique fora fecham.
 */
export function AccountMenu({ className }: { className?: string }) {
  const { signedIn } = useFavorites();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Fecha ao trocar de página.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!signedIn) {
    return (
      <Link href="/entrar" className={cn(pill, className)}>
        <UserIcon />
        {accountLabel(false)}
      </Link>
    );
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className={cn(pill, open && "border-petroleo")}
      >
        <UserIcon />
        {accountLabel(true)}
        <ChevronDownIcon
          width={16}
          height={16}
          className={cn("transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      <div
        id={id}
        hidden={!open}
        className="absolute top-full right-0 z-30 mt-2 w-60 rounded-photo border border-areia bg-branco p-2 shadow-flutuante"
      >
        <ul className="grid gap-0.5">
          <li>
            <Link href="/entrar" className={item}>
              Minha conta
            </Link>
          </li>
          <li>
            <Link href="/minhas-estadias" className={item}>
              Minhas estadias
            </Link>
          </li>
          <li>
            <Link href="/favoritos" className={item}>
              Favoritos
            </Link>
          </li>
          <li className="mt-1 border-t border-areia pt-1">
            <form action={signOut}>
              <button type="submit" className={cn(item, "text-petroleo")}>
                Sair
              </button>
            </form>
          </li>
        </ul>
      </div>
    </div>
  );
}
