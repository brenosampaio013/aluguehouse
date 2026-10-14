import Link from "next/link";

import { Container } from "@/components/ui/container";
import { Wordmark } from "@/components/ui/wordmark";
import { siteConfig } from "@/lib/site-config";

/** Cabeçalho e rodapé provisórios; o layout definitivo vem com a página inicial. */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="border-b border-areia">
        <Container className="flex min-h-16 items-center">
          <Link href="/" className="rounded-control">
            <Wordmark className="text-[1.375rem]" />
          </Link>
        </Container>
      </header>
      {children}
      <footer className="bg-abismo py-10 text-areia">
        <Container>
          <p>
            <a className="underline underline-offset-3" href={`mailto:${siteConfig.contact.email}`}>
              {siteConfig.contact.email}
            </a>
          </p>
        </Container>
      </footer>
    </>
  );
}
