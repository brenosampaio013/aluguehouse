import { AmenityIcon } from "@/components/amenities/amenity-icon";
import { groupByCategory, sortForPreview } from "@/lib/amenities";

import { AllAmenitiesDialog } from "./all-amenities-dialog";

/** Quantas comodidades aparecem antes de "Mostrar todas". */
const PREVIEW = 10;

type Amenity = { slug: string; label: string };

function AmenityItem({ amenity }: { amenity: Amenity }) {
  return (
    <li className="flex min-h-11 items-center gap-3">
      <AmenityIcon name={amenity.slug} size={24} className="shrink-0 text-abismo" />
      <span>{amenity.label}</span>
    </li>
  );
}

/**
 * Comodidades da página do imóvel: as principais com ícone e, havendo mais,
 * "Mostrar todas" com a lista completa por categoria. Só o que foi marcado
 * no painel aparece; sem comodidades, a seção não é exibida.
 */
export function AmenitiesSection({ amenities }: { amenities: Amenity[] }) {
  if (amenities.length === 0) return null;
  const preview = sortForPreview(amenities).slice(0, PREVIEW);
  return (
    <section aria-labelledby="comodidades" className="grid gap-5">
      <h2 id="comodidades" className="font-serif text-h2 font-normal">
        O que este lugar oferece
      </h2>
      <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
        {preview.map((amenity) => (
          <AmenityItem key={amenity.slug} amenity={amenity} />
        ))}
      </ul>
      {amenities.length > PREVIEW ? (
        <AllAmenitiesDialog count={amenities.length}>
          {groupByCategory(amenities).map((group) => (
            <section
              key={group.id}
              aria-labelledby={`comodidades-${group.id}`}
              className="grid gap-2"
            >
              <h3 id={`comodidades-${group.id}`} className="text-h3 font-semibold">
                {group.label}
              </h3>
              <ul className="grid divide-y divide-areia">
                {group.items.map((amenity) => (
                  <AmenityItem key={amenity.slug} amenity={amenity} />
                ))}
              </ul>
            </section>
          ))}
        </AllAmenitiesDialog>
      ) : null}
    </section>
  );
}
