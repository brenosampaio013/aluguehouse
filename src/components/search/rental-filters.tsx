import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ChevronDownIcon } from "@/components/ui/icons";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { propertyTypeLabels } from "@/lib/properties/labels";
import { formatArea, rentalTypes, type RentalFilters, type RentalMode } from "@/lib/search/params";

import { DestinationSelect } from "./destination-select";

const bedroomOptions = [
  { value: "", label: "Qualquer" },
  ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} ou mais` })),
];

const sortOptions = [
  { value: "recentes", label: "Mais recentes" },
  { value: "menor-preco", label: "Menor preço" },
  { value: "maior-preco", label: "Maior preço" },
  { value: "melhor-avaliados", label: "Melhor avaliados" },
];

const typeOptions = [
  { value: "", label: "Qualquer tipo" },
  ...rentalTypes.map((t) => ({ value: t, label: propertyTypeLabels[t] })),
];

/**
 * Filtros como formulário GET: funcionam sem JavaScript e deixam a busca na
 * URL, pronta para compartilhar.
 */
export function RentalFiltersForm({
  path,
  mode,
  filters,
  amenities,
  today,
}: {
  path: string;
  mode: RentalMode;
  filters: RentalFilters;
  amenities: { slug: string; label: string }[];
  today: string;
}) {
  const selected = new Set(filters.comodidades);
  const moreCount =
    [filters.quartos, filters.tipo, filters.precoMin, filters.precoMax].filter(Boolean).length +
    filters.comodidades.length +
    (filters.ordem !== "recentes" ? 1 : 0);
  return (
    <form
      method="get"
      action={path}
      aria-label="Filtros"
      className="grid gap-5 rounded-photo border border-areia p-5"
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto] lg:items-start">
        <DestinationSelect
          defaultValue={filters.destino ?? filters.regiao ?? ""}
          area={filters.area ? formatArea(filters.area) : undefined}
        />
        <TextField
          label="Chegada"
          name="chegada"
          type="date"
          min={today}
          defaultValue={filters.chegada}
        />
        <TextField
          label="Saída"
          name="saida"
          type="date"
          min={today}
          defaultValue={filters.saida}
          hint={mode === "seasonal" ? "Até 29 noites." : "De 30 a 90 noites."}
        />
        <TextField
          label="Hóspedes"
          name="hospedes"
          type="number"
          min={1}
          max={50}
          defaultValue={filters.hospedes}
        />
        <Button type="submit" className="max-lg:hidden lg:mt-[1.6rem]">
          Aplicar filtros
        </Button>
      </div>

      {/* Demais filtros: recolhidos no computador (abrem sozinhos se algum estiver em uso). */}
      <details open={moreCount > 0} className="group grid gap-5">
        <summary className="inline-flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 rounded-full border border-junco px-4 font-semibold text-abismo hover:border-abismo [&::-webkit-details-marker]:hidden">
          Mais filtros
          {moreCount > 0 ? (
            <span className="rounded-full bg-petroleo px-2 text-small text-branco">
              {moreCount}
              <span className="sr-only"> em uso</span>
            </span>
          ) : null}
          <ChevronDownIcon
            width={16}
            height={16}
            aria-hidden="true"
            className="transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <SelectField
            label="Quartos"
            name="quartos"
            options={bedroomOptions}
            defaultValue={filters.quartos ? String(filters.quartos) : ""}
          />
          <SelectField
            label="Tipo de imóvel"
            name="tipo"
            options={typeOptions}
            defaultValue={filters.tipo ?? ""}
          />
          <TextField
            label={
              mode === "seasonal" ? "Diária a partir de (R$)" : "Aluguel mensal a partir de (R$)"
            }
            name="preco_min"
            inputMode="numeric"
            pattern="[0-9]*"
            defaultValue={filters.precoMin}
          />
          <TextField
            label={mode === "seasonal" ? "Diária até (R$)" : "Aluguel mensal até (R$)"}
            name="preco_max"
            inputMode="numeric"
            pattern="[0-9]*"
            defaultValue={filters.precoMax}
            hint={
              mode === "seasonal" ? "Com datas, vale a média das diárias do período." : undefined
            }
          />
          <SelectField
            label="Ordenar por"
            name="ordem"
            options={sortOptions}
            defaultValue={filters.ordem}
          />
        </div>

        <fieldset className="mt-6 grid gap-3">
          <legend className="mb-2 font-semibold">Comodidades</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {amenities.map((amenity) => (
              <CheckboxField
                key={amenity.slug}
                label={amenity.label}
                name="comodidade"
                value={amenity.slug}
                defaultChecked={selected.has(amenity.slug)}
              />
            ))}
          </div>
        </fieldset>
      </details>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" className="lg:hidden">
          Aplicar filtros
        </Button>
        <Link href={path} className="font-semibold text-petroleo underline underline-offset-3">
          Limpar filtros
        </Link>
      </div>
    </form>
  );
}
