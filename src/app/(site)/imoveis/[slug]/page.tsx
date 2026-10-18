import type { Metadata } from "next";
import Link from "next/link";
import { AmenitiesSection } from "@/components/property/amenities-section";
import { notFound } from "next/navigation";

import { InquiryForm } from "@/components/contact/inquiry-form";
import { AvailabilityCalendar } from "@/components/booking/availability-calendar";
import { BookingRequestForm } from "@/components/booking/booking-request-form";
import { JsonLd } from "@/components/seo/json-ld";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { AreaMap } from "@/components/map/area-map";
import { Stars } from "@/components/reviews/stars";
import { PropertyGallery } from "@/components/property/gallery";
import { HouseStory } from "@/components/property/house-story";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ChatIcon } from "@/components/ui/icons";
import { stayLimits, stayMode } from "@/lib/booking/calendar";
import { bookingErrorMessage } from "@/lib/booking/schema";
import { cn } from "@/lib/cn";
import { getPublicEnv } from "@/lib/env";
import { addDaysISO, formatBRL, formatDateISO, formatPrice, todayInSaoPaulo } from "@/lib/format";
import { publicMediaUrl, variantPath, variantWidths } from "@/lib/media";
import { propertyTypeLabels } from "@/lib/properties/labels";
import { listingStatus } from "@/lib/properties/listing";
import { averageRating } from "@/lib/reviews";
import { breadcrumbJsonLd, listingJsonLd } from "@/lib/seo/json-ld";
import { first, int, isRealDate } from "@/lib/search/shared";
import { whatsappLink } from "@/lib/whatsapp";
import {
  getPublicProperty,
  getUnavailableRanges,
  isRangeAvailable,
  quoteForSearch,
  type PublicProperty,
  type StayQuote,
} from "@/server/queries/property-page";
import { getPublishedReviews } from "@/server/queries/reviews";

type Props = PageProps<"/imoveis/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPublicProperty(slug);
  if (!property) return { title: "Imóvel não encontrado" };

  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();
  const cover = property.images[0];
  return {
    title: property.title,
    description:
      property.summary ?? `${propertyTypeLabels[property.property_type]} em ${place(property)}.`,
    // Datas e hóspedes da busca não criam páginas novas para o Google.
    alternates: { canonical: `/imoveis/${property.slug}` },
    openGraph: {
      type: "website",
      url: `/imoveis/${property.slug}`,
      title: property.title,
      ...(cover
        ? {
            images: [
              {
                url: largestImage(NEXT_PUBLIC_SUPABASE_URL, cover),
                alt: cover.alt,
              },
            ],
          }
        : {}),
    },
  };
}

function largestImage(supabaseUrl: string, photo: { path: string; width: number }) {
  return publicMediaUrl(supabaseUrl, variantPath(photo.path, variantWidths(photo.width).at(-1)!));
}

function place(p: Pick<PublicProperty, "neighborhood" | "city">) {
  return [p.neighborhood, p.city].filter(Boolean).join(", ");
}

const reviewMonth = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Janela do calendário público: um ano a partir de hoje. */
const CALENDAR_DAYS = 365;

type SearchStay =
  | { status: "none" }
  | { status: "invalid"; message: string; checkIn: string; checkOut: string; guests: number }
  | {
      status: "quoted";
      quote: StayQuote;
      checkIn: string;
      checkOut: string;
      guests: number;
      mode: "seasonal" | "monthly";
    };

/** Datas vindas da busca: confere disponibilidade e calcula o total estimado. */
async function stayFromSearch(
  property: PublicProperty,
  raw: Record<string, string | string[] | undefined>,
): Promise<SearchStay> {
  const checkIn = first(raw.chegada);
  const checkOut = first(raw.saida);
  if (!checkIn || !checkOut || !isRealDate(checkIn) || !isRealDate(checkOut))
    return { status: "none" };
  if (!property.offers_seasonal && !property.offers_monthly) return { status: "none" };

  const guests = int(first(raw.hospedes), 1, 50) ?? 1;
  const base = { checkIn, checkOut, guests };
  const today = todayInSaoPaulo();
  if (checkIn < today)
    return { status: "invalid", message: "A data de chegada já passou.", ...base };
  if (checkOut <= checkIn)
    return { status: "invalid", message: "A saída precisa ser depois da chegada.", ...base };

  const mode = stayMode(checkIn, checkOut);
  if (!(await isRangeAvailable(property.id, checkIn, checkOut))) {
    return {
      status: "invalid",
      message: "Essas datas não estão disponíveis. Tente outro período.",
      ...base,
    };
  }
  const result = await quoteForSearch(property.id, mode, checkIn, checkOut, guests);
  if (!result.ok) {
    const message = bookingErrorMessage(result.reason, result.detail);
    return { status: "invalid", message, ...base };
  }
  return { status: "quoted", quote: result.quote, mode, ...base };
}

export default async function ImovelPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const property = await getPublicProperty(slug);
  if (!property) notFound();

  const {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SITE_URL: siteUrl,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: turnstileSiteKey,
  } = getPublicEnv();
  const stay = await stayFromSearch(property, await searchParams);
  const rents = property.offers_seasonal || property.offers_monthly;
  const today = todayInSaoPaulo();
  const lastDate = addDaysISO(today, CALENDAR_DAYS);
  const [blocked, reviews] = await Promise.all([
    rents ? getUnavailableRanges(property.id, today, lastDate) : [],
    getPublishedReviews(property.id),
  ]);
  const average = averageRating(reviews.map((review) => review.rating));
  const pageUrlCanonical = `${siteUrl}/imoveis/${property.slug}`;
  const mainMode = property.offers_seasonal
    ? { name: "Temporada", path: "/temporada" }
    : property.offers_monthly
      ? { name: "Mensal", path: "/mensal" }
      : { name: "Venda", path: "/venda" };
  const structuredData = [
    listingJsonLd({
      url: pageUrlCanonical,
      title: property.title,
      description: property.summary ?? property.description,
      propertyType: property.property_type,
      city: property.city,
      neighborhood: property.neighborhood,
      geo:
        property.approx_lat !== null && property.approx_lng !== null
          ? { lat: property.approx_lat, lng: property.approx_lng }
          : null,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      maxGuests: property.max_guests,
      areaM2: property.area_m2,
      amenities: property.amenities.map((amenity) => amenity.label),
      images: property.images
        .filter((image) => !image.isDemo)
        .slice(0, 10)
        .map((image) => largestImage(supabaseUrl, image)),
      publishedAt: property.published_at,
      prices: {
        nightly: property.offers_seasonal ? property.nightly_price : null,
        monthly: property.offers_monthly ? property.monthly_price : null,
        sale: property.offers_sale ? property.sale_price : null,
      },
      rating:
        reviews.length > 0
          ? {
              average: reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length,
              count: reviews.length,
            }
          : null,
    }),
    breadcrumbJsonLd([
      { name: "Início", url: `${siteUrl}/` },
      { name: mainMode.name, url: `${siteUrl}${mainMode.path}` },
      { name: property.title, url: pageUrlCanonical },
    ]),
  ];
  const location = place(property);

  const facts = [
    property.bedrooms > 0 ? plural(property.bedrooms, "quarto", "quartos") : null,
    property.suites > 0 ? plural(property.suites, "suíte", "suítes") : null,
    property.bathrooms > 0 ? plural(property.bathrooms, "banheiro", "banheiros") : null,
    property.offers_seasonal || property.offers_monthly
      ? `até ${plural(property.max_guests, "hóspede", "hóspedes")}`
      : null,
    property.parking_spots > 0 ? plural(property.parking_spots, "vaga", "vagas") : null,
    property.area_m2 ? `${new Intl.NumberFormat("pt-BR").format(property.area_m2)} m²` : null,
    property.distance_to_beach_m !== null
      ? property.distance_to_beach_m === 0
        ? "pé na areia"
        : `${new Intl.NumberFormat("pt-BR").format(property.distance_to_beach_m)} m da praia`
      : null,
  ].filter(Boolean) as string[];

  const prices = [
    property.offers_seasonal && property.nightly_price !== null
      ? {
          label: "Temporada",
          value: `${formatPrice(property.nightly_price)} por noite`,
          note: `Diária base; mínimo de ${plural(property.min_nights, "noite", "noites")}. Feriados podem ter tarifa diferente.`,
        }
      : null,
    property.offers_monthly && property.monthly_price !== null
      ? {
          label: "Mensal",
          value: `${formatPrice(property.monthly_price)} por mês`,
          note: "De 30 a 90 noites, valor proporcional.",
        }
      : null,
    property.offers_sale && property.sale_price !== null
      ? {
          label: "Venda",
          value: formatPrice(property.sale_price),
          note:
            [
              property.condo_fee ? `Condomínio ${formatBRL(property.condo_fee)}/mês` : null,
              property.iptu_yearly ? `IPTU ${formatBRL(property.iptu_yearly)}/ano` : null,
            ]
              .filter(Boolean)
              .join(" · ") || null,
        }
      : null,
  ].filter(Boolean) as { label: string; value: string; note: string | null }[];

  const pageUrl = `${siteUrl}/imoveis/${property.slug}`;
  const datesText =
    stay.status !== "none"
      ? ` para ${formatDateISO(stay.checkIn)} a ${formatDateISO(stay.checkOut)}, ${plural(stay.guests, "hóspede", "hóspedes")}`
      : "";
  const onlySale = property.offers_sale && !property.offers_seasonal && !property.offers_monthly;
  const whatsappMessage = onlySale
    ? `Olá! Gostaria de agendar uma visita ao imóvel "${property.title}": ${pageUrl}`
    : `Olá! Tenho interesse no imóvel "${property.title}"${datesText}: ${pageUrl}`;
  const ctaLabel = onlySale ? "Agendar visita pelo WhatsApp" : "Falar no WhatsApp";
  const mainPrice = prices[0];

  return (
    <main id="conteudo" className="flex-1 pt-8 pb-28 md:pb-16">
      <JsonLd data={structuredData} />
      <Container className="grid gap-8">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
          <div className="grid gap-2">
            <h1 className="font-serif text-h1 font-normal">{property.title}</h1>
            <p className="text-rocha">
              {propertyTypeLabels[property.property_type]}
              {location ? ` em ${location}` : ""}
            </p>
          </div>
          <FavoriteButton
            propertyId={property.id}
            title={property.title}
            variant="page"
            className="-ml-3 sm:ml-0"
          />
        </div>

        <PropertyGallery
          photos={property.images}
          videos={property.videos}
          supabaseUrl={supabaseUrl}
          listing={listingStatus(property)}
        />

        <div className="grid gap-12 lg:grid-cols-[1fr_380px] lg:items-start">
          <div className="grid min-w-0 gap-12">
            {facts.length > 0 ? (
              <ul
                aria-label="Características"
                className="flex flex-wrap gap-x-5 gap-y-2 border-b border-areia pb-6 text-h3"
              >
                {facts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            ) : null}

            {property.description || property.summary ? (
              <section aria-labelledby="sobre" className="grid gap-4">
                <h2 id="sobre" className="font-serif text-h2 font-normal">
                  Sobre o imóvel
                </h2>
                <p className="max-w-[68ch] whitespace-pre-line">
                  {property.description ?? property.summary}
                </p>
              </section>
            ) : null}

            {rents ? (
              <section aria-labelledby="disponibilidade" className="grid scroll-mt-6 gap-4">
                <h2 id="disponibilidade" className="font-serif text-h2 font-normal">
                  Disponibilidade
                </h2>
                <AvailabilityCalendar
                  today={today}
                  lastDate={lastDate}
                  blocked={blocked}
                  limits={stayLimits(property)}
                  maxGuests={property.max_guests}
                  initialCheckIn={stay.status !== "none" ? stay.checkIn : undefined}
                  initialCheckOut={stay.status !== "none" ? stay.checkOut : undefined}
                  initialGuests={stay.status !== "none" ? stay.guests : undefined}
                />
              </section>
            ) : null}

            <AmenitiesSection amenities={property.amenities} />

            {property.offers_seasonal || property.offers_monthly ? (
              <section aria-labelledby="regras" className="grid gap-4">
                <h2 id="regras" className="font-serif text-h2 font-normal">
                  Horários e regras
                </h2>
                <p>
                  Check-in a partir das {property.check_in_time.slice(0, 5)} · check-out até{" "}
                  {property.check_out_time.slice(0, 5)}
                </p>
                {property.house_rules ? (
                  <p className="max-w-[68ch] whitespace-pre-line">{property.house_rules}</p>
                ) : null}
              </section>
            ) : null}

            {reviews.length > 0 ? (
              <section aria-labelledby="avaliacoes" className="grid gap-5">
                <div className="grid gap-1">
                  <h2 id="avaliacoes" className="font-serif text-h2 font-normal">
                    Avaliações
                  </h2>
                  <p className="flex items-center gap-2">
                    <Stars
                      decorative
                      rating={Math.round(
                        reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length,
                      )}
                    />
                    <span>
                      <strong className="font-semibold">{average}</strong> de 5 ·{" "}
                      {plural(reviews.length, "avaliação", "avaliações")} de hóspedes
                    </span>
                  </p>
                </div>
                <ul className="grid gap-6 sm:grid-cols-2">
                  {reviews.map((review) => (
                    <li key={review.id} className="grid content-start gap-2">
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-semibold">
                          {review.author_display_name || "Hóspede"}
                        </span>
                        <span className="text-small text-rocha">
                          {reviewMonth.format(new Date(review.created_at))}
                        </span>
                      </p>
                      <Stars rating={review.rating} />
                      {review.comment ? (
                        <p className="max-w-[68ch] whitespace-pre-line">{review.comment}</p>
                      ) : null}
                      {review.admin_reply ? (
                        <p className="max-w-[68ch] border-l-2 border-junco pl-3 text-small text-rocha">
                          <span className="font-semibold text-abismo">
                            Resposta da Alugue Houses:
                          </span>{" "}
                          {review.admin_reply}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {property.approx_lat !== null && property.approx_lng !== null ? (
              <section aria-labelledby="localizacao" className="grid gap-4">
                <h2 id="localizacao" className="font-serif text-h2 font-normal">
                  Localização
                </h2>
                <p className="max-w-[68ch] text-rocha">
                  {location ? `${location}. ` : ""}Por segurança, o mapa mostra só a área aproximada
                  do imóvel.
                </p>
                <AreaMap
                  label={`Mapa com a área aproximada do imóvel${location ? ` em ${location}` : ""}`}
                  areas={[
                    {
                      id: property.id,
                      lat: property.approx_lat,
                      lng: property.approx_lng,
                      label: property.title,
                    },
                  ]}
                  className="h-[320px] sm:h-[400px]"
                />
              </section>
            ) : null}
          </div>

          <aside
            id="valores"
            aria-label="Valores e contato"
            className={cn(
              "grid scroll-mt-6 gap-5 rounded-photo bg-areia p-6",
              // Com o formulário, o painel fica alto demais para ficar fixo.
              stay.status !== "quoted" && !property.offers_sale && "lg:sticky lg:top-6",
            )}
          >
            {stay.status === "quoted" ? (
              <div className="grid gap-3">
                <p className="text-small font-semibold">
                  Sua busca: {formatDateISO(stay.checkIn)} a {formatDateISO(stay.checkOut)} ·{" "}
                  {plural(stay.guests, "hóspede", "hóspedes")}
                </p>
                <dl className="grid gap-1 tabular-nums">
                  {stay.quote.lines.map((line) => (
                    <div key={line.label + line.unit_price} className="flex justify-between gap-4">
                      <dt>
                        {line.label === "Aluguel mensal"
                          ? `Aluguel (${plural(line.nights, "noite", "noites")})`
                          : `${line.label} · ${plural(line.nights, "noite", "noites")} × ${formatBRL(line.unit_price)}`}
                      </dt>
                      <dd>{formatBRL(line.amount)}</dd>
                    </div>
                  ))}
                  {stay.quote.fees.map((fee) => (
                    <div key={fee.label} className="flex justify-between gap-4">
                      <dt>{fee.label}</dt>
                      <dd>{formatBRL(fee.amount)}</dd>
                    </div>
                  ))}
                  <div className="mt-2 flex justify-between gap-4 border-t border-junco pt-2 font-semibold">
                    <dt>Total estimado</dt>
                    <dd>{formatBRL(stay.quote.total)}</dd>
                  </div>
                </dl>
                {stay.quote.deposits.map((deposit) => (
                  <p key={deposit.label} className="text-small">
                    {deposit.label} (reembolsável): {formatBRL(deposit.amount)}, fora do total.
                  </p>
                ))}
                <p className="text-small text-rocha">
                  Valor confirmado na resposta à sua solicitação.
                </p>
              </div>
            ) : (
              <dl className="grid gap-4">
                {prices.map((price) => (
                  <div key={price.label} className="grid gap-0.5">
                    <dt className="text-small font-semibold text-rocha">{price.label}</dt>
                    <dd className="text-h3 font-semibold tabular-nums">{price.value}</dd>
                    {price.note ? <dd className="text-small text-rocha">{price.note}</dd> : null}
                  </div>
                ))}
              </dl>
            )}

            {stay.status === "invalid" ? (
              <p
                role="status"
                className="rounded-control border border-erro bg-branco px-3 py-2 text-small text-erro"
              >
                {stay.message}
              </p>
            ) : null}

            {stay.status === "quoted" ? (
              <div className="rounded-photo bg-branco p-5">
                <BookingRequestForm
                  propertyId={property.id}
                  propertyTitle={property.title}
                  checkIn={stay.checkIn}
                  checkOut={stay.checkOut}
                  guests={stay.guests}
                  turnstileSiteKey={turnstileSiteKey}
                />
              </div>
            ) : rents ? (
              <a href="#disponibilidade" className={buttonClasses("primary")}>
                Escolher datas para reservar
              </a>
            ) : null}

            <a
              href={whatsappLink(whatsappMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses(rents ? "secondary" : "primary")}
            >
              <ChatIcon />
              {ctaLabel}
              <span className="sr-only"> (abre em nova aba)</span>
            </a>

            {property.offers_sale ? (
              <section
                id="visita"
                aria-labelledby="visita-titulo"
                className="grid scroll-mt-6 gap-4 rounded-photo bg-branco p-5"
              >
                <h2 id="visita-titulo" className="font-serif text-h3 font-normal">
                  Agendar visita ou tirar dúvidas
                </h2>
                <InquiryForm
                  variant="sale"
                  propertyId={property.id}
                  today={today}
                  turnstileSiteKey={turnstileSiteKey}
                  submitLabel="Enviar pedido"
                />
              </section>
            ) : (
              <Link
                href={`/contato?imovel=${property.slug}`}
                className="text-center text-petroleo underline underline-offset-3"
              >
                Enviar uma pergunta por mensagem
              </Link>
            )}
          </aside>
        </div>

        {property.images.length >= 3 ? (
          <HouseStory photos={property.images} supabaseUrl={supabaseUrl} />
        ) : null}
      </Container>

      {/* Celular: barra fixa com o preço principal e o contato (substitui a barra de atalhos). */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-4 border-t border-areia bg-branco px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        <p className="tabular-nums">
          {stay.status === "quoted" ? (
            <>
              <strong className="font-semibold">{formatPrice(stay.quote.total)}</strong>
              <span className="block text-small text-rocha">total estimado</span>
            </>
          ) : mainPrice ? (
            <strong className="font-semibold">{mainPrice.value}</strong>
          ) : null}
        </p>
        <div className="flex shrink-0 gap-2">
          {rents ? (
            <a
              href={stay.status === "quoted" ? "#valores" : "#disponibilidade"}
              className={buttonClasses("primary", "px-4")}
            >
              {stay.status === "quoted" ? "Solicitar" : "Ver datas"}
            </a>
          ) : null}
          <a
            href={whatsappLink(whatsappMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses(rents ? "secondary" : "primary", "px-4")}
          >
            <ChatIcon />
            WhatsApp
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
        </div>
      </div>
    </main>
  );
}
