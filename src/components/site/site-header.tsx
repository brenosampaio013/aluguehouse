import Link from "next/link";

import { Container } from "@/components/ui/container";
import { HeartIcon } from "@/components/ui/icons";
import { Wordmark } from "@/components/ui/wordmark";

import { AccountLink } from "./account-link";
import { HeaderNav } from "./header-nav";
import { MobileMenu } from "./mobile-menu";

export function SiteHeader() {
  return (
    <header className="relative z-20 border-b border-areia bg-marfim">
      {/* Filete dourado no topo: só decoração. */}
      <div aria-hidden="true" className="h-0.5 bg-dourado" />
      <Container className="flex min-h-18 items-center justify-between gap-6">
        <Link href="/" className="grid rounded-control py-2 leading-none">
          <Wordmark className="text-[1.5rem] text-abismo" />
          <span
            aria-hidden="true"
            className="mt-1 text-[0.6875rem] font-semibold tracking-[0.18em] text-rocha uppercase"
          >
            Riviera · Litoral Norte
          </span>
          <span className="sr-only"> — página inicial</span>
        </Link>

        <HeaderNav />

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/favoritos"
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 font-medium text-abismo transition-colors hover:bg-areia"
          >
            <HeartIcon />
            Favoritos
          </Link>
          <AccountLink />
        </div>

        <MobileMenu />
      </Container>
    </header>
  );
}
