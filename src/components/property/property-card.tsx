import Link from "next/link";

import { FavoriteButton } from "@/components/favorites/favorite-button";
import { formatPrice } from "@/lib/format";
import { mediaSrcSet, publicMediaUrl, variantPath, variantWidths } from "@/lib/media";
import type { PropertyCardData } from "@/server/queries/public-properties";

export type CardStay = { nights: number; total: number };

const priceSuffix = { night: "por noite", month: "por mês", sale: "à venda" } as const;

function facts(property: PropertyCardData) {
  const rooms =
    property.suites > 0
      ? `${property.suites} ${property.suites === 1 ? "suíte" : "suítes"}`
      : property.bedrooms > 0
        ? `${property.bedrooms} ${property.bedrooms === 1 ? "quarto" : "quartos"}`
        : null;
  // Venda: área no lugar da capacidade de hóspedes.
  const extra =
    property.price?.kind === "sale"
      ? property.areaM2
        ? `${new Intl.NumberFormat("pt-BR").format(property.areaM2)} m²`
        : null
      : `até ${property.maxGuests} ${property.maxGuests === 1 ? "hóspede" : "hóspedes"}`;
  return [rooms, extra].filter(Boolean).join(" · ");
}

/** Cartão de imóvel: a foto é a protagonista; texto curto e alinhado à esquerda. */
export function PropertyCard({
  property,
  supabaseUrl,
  priority = false,
  href = `/imoveis/${property.slug}`,
  stay = null,
}: {
  property: PropertyCardData;
  supabaseUrl: string;
  priority?: boolean;
  href?: string;
  /** Com datas escolhidas: total estimado da estadia. */
  stay?: CardStay | null;
}) {
  const { cover } = property;
  const place = [property.neighborhood, property.city].filter(Boolean).join(", ");

  return (
    <article className="group relative grid gap-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-photo bg-areia">
        {cover ? (
          // Variantes WebP geradas no upload (Etapa 6), sem otimização no servidor.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={publicMediaUrl(
              supabaseUrl,
              variantPath(cover.path, variantWidths(cover.width)[0]!),
            )}
            srcSet={mediaSrcSet(supabaseUrl, cover.path, cover.width)}
            sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
            alt={cover.alt}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : null}
        <FavoriteButton
          propertyId={property.id}
          title={property.title}
          className="absolute top-3 right-3 z-10"
        />
        {cover?.isDemo ? (
          <span className="absolute bottom-3 left-3 rounded-full bg-branco/95 px-2.5 py-1 text-small font-semibold text-abismo">
            Foto ilustrativa
          </span>
        ) : null}
      </div>
      <div className="grid gap-0.5">
        <h3 className="leading-snug font-semibold">
          <Link
            href={href}
            className="after:absolute after:inset-0 after:rounded-photo focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-petroleo"
          >
            {property.title}
          </Link>
        </h3>
        {place ? <p className="text-small text-rocha">{place}</p> : null}
        <p className="text-small text-rocha">{facts(property)}</p>
        {stay ? (
          <p className="mt-1 tabular-nums">
            <strong className="font-semibold">{formatPrice(stay.total)}</strong> no total ·{" "}
            {stay.nights} {stay.nights === 1 ? "noite" : "noites"}
          </p>
        ) : property.price ? (
          <p className="mt-1 tabular-nums">
            <strong className="font-semibold">{formatPrice(property.price.amount)}</strong>{" "}
            {priceSuffix[property.price.kind]}
          </p>
        ) : null}
      </div>
    </article>
  );
}
