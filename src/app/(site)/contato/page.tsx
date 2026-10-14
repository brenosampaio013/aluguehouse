import type { Metadata } from "next";
import Link from "next/link";

import { InquiryForm } from "@/components/contact/inquiry-form";
import { Container } from "@/components/ui/container";
import { ChatIcon } from "@/components/ui/icons";
import { buttonClasses } from "@/components/ui/button";
import { getPublicEnv } from "@/lib/env";
import { first, SLUG } from "@/lib/search/shared";
import { siteConfig } from "@/lib/site-config";
import { whatsappLink } from "@/lib/whatsapp";
import { getPublicProperty } from "@/server/queries/property-page";

export const metadata: Metadata = {
  title: "Contato",
  description: "Fale com a Alugue Houses por WhatsApp, e-mail ou pelo formulário.",
  alternates: { canonical: "/contato" },
};

export default async function ContatoPage({ searchParams }: PageProps<"/contato">) {
  const slug = first((await searchParams).imovel);
  const property = slug && SLUG.test(slug) ? await getPublicProperty(slug) : null;
  const { NEXT_PUBLIC_TURNSTILE_SITE_KEY: turnstileSiteKey } = getPublicEnv();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
    new Date(),
  );
  const { contact } = siteConfig;

  return (
    <main id="conteudo" className="flex-1 py-12">
      <Container className="grid gap-10 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="grid max-w-2xl gap-6">
          <div className="grid gap-2">
            <h1 className="font-serif text-h1 font-normal">Contato</h1>
            <p className="text-rocha">
              Dúvidas sobre um imóvel, uma estadia ou uma compra. Respondemos pelo e-mail ou
              telefone informados.
            </p>
          </div>
          {property ? (
            <p className="rounded-control bg-areia px-4 py-3">
              Sobre o imóvel{" "}
              <Link
                href={`/imoveis/${property.slug}`}
                className="font-semibold text-petroleo underline underline-offset-3"
              >
                {property.title}
              </Link>
            </p>
          ) : null}
          <InquiryForm
            variant="contact"
            propertyId={property?.id}
            today={today}
            turnstileSiteKey={turnstileSiteKey}
          />
        </div>

        <aside aria-label="Outros canais" className="grid gap-4 rounded-photo bg-areia p-6">
          <h2 className="font-serif text-h3 font-normal">Prefere conversar agora?</h2>
          <a
            href={whatsappLink(
              property
                ? `Olá! Tenho uma dúvida sobre o imóvel "${property.title}".`
                : "Olá! Vim pelo site da Alugue Houses.",
            )}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses("primary")}
          >
            <ChatIcon />
            WhatsApp {contact.whatsappDisplay}
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
          <p className="grid gap-1">
            Ou escreva para
            <a
              href={`mailto:${contact.email}`}
              className="[overflow-wrap:anywhere] text-petroleo underline underline-offset-3"
            >
              {contact.email}
            </a>
          </p>
        </aside>
      </Container>
    </main>
  );
}
