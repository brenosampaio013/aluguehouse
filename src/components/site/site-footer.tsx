import Link from "next/link";

import { Container } from "@/components/ui/container";
import { Wordmark } from "@/components/ui/wordmark";
import { destinationHref } from "@/lib/home/destinations";
import { regions } from "@/lib/regions";
import { siteConfig } from "@/lib/site-config";

import { modeLinks } from "./nav-links";

const linkClass = "underline-offset-4 transition-colors hover:text-branco hover:underline";

function Column({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <h2 className="mb-4 text-small font-semibold tracking-[0.16em] text-dourado uppercase">
        {title}
      </h2>
      <ul className="grid gap-2.5">{children}</ul>
    </div>
  );
}

export function SiteFooter() {
  const { contact, responsible } = siteConfig;
  return (
    <footer className="sobre-escuro border-t-2 border-dourado bg-abismo pt-16 pb-24 text-areia md:pb-14">
      <Container className="grid gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)]">
        <div className="grid content-start gap-4">
          <div className="grid gap-1">
            <Wordmark className="text-[1.75rem] text-branco" />
            <p className="text-small font-semibold tracking-[0.18em] text-dourado uppercase">
              Riviera · Litoral Norte
            </p>
          </div>
          <p className="max-w-[44ch]">{siteConfig.description}</p>
          {responsible.name && responsible.creci ? (
            <p className="text-small">
              Responsável: {responsible.name} — CRECI {responsible.creci}
            </p>
          ) : null}
        </div>

        <nav
          aria-label="Rodapé"
          className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.3fr)]"
        >
          <Column title="Imóveis">
            {modeLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/favoritos" className={linkClass}>
                Favoritos
              </Link>
            </li>
          </Column>

          <Column title="Destinos">
            {regions.map((region) => (
              <li key={region.slug}>
                <Link href={destinationHref(region.slug)} className={linkClass}>
                  {region.name}
                </Link>
              </li>
            ))}
          </Column>

          <Column title="Atendimento" className="col-span-2 sm:col-span-1">
            <li>
              <a
                href={`https://wa.me/${contact.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`whitespace-nowrap ${linkClass}`}
              >
                WhatsApp {contact.whatsappDisplay}
                <span className="sr-only"> (abre em nova aba)</span>
              </a>
            </li>
            <li>
              <Link href="/contato" className={linkClass}>
                Formulário de contato
              </Link>
            </li>
            <li>
              <a
                href={`mailto:${contact.email}`}
                className={`[overflow-wrap:anywhere] ${linkClass}`}
              >
                {contact.email}
              </a>
            </li>
          </Column>
        </nav>
      </Container>
      <Container>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-rocha pt-6 text-small">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            <li>
              <Link href="/privacidade" className={linkClass}>
                Política de privacidade
              </Link>
            </li>
            <li>
              <Link href="/termos" className={linkClass}>
                Termos de uso
              </Link>
            </li>
          </ul>
        </div>
      </Container>
    </footer>
  );
}
