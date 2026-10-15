"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { useFavorites } from "@/components/favorites/favorites-provider";
import { CloseIcon, MenuIcon } from "@/components/ui/icons";

import { accountLabel } from "./account-link";
import { isActivePath, modeLinks } from "./nav-links";

/** Menu do celular: modalidades, favoritos e conta. Fecha com Esc e devolve o foco. */
export function MobileMenu() {
  const { signedIn } = useFavorites();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-11 items-center justify-center rounded-full text-abismo hover:bg-areia"
      >
        {open ? <CloseIcon width={24} height={24} /> : <MenuIcon width={24} height={24} />}
        <span className="sr-only">{open ? "Fechar menu" : "Abrir menu"}</span>
      </button>
      <nav
        id={panelId}
        aria-label="Menu principal"
        hidden={!open}
        className="absolute inset-x-0 top-full z-30 border-b border-areia bg-marfim shadow-flutuante"
      >
        <ul className="grid px-4 py-2">
          {modeLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={isActivePath(pathname, link.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center font-serif text-h3 text-abismo aria-[current=page]:underline aria-[current=page]:decoration-dourado aria-[current=page]:decoration-1 aria-[current=page]:underline-offset-6"
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li className="mt-1 border-t border-areia pt-1">
            <Link
              href="/favoritos"
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center font-semibold text-petroleo"
            >
              Favoritos
            </Link>
          </li>
          <li>
            <Link
              href="/entrar"
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center font-semibold text-petroleo"
            >
              {accountLabel(signedIn)}
            </Link>
          </li>
          <li>
            <Link
              href="/contato"
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center font-semibold text-petroleo"
            >
              Contato
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
