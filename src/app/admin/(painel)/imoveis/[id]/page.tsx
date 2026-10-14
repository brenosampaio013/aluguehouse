import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { notFound } from "next/navigation";

import { AmenitiesForm } from "@/components/admin/amenities-form";
import { FeesManager } from "@/components/admin/fees-manager";
import { MediaManager } from "@/components/admin/media-manager";
import { PropertyGeneralForm } from "@/components/admin/property-general-form";
import { PropertyPrivateForm } from "@/components/admin/property-private-form";
import { PublishPanel } from "@/components/admin/publish-panel";
import { RatesManager } from "@/components/admin/rates-manager";
import { StatusBadge } from "@/components/admin/status-badge";
import { Container } from "@/components/ui/container";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getPublicEnv } from "@/lib/env";
import { publishChecklist } from "@/lib/properties/publish";
import { getPropertyForEdit } from "@/server/queries/admin-properties";

export const metadata: Metadata = { title: "Editar imóvel" };

const sections = [
  { id: "publicacao", label: "Publicação" },
  { id: "dados-gerais", label: "Dados gerais" },
  { id: "fotos", label: "Fotos" },
  { id: "comodidades", label: "Comodidades" },
  { id: "tarifas", label: "Tarifas sazonais" },
  { id: "taxas", label: "Taxas" },
  { id: "localizacao", label: "Localização privada" },
];

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      className="grid min-w-0 scroll-mt-6 gap-5 border-t border-areia pt-8"
    >
      <div className="grid gap-1">
        <h2 id={`${id}-titulo`} className="font-serif text-h2 font-normal">
          {title}
        </h2>
        {description ? <p className="max-w-[68ch] text-rocha">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default async function EditarImovelPage({ params }: PageProps<"/admin/imoveis/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const { supabase } = await requireAdmin();
  const data = await getPropertyForEdit(supabase, id);
  const { property } = data;
  const images = data.media.filter((item) => item.kind === "image");
  const checks = publishChecklist({ ...property, imageCount: images.length });

  return (
    <main id="conteudo" className="flex-1 py-12">
      <Container className="grid gap-8">
        <Link href="/admin/imoveis" className="text-petroleo underline underline-offset-3">
          Voltar para imóveis
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="font-serif text-h1 font-normal">{property.title}</h1>
          <StatusBadge status={property.status} />
        </div>

        <nav aria-label="Seções do imóvel">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-petroleo underline underline-offset-3">
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <Section
          id="publicacao"
          title="Publicação"
          description="Só imóveis publicados aparecem no site."
        >
          <PublishPanel propertyId={property.id} status={property.status} checks={checks} />
        </Section>

        <Section id="dados-gerais" title="Dados gerais">
          <PropertyGeneralForm property={property} />
        </Section>

        <Section
          id="fotos"
          title="Fotos"
          description="As fotos são convertidas para WebP em 3 tamanhos no seu navegador antes do envio. Os metadados do arquivo, como a localização do celular, não são enviados."
        >
          <MediaManager
            propertyId={property.id}
            supabaseUrl={getPublicEnv().NEXT_PUBLIC_SUPABASE_URL}
            items={images}
          />
        </Section>

        <Section id="comodidades" title="Comodidades">
          <AmenitiesForm
            propertyId={property.id}
            amenities={data.amenities}
            selected={[...data.selectedAmenityIds]}
          />
        </Section>

        <Section
          id="tarifas"
          title="Tarifas sazonais"
          description="Diárias diferentes em períodos como Réveillon e Carnaval. Valem só para temporada e não podem se sobrepor."
        >
          <RatesManager
            propertyId={property.id}
            rates={data.rates.map((rate) => ({ ...rate, period: String(rate.period) }))}
          />
        </Section>

        <Section id="taxas" title="Taxas" description="Limpeza, taxa por hóspede, caução e outras.">
          <FeesManager propertyId={property.id} fees={data.fees} />
        </Section>

        <Section
          id="localizacao"
          title="Localização privada"
          description="O endereço e a coordenada exata nunca aparecem no site. O mapa público usa uma área aproximada, a até ~550 m do ponto real."
        >
          <PropertyPrivateForm
            propertyId={property.id}
            data={data.privateData}
            approx={{ lat: property.approx_lat, lng: property.approx_lng }}
          />
        </Section>
      </Container>
    </main>
  );
}
