import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Wordmark } from "@/components/ui/wordmark";
import { siteConfig } from "@/lib/site-config";

/**
 * Página provisória da Etapa 3. A página inicial real é criada em etapa
 * própria, conforme docs/planejamento.md.
 */
export default function Page() {
  return (
    <>
      <header className="border-b border-areia">
        <Container className="flex min-h-16 items-center">
          <Wordmark className="text-[1.375rem]" />
        </Container>
      </header>
      <main id="conteudo" className="flex flex-1 items-center py-16">
        <Container>
          <h1 className="max-w-[16ch] font-serif text-h1 font-normal tracking-[-0.01em] sm:text-display">
            Site em construção
          </h1>
          <p className="mt-5 max-w-[60ch] text-rocha">
            Em breve, casas para temporada, aluguel mensal e venda na Riviera de São Lourenço e no
            Litoral Norte de São Paulo.
          </p>
          <a
            className={buttonClasses("primary", "mt-8")}
            href={`https://wa.me/${siteConfig.contact.whatsapp}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            Falar no WhatsApp
            <span className="sr-only">(abre em nova aba)</span>
          </a>
        </Container>
      </main>
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
