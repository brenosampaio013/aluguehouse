import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

import { FavoriteButton } from "@/components/favorites/favorite-button";
import { AreaIcon, BathIcon, BedIcon, GuestsIcon, HouseIcon } from "@/components/ui/icons";
import { formatPrice } from "@/lib/format";
import { mediaSrcSet, publicMediaUrl, variantPath, variantWidths } from "@/lib/media";
import type { PropertyCardData } from "@/server/queries/public-properties";

import { ListingBadge } from "./listing-badge";

export type CardStay = { nights: number; total: number };

const priceSuffix = { night: "por noite", month: "por mês", sale: "à venda" } as const;

type Fact = { icon: ComponentType<SVGProps<SVGSVGElement>>; label: string };

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * Quartos, suítes e capacidade, só com o que está cadastrado (nada de zero).
 * Venda: área no lugar da capacidade de hóspedes.
 */
export function cardFacts(property: PropertyCardData): Fact[] {
  const facts: Fact[] = [];
  if (property.bedrooms > 0)
    facts.push({ icon: BedIcon, label: plural(property.bedrooms, "quarto", "quartos") });
  if (property.suites > 0)
    facts.push({ icon: BathIcon, label: plural(property.suites, "suíte", "suítes") });
  if (property.price?.kind === "sale") {
    if (property.areaM2)
      facts.push({
        icon: AreaIcon,
        label: `${new Intl.NumberFormat("pt-BR").format(property.areaM2)} m²`,
      });
  } else if (property.maxGuests > 0) {
    facts.push({
      icon: GuestsIcon,
      label: `até ${plural(property.maxGuests, "hóspede", "hóspedes")}`,
    });
  }
  return facts;
}

/**
 * Cartão de imóvel: foto grande, localização, título em serifa, quartos,
 * suítes e capacidade, e o preço real cadastrado (ou o total da estadia).
 */
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
  const place = [property.neighborhood, property.city].filter(Boolean).join(" · ");
  const facts = cardFacts(property);

  return (
    <article className="group relative grid content-start gap-4">
      <div className="relative aspect-[4/3] overflow-hidden rounded-photo bg-areia shadow-[0_1px_2px_rgb(20_43_58/0.06)] transition-shadow duration-300 group-hover:shadow-[0_18px_40px_-18px_rgb(20_43_58/0.35)]">
        {cover ? (
          // Variantes WebP geradas no upload (Etapa 6), sem otimização no servidor.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={publicMediaUrl(
              supabaseUrl,
              variantPath(cover.path, variantWidths(cover.width)[0]!),
            )}
            srcSet={mediaSrcSet(supabaseUrl, cover.path, cover.width)}
            sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
            alt={cover.alt}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
            className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid size-full place-content-center justify-items-center gap-2 text-rocha">
            <HouseIcon width={32} height={32} />
            <span className="text-small">Fotos em breve</span>
          </div>
        )}
        {/* Leve escurecimento no alto para o coração ficar visível em fotos claras. */}
        {cover ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-b from-abismo/25 to-transparent"
          />
        ) : null}
        <ListingBadge status={property.listing} />
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

      <div className="grid gap-2">
        {place ? (
          <p className="text-small font-semibold tracking-[0.12em] text-rocha uppercase">{place}</p>
        ) : null}
        <h3 className="font-serif text-h3 leading-snug font-normal text-abismo">
          <Link
            href={href}
            className="group-hover:underline group-hover:decoration-dourado group-hover:underline-offset-4 after:absolute after:inset-0 after:rounded-photo focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-petroleo"
          >
            {property.title}
          </Link>
        </h3>
        {facts.length > 0 ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-small text-rocha">
            {facts.map(({ icon: FactIcon, label }) => (
              <li key={label} className="inline-flex items-center gap-1.5">
                <FactIcon width={16} height={16} className="text-petroleo" />
                {label}
              </li>
            ))}
          </ul>
        ) : null}
        {stay || property.price ? (
          <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 border-t border-dourado/40 pt-3 tabular-nums">
            {stay ? (
              <>
                <strong className="text-[1.0625rem] font-semibold text-abismo">
                  {formatPrice(stay.total)}
                </strong>{" "}
                <span className="text-small text-rocha">
                  no total · {plural(stay.nights, "noite", "noites")}
                </span>
              </>
            ) : (
              <>
                <strong className="text-[1.0625rem] font-semibold text-abismo">
                  {formatPrice(property.price!.amount)}
                </strong>{" "}
                <span className="text-small text-rocha">{priceSuffix[property.price!.kind]}</span>
              </>
            )}
          </p>
        ) : null}
      </div>
    </article>
  );
}
