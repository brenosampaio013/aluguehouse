import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { Card, CardHeader } from "@/components/admin/ui/card";
import { AdminPage, PageHeader } from "@/components/admin/ui/page";
import { DayStateLegend, OccupancyStrip } from "@/components/owner/occupancy-strip";
import { PropertyStatusBadge } from "@/components/owner/property-status-badge";
import { ChangeRequestForm } from "@/components/owner/request-forms";
import { RequestList } from "@/components/owner/request-list";
import { buttonClasses } from "@/components/ui/button";
import { CalendarIcon, ExternalIcon } from "@/components/ui/icons";
import { parseUuid } from "@/lib/admin/filters";
import { requireOwner } from "@/lib/auth/require-owner";
import { getPublicEnv } from "@/lib/env";
import { addDaysISO, formatBRL, formatDateISO, todayInSaoPaulo } from "@/lib/format";
import { mediaSrcSet, publicMediaUrl, variantPath, variantWidths } from "@/lib/media";
import { plural } from "@/lib/owner/portal";
import { feeAppliesToLabels, feeCalcLabels, propertyTypeLabels } from "@/lib/properties/labels";
import {
  getOwnerCalendar,
  getOwnerProperty,
  listOwnerRequests,
} from "@/server/queries/owner-portal";

export const metadata: Metadata = { title: "Imóvel" };

const AVAILABILITY_DAYS = 60;

function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label} className="grid gap-0.5">
          <dt className="text-small text-rocha">{label}</dt>
          <dd className="font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function feeAmount(fee: { calc: keyof typeof feeCalcLabels; amount: number }) {
  return fee.calc === "percent" ? `${fee.amount}%` : formatBRL(fee.amount);
}

export default async function ImovelProprietarioPage({
  params,
}: PageProps<"/proprietario/imoveis/[id]">) {
  const { id: rawId } = await params;
  const id = parseUuid(rawId);
  if (!id) notFound();

  const { supabase } = await requireOwner();
  // Só abre se o imóvel estiver vinculado a quem está logado (e o banco confere de novo).
  const property = await getOwnerProperty(supabase, id);
  if (!property) notFound();

  const today = todayInSaoPaulo();
  const [blocks, requests] = await Promise.all([
    getOwnerCalendar(supabase, {
      from: today,
      to: addDaysISO(today, AVAILABILITY_DAYS),
      propertyId: id,
    }),
    listOwnerRequests(supabase, id),
  ]);
  const { NEXT_PUBLIC_SUPABASE_URL: supabaseUrl } = getPublicEnv();
  const modes = [
    property.offers_seasonal && "Temporada",
    property.offers_monthly && "Mensal",
    property.offers_sale && "Venda",
  ].filter(Boolean);

  return (
    <AdminPage>
      <PageHeader
        back={{ href: "/proprietario/imoveis", label: "Meus imóveis" }}
        title={property.title}
        meta={<PropertyStatusBadge status={property.status} />}
        description={[property.neighborhood, property.city].filter(Boolean).join(", ")}
        actions={
          <>
            <Link
              href={`/proprietario/calendario?imovel=${property.id}`}
              className={buttonClasses("secondary", "min-h-10 px-4")}
            >
              <CalendarIcon width={18} height={18} />
              Calendário
            </Link>
            {property.status === "published" ? (
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
            ) : null}
          </>
        }
      />

      <Card aria-labelledby="fotos">
        <CardHeader
          id="fotos"
          title="Fotos"
          description={plural(property.images.length, "foto no anúncio", "fotos no anúncio")}
        />
        {property.images.length === 0 ? (
          <p className="px-5 py-6 text-rocha">Nenhuma foto cadastrada ainda.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 p-5 md:grid-cols-3 xl:grid-cols-4">
            {property.images.slice(0, 8).map((image) => (
              <li
                key={image.id}
                className="relative aspect-[4/3] overflow-hidden rounded-control bg-areia"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={publicMediaUrl(
                    supabaseUrl,
                    variantPath(image.storage_path!, variantWidths(image.width!)[0]!),
                  )}
                  srcSet={mediaSrcSet(supabaseUrl, image.storage_path!, image.width!)}
                  sizes="(min-width: 1280px) 20vw, (min-width: 768px) 30vw, 50vw"
                  alt={image.alt_text}
                  loading="lazy"
                  className="size-full object-cover"
                />
                {image.is_cover ? (
                  <span className="absolute top-2 left-2 rounded-full bg-branco/95 px-2 py-0.5 text-small font-semibold">
                    Capa
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card aria-labelledby="caracteristicas">
        <CardHeader id="caracteristicas" title="Características e capacidade" />
        <div className="grid gap-6 p-5">
          <Facts
            items={[
              ["Tipo", propertyTypeLabels[property.property_type]],
              ["Modalidades", modes.length ? modes.join(", ") : "Nenhuma definida"],
              ["Hóspedes", property.max_guests],
              ["Quartos", `${property.bedrooms} (${plural(property.suites, "suíte", "suítes")})`],
              ["Banheiros", property.bathrooms],
              ["Vagas", property.parking_spots],
              ...(property.area_m2
                ? ([["Área", `${property.area_m2} m²`]] as [string, string][])
                : []),
              ...(property.distance_to_beach_m !== null
                ? ([["Distância da praia", `${property.distance_to_beach_m} m`]] as [
                    string,
                    string,
                  ][])
                : []),
            ]}
          />
          <div className="grid gap-2">
            <h3 className="text-small font-semibold text-rocha">Comodidades</h3>
            {property.amenities.length ? (
              <ul className="flex flex-wrap gap-2">
                {property.amenities.map((amenity) => (
                  <li
                    key={amenity}
                    className="rounded-full border border-areia bg-marfim px-3 py-1 text-small"
                  >
                    {amenity}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-rocha">Nenhuma comodidade marcada.</p>
            )}
          </div>
        </div>
      </Card>

      <Card aria-labelledby="tarifas">
        <CardHeader
          id="tarifas"
          title="Tarifas e regras"
          description="Valores do anúncio. Para mudar, envie um pedido de alteração abaixo."
        />
        <div className="grid gap-6 p-5">
          <Facts
            items={[
              ...(property.offers_seasonal
                ? ([["Diária base", formatBRL(property.nightly_price)]] as [string, string][])
                : []),
              ...(property.offers_monthly
                ? ([["Aluguel mensal", formatBRL(property.monthly_price)]] as [string, string][])
                : []),
              ...(property.offers_sale
                ? ([["Preço de venda", formatBRL(property.sale_price)]] as [string, string][])
                : []),
              ["Estadia mínima", plural(property.min_nights, "noite", "noites")],
              ["Estadia máxima", plural(property.max_nights, "noite", "noites")],
              [
                "Entrada / saída",
                `${property.check_in_time.slice(0, 5)} / ${property.check_out_time.slice(0, 5)}`,
              ],
            ]}
          />
          <div className="grid gap-2">
            <h3 className="text-small font-semibold text-rocha">Tarifas sazonais</h3>
            {property.rates.length ? (
              <ul className="grid gap-1">
                {property.rates.map((rate) => (
                  <li
                    key={rate.start}
                    className="flex flex-wrap justify-between gap-2 tabular-nums"
                  >
                    <span>
                      {rate.label}: {formatDateISO(rate.start)} a {formatDateISO(rate.end)}
                      {rate.minNights
                        ? ` · mínimo ${plural(rate.minNights, "noite", "noites")}`
                        : ""}
                    </span>
                    <span className="font-semibold">{formatBRL(rate.nightlyPrice)}/noite</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-rocha">Sem tarifas sazonais: vale a diária base o ano todo.</p>
            )}
          </div>
          <div className="grid gap-2">
            <h3 className="text-small font-semibold text-rocha">Taxas</h3>
            {property.fees.length ? (
              <ul className="grid gap-1">
                {property.fees.map((fee) => (
                  <li key={fee.id} className="flex flex-wrap justify-between gap-2 tabular-nums">
                    <span>
                      {fee.label} · {feeCalcLabels[fee.calc]} · {feeAppliesToLabels[fee.applies_to]}
                      {fee.is_refundable ? " · reembolsável" : ""}
                    </span>
                    <span className="font-semibold">{feeAmount(fee)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-rocha">Nenhuma taxa cadastrada.</p>
            )}
          </div>
          {property.house_rules ? (
            <div className="grid gap-2">
              <h3 className="text-small font-semibold text-rocha">Regras da casa</h3>
              <p className="max-w-[72ch] whitespace-pre-line">{property.house_rules}</p>
            </div>
          ) : null}
        </div>
      </Card>

      <Card aria-labelledby="disponibilidade">
        <CardHeader
          id="disponibilidade"
          title="Disponibilidade"
          description={`Próximos ${AVAILABILITY_DAYS} dias, a partir de hoje.`}
        />
        <div className="grid gap-4 p-5">
          <DayStateLegend />
          <OccupancyStrip blocks={blocks} from={today} days={AVAILABILITY_DAYS} />
        </div>
      </Card>

      <Card aria-labelledby="alteracao">
        <CardHeader
          id="alteracao"
          title="Pedir alteração do anúncio"
          description="A Alugue Houses revisa o pedido e faz a edição. O anúncio público não muda antes disso."
        />
        <div className="p-5">
          <ChangeRequestForm propertyId={property.id} />
        </div>
        <div className="border-t border-areia">
          <h3 className="px-5 pt-4 font-semibold">Pedidos deste imóvel</h3>
          <RequestList requests={requests} empty="Nenhum pedido enviado para este imóvel." />
        </div>
      </Card>
    </AdminPage>
  );
}
