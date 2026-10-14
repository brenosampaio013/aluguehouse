import { Container } from "@/components/ui/container";
import { formatDateISO } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";

/** Moldura das páginas legais: título, data da versão e texto corrido. */
export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: React.ReactNode;
  sections: { id: string; title: string; content: React.ReactNode }[];
}) {
  return (
    <main id="conteudo" className="flex-1 py-12">
      <Container>
        <div className="grid max-w-3xl gap-8">
          <header className="grid gap-3">
            <h1 className="font-serif text-h1 font-normal">{title}</h1>
            <p className="text-small text-rocha">
              Versão de {formatDateISO(siteConfig.legal.updatedAt)}
            </p>
            <div className="grid gap-3">{intro}</div>
          </header>

          <nav aria-label="Nesta página" className="rounded-photo bg-areia p-5">
            <h2 className="mb-2 font-semibold">Nesta página</h2>
            <ol className="grid list-decimal gap-1 pl-5">
              {sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="text-petroleo underline underline-offset-3">
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-titulo`}
              className="legal-text grid scroll-mt-6 gap-3"
            >
              <h2 id={`${section.id}-titulo`} className="font-serif text-h2 font-normal">
                {index + 1}. {section.title}
              </h2>
              {section.content}
            </section>
          ))}
        </div>
      </Container>
    </main>
  );
}

/** Controlador como aparece nos textos (sem dados até serem informados). */
export function controllerLabel() {
  const { controllerName, controllerDocument } = siteConfig.legal;
  if (!controllerName) return siteConfig.name;
  return controllerDocument
    ? `${controllerName} (${controllerDocument}), responsável pela ${siteConfig.name}`
    : `${controllerName}, responsável pela ${siteConfig.name}`;
}
