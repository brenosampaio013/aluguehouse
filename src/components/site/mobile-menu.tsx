"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { useFavorites } from "@/components/favorites/favorites-provider";
import { CloseIcon, HeartIcon, MenuIcon, UserIcon, WhatsAppIcon } from "@/components/ui/icons";
import { whatsappLink } from "@/lib/whatsapp";

import { accountLabel } from "./account-link";
import { CONTACT_MESSAGE } from "./contact";
import { headerLinks, isActivePath } from "./nav-links";

/** Menu do celular: modalidades, favoritos, conta e contato. Fecha com Esc e devolve o foco. */
export function MobileMenu() {
  const { signedIn, count } = useFavorites();
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
          {headerLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={isActivePath(pathname, link.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center font-serif text-h3 text-abismo aria-[current=page]:underline aria-[current=page]:decoration-petroleo aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-6"
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li className="mt-1 border-t border-areia pt-1">
            <Link
              href="/favoritos"
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center gap-3 font-semibold text-petroleo"
            >
              <HeartIcon className={count > 0 ? "fill-petroleo" : undefined} />
              Favoritos
              {count > 0 ? (
                <span className="rounded-full bg-petroleo px-2 text-small text-branco tabular-nums">
                  {count}
                  <span className="sr-only">
                    {" "}
                    {count === 1 ? "imóvel salvo" : "imóveis salvos"}
                  </span>
                </span>
              ) : null}
            </Link>
          </li>
          <li>
            <Link
              href="/entrar"
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center gap-3 font-semibold text-petroleo"
            >
              <UserIcon />
              {accountLabel(signedIn)}
            </Link>
          </li>
          {signedIn ? (
            <li>
              <Link
                href="/minhas-estadias"
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center pl-8 font-medium text-abismo"
              >
                Minhas estadias
              </Link>
            </li>
          ) : null}
          <li className="mt-1 grid gap-2 border-t border-areia pt-3 pb-2">
            <a
              href={whatsappLink(CONTACT_MESSAGE)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-petroleo px-5 font-semibold text-branco"
            >
              <WhatsAppIcon width={20} height={20} />
              Fale conosco
              <span className="sr-only"> pelo WhatsApp (abre em nova aba)</span>
            </a>
            <Link
              href="/contato"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-11 items-center justify-center font-semibold text-petroleo underline underline-offset-3"
            >
              Formulário de contato
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
