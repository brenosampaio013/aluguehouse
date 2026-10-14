import Link from "next/link";

import { Container } from "@/components/ui/container";
import { HeartIcon } from "@/components/ui/icons";
import { Wordmark } from "@/components/ui/wordmark";

import { MobileMenu } from "./mobile-menu";
import { modeLinks } from "./nav-links";

export function SiteHeader() {
  return (
    <header className="relative z-20 border-b border-areia bg-branco">
      <Container className="flex min-h-16 items-center justify-between gap-6">
        <Link href="/" className="rounded-control">
          <Wordmark className="text-[1.375rem]" />
          <span className="sr-only"> — página inicial</span>
        </Link>

        <nav aria-label="Modalidades" className="hidden md:block">
          <ul className="flex gap-1">
            {modeLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-11 items-center rounded-control px-3 font-medium text-abismo hover:bg-areia"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-1 md:flex">
          <Link
            href="/favoritos"
            className="inline-flex min-h-11 items-center gap-2 rounded-control px-3 font-medium text-abismo hover:bg-areia"
          >
            <HeartIcon />
            Favoritos
          </Link>
          <Link
            href="/entrar"
            className="inline-flex min-h-11 items-center rounded-control px-3 font-medium text-abismo hover:bg-areia"
          >
            Entrar
          </Link>
        </div>

        <MobileMenu />
      </Container>
    </header>
  );
}
