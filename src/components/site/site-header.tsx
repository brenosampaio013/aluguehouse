import Link from "next/link";

import { Container } from "@/components/ui/container";
import { WhatsAppIcon } from "@/components/ui/icons";
import { BrandMark, Wordmark } from "@/components/ui/wordmark";
import { whatsappLink } from "@/lib/whatsapp";

import { AccountMenu } from "./account-link";
import { CONTACT_MESSAGE } from "./contact";
import { FavoritesLink } from "./favorites-link";
import { HeaderNav } from "./header-nav";
import { MobileMenu } from "./mobile-menu";

/**
 * Cabeçalho do site: marca à esquerda, modalidades no centro e, à direita,
 * favoritos, conta e "Fale conosco" (WhatsApp do atendimento; só o ícone até
 * 1280 px). No celular, tudo isso fica no menu.
 */
export function SiteHeader() {
  return (
    <header className="relative z-20 border-b border-areia/80 bg-marfim shadow-[0_6px_18px_-14px_rgb(20_43_58/0.35)]">
      <Container className="grid h-18 grid-cols-[1fr_auto] items-center gap-4 md:h-22 md:grid-cols-[auto_1fr_auto] md:gap-4 lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
        <Link href="/" className="flex w-fit items-center gap-3 rounded-control py-2 leading-none">
          <BrandMark className="h-8 w-[3.25rem] shrink-0 lg:h-10 lg:w-16" />
          <span className="grid gap-1.5">
            <Wordmark className="text-[1.5rem] leading-none text-abismo lg:text-[1.75rem]" />
            <span
              aria-hidden="true"
              className="pl-[0.1em] text-[0.625rem] leading-none font-semibold tracking-[0.24em] whitespace-nowrap text-rocha uppercase lg:text-[0.6875rem] lg:tracking-[0.3em]"
            >
              Riviera · Litoral Norte
            </span>
          </span>
          <span className="sr-only"> — página inicial</span>
        </Link>

        <HeaderNav />

        <div className="hidden items-center justify-end gap-2 md:flex lg:gap-4">
          <FavoritesLink />
          <span aria-hidden="true" className="h-6 w-px bg-areia" />
          <AccountMenu />
          <a
            href={whatsappLink(CONTACT_MESSAGE)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex size-11 shrink-0 items-center justify-center gap-2 rounded-full bg-petroleo font-semibold text-branco shadow-[0_6px_16px_-8px_rgb(16_59_64/0.6)] transition-[background-color,transform] duration-200 hover:bg-abismo active:scale-[0.98] xl:w-auto xl:px-5"
          >
            <WhatsAppIcon width={20} height={20} />
            {/* Até 1280 px só o ícone; o nome completo segue para leitores de tela. */}
            <span className="max-xl:sr-only">Fale conosco</span>
            <span className="sr-only"> pelo WhatsApp (abre em nova aba)</span>
          </a>
        </div>

        <MobileMenu />
      </Container>
    </header>
  );
}
