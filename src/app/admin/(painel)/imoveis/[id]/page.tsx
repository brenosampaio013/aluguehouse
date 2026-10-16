import type { Metadata } from "next";
import { z } from "@/lib/zod";
import { notFound } from "next/navigation";

import { AmenitiesForm } from "@/components/admin/amenities-form";
import { BlocksManager } from "@/components/admin/blocks-manager";
import { FeesManager } from "@/components/admin/fees-manager";
import { MediaManager } from "@/components/admin/media-manager";
import { PropertyGeneralForm } from "@/components/admin/property-general-form";
import { PropertyPrivateForm } from "@/components/admin/property-private-form";
import { PublishPanel } from "@/components/admin/publish-panel";
import { RatesManager } from "@/components/admin/rates-manager";
import { StatusBadge } from "@/components/admin/status-badge";
import { VideoManager } from "@/components/admin/video-manager";
import { AdminPage, PageHeader } from "@/components/admin/ui/page";
import { buttonClasses } from "@/components/ui/button";
import { ExternalIcon } from "@/components/ui/icons";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getPublicEnv } from "@/lib/env";
import { publishChecklist } from "@/lib/properties/publish";
import { getServerEnv } from "@/lib/server-env";
import { listUpcomingBlocks } from "@/server/queries/admin-bookings";
import { getPropertyForEdit } from "@/server/queries/admin-properties";
import { todayInSaoPaulo } from "@/lib/format";

export const metadata: Metadata = { title: "Editar imóvel" };

const sections = [
  { id: "publicacao", label: "Publicação" },
  { id: "dados-gerais", label: "Dados gerais" },
  { id: "fotos", label: "Fotos" },
  { id: "videos", label: "Vídeos" },
  { id: "comodidades", label: "Comodidades" },
  { id: "tarifas", label: "Tarifas sazonais" },
  { id: "taxas", label: "Taxas" },
  { id: "calendario", label: "Calendário" },
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
      className="min-w-0 scroll-mt-24 rounded-photo border border-areia bg-branco"
    >
      <div className="grid gap-1 border-b border-areia px-5 py-4 sm:px-6">
        <h2 id={`${id}-titulo`} className="text-h3 font-semibold">
          {title}
        </h2>
        {description ? <p className="max-w-[72ch] text-small text-rocha">{description}</p> : null}
      </div>
      <div className="grid gap-5 p-5 sm:p-6">{children}</div>
    </section>
  );
}

export default async function EditarImovelPage({ params }: PageProps<"/admin/imoveis/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const { supabase } = await requireAdmin();
  const today = todayInSaoPaulo();
  const [data, blocks] = await Promise.all([
    getPropertyForEdit(supabase, id),
    listUpcomingBlocks(supabase, id, today),
  ]);
  const { property } = data;
  const images = data.media.filter((item) => item.kind === "image");
  const videos = data.media.filter((item) => item.kind === "video" && item.video_source === "file");
  const env = getServerEnv();
  const checks = publishChecklist({ ...property, imageCount: images.length });

  return (
    <AdminPage>
      <PageHeader
        back={{ href: "/admin/imoveis", label: "Voltar para imóveis" }}
        title={property.title}
        meta={<StatusBadge status={property.status} />}
        description={[property.neighborhood, property.city].filter(Boolean).join(", ")}
        actions={
          property.status === "published" ? (
            <a
              href={`/imoveis/${property.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("secondary", "min-h-10 px-4")}
            >
              <ExternalIcon width={18} height={18} />
              Ver no site
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
          ) : null
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[13rem_minmax(0,1fr)] xl:items-start">
        <nav
          aria-label="Seções do imóvel"
          className="relative -mx-4 overflow-x-auto px-4 xl:sticky xl:top-24 xl:mx-0 xl:px-0"
        >
          <ul className="flex gap-1 xl:grid">
            {sections.map((section) => (
              <li key={section.id} className="shrink-0">
                <a
                  href={`#${section.id}`}
                  className="flex min-h-10 items-center rounded-control px-3 text-small font-semibold whitespace-nowrap text-rocha hover:bg-branco hover:text-abismo"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="grid min-w-0 gap-6">
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

          <Section
            id="videos"
            title="Vídeos do imóvel"
            description="Envie vídeos curtos em MP4 ou WebM. O arquivo vai direto para o armazenamento do site e é conferido no servidor antes de aparecer."
          >
            <VideoManager
              propertyId={property.id}
              supabaseUrl={getPublicEnv().NEXT_PUBLIC_SUPABASE_URL}
              items={videos}
              maxBytes={env.VIDEO_MAX_UPLOAD_MB * 1024 * 1024}
              maxPerProperty={env.VIDEO_MAX_PER_PROPERTY}
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

          <Section
            id="taxas"
            title="Taxas"
            description="Limpeza, taxa por hóspede, caução e outras."
          >
            <FeesManager propertyId={property.id} fees={data.fees} />
          </Section>

          <Section
            id="calendario"
            title="Calendário"
            description="Reservas aprovadas e datas bloqueadas daqui para frente. Datas bloqueadas aparecem ocupadas no site e não aceitam pedidos."
          >
            <BlocksManager
              propertyId={property.id}
              blocks={blocks.map((block) => ({
                id: block.id,
                kind: block.kind,
                checkIn: block.checkIn,
                checkOut: block.checkOut,
                note: block.note,
                booking_request_id: block.booking_request_id,
                guestName: block.booking_requests?.guest_name ?? null,
              }))}
            />
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
        </div>
      </div>
    </AdminPage>
  );
}
