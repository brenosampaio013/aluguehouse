import Link from "next/link";

import { Container } from "@/components/ui/container";
import { Wordmark } from "@/components/ui/wordmark";
import { siteConfig } from "@/lib/site-config";

import { modeLinks } from "./nav-links";

export function SiteFooter() {
  const { contact, responsible } = siteConfig;
  return (
    <footer className="bg-abismo pt-14 pb-24 text-areia md:pb-14">
      <Container className="grid gap-10 md:grid-cols-[2fr_1fr_1fr]">
        <div className="grid content-start gap-3">
          <Wordmark className="text-[1.5rem] text-branco" />
          <p className="max-w-[44ch]">{siteConfig.description}</p>
          {responsible.name && responsible.creci ? (
            <p className="text-small">
              Responsável: {responsible.name} — CRECI {responsible.creci}
            </p>
          ) : null}
        </div>

        <nav aria-label="Rodapé">
          <h2 className="mb-3 font-semibold text-branco">Imóveis</h2>
          <ul className="grid gap-2">
            {modeLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="underline-offset-3 hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="mb-3 font-semibold text-branco">Contato</h2>
          <ul className="grid gap-2">
            <li>
              <a
                href={`https://wa.me/${contact.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-3 hover:underline"
              >
                WhatsApp {contact.whatsappDisplay}
                <span className="sr-only"> (abre em nova aba)</span>
              </a>
            </li>
            <li>
              <a
                href={`mailto:${contact.email}`}
                className="break-all underline-offset-3 hover:underline"
              >
                {contact.email}
              </a>
            </li>
          </ul>
        </div>
      </Container>
      <Container>
        <p className="mt-10 border-t border-rocha pt-6 text-small">
          © {new Date().getFullYear()} {siteConfig.name}
        </p>
      </Container>
    </footer>
  );
}
